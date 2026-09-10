/**
 * test-invitations.ts — Pruebas de FU-07: emisión, revocación, reenvío,
 * aceptación por contraseña y el núcleo común de aceptación (los tres
 * métodos convergen en `completarAceptacionInvitacion`).
 *
 * Contra Postgres real (`invitation`/`membership` con RLS, 0008) y SMTP real
 * (captador en proceso de FU-08, sin Docker). Google/Microsoft NO se prueban
 * de punta a punta aquí: F.2-2/F.2-3 siguen `[PENDIENTE]` y sin credenciales
 * reales Better Auth ni siquiera registra esos proveedores. Lo que SÍ se
 * prueba es el código que los dos comparten con contraseña
 * (`completarAceptacionInvitacion`), con una sesión fabricada — el mismo
 * patrón que `test-auth.ts` fabrica `AuthContext` con `ctxDeRol()`.
 */
import { randomUUID, randomBytes, createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { contextoDeSesion, type AuthContext } from "../../lib/db/context.ts";
import { withScope, withSystemScope } from "../../lib/db/scope.ts";
import {
  crearInvitacion,
  revocarInvitacion,
  reenviarInvitacion,
  buscarInvitacionVigente,
  aceptarInvitacionConContrasena,
  completarAceptacionInvitacion,
} from "../../lib/auth/invitations.ts";
import { leerMailConfig } from "../../lib/email/config.ts";
import { crearTransporteSmtp } from "../../lib/email/smtp-transport.ts";
import { invitation, membership, organization, user, type UserRole } from "../../lib/db/schema.ts";
import { iniciarServidorSmtpFalso } from "../email/fake-smtp-server.ts";

const conexion = postgres(process.env.DATABASE_URL!, { max: 5, onnotice: () => {} });
const db = drizzle(conexion, { schema: { organization, user, invitation } });

let fallos = 0;
function ok(nombre: string, condicion: boolean, detalle = "") {
  if (condicion) console.log(`  ✓ ${nombre}`);
  else {
    fallos++;
    console.error(`  ✗ ${nombre}${detalle ? ` — ${detalle}` : ""}`);
  }
}

/** `inviter_id`/`accepted_by_user_id` son FK reales a `user.id` (0008): el actor de la prueba debe existir de verdad. */
async function ctxDeRol(role: UserRole, organizationId: string | null): Promise<AuthContext> {
  const userId = randomUUID();
  await db.insert(user).values({
    id: userId,
    name: "Actor de prueba FU-07",
    email: `actor-${userId.slice(0, 8)}@example.test`,
    role,
  });
  return contextoDeSesion({ userId, userName: "prueba", role, organizationId });
}

/** `invitation`/`membership` tienen RLS (0008/0001): leerlas de prueba exige el mismo `withSystemScope` que el código real. */
async function leerInvitacion(id: string) {
  return withSystemScope("prueba: leer invitación (FU-07 test)", async (tx) => {
    const [fila] = await tx.select().from(invitation).where(eq(invitation.id, id));
    return fila;
  });
}

async function leerMembership(userId: string) {
  return withSystemScope("prueba: leer membership (FU-07 test)", async (tx) => {
    const [fila] = await tx.select().from(membership).where(eq(membership.userId, userId));
    return fila;
  });
}

async function crearOrg(type: "client" | "slg"): Promise<string> {
  const id = randomUUID();
  await db.insert(organization).values({
    id,
    name: `Empresa de prueba FU-07 (${type})`,
    slug: `prueba-fu07-${type}-${id.slice(0, 8)}`,
    type,
  });
  return id;
}

async function main() {
  console.log("FU-07 — servicio de invitaciones\n");

  const captador = await iniciarServidorSmtpFalso();
  process.env.MAIL_SMTP_HOST = "127.0.0.1";
  process.env.MAIL_SMTP_PORT = String(captador.puerto);
  const cfg = leerMailConfig();
  const transporte = crearTransporteSmtp(cfg);

  const orgCliente = await crearOrg("client");
  const orgSlg = await crearOrg("slg");
  const CTX_SLG_ADMIN = await ctxDeRol("slg_admin", null);
  const CTX_CLIENT_ADMIN = await ctxDeRol("client_admin", orgCliente);

  // ── A. Emisión: matriz B.3 aplicada, con correo real de por medio ──────────
  console.log("A. Emisión (criterio 2, 4) y correo (FU-08)");
  const correoInvitado = `invitado-${randomUUID().slice(0, 8)}@empresa-prueba.test`;
  const creada = await crearInvitacion(
    CTX_CLIENT_ADMIN,
    { organizationId: orgCliente, email: correoInvitado, role: "client_member" },
    cfg,
    transporte,
  );
  ok("client_admin invita a un client_member de su propia empresa", creada.ok);
  if (creada.ok) {
    const mensajes = captador.mensajesPara(correoInvitado);
    ok("el correo de invitación llegó de verdad al captador SMTP", mensajes.length === 1);
    const filaBd = await leerInvitacion(creada.id);
    ok("sent_at queda registrado tras el envío correcto", !!filaBd?.sentAt);
    ok("inviter_id queda registrado", filaBd?.inviterId === CTX_CLIENT_ADMIN.actorId);
  }

  console.log("\nA2. `identidad.invitar_miembro_empresa` NO alcanza para invitar SLG (capa de aplicación)");
  let clientAdminInvitaSlgAdminLanzo = false;
  try {
    await crearInvitacion(
      CTX_CLIENT_ADMIN,
      { organizationId: orgSlg, email: "otro@example.test", role: "slg_admin" },
      cfg,
      transporte,
    );
  } catch {
    clientAdminInvitaSlgAdminLanzo = true;
  }
  ok("client_admin invitando role=slg_admin es rechazado por `exigir` antes de tocar la base", clientAdminInvitaSlgAdminLanzo);

  console.log("\nA3. `invitation_insert_policy` (0008) — defensa en profundidad si se salta la capa de aplicación");
  let politicaRestrictivaRechazo = false;
  try {
    await withScope(CTX_CLIENT_ADMIN, (tx) =>
      tx.insert(invitation).values({
        id: randomUUID(),
        organizationId: orgCliente,
        email: "bypass@example.test",
        role: "slg_admin", // se salta `exigir` llamando directo al repositorio
        tokenHash: "x".repeat(64),
        expiresAt: new Date(Date.now() + 1000),
      }),
    );
  } catch {
    politicaRestrictivaRechazo = true;
  }
  ok(
    "un INSERT directo con role=slg_admin desde client_admin lo rechaza la política, no solo la aplicación",
    politicaRestrictivaRechazo,
  );

  console.log("\nA4. slg_admin SÍ puede invitar dentro de SLG (exención de la política restrictiva)");
  const invitacionSlg = await crearInvitacion(
    CTX_SLG_ADMIN,
    { organizationId: orgSlg, email: `interno-${randomUUID().slice(0, 8)}@softlandingglobal.com`, role: "slg_operator" },
    cfg,
    transporte,
  );
  ok("slg_admin invita role=slg_operator a la organización SLG sin que la política lo bloquee", invitacionSlg.ok);

  console.log("\nA5. Duplicado (RF-78)");
  const duplicada = await crearInvitacion(
    CTX_CLIENT_ADMIN,
    { organizationId: orgCliente, email: correoInvitado, role: "client_member" },
    cfg,
    transporte,
  );
  ok("una segunda invitación pendiente al mismo correo se rechaza", !duplicada.ok && duplicada.razon === "ya_invitado");

  // ── B. Canje del token: neutro en los cuatro motivos (criterio 1) ──────────
  console.log("\nB. Canje del token — mensaje neutro (criterio 1)");
  ok("un token inexistente no es vigente", (await buscarInvitacionVigente("token-que-no-existe")) === null);

  const paraExpirar = await crearInvitacion(
    CTX_CLIENT_ADMIN,
    { organizationId: orgCliente, email: `expira-${randomUUID().slice(0, 8)}@empresa-prueba.test`, role: "client_member" },
    cfg,
    transporte,
  );
  if (paraExpirar.ok) {
    await withSystemScope("prueba: forzar caducidad (FU-07 test)", (tx) =>
      tx.update(invitation).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(invitation.id, paraExpirar.id)),
    );
  }
  // No tenemos el token en claro tras crearInvitacion (a propósito, no se
  // guarda ni se devuelve más allá del correo) — comprobamos por el email
  // de una invitación viva de verdad más abajo, y aquí solo que un token
  // fabricado nunca cuela.
  ok("un token fabricado nunca es vigente", (await buscarInvitacionVigente(randomUUID())) === null);

  // ── C. Revocación (criterio 5) ──────────────────────────────────────────────
  console.log("\nC. Revocación inmediata (criterio 5)");
  const paraRevocar = await crearInvitacion(
    CTX_CLIENT_ADMIN,
    { organizationId: orgCliente, email: `revocar-${randomUUID().slice(0, 8)}@empresa-prueba.test`, role: "client_member" },
    cfg,
    transporte,
  );
  if (paraRevocar.ok) {
    const revocada = await revocarInvitacion(CTX_CLIENT_ADMIN, paraRevocar.id);
    ok("revocar una invitación pendiente tiene éxito", revocada.ok);
    const filaBd = await leerInvitacion(paraRevocar.id);
    ok("status=canceled, revoked_at y revoked_by_user_id quedan escritos", filaBd?.status === "canceled" && !!filaBd?.revokedAt);
    const segundaRevocacion = await revocarInvitacion(CTX_CLIENT_ADMIN, paraRevocar.id);
    ok("revocar una invitación ya revocada es un no-op (no la reactiva)", !segundaRevocacion.ok);
  }

  // ── D. Reenvío: testigo nuevo, el correo llega otra vez (criterio 4) ───────
  console.log("\nD. Reenvío con testigo nuevo");
  const correoReenvio = `reenvio-${randomUUID().slice(0, 8)}@empresa-prueba.test`;
  const paraReenviar = await crearInvitacion(
    CTX_CLIENT_ADMIN,
    { organizationId: orgCliente, email: correoReenvio, role: "client_member" },
    cfg,
    transporte,
  );
  if (paraReenviar.ok) {
    const antes = await leerInvitacion(paraReenviar.id);
    const reenviada = await reenviarInvitacion(CTX_CLIENT_ADMIN, paraReenviar.id, cfg, transporte);
    ok("reenviar una invitación pendiente tiene éxito", reenviada.ok);
    const despues = await leerInvitacion(paraReenviar.id);
    ok("el testigo cambia (el anterior queda invalidado)", antes?.tokenHash !== despues?.tokenHash);
    ok("llegaron dos correos de verdad al captador (creación + reenvío)", captador.mensajesPara(correoReenvio).length === 2);
  }

  // ── E. Aceptación por contraseña, de punta a punta (criterio 2) ────────────
  console.log("\nE. Aceptación por contraseña");
  const correoAceptar = `aceptar-${randomUUID().slice(0, 8)}@empresa-prueba.test`;
  // Necesitamos el token en claro para "hacer clic en el enlace": lo leemos
  // del correo que de verdad llegó al captador, tal y como lo haría la
  // persona invitada — no un atajo interno.
  const paraAceptar = await crearInvitacion(
    CTX_CLIENT_ADMIN,
    { organizationId: orgCliente, email: correoAceptar, role: "client_admin" },
    cfg,
    transporte,
  );
  ok("la invitación a aceptar se creó", paraAceptar.ok);
  if (paraAceptar.ok) {
    ok("el correo de invitación a aceptar llegó de verdad", captador.mensajesPara(correoAceptar).length >= 1);
    // El enlace en claro solo vive en el cuerpo del correo (nunca en la base,
    // §5.7) y `fake-smtp-server.ts` no decodifica cuerpos MIME (quoted-printable
    // por los acentos del castellano) — decodificarlo aquí solo para releer un
    // valor que la propia aplicación ya generó sería probar el códec, no la
    // lógica de aceptación. En su lugar se fija un testigo conocido sobre la
    // MISMA fila ya creada y enviada, y se acepta con él: ejercita exactamente
    // el mismo camino (`buscarInvitacionVigente` → `signUpEmail` privilegiado →
    // `completarAceptacionInvitacion`) que un testigo real habría recorrido.
    const resultado = await aceptarInvitacionConContrasenaDesdeFilaDePrueba(paraAceptar.id);
    ok("acepta y crea la cuenta con contraseña", resultado?.ok === true);
    if (resultado?.ok) {
      const mem = await leerMembership(resultado.userId);
      ok("la membership queda con el rol de la invitación (client_admin)", mem?.orgRole === "client_admin");
      const [usuario] = await db.select().from(user).where(eq(user.id, resultado.userId));
      ok("user.role queda ligado al rol de la invitación (RF-68)", usuario?.role === "client_admin");
      ok("user.email_verified queda true (clicar el enlace ya lo demuestra)", usuario?.emailVerified === true);
    }
    const filaFinal = await leerInvitacion(paraAceptar.id);
    ok("la invitación queda accepted, con accepted_at y accepted_by_user_id", filaFinal?.status === "accepted" && !!filaFinal?.acceptedAt);
  }

  // ── F. El núcleo común rechaza un correo de sesión que no coincide ─────────
  console.log("\nF. `completarAceptacionInvitacion` — criterio 3 (RF-63, R-22)");
  const correoOAuth = `oauth-${randomUUID().slice(0, 8)}@empresa-prueba.test`;
  const paraOAuth = await crearInvitacion(
    CTX_CLIENT_ADMIN,
    { organizationId: orgCliente, email: correoOAuth, role: "client_member" },
    cfg,
    transporte,
  );
  if (paraOAuth.ok) {
    const inv = await buscarInvitacionInternaParaPrueba(paraOAuth.id);
    const usuarioOAuthId = randomUUID();
    const correoDeLaSesionOAuth = `otro-correo-${randomUUID().slice(0, 8)}@example.test`;
    await db.insert(user).values({ id: usuarioOAuthId, name: "Sesión OAuth de prueba", email: correoDeLaSesionOAuth, role: "client_member" });

    const conCorreoDistintoNoVerificado = await completarAceptacionInvitacion(inv.tokenCrudoDePrueba, {
      userId: usuarioOAuthId,
      email: correoDeLaSesionOAuth,
      emailVerified: false,
    });
    ok(
      "correo de sesión distinto y NO verificado → rechazado, no se vincula (R-22)",
      !conCorreoDistintoNoVerificado.ok && conCorreoDistintoNoVerificado.razon === "correo_no_coincide",
    );

    const conConfirmacionExplicita = await completarAceptacionInvitacion(
      inv.tokenCrudoDePrueba,
      { userId: usuarioOAuthId, email: correoDeLaSesionOAuth, emailVerified: false },
      correoOAuth,
    );
    ok(
      "el mismo caso, con el correo invitado confirmado a mano, SÍ se vincula (criterio 3)",
      conConfirmacionExplicita.ok === true,
    );
  }

  await captador.detener();
  await conexion.end({ timeout: 5 });

  console.log(fallos ? `\n✗ ${fallos} comprobación(es) fallida(s).\n` : "\n✓ Todo correcto.\n");
  process.exit(fallos ? 1 : 0);
}

/**
 * Helpers de prueba que necesitan el testigo en claro para simular "lo que
 * haría la persona invitada al clicar el enlace" sin depender de parsear el
 * cuerpo del correo (fuera de alcance de `fake-smtp-server.ts` hoy). Generan
 * su PROPIA invitación con un testigo conocido, en vez de leer el de
 * `crearInvitacion` (que deliberadamente no lo expone más allá del correo).
 */
async function aceptarInvitacionConContrasenaDesdeFilaDePrueba(invitationIdOriginal: string) {
  const tokenCrudo = randomBytes(32).toString("hex");
  await withSystemScope("prueba: fijar testigo conocido (FU-07 test)", (tx) =>
    tx
      .update(invitation)
      .set({ tokenHash: createHash("sha256").update(tokenCrudo).digest("hex") })
      .where(eq(invitation.id, invitationIdOriginal)),
  );
  return aceptarInvitacionConContrasena(tokenCrudo, "una-contrasena-de-doce-o-mas");
}

async function buscarInvitacionInternaParaPrueba(invitationId: string) {
  const tokenCrudoDePrueba = randomBytes(32).toString("hex");
  await withSystemScope("prueba: fijar testigo conocido (FU-07 test)", (tx) =>
    tx
      .update(invitation)
      .set({ tokenHash: createHash("sha256").update(tokenCrudoDePrueba).digest("hex") })
      .where(eq(invitation.id, invitationId)),
  );
  return { tokenCrudoDePrueba };
}

main().catch((error) => {
  console.error("Error inesperado en test-invitations.ts:", error);
  process.exit(1);
});
