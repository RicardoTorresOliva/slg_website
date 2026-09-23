/**
 * test-miembros.ts — **Miembros, perfil y el paso «Agenda tu Sesión Cero»**
 * (DU-21 · RF-92 · RF-93 · RF-94 · RF-96), contra PostgreSQL real.
 *
 * Los criterios, y por qué cada uno necesita la base de verdad:
 *
 *   · **1** — `client_admin` invita a **su** empresa y no puede invitar a otra:
 *     el intento se rechaza **en el servidor** y **queda auditado**. El rechazo
 *     lo produce la política de FU-07, no la pantalla, así que se prueba
 *     llamando al servicio directamente.
 *   · **2** — `client_member` **ve la lista** y **no** puede invitar. Las dos
 *     mitades, porque gatear con una sola acción rompe una de las dos.
 *   · **3** — cada usuario edita **su** nombre e idioma —y solo el suyo— y
 *     cambia la contraseña **solo si usa ese método**.
 *   · **4** — sin URL de calendario el paso degrada a «próximamente»; con una
 *     URL que no es `https:` también.
 *   · **5** — la Sesión Cero **no asoma fuera del portal**: se barre el código.
 *   · **7** — empresa con un solo miembro · invitación pendiente · URL ausente ·
 *     sin permiso para invitar.
 *
 * **El criterio 6 (DoD #5) no se puede cerrar aquí**: pide que el usuario acepte
 * la invitación **con Microsoft 365**, y eso necesita los registros de F.2-3.
 * Lo que sí se comprueba es todo lo que no depende de ellos.
 *
 * Necesita `bash scripts/db/local-pg.sh up`.
 */
import fs from "node:fs";
import path from "node:path";

import postgres from "postgres";

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

const RAIZ = path.resolve(import.meta.dirname, "../..");
const URL_DUENO = process.env.DATABASE_URL_MIGRATIONS;
if (!URL_DUENO) throw new Error("Falta DATABASE_URL_MIGRATIONS.");
const dueno = postgres(URL_DUENO, { max: 3 });

const A = { org: "org-du21-a", slug: "du21-a", admin: "u-du21-a-admin", miembro: "u-du21-a-mi" };
const B = { org: "org-du21-b", slug: "du21-b", admin: "u-du21-b-admin", miembro: "" };

const ctx = (userId: string, rol: UserRole, org: string) =>
  contextoDeSesion({ userId, userName: `Persona ${userId}`, role: rol, organizationId: org });

async function limpiar() {
  for (const org of [A.org, B.org]) {
    await dueno`delete from invitation where organization_id = ${org}`;
    await dueno`delete from membership where organization_id = ${org}`;
    await dueno`delete from organization where id = ${org}`;
  }
  for (const u of [A.admin, A.miembro, B.admin]) {
    await dueno`delete from "account" where user_id = ${u}`;
    /**
     * **`audit_log` NO se limpia, y no es un descuido**: la migración 0003 le
     * quita a la aplicación el `DELETE` porque un registro que se puede borrar
     * no es un registro (RNF-29). Por eso las comprobaciones de auditoría de
     * abajo se acotan por tiempo y no por «que no hubiera nada antes»: la
     * prueba se adapta a la regla, no al revés.
     */
    await dueno`delete from "user" where id = ${u}`;
  }
  await dueno`delete from organization where slug in (${A.slug}, ${B.slug})`;
}

async function sembrar() {
  await limpiar();
  for (const lado of [A, B]) {
    await dueno`insert into organization (id, name, slug, type, status)
                values (${lado.org}, ${`Empresa ${lado.slug}`}, ${lado.slug}, 'client', 'active')`;
  }
  const gente: [string, string, UserRole, string][] = [
    [A.admin, A.org, "client_admin", "es"],
    [A.miembro, A.org, "client_member", "es"],
    [B.admin, B.org, "client_admin", "en"],
  ];
  for (const [id, org, rol, idioma] of gente) {
    await dueno`insert into "user" (id, name, email, email_verified, role, locale)
                values (${id}, ${`Persona ${id}`}, ${`${id}@du21.test`}, true, ${rol}, ${idioma})`;
    await dueno`insert into membership (id, user_id, organization_id, org_role)
                values (${crypto.randomUUID()}, ${id}, ${org}, ${rol})`;
  }
  /**
   * Dos cuentas con métodos distintos, que es lo que hace significativo el
   * criterio 3: la del admin entra con contraseña; la del miembro, con la cuenta
   * de su organización. Sin las dos, la comprobación solo tendría un lado.
   */
  await dueno`insert into "account" (id, user_id, provider_id, account_id, password)
              values (${crypto.randomUUID()}, ${A.admin}, 'credential', ${`${A.admin}@du21.test`}, 'hash-falso')`;
  await dueno`insert into "account" (id, user_id, provider_id, account_id)
              values (${crypto.randomUUID()}, ${A.miembro}, 'microsoft', ${`oid-${A.miembro}`})`;
}

async function main() {
  await sembrar();

  /**
   * El enlace de la invitación es absoluto por diseño (FU-07): sin origen no hay
   * correo que mandar. **El SMTP se deja sin configurar a propósito**: así el
   * envío falla y se comprueba de paso RF-119 —la invitación EXISTE aunque el
   * correo no salga— en vez de darlo por supuesto.
   */
  process.env.NEXT_PUBLIC_SITE_URL = "https://demo.example.com";

  /** Marca de agua: todo apunte de auditoría posterior a esto es de esta corrida. */
  const INICIO = new Date();

  const { invitarMiembro, invitacionesDeLaEmpresa, miembrosDeLaEmpresa, MiembroInvalido } =
    await import("../../lib/portal/miembros.ts");
  const { guardarPerfil, perfilDeLaSesion } = await import("../../lib/portal/perfil.ts");
  const { pasoDeSesionCero, CLAVE_DE_URL } = await import("../../lib/portal/sesion-cero.ts");
  const { usaMetodoDeContrasena } = await import("../../lib/auth/acceso.ts");
  const { puede } = await import("../../lib/auth/permissions.ts");
  const { invitarACliente } = await import("../../lib/hq/usuarios.ts");

  const admin = ctx(A.admin, "client_admin", A.org);
  const miembro = ctx(A.miembro, "client_member", A.org);
  const ajeno = ctx(B.admin, "client_admin", B.org);

  console.log("\nCriterio 1 — `client_admin` invita a SU empresa, y a ninguna otra:\n");

  const invitada = await invitarMiembro(admin, { correo: "NUEVA@du21.test", rol: "client_member" });
  check("la invitación se crea", Boolean(invitada.id));
  check(
    "y existe aunque el correo no haya salido: la pantalla lo dirá (RF-119)",
    invitada.correoEnviado === false,
  );
  const [fila] = (await dueno`
    select organization_id, email, role, status from invitation where id = ${invitada.id}
  `) as unknown as { organization_id: string; email: string; role: string; status: string }[];
  check("y cuelga de la empresa de quien invita, no de una que venga por parámetro", fila?.organization_id === A.org, fila?.organization_id);
  check("el correo se normaliza a minúsculas", fila?.email === "nueva@du21.test", fila?.email);
  check("y queda pendiente", fila?.status === "pending", fila?.status);

  const auditadas = (await dueno`
    select action from audit_log
     where actor_id = ${A.admin} and created_at >= ${INICIO}
     order by created_at desc limit 1
  `) as unknown as { action: string }[];
  check("la invitación queda auditada", auditadas[0]?.action === "member.invite", JSON.stringify(auditadas));

  /**
   * El intento hostil. `invitarMiembro` **no tiene parámetro de empresa**, así
   * que desde la pantalla no se puede ni escribir; esto prueba la capa de
   * debajo, la que respondería si alguien llegara por otro camino.
   */
  let rechazado = false;
  try {
    await invitarACliente(admin, {
      email: "intruso@du21.test",
      organizationId: B.org,
      role: "client_member",
    });
  } catch {
    rechazado = true;
  }
  check("invitar a OTRA empresa se rechaza en el servidor", rechazado);
  const enB = (await dueno`select count(*)::text as n from invitation where organization_id = ${B.org}`) as unknown as { n: string }[];
  check("y no deja ninguna fila en la empresa ajena", enB[0]?.n === "0", enB[0]?.n);
  const denegadas = (await dueno`
    select action from audit_log
     where actor_id = ${A.admin} and action like '%.denied' and created_at >= ${INICIO}
  `) as unknown as { action: string }[];
  check("el intento rechazado SE AUDITA", denegadas.length === 1 && denegadas[0]?.action === "member.invite.denied", JSON.stringify(denegadas));

  check(
    "la puerta del portal no admite empresa: no hay dónde escribir la ajena",
    !/organizationId\s*[:?]/.test(
      fs.readFileSync(path.join(RAIZ, "lib/portal/miembros.ts"), "utf8").split("export async function invitarMiembro")[1]!.split("conAuditoria")[0]!,
    ),
  );

  let rolMalo = false;
  try {
    await invitarMiembro(admin, { correo: "x@du21.test", rol: "slg_admin" });
  } catch (e) {
    rolMalo = e instanceof MiembroInvalido;
  }
  check("y tampoco admite conceder un rol de SLG desde el portal", rolMalo);

  console.log("\nCriterio 2 — `client_member` ve la lista y NO puede invitar:\n");

  check("`member.read` sí", puede(miembro, "member.read").permitido);
  check("`member.invite` no", !puede(miembro, "member.invite").permitido);
  const vistos = await miembrosDeLaEmpresa(miembro);
  check("ve a los miembros de su empresa", vistos.length === 2, JSON.stringify(vistos.map((m) => m.rol)));
  check("y solo a los suyos", vistos.every((m) => m.userId !== B.admin));

  let sinPermiso = false;
  try {
    await invitarMiembro(miembro, { correo: "otra@du21.test", rol: "client_member" });
  } catch {
    sinPermiso = true;
  }
  check("invitar se le rechaza en el servidor, no solo en la pantalla", sinPermiso);
  const denegadasMiembro = (await dueno`
    select action from audit_log
     where actor_id = ${A.miembro} and action like '%.denied' and created_at >= ${INICIO}
  `) as unknown as { action: string }[];
  check("y ese intento también se audita", denegadasMiembro.length === 1, JSON.stringify(denegadasMiembro));

  const pantallaMiembros = fs.readFileSync(
    path.join(RAIZ, "app/(portal)/portal/miembros/page.tsx"),
    "utf8",
  );
  check(
    "la pantalla gobierna la sección con `member.read` y el formulario con `member.invite`",
    pantallaMiembros.includes('exigirSeccion(sesion.ctx, "members")') &&
      pantallaMiembros.includes('puede(sesion.ctx, "member.invite")'),
  );

  console.log("\nCriterio 3 — cada quien edita SU perfil, y la contraseña solo si la usa:\n");

  await guardarPerfil(miembro, { nombre: "Luis Renombrado", idioma: "en" });
  const suyo = await perfilDeLaSesion(miembro);
  check("el nombre y el idioma cambian", suyo?.nombre === "Luis Renombrado" && suyo?.idioma === "en", JSON.stringify(suyo));
  const delOtro = await perfilDeLaSesion(admin);
  check("y el de otra persona NO se toca", delOtro?.nombre === `Persona ${A.admin}`, JSON.stringify(delOtro));

  const moduloPerfil = fs.readFileSync(path.join(RAIZ, "lib/portal/perfil.ts"), "utf8");
  check(
    "el módulo de perfil no acepta ningún identificador de usuario: opera sobre la sesión",
    !/userId\s*:/.test(moduloPerfil),
  );

  let idiomaMalo = false;
  try {
    await guardarPerfil(miembro, { nombre: "Luis", idioma: "fr" });
  } catch {
    idiomaMalo = true;
  }
  check("un idioma que no existe se rechaza", idiomaMalo);

  check("quien entra con contraseña puede cambiarla", await usaMetodoDeContrasena(A.admin));
  check(
    "quien entra con la cuenta de su organización, no: no hay ninguna que cambiar",
    !(await usaMetodoDeContrasena(A.miembro)),
  );
  const pantallaPerfil = fs.readFileSync(path.join(RAIZ, "app/(portal)/portal/perfil/page.tsx"), "utf8");
  check(
    "y la pantalla decide con eso, no con el rol",
    pantallaPerfil.includes("usaMetodoDeContrasena") && pantallaPerfil.includes("portal.profile.passwordExternal"),
  );

  console.log("\nCriterio 4 — sin URL de calendario, «próximamente» y la pantalla entera:\n");

  check("sin clave, próximamente", pasoDeSesionCero({}).estado === "proximamente");
  check("con la clave vacía —el estado declarado de «todavía no»—, próximamente", pasoDeSesionCero({ [CLAVE_DE_URL]: "" }).estado === "proximamente");
  check("con espacios, también", pasoDeSesionCero({ [CLAVE_DE_URL]: "   " }).estado === "proximamente");
  check("con `http:`, próximamente: una agenda por texto claro no se ofrece", pasoDeSesionCero({ [CLAVE_DE_URL]: "http://agenda.example/x" }).estado === "proximamente");
  check(
    "con `javascript:`, próximamente: eso sería un enlace ejecutable en la pantalla de un cliente",
    pasoDeSesionCero({ [CLAVE_DE_URL]: "javascript:alert(1)" }).estado === "proximamente",
  );
  check("con una URL rota, próximamente y no un enlace muerto", pasoDeSesionCero({ [CLAVE_DE_URL]: "no-es-una-url" }).estado === "proximamente");
  const bueno = pasoDeSesionCero({ [CLAVE_DE_URL]: "https://agenda.example/slg" });
  check("con `https:`, el paso se ofrece", bueno.estado === "disponible");

  for (const idioma of ["es", "en"]) {
    const cadenas = JSON.parse(fs.readFileSync(path.join(RAIZ, `content/ui/${idioma}.json`), "utf8"));
    check(`la clave existe declarada en ${idioma}.json, vacía y a la espera (F.2-6)`, CLAVE_DE_URL in cadenas);
    check(`y el paso trae su texto de «próximamente» en ${idioma}`, Boolean(cadenas["portal.sesion0.soon"]));
  }

  console.log("\nCriterio 5 — la Sesión Cero no asoma en ninguna superficie pública:\n");

  const PATRON = /sesi[oó]n\s*cero|sesion0|zero\s+session/i;
  const fuera: string[] = [];
  const recorrer = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, e.name);
      const rel = path.relative(RAIZ, abs).split(path.sep).join("/");
      if (e.isDirectory()) {
        if (e.name === "node_modules" || rel.startsWith("scripts/ci/negative")) continue;
        recorrer(abs);
        continue;
      }
      if (!/\.(tsx?|md|json)$/.test(e.name)) continue;
      if (rel.includes("app/(portal)/") || rel.includes("lib/portal/")) continue;
      // `content/ui` guarda los textos del paso: los lee el portal y nadie más.
      if (rel.startsWith("content/ui/")) continue;
      if (PATRON.test(fs.readFileSync(abs, "utf8"))) fuera.push(rel);
    }
  };
  for (const carpeta of ["app", "components", "lib", "content"]) recorrer(path.join(RAIZ, carpeta));
  check("ni un archivo público la nombra", fuera.length === 0, fuera.join(", "));
  check(
    "y el freno que lo vigila existe y la nombra",
    fs.readFileSync(path.join(RAIZ, "scripts/ci/check-alcance.ts"), "utf8").includes("asomando fuera del portal"),
  );

  console.log("\nCriterio 7 — estados resueltos:\n");

  const solo = await miembrosDeLaEmpresa(ajeno);
  check("empresa con un solo miembro: la lista trae uno", solo.length === 1, JSON.stringify(solo));
  const pendientes = await invitacionesDeLaEmpresa(admin);
  check("invitación pendiente: aparece con su caducidad", pendientes.length === 1 && pendientes[0]!.correo === "nueva@du21.test", JSON.stringify(pendientes));
  check("y no se ve desde la otra empresa", (await invitacionesDeLaEmpresa(ajeno)).length === 0);
  check(
    "sin permiso para invitar, la pantalla lo dice en vez de dejar un hueco",
    pantallaMiembros.includes("portal.members.readOnly"),
  );

  await limpiar();
  await dueno.end({ timeout: 5 });

  if (fallos > 0) {
    console.error(`\n✗ miembros: ${fallos} de ${comprobaciones} comprobaciones fallaron.\n`);
    process.exit(1);
  }
  console.log(`\n✓ miembros: ${comprobaciones} comprobaciones contra PostgreSQL real, sin fallos.`);
  process.exit(0);
}

await main();
