/**
 * invitations.ts — FU-07: emisión, revocación, reenvío y aceptación.
 *
 * Acceso de clientes SOLO por invitación (`data_model` §10-10, §5.7). El
 * testigo del enlace **no se guarda**: solo su hash (`token_hash`); el valor
 * en claro viaja una vez, en el correo, y desaparece del proceso al terminar
 * esta función — el mismo principio que `lib/auth/api-keys.ts`.
 *
 * Mensajes NEUTROS en la validación del token (criterio 1): "inválida o
 * caducada" cubre no-existe, ya-usada, revocada y caducada por igual — RNF-32,
 * mismo patrón que `permissions.ts`.
 */
import { randomBytes, createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";

import { withScope, withSystemScope } from "../db/scope.ts";
import { exigir, esRolDeSlg } from "./permissions.ts";
import { auth } from "./config.ts";
import { authParaAceptarInvitacion } from "./invitation-signup.ts";
import { invitation, membership, organization, user, type UserRole } from "../db/schema.ts";
import type { AuthContext } from "../db/context.ts";
import { enviarCorreo } from "../email/send.ts";
import type { MailConfig } from "../email/config.ts";
import type { EmailTransport } from "../email/types.ts";

const VIGENCIA_HORAS = 72;

function hashToken(tokenCrudo: string): string {
  return createHash("sha256").update(tokenCrudo).digest("hex");
}

/** El código de Postgres real viaja en `error.cause` — drizzle-orm envuelve el error del driver. */
function codigoPostgres(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  if ("code" in error && typeof error.code === "string") return error.code;
  if ("cause" in error) return codigoPostgres((error as { cause: unknown }).cause);
  return undefined;
}

function esViolacionDeUnicidad(error: unknown): boolean {
  return codigoPostgres(error) === "23505";
}

function urlDeInvitacion(tokenCrudo: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  return `${base}/invitacion/${tokenCrudo}`;
}

async function enviarCorreoDeInvitacion(
  fila: { id: string; email: string; organizationName: string; expiresAt: Date },
  tokenCrudo: string,
  cfg: MailConfig,
  transporte: EmailTransport,
): Promise<void> {
  await enviarCorreo(
    {
      kind: "invitation",
      to: fila.email,
      // Sin señal de idioma del invitado todavía (`organization` no tiene
      // columna de idioma): español por defecto. Corregible sin migración
      // el día que exista una preferencia real que leer.
      locale: "es",
      data: {
        organizationName: fila.organizationName,
        inviteUrl: urlDeInvitacion(tokenCrudo),
        expiresAt: fila.expiresAt.toISOString(),
      },
      // `related.id` es el ID DE FILA de la invitación, NUNCA el testigo en
      // claro (`tokenCrudo`) — email_delivery.related_entity_id se persiste
      // de verdad, y el testigo no se guarda en ningún sitio (§2.4/§5.7).
      related: { type: "invitation", id: fila.id },
    },
    cfg,
    transporte,
  );
}

export type ResultadoCrearInvitacion =
  | { ok: true; id: string }
  | { ok: false; razon: "ya_invitado" };

/**
 * Emite una invitación. La matriz B.3 decide QUIÉN puede invitar; el rol
 * pedido decide a qué acción se exige (`identidad.invitar_slg` para roles de
 * SLG, `identidad.invitar_miembro_empresa` para roles de cliente) — así un
 * `client_admin` nunca llega a intentar invitar un `slg_admin`, y si lo
 * intentara igual, `invitation_insert_policy` (0008) lo rechaza en la base.
 */
export async function crearInvitacion(
  ctx: AuthContext,
  input: { organizationId: string; email: string; role: UserRole },
  cfg: MailConfig,
  transporte: EmailTransport,
): Promise<ResultadoCrearInvitacion> {
  exigir(
    ctx,
    esRolDeSlg(input.role) ? "identidad.invitar_slg" : "identidad.invitar_miembro_empresa",
  );

  const tokenCrudo = randomBytes(32).toString("hex");
  const id = crypto.randomUUID();
  const email = input.email.toLowerCase();
  const expiresAt = new Date(Date.now() + VIGENCIA_HORAS * 60 * 60 * 1000);

  let organizationName: string;
  try {
    const fila = await withScope(ctx, async (db) => {
      const [org] = await db
        .select({ name: organization.name })
        .from(organization)
        .where(eq(organization.id, input.organizationId));
      await db.insert(invitation).values({
        id,
        organizationId: input.organizationId,
        email,
        role: input.role,
        tokenHash: hashToken(tokenCrudo),
        expiresAt,
        inviterId: ctx.actorType === "user" ? ctx.actorId : null,
        status: "pending",
      });
      return org;
    });
    organizationName = fila?.name ?? "";
  } catch (error) {
    if (esViolacionDeUnicidad(error)) return { ok: false, razon: "ya_invitado" };
    throw error;
  }

  const { entregado } = await enviarCorreoConSentAt(id, { id, email, organizationName, expiresAt }, tokenCrudo, cfg, transporte);
  void entregado; // el hecho de negocio ya está creado (criterio 4); el envío es best-effort aquí.
  return { ok: true, id };
}

async function enviarCorreoConSentAt(
  invitationId: string,
  fila: { id: string; email: string; organizationName: string; expiresAt: Date },
  tokenCrudo: string,
  cfg: MailConfig,
  transporte: EmailTransport,
): Promise<{ entregado: boolean }> {
  try {
    await enviarCorreoDeInvitacion(fila, tokenCrudo, cfg, transporte);
    await withSystemScope("registrar envío de invitación (FU-07)", (db) =>
      db.update(invitation).set({ sentAt: new Date() }).where(eq(invitation.id, invitationId)),
    );
    return { entregado: true };
  } catch {
    // RF-119: el fallo de correo no deshace la invitación ya creada. `sent_at`
    // queda NULL — es la señal de "creada, no enviada" que la usa reenviar.
    return { entregado: false };
  }
}

/** Inutiliza una invitación pendiente de inmediato (criterio 5). */
export async function revocarInvitacion(ctx: AuthContext, invitationId: string): Promise<{ ok: boolean }> {
  exigir(ctx, "identidad.invitar_miembro_empresa");
  const filas = await withScope(ctx, (db) =>
    db
      .update(invitation)
      .set({
        status: "canceled",
        revokedAt: new Date(),
        revokedByUserId: ctx.actorType === "user" ? ctx.actorId : null,
      })
      .where(and(eq(invitation.id, invitationId), eq(invitation.status, "pending")))
      .returning({ id: invitation.id }),
  );
  return { ok: filas.length > 0 };
}

export type ResultadoReenviar = { ok: true } | { ok: false; razon: "no_reenviable" };

/** Reenvía con un testigo NUEVO: el anterior queda invalidado (el valor en claro no se conserva). */
export async function reenviarInvitacion(
  ctx: AuthContext,
  invitationId: string,
  cfg: MailConfig,
  transporte: EmailTransport,
): Promise<ResultadoReenviar> {
  exigir(ctx, "identidad.invitar_miembro_empresa");

  const tokenCrudo = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + VIGENCIA_HORAS * 60 * 60 * 1000);

  const fila = await withScope(ctx, async (db) => {
    const [actualizada] = await db
      .update(invitation)
      .set({ tokenHash: hashToken(tokenCrudo), expiresAt, sentAt: null })
      .where(and(eq(invitation.id, invitationId), eq(invitation.status, "pending")))
      .returning();
    if (!actualizada) return null;
    const [org] = await db
      .select({ name: organization.name })
      .from(organization)
      .where(eq(organization.id, actualizada.organizationId));
    return { ...actualizada, organizationName: org?.name ?? "" };
  });

  if (!fila) return { ok: false, razon: "no_reenviable" };
  await enviarCorreoConSentAt(fila.id, fila, tokenCrudo, cfg, transporte);
  return { ok: true };
}

export type InvitacionVigente = {
  id: string;
  email: string;
  organizationId: string;
  organizationName: string;
  role: UserRole;
};

/**
 * Canjea el token: existe, está `pending` y no ha caducado. Cualquier otro
 * caso responde `null` — el mismo mensaje neutro para los cuatro motivos
 * posibles (criterio 1).
 */
export async function buscarInvitacionVigente(tokenCrudo: string): Promise<InvitacionVigente | null> {
  return withSystemScope("canjear token de invitación (FU-07)", async (db) => {
    const [fila] = await db
      .select({
        id: invitation.id,
        email: invitation.email,
        organizationId: invitation.organizationId,
        organizationName: organization.name,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
      })
      .from(invitation)
      .innerJoin(organization, eq(organization.id, invitation.organizationId))
      .where(eq(invitation.tokenHash, hashToken(tokenCrudo)));

    if (!fila || fila.status !== "pending" || fila.expiresAt.getTime() <= Date.now()) return null;
    return {
      id: fila.id,
      email: fila.email,
      organizationId: fila.organizationId,
      organizationName: fila.organizationName,
      role: fila.role as UserRole,
    };
  });
}

export type ResultadoAceptacion =
  | { ok: true; userId: string; role: UserRole }
  | { ok: false; razon: "invalida" | "correo_no_coincide" };

/**
 * El núcleo común a los tres métodos (criterio 2): dada una sesión YA
 * establecida (por contraseña, Google o Microsoft — a esta función no le
 * importa cuál), liga la cuenta a la empresa y al rol de la invitación.
 *
 * Criterio 3 (RF-63, R-22): si el correo de la sesión no viene verificado por
 * el proveedor, exige coincidencia EXPLÍCITA (`confirmarCorreo`) con el
 * correo invitado. Nunca se vincula por un correo no verificado.
 */
export async function completarAceptacionInvitacion(
  tokenCrudo: string,
  sesion: { userId: string; email: string; emailVerified: boolean },
  confirmarCorreo?: string,
): Promise<ResultadoAceptacion> {
  const inv = await buscarInvitacionVigente(tokenCrudo);
  if (!inv) return { ok: false, razon: "invalida" };

  const correoCoincideVerificado = sesion.emailVerified && sesion.email.toLowerCase() === inv.email;
  const correoConfirmadoAMano = !!confirmarCorreo && confirmarCorreo.toLowerCase() === inv.email;
  if (!correoCoincideVerificado && !correoConfirmadoAMano) {
    return { ok: false, razon: "correo_no_coincide" };
  }

  return withSystemScope("aceptar invitación: crea membership y liga el rol (FU-07)", async (db) => {
    await db.insert(membership).values({
      id: crypto.randomUUID(),
      userId: sesion.userId,
      organizationId: inv.organizationId,
      orgRole: inv.role,
    });
    // `user.role` (sin RLS) es la fuente real de B.3 (RF-68) — la
    // pertenencia por sí sola no autoriza nada si el rol no la acompaña.
    await db.update(user).set({ role: inv.role }).where(eq(user.id, sesion.userId));
    await db
      .update(invitation)
      .set({ status: "accepted", acceptedAt: new Date(), acceptedByUserId: sesion.userId })
      .where(eq(invitation.id, inv.id));
    return { ok: true, userId: sesion.userId, role: inv.role };
  });
}

/**
 * Acepta por contraseña (uno de los tres métodos, criterio 2). Crea la cuenta
 * vía la puerta privilegiada (`invitation-signup.ts`, única forma de sortear
 * `disableSignUp`), marca el correo verificado —clicar el enlace del correo
 * YA demuestra control del buzón, que es justo lo que la verificación por
 * correo demostraría— e inicia sesión real con la instancia PÚBLICA (`auth`,
 * con `nextCookies()`) para que el navegador reciba la cookie de verdad.
 */
export async function aceptarInvitacionConContrasena(
  tokenCrudo: string,
  password: string,
): Promise<ResultadoAceptacion> {
  const inv = await buscarInvitacionVigente(tokenCrudo);
  if (!inv) return { ok: false, razon: "invalida" };

  const { user: creado } = await authParaAceptarInvitacion.api.signUpEmail({
    body: { email: inv.email, password, name: inv.email.split("@")[0] },
  });

  await withSystemScope("marcar correo verificado tras aceptar invitación (FU-07)", (db) =>
    db.update(user).set({ emailVerified: true }).where(eq(user.id, creado.id)),
  );

  // Sesión real, con cookie: la instancia pública lleva `nextCookies()`
  // (config.ts) y sign-IN nunca lo bloquea `disableSignUp` (eso solo protege
  // el alta, no el acceso a una cuenta que ya existe).
  await auth.api.signInEmail({ body: { email: inv.email, password } });

  return completarAceptacionInvitacion(tokenCrudo, {
    userId: creado.id,
    email: inv.email,
    emailVerified: true,
  });
}
