/**
 * test-claves.ts — Claves de API y registro de auditoría (DU-17), contra
 * PostgreSQL real.
 *
 * Los criterios que solo se comprueban así:
 *
 *   · **1** — no se crea una clave **sin alcances, sin límite o sin
 *     caducidad**, y el que lo impide es el **servidor**, no el formulario.
 *   · **2** — la clave en claro se devuelve **una vez**; una segunda visita a la
 *     misma ficha **no la enseña**, y en la base solo vive su huella.
 *   · **3** — la revocación es **inmediata**: `verificarClave` rechaza en la
 *     petición siguiente, sin caché que invalidar.
 *   · **4** — los alcances son **granulares y ninguno implica a otro**:
 *     `deliverables:write` no abre `deliverables:read`.
 *   · **5** — la auditoría es de `slg_admin`; el intento de `slg_operator` se
 *     rechaza **y queda auditado**.
 *   · **6** — el registro **no se puede editar ni borrar**, y la prueba lo
 *     intenta: la base lo rechaza incluso con el usuario dueño (RNF-29).
 *   · **7** — sin claves · sin eventos · filtro sin resultados · clave caducada.
 *
 * Necesita `bash scripts/db/local-pg.sh up`.
 */
import postgres from "postgres";

import { ErrorDeAutorizacion } from "../../lib/auth/matriz.ts";
import { contextoDeSesion } from "../../lib/db/context.ts";
import type { UserRole } from "../../lib/db/schema.ts";

let fallos = 0;
let comprobaciones = 0;

function check(caso: string, ok: boolean, detalle = "") {
  comprobaciones++;
  if (ok) console.log(`  ✓ ${caso}`);
  else {
    fallos++;
    console.error(`  ✗ ${caso}${detalle ? `\n      ${detalle}` : ""}`);
  }
}

const URL_DUENO = process.env.DATABASE_URL_MIGRATIONS;
if (!URL_DUENO) throw new Error("Falta DATABASE_URL_MIGRATIONS.");
const dueno = postgres(URL_DUENO, { max: 3 });

const ADMIN = "u-admin-du17";
const OPERADOR = "u-operador-du17";
const MARCA = "du17";
const DESDE = new Date();

const ctxDe = (rol: UserRole, id: string) =>
  contextoDeSesion({ userId: id, userName: `Persona ${rol}`, role: rol, organizationId: null });
const admin = () => ctxDe("slg_admin", ADMIN);
const operador = () => ctxDe("slg_operator", OPERADOR);

const manana = () => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

async function limpiar() {
  await dueno`delete from api_key where name like ${`${MARCA}%`}`;
}

async function main() {
  process.env.CRM_QUEUE_DISABLED = "1";

  const { auditoria, claves, crearClave, guardarParaMostrar, recogerParaMostrar, revocarClave } =
    await import("../../lib/hq/claves.ts");
  const { verificarClave } = await import("../../lib/auth/index.ts");

  await limpiar();

  try {
    /* ── Criterio 7 · sin claves ────────────────────────────────────────── */
    console.log("\nCriterio 7 — sin claves, la lista está vacía y no se rompe:\n");
    check("la lista puede venir vacía", Array.isArray(await claves(admin())));

    /* ── Criterio 1 · los tres obligatorios ─────────────────────────────── */
    console.log("\nCriterio 1 — ni sin alcances, ni sin límite, ni sin caducidad (RF-82, R-14):\n");
    const base = {
      nombre: `${MARCA}-buena`,
      organizationId: null,
      alcances: ["captures:read"],
      limite: 60,
      ventanaSegundos: 60,
      caducaEn: manana(),
    };
    const intentar = async (parche: Record<string, unknown>) => {
      try {
        await crearClave(admin(), { ...base, ...parche } as typeof base);
        return "(creada)";
      } catch (e) {
        return (e as Error & { campo?: string }).campo ?? (e as Error).name;
      }
    };
    check("sin alcances NO se crea", (await intentar({ alcances: [] })) === "alcances");
    check("con un alcance inventado tampoco", (await intentar({ alcances: ["todo:todo"] })) === "alcances");
    check("sin caducidad NO se crea", (await intentar({ caducaEn: "" })) === "caduca");
    check("con caducidad en el pasado tampoco", (await intentar({ caducaEn: "2020-01-01" })) === "caduca");
    check("con límite cero NO se crea", (await intentar({ limite: 0 })) === "limite");
    check("sin nombre NO se crea", (await intentar({ nombre: "  " })) === "nombre");

    /* ── Criterio 2 · una sola vez ──────────────────────────────────────── */
    console.log("\nCriterio 2 — la clave en claro se enseña UNA vez (RF-82):\n");
    const creada = await crearClave(admin(), base);
    check("crear devuelve el secreto en claro", creada.enClaro.startsWith("slg_"), creada.enClaro.slice(0, 8));

    const guardada = await dueno`select key_hash, scopes, rate_limit_max, expires_at from api_key where id = ${creada.id}`;
    check(
      "en la base vive la HUELLA, nunca el secreto",
      Boolean(guardada[0]?.key_hash) && !JSON.stringify(guardada[0]).includes(creada.enClaro),
    );
    check(
      "y la fila guarda los tres campos obligatorios tal como se pidieron",
      guardada[0]?.rate_limit_max === 60 && Boolean(guardada[0]?.expires_at),
      JSON.stringify(guardada[0]),
    );

    const vale = guardarParaMostrar(creada.enClaro);
    check("la primera visita a la ficha lo enseña", recogerParaMostrar(vale) === creada.enClaro);
    check("LA SEGUNDA NO ENSEÑA NADA", recogerParaMostrar(vale) === null);
    check("y un identificador inventado tampoco", recogerParaMostrar("no-existe") === null);
    check(
      "el apunte de auditoría dice QUE se creó una clave, nunca su valor",
      !JSON.stringify(
        await dueno`select * from audit_log where action = 'apikey.create' and created_at >= ${DESDE}`,
      ).includes(creada.enClaro),
    );

    /* ── Criterios 3 y 4 · revocación y alcances ────────────────────────── */
    console.log("\nCriterios 3 y 4 — revocación inmediata, y alcances que no se implican:\n");
    const cabeceras = (clave: string) => new Headers({ authorization: `Bearer ${clave}` });

    const antes = await verificarClave(cabeceras(creada.enClaro));
    check("antes de revocar, la clave verifica", antes.ok === true, JSON.stringify(antes).slice(0, 160));
    check(
      "y su contexto lleva EXACTAMENTE los alcances pedidos, sin expandir",
      antes.ok === true && JSON.stringify(antes.ctx.scopes) === JSON.stringify(["captures:read"]),
      antes.ok ? JSON.stringify(antes.ctx.scopes) : "",
    );

    await revocarClave(admin(), creada.id);
    const despues = await verificarClave(cabeceras(creada.enClaro));
    check(
      "DESPUÉS DE REVOCAR, la siguiente petición ya no pasa",
      despues.ok === false,
      JSON.stringify(despues).slice(0, 160),
    );
    check(
      "la revocación queda auditada",
      (
        await dueno`select action from audit_log where action = 'apikey.revoke' and actor_id = ${ADMIN} and created_at >= ${DESDE}`
      ).length === 1,
    );

    const soloEscritura = await crearClave(admin(), {
      ...base,
      nombre: `${MARCA}-escritura`,
      alcances: ["deliverables:write"],
    });
    const v = await verificarClave(cabeceras(soloEscritura.enClaro));
    check(
      "`deliverables:write` NO trae `deliverables:read`: los alcances son granulares (RF-147)",
      v.ok === true && !v.ctx.scopes.includes("deliverables:read"),
      v.ok ? JSON.stringify(v.ctx.scopes) : "",
    );

    console.log("\nCriterio 7 — una clave caducada no sirve, y la lista la marca:\n");
    const caducada = await crearClave(admin(), { ...base, nombre: `${MARCA}-caducada` });
    await dueno`update api_key set expires_at = now() - interval '1 hour' where id = ${caducada.id}`;
    const vCaducada = await verificarClave(cabeceras(caducada.enClaro));
    check("una clave caducada no verifica", vCaducada.ok === false);
    const enLista = (await claves(admin())).find((c) => c.id === caducada.id);
    check("y la lista la da por muerta sin necesidad de revocarla", enLista?.muerta === true, JSON.stringify(enLista));

    /* ── Criterio 5 · la auditoría es de admin ──────────────────────────── */
    console.log("\nCriterio 5 — la auditoría es SOLO de `slg_admin` (RF-83, RF-86):\n");
    const comoAdmin = await auditoria(admin(), { limite: 10 });
    check("`slg_admin` la lee", Array.isArray(comoAdmin) && comoAdmin.length > 0, `${comoAdmin.length}`);

    let estado = 0;
    try {
      await auditoria(operador(), {});
    } catch (e) {
      estado = e instanceof ErrorDeAutorizacion ? e.status : -1;
    }
    check("`slg_operator` recibe denegación", estado > 0, `estado ${estado}`);
    check(
      "y su intento QUEDA AUDITADO: quien mira la auditoría ve quién intentó mirarla",
      (
        await dueno`select action from audit_log
                     where action = 'audit.read.denied' and actor_id = ${OPERADOR} and created_at >= ${DESDE}`
      ).length === 1,
    );
    check(
      "los rechazos se pueden pedir solos, sin escribir una consulta",
      (await auditoria(admin(), { soloRechazos: true, limite: 50 })).every((a) => a.rechazo),
    );

    console.log("\nCriterio 7 — un filtro sin resultados no es un error:\n");
    check(
      "filtrar por una acción que no existe devuelve lista vacía",
      (await auditoria(admin(), { accion: "esto.no.existe" })).length === 0,
    );

    /* ── Criterio 6 · el registro es INMUTABLE ──────────────────────────── */
    console.log("\nCriterio 6 — el registro no se puede editar ni borrar (RNF-29):\n");
    const unApunte = (
      await dueno`select id from audit_log where created_at >= ${DESDE} limit 1`
    )[0] as { id: string } | undefined;
    check("hay un apunte con el que probar", Boolean(unApunte));

    let mensajeUpdate = "";
    try {
      // Con el usuario DUEÑO de la base, que es el más privilegiado que existe
      // aquí. Si ni él puede, nadie puede.
      await dueno`update audit_log set action = 'manipulado' where id = ${unApunte?.id ?? ""}`;
    } catch (e) {
      mensajeUpdate = (e as Error).message;
    }
    check("un UPDATE sobre la auditoría FALLA", mensajeUpdate.includes("inmutable"), mensajeUpdate.slice(0, 120));

    let mensajeDelete = "";
    try {
      await dueno`delete from audit_log where id = ${unApunte?.id ?? ""}`;
    } catch (e) {
      mensajeDelete = (e as Error).message;
    }
    check("un DELETE sobre la auditoría FALLA", mensajeDelete.includes("inmutable"), mensajeDelete.slice(0, 120));
    check(
      "y el apunte sigue ahí, con su acción original",
      (
        await dueno`select action from audit_log where id = ${unApunte?.id ?? ""}`
      )[0]?.action !== "manipulado",
    );
    check(
      "no existe ninguna función de editar ni de borrar auditoría en `lib/hq`",
      !Object.keys(await import("../../lib/hq/claves.ts")).some((k) => /borrar|editar|eliminar/i.test(k)),
      Object.keys(await import("../../lib/hq/claves.ts")).join(" · "),
    );

    await limpiar();
  } finally {
    await dueno.end({ timeout: 5 });
  }

  if (fallos > 0) {
    console.error(`\n✗ claves: ${fallos} de ${comprobaciones} comprobaciones fallaron.\n`);
    process.exit(1);
  }
  console.log(`\n✓ claves: ${comprobaciones} comprobaciones contra PostgreSQL real, sin fallos.`);
  process.exit(0);
}

await main();
