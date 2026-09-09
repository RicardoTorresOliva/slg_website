/**
 * test-isolation.ts — Prueba del aislamiento entre empresas.
 *
 * Es la prueba que sostiene el DoD #5, el riesgo R-10 y el gate D9. No mira el
 * código: ejecuta consultas reales contra PostgreSQL con el mismo usuario con
 * el que la aplicación se conectará, y comprueba comportamiento.
 *
 * La comprobación 0 existe por un hallazgo real de FU-04: el usuario que crea la
 * imagen de PostgreSQL es SUPERUSUARIO y lleva `rolbypassrls`. Conectando con
 * él, las políticas de fila no se aplican y todo lo demás es decorativo. Si
 * alguien vuelve a apuntar `DATABASE_URL` al dueño, esta prueba se pone roja.
 *
 * La comprobación 8 recorre el CATÁLOGO de PostgreSQL, no una lista escrita a
 * mano: una tabla nueva con `organization_id` nace fallando el CI hasta que
 * declara su política.
 */

import postgres from "postgres";

const APP_URL = process.env.DATABASE_URL;
const OWNER_URL = process.env.DATABASE_URL_MIGRATIONS ?? APP_URL;

if (!APP_URL) {
  console.error("Falta DATABASE_URL. Carga `.env` antes de ejecutar.");
  process.exit(1);
}

const app = postgres(APP_URL, { max: 2, onnotice: () => {} });
const owner = postgres(OWNER_URL!, { max: 2, onnotice: () => {} });

let fallos = 0;
function comprobar(nombre: string, ok: boolean, detalle = "") {
  if (ok) console.log(`  ✓ ${nombre}`);
  else {
    fallos++;
    console.error(`  ✗ ${nombre}${detalle ? ` — ${detalle}` : ""}`);
  }
}

/** Ejecuta trabajo con el contexto fijado, igual que `withScope`. */
async function conContexto<T>(
  orgId: string | null,
  rol: string,
  trabajo: (tx: postgres.TransactionSql) => Promise<T>,
): Promise<T> {
  return app.begin(async (tx) => {
    await tx`select set_config('app.organization_id', ${orgId ?? ""}, true)`;
    await tx`select set_config('app.actor_role', ${rol}, true)`;
    return trabajo(tx);
  }) as Promise<T>;
}

async function main() {
  console.log("Aislamiento entre empresas — DoD #5 · R-10 · gate D9\n");

  // ── 0. El usuario de la aplicación no puede saltarse RLS ──────────────────
  const [rol] = await app`
    select current_user as usuario, usesuper as superusuario, usebypassrls as bypass
    from pg_user where usename = current_user`;
  comprobar(
    "el usuario de DATABASE_URL NO es superusuario",
    rol.superusuario === false,
    `es ${rol.usuario}, superusuario=${rol.superusuario}`,
  );
  comprobar(
    "el usuario de DATABASE_URL NO tiene BYPASSRLS",
    rol.bypass === false,
    "con BYPASSRLS las políticas de fila no se aplican y el aislamiento es teatro",
  );

  // ── Datos de dos empresas, creados con el dueño ───────────────────────────
  await owner`delete from project where id like 'test-%'`;
  await owner`delete from organization where id like 'test-%'`;
  await owner`insert into organization (id,name,slug,type,status) values
    ('test-a','Cliente A','test-cliente-a','client','active'),
    ('test-b','Cliente B','test-cliente-b','client','active')`;
  await owner`insert into project (id,organization_id,name,service,status) values
    ('test-pa','test-a','Readiness A','SLG_Readiness','active'),
    ('test-pb','test-b','Readiness B','SLG_Readiness','active')`;

  // ── 1. Sin contexto: cero filas, no todas ─────────────────────────────────
  const sinCtx = await conContexto(null, "", (tx) => tx`select count(*)::int as n from project`);
  comprobar(
    "sin contexto, una consulta devuelve CERO filas (no todas)",
    sinCtx[0].n === 0,
    `devolvió ${sinCtx[0].n}`,
  );

  // ── 2. Con contexto de A: solo A ──────────────────────────────────────────
  const soloA = await conContexto("test-a", "client_admin", (tx) =>
    tx`select id from project where id like 'test-%'`,
  );
  comprobar(
    "con contexto de la empresa A, solo se ven sus proyectos",
    soloA.length === 1 && soloA[0].id === "test-pa",
    `vio ${soloA.map((r) => r.id).join(",") || "nada"}`,
  );

  // ── 3. Pedir explícitamente la empresa ajena ──────────────────────────────
  const ajena = await conContexto("test-a", "client_admin", (tx) =>
    tx`select count(*)::int as n from project where organization_id = 'test-b'`,
  );
  comprobar(
    "pedir explícitamente los datos de otra empresa devuelve cero",
    ajena[0].n === 0,
    `devolvió ${ajena[0].n}`,
  );

  // ── 4. Escribir en la empresa ajena ───────────────────────────────────────
  let escrituraRechazada = false;
  try {
    await conContexto("test-a", "client_admin", (tx) =>
      tx`insert into project (id,organization_id,name,service,status)
         values ('test-px','test-b','Intruso','SLG_Readiness','active')`,
    );
  } catch {
    escrituraRechazada = true;
  }
  comprobar("escribir en otra empresa es rechazado por la política de fila", escrituraRechazada);

  // ── 5. Un actor de SLG sí ve las dos ──────────────────────────────────────
  const slg = await conContexto(null, "slg_operator", (tx) =>
    tx`select count(*)::int as n from project where id like 'test-%'`,
  );
  comprobar(
    "un operador de SLG ve las dos empresas (B.3)",
    slg[0].n === 2,
    `vio ${slg[0].n}`,
  );

  // ── 6 y 7. audit_log inmutable, ni siquiera para slg_admin ────────────────
  // Id único por ejecución: las filas de auditoría NO se limpian, y eso no es
  // un descuido. Es lo que significa «inmutable»: el disparador bloquea el
  // borrado incluso para el dueño del esquema. Un test que necesitara limpiar
  // aquí estaría pidiendo debilitar justo lo que verifica.
  const auditId = `test-audit-${Date.now()}`;
  await owner`insert into audit_log (id,actor_type,actor_id,action,entity,entity_id)
    values (${auditId},'user','u1','project.create','project','test-pa')`;

  for (const [op, sentencia] of [
    ["UPDATE", (tx: postgres.TransactionSql) => tx`update audit_log set action='falso' where id=${auditId}`],
    ["DELETE", (tx: postgres.TransactionSql) => tx`delete from audit_log where id=${auditId}`],
  ] as const) {
    let rechazado = false;
    try {
      await conContexto(null, "slg_admin", sentencia);
    } catch {
      rechazado = true;
    }
    comprobar(`audit_log rechaza ${op} incluso para slg_admin (RNF-29)`, rechazado);
  }

  // ── 8. Catálogo: ninguna tabla con organization_id sin política ───────────
  const sinPolitica = await owner`
    select c.relname as tabla
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = c.oid and a.attname = 'organization_id' and a.attnum > 0
    where n.nspname = 'public' and c.relkind = 'r'
      and (c.relrowsecurity = false
           or c.relforcerowsecurity = false
           or not exists (select 1 from pg_policy p where p.polrelid = c.oid))
    order by 1`;
  comprobar(
    "toda tabla con organization_id tiene RLS activa, FORZADA y con política",
    sinPolitica.length === 0,
    sinPolitica.length ? `sin proteger: ${sinPolitica.map((r) => r.tabla).join(", ")}` : "",
  );

  // ── Limpieza ──────────────────────────────────────────────────────────────
  // `audit_log` queda fuera a propósito: es inmutable por diseño (RNF-29).
  await owner`delete from project where id like 'test-%'`;
  await owner`delete from organization where id like 'test-%'`;

  await app.end({ timeout: 5 });
  await owner.end({ timeout: 5 });

  if (fallos) {
    console.error(`\n✗ ${fallos} comprobación(es) de aislamiento fallaron.\n`);
    process.exit(1);
  }
  console.log("\n✓ Aislamiento verificado contra PostgreSQL real.\n");
}

main().catch(async (e) => {
  console.error("\n✗ La prueba de aislamiento no pudo completarse:", e);
  await app.end({ timeout: 5 }).catch(() => {});
  await owner.end({ timeout: 5 }).catch(() => {});
  process.exit(1);
});
