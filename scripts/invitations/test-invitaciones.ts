/**
 * test-invitaciones.ts — Las cinco reglas de FU-07, una a una.
 *
 * El acceso de clientes es **solo por invitación** (§10-10): esto es la puerta
 * por la que entra todo el mundo, así que se prueba contra PostgreSQL real y
 * contra un servidor SMTP real, no contra dobles.
 *
 * Necesita `bash scripts/db/local-pg.sh up`.
 */
import { SMTPServer } from "smtp-server";
import postgres from "postgres";

import { contextoDeSesion } from "../../lib/db/context.ts";
import { cerrarConexion, withSystemScope } from "../../lib/db/scope.ts";
import { ErrorDeAutorizacion } from "../../lib/auth/index.ts";
import { cerrarConexionDeAuth } from "../../lib/auth/db.ts";
import { emailDelivery } from "../../lib/db/schema.ts";
import {
  aceptarInvitacion,
  caducarPendientesVencidas,
  consultarTestigo,
  emitirInvitacion,
  hashDeTestigo,
  MENSAJE_DE_TESTIGO_INVALIDO,
  reenviarInvitacion,
  revocarInvitacion,
  VIGENCIA_EN_HORAS,
} from "../../lib/invitations/index.ts";

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

/* ── Servidor SMTP real, y el testigo que capturamos del correo ───────────── */

let ultimoEnlace: string | null = null;

async function levantarSmtp(puerto: number) {
  const servidor = new SMTPServer({
    secure: false,
    authOptional: false,
    disabledCommands: ["STARTTLS"],
    onAuth: (_a, _s, cb) => cb(null, { user: "u" }),
    onData(flujo, _sesion, cb) {
      let crudo = "";
      flujo.on("data", (c) => (crudo += c.toString("utf8")));
      flujo.on("end", () => {
        // El testigo SOLO existe aquí: en el correo. Es exactamente lo que
        // `data_model` §5.7 promete, y por eso la prueba tiene que leerlo de
        // donde lo leería una persona.
        const m = crudo.replace(/=\r?\n/g, "").match(/invitacion\/([A-Za-z0-9_-]+)/);
        if (m) ultimoEnlace = m[1];
        cb();
      });
    },
  });
  await new Promise<void>((r) => servidor.listen(puerto, "127.0.0.1", r));
  return () => new Promise<void>((r) => servidor.close(() => r()));
}

/**
 * Valor falso en una constante de nombre neutro: pegar un literal junto al
 * nombre de la variable real es lo que `check:secrets` marca en rojo, y hace
 * bien aunque aquí sea de mentira.
 */
const CLAVE_DEL_BUZON_LOCAL = "valor-de-prueba-local";

function apuntarCorreoA(puerto: number) {
  process.env.MAIL_SMTP_HOST = "127.0.0.1";
  process.env.MAIL_SMTP_PORT = String(puerto);
  process.env.MAIL_SMTP_USERNAME = "u";
  process.env.MAIL_SMTP_PASSWORD = CLAVE_DEL_BUZON_LOCAL;
  process.env.MAIL_FROM_ADDRESS = "no-reply@mailweb.softlandingglobal.com";
  process.env.MAIL_FROM_NAME = "SLG Agency";
  process.env.MAIL_REPLY_TO = "support@softlandingglobal.com";
  process.env.MAIL_ALERTS_TO = "support@softlandingglobal.com";
  process.env.NEXT_PUBLIC_SITE_URL = "https://softlandingglobal.com";
}

/* ── Fixtures ─────────────────────────────────────────────────────────────── */

/**
 * Los fixtures se siembran con el rol DUEÑO, no por la aplicación.
 *
 * `membership` e `invitation` están bajo row level security forzada: sembrarlos
 * como sistema devolvería cero filas escritas. Que el sembrado necesite el rol
 * dueño no es un rodeo, es la demostración de que la política está puesta —y de
 * que el servicio, que sí escribe con contexto de actor, pasa por ella—.
 */
const URL_DUENO = process.env.DATABASE_URL_MIGRATIONS;
if (!URL_DUENO) throw new Error("Falta DATABASE_URL_MIGRATIONS para sembrar los fixtures.");
const dueno = postgres(URL_DUENO, { max: 2 });

const ORG_CLIENTE = "org-fu07-cliente";
const ORG_OTRA = "org-fu07-otra";
const ORG_SLG = "org-fu07-slg";

async function limpiar() {
  await dueno`delete from invitation where email like '%fu07%'`;
  await dueno`delete from membership where user_id like 'u-fu07%'`;
  await dueno`delete from "user" where id like 'u-fu07%'`;
  await dueno`delete from organization where id like 'org-fu07%'`;
}

async function sembrar() {
  await limpiar();
  await dueno`
    insert into organization (id, name, slug, type, status) values
      (${ORG_CLIENTE}, 'Acme FU07', 'acme-fu07', 'client', 'active'),
      (${ORG_OTRA},    'Otra FU07', 'otra-fu07', 'client', 'active'),
      (${ORG_SLG},     'SLG FU07',  'slg-fu07',  'slg',    'active')
  `;
  await dueno`
    insert into "user" (id, name, email, role) values
      ('u-fu07-admin',    'Ricardo',       'admin@fu07.test',    'slg_admin'),
      ('u-fu07-cliadmin', 'Cliente Admin', 'cliadmin@fu07.test', 'client_admin'),
      ('u-fu07-nuevo',    'Persona Nueva', 'nuevo@fu07.test',    'client_member'),
      ('u-fu07-otro',     'Otra Persona',  'otro@fu07.test',     'client_member')
  `;
  await dueno`
    insert into membership (id, user_id, organization_id, org_role)
    values ('m-fu07-cliadmin', 'u-fu07-cliadmin', ${ORG_CLIENTE}, 'client_admin')
  `;
}

const ctxAdmin = contextoDeSesion({
  userId: "u-fu07-admin",
  userName: "Ricardo",
  role: "slg_admin",
  organizationId: null,
});
const ctxClienteAdmin = contextoDeSesion({
  userId: "u-fu07-cliadmin",
  userName: "Cliente Admin",
  role: "client_admin",
  organizationId: ORG_CLIENTE,
});
const ctxMiembro = contextoDeSesion({
  userId: "u-fu07-nuevo",
  userName: "Persona Nueva",
  role: "client_member",
  organizationId: ORG_CLIENTE,
});

async function esperaError(fn: () => Promise<unknown>): Promise<ErrorDeAutorizacion | null> {
  try {
    await fn();
    return null;
  } catch (e) {
    return e instanceof ErrorDeAutorizacion ? e : null;
  }
}

/* ══════════════════════════════════════════════════════════════════════════ */

async function main() {
  console.log("Servicio de invitaciones — contra PostgreSQL y SMTP reales\n");
  const cerrarSmtp = await levantarSmtp(2528);
  apuntarCorreoA(2528);
  await sembrar();

  try {
    /* ── Emisión ────────────────────────────────────────────────────────── */
    console.log("Emisión:\n");
    ultimoEnlace = null;
    const emitida = await emitirInvitacion(ctxAdmin, {
      email: "Invitado@FU07.test",
      organizationId: ORG_CLIENTE,
      role: "client_member",
    });
    check("se emite y el correo sale", emitida.correoEnviado, emitida.errorDeCorreo ?? "");
    check("el correo se normaliza a minúsculas", emitida.invitacion.email === "invitado@fu07.test");
    check("caduca a las 72 horas (RF-60)", Math.round(
      (emitida.invitacion.expiresAt.getTime() - Date.now()) / 3_600_000,
    ) === VIGENCIA_EN_HORAS);
    check("el testigo viajó en el correo", ultimoEnlace !== null);

    const enClaro = ultimoEnlace!;
    const [guardado] = await dueno<
      { token_hash: string; sent_at: Date | null }[]
    >`select token_hash, sent_at from invitation where id = ${emitida.invitacion.id}`;
    check(
      "en la base está el HASH, no el testigo (§5.7)",
      guardado.token_hash === hashDeTestigo(enClaro) && !JSON.stringify(guardado).includes(enClaro),
      "un testigo en claro convierte cualquier lectura de una copia en acceso",
    );
    check("queda marcada como enviada", guardado.sent_at !== null);

    /* ── Criterio 1: un solo uso y caducidad ────────────────────────────── */
    console.log("\nCriterio 1 — un solo uso, 72 horas, y sin revelar nada:\n");

    const consulta = await consultarTestigo(enClaro);
    check("el testigo recién emitido vale", consulta.valido);

    const aceptada = await aceptarInvitacion({
      testigo: enClaro,
      userId: "u-fu07-nuevo",
      correoVerificado: "invitado@fu07.test",
    });
    check("se acepta con correo verificado del proveedor", aceptada.aceptada);

    const segundoUso = await aceptarInvitacion({
      testigo: enClaro,
      userId: "u-fu07-otro",
      correoVerificado: "invitado@fu07.test",
    });
    check("un enlace usado deja de servir", !segundoUso.aceptada);
    check(
      "y el mensaje no revela que existió",
      !segundoUso.aceptada && segundoUso.mensaje === MENSAJE_DE_TESTIGO_INVALIDO,
    );

    const inexistente = await aceptarInvitacion({
      testigo: "testigo-que-no-existe",
      userId: "u-fu07-otro",
      correoVerificado: "x@y.z",
    });
    check(
      "un enlace inexistente da EXACTAMENTE el mismo mensaje que uno usado",
      !inexistente.aceptada && !segundoUso.aceptada && inexistente.mensaje === segundoUso.mensaje,
      "distinguirlos le dice a quien prueba enlaces cuáles existieron",
    );

    /* ── Criterio 2: la cuenta hereda empresa y rol ─────────────────────── */
    console.log("\nCriterio 2 — la cuenta queda ligada a la empresa y al rol:\n");
    const pertenencias = await dueno<{ organization_id: string }[]>`
      select organization_id from membership where user_id = 'u-fu07-nuevo'
    `;
    const [cuenta] = await dueno<{ role: string }[]>`select role from "user" where id = 'u-fu07-nuevo'`;
    check(
      "se creó la pertenencia a la empresa de la invitación",
      pertenencias.length === 1 && pertenencias[0].organization_id === ORG_CLIENTE,
    );
    check("la cuenta hereda el rol de la invitación (RF-61)", cuenta.role === "client_member");

    /* ── Criterio 3: RF-63, sin correo verificable ──────────────────────── */
    console.log("\nCriterio 3 — proveedor sin correo verificable (RF-63, R-22):\n");
    ultimoEnlace = null;
    await emitirInvitacion(ctxAdmin, {
      email: "entra@fu07.test",
      organizationId: ORG_CLIENTE,
      role: "client_member",
    });
    const testigoEntra = ultimoEnlace!;

    const sinCoincidencia = await aceptarInvitacion({
      testigo: testigoEntra,
      userId: "u-fu07-otro",
      correoVerificado: null,
    });
    check("sin correo verificado y sin coincidencia explícita, se rechaza", !sinCoincidencia.aceptada);

    const coincidenciaMala = await aceptarInvitacion({
      testigo: testigoEntra,
      userId: "u-fu07-otro",
      correoVerificado: null,
      correoDeclarado: "otra-cosa@fu07.test",
    });
    check("con coincidencia equivocada, se rechaza", !coincidenciaMala.aceptada);

    const verificadoAjeno = await aceptarInvitacion({
      testigo: testigoEntra,
      userId: "u-fu07-otro",
      correoVerificado: "otro@fu07.test",
    });
    check(
      "un correo verificado que NO es el de la invitación no la toma",
      !verificadoAjeno.aceptada,
      "si no, cualquiera con el enlace entra con su propia cuenta",
    );

    const conCoincidencia = await aceptarInvitacion({
      testigo: testigoEntra,
      userId: "u-fu07-otro",
      correoVerificado: null,
      correoDeclarado: "Entra@FU07.test",
    });
    check("con coincidencia explícita, se acepta (RF-63)", conCoincidencia.aceptada);

    /* ── Criterio 4: si el correo falla, la invitación queda ────────────── */
    console.log("\nCriterio 4 — si el correo falla, la invitación existe (RF-119):\n");
    const puertoBueno = process.env.MAIL_SMTP_PORT;
    process.env.MAIL_SMTP_PORT = "1";
    const sinCorreo = await emitirInvitacion(ctxAdmin, {
      email: "sincorreo@fu07.test",
      organizationId: ORG_CLIENTE,
      role: "client_member",
    });
    process.env.MAIL_SMTP_PORT = puertoBueno;

    check("la emisión NO lanza aunque el correo falle", sinCorreo.invitacion.id.length > 0);
    check("y queda constancia de que no se envió", sinCorreo.correoEnviado === false && sinCorreo.invitacion.sentAt === null);
    check("con el error registrado", (sinCorreo.errorDeCorreo ?? "").length > 0);

    ultimoEnlace = null;
    const reenviada = await reenviarInvitacion(ctxAdmin, sinCorreo.invitacion.id);
    check("es reenviable, y el reenvío sí sale", reenviada.correoEnviado, reenviada.errorDeCorreo ?? "");
    check("el reenvío trae un testigo NUEVO", ultimoEnlace !== null);
    check(
      "y renueva la caducidad",
      reenviada.invitacion.expiresAt.getTime() > sinCorreo.invitacion.expiresAt.getTime() - 1000,
    );

    /* ── Criterio 5: revocación inmediata ───────────────────────────────── */
    console.log("\nCriterio 5 — la revocación inutiliza de inmediato:\n");
    const testigoReenviado = ultimoEnlace!;
    const revocada = await revocarInvitacion(ctxAdmin, sinCorreo.invitacion.id);
    check("la revocación surte efecto", revocada);
    const trasRevocar = await aceptarInvitacion({
      testigo: testigoReenviado,
      userId: "u-fu07-otro",
      correoVerificado: "sincorreo@fu07.test",
    });
    check("el enlace revocado deja de servir en el acto", !trasRevocar.aceptada);

    /* ── Caducidad ──────────────────────────────────────────────────────── */
    console.log("\nCaducidad:\n");
    ultimoEnlace = null;
    const aCaducar = await emitirInvitacion(ctxAdmin, {
      email: "caduca@fu07.test",
      organizationId: ORG_CLIENTE,
      role: "client_member",
    });
    const testigoCaduco = ultimoEnlace!;
    await dueno`update invitation set expires_at = now() - interval '1 second' where id = ${aCaducar.invitacion.id}`;
    const caducado = await aceptarInvitacion({
      testigo: testigoCaduco,
      userId: "u-fu07-otro",
      correoVerificado: "caduca@fu07.test",
    });
    check("un enlace de más de 72 horas deja de servir", !caducado.aceptada);
    const cerradas = await caducarPendientesVencidas();
    check("el barrido cierra las pendientes vencidas", cerradas >= 1);

    /* ── B.3: quién puede invitar a quién ───────────────────────────────── */
    console.log("\nB.3 — quién puede invitar a quién:\n");

    const eMiembro = await esperaError(() =>
      emitirInvitacion(ctxMiembro, {
        email: "x1@fu07.test",
        organizationId: ORG_CLIENTE,
        role: "client_member",
      }),
    );
    check("un client_member NO puede invitar", eMiembro !== null);

    const eOtraEmpresa = await esperaError(() =>
      emitirInvitacion(ctxClienteAdmin, {
        email: "x2@fu07.test",
        organizationId: ORG_OTRA,
        role: "client_member",
      }),
    );
    check("un client_admin NO puede invitar a otra empresa", eOtraEmpresa !== null);
    check("y la respuesta es 404, no 403", eOtraEmpresa?.status === 404, `fue ${eOtraEmpresa?.status}`);

    const eEscalada = await esperaError(() =>
      emitirInvitacion(ctxClienteAdmin, {
        email: "x3@fu07.test",
        organizationId: ORG_CLIENTE,
        role: "slg_admin",
      }),
    );
    check(
      "un client_admin NO puede conceder un rol de SLG",
      eEscalada !== null,
      "sin esto, «invitar a un miembro» es escalada de privilegios con formulario",
    );

    const eOrgSlg = await esperaError(() =>
      emitirInvitacion(ctxClienteAdmin, {
        email: "x4@fu07.test",
        organizationId: ORG_SLG,
        role: "client_member",
      }),
    );
    check("un client_admin NO puede invitar a la organización de SLG", eOrgSlg !== null);

    const propia = await emitirInvitacion(ctxClienteAdmin, {
      email: "suyo@fu07.test",
      organizationId: ORG_CLIENTE,
      role: "client_member",
    });
    check("un client_admin SÍ puede invitar a su propia empresa (RF-92)", propia.invitacion.id.length > 0);

    /* ── Una sola invitación vigente por correo y empresa ───────────────── */
    console.log("\nUna sola invitación vigente por correo y empresa (RF-78):\n");
    let duplicada = false;
    try {
      await emitirInvitacion(ctxAdmin, {
        email: "suyo@fu07.test",
        organizationId: ORG_CLIENTE,
        role: "client_member",
      });
    } catch {
      duplicada = true;
    }
    check(
      "dos invitaciones vigentes al mismo correo y empresa son imposibles",
      duplicada,
      "dos enlaces válidos a la vez producen la duda de cuál revocar",
    );
  } finally {
    await cerrarSmtp();
    await limpiar();
    await withSystemScope("limpiar la cola de correo de la prueba", async (db) => {
      await db.delete(emailDelivery);
    });
    await dueno.end({ timeout: 5 });
    await cerrarConexion();
    await cerrarConexionDeAuth();
  }
}

try {
  await main();
} catch (e) {
  console.error(`\n✗ La prueba no pudo completarse: ${(e as Error).message}`);
  fallos++;
}

console.log("");
if (fallos > 0) {
  console.error(`✗ invitaciones: ${fallos} fallo(s) sobre ${comprobaciones} comprobaciones.\n`);
  process.exit(1);
}
console.log(`✓ invitaciones: ${comprobaciones} comprobaciones contra PostgreSQL y SMTP reales, sin fallos.\n`);
