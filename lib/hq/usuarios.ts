/**
 * usuarios.ts — Usuarios de SLG e invitaciones, desde HQ (DU-14 · RF-78 · RF-86).
 *
 * **ESTA ES LA SUPERFICIE QUE CONVIERTE FU-07 EN ALGO CONSUMIBLE.** El servicio
 * de invitaciones existía desde M0-B y no había forma de usarlo sin escribir
 * SQL: emitir, reenviar y revocar ya estaban construidos y probados, pero una
 * capacidad sin pantalla es una capacidad que nadie usa.
 *
 * NO SE REIMPLEMENTA NADA. Este archivo **llama** a `lib/invitations`, que es
 * quien aplica B.3, genera el testigo, lo hashea, pone la caducidad y manda el
 * correo. Reescribir aquí cualquiera de esos pasos sería tener dos sitios
 * donde vive la regla de caducidad, y solo uno probado.
 *
 * `user.invite.slg` es de `slg_admin` **y de nadie más** (RF-86): invitar a
 * alguien a SLG es repartir acceso a todas las empresas a la vez. Invitar a una
 * empresa cliente es otra acción distinta —`member.invite`— y la gobierna
 * `lib/invitations` con el alcance de quien invita.
 */
import { desc, eq, inArray } from "drizzle-orm";

import { exigir } from "../auth/matriz.ts";
import { conAuditoria } from "../auditoria/index.ts";
import type { AuthContext } from "../db/context.ts";
import { invitation, membership, organization, user } from "../db/schema.ts";
import { withScope, withSystemScope } from "../db/scope.ts";
import {
  emitirInvitacion,
  reenviarInvitacion,
  revocarInvitacion,
  type Invitacion,
} from "../invitations/index.ts";

export type UsuarioDeSlg = {
  readonly id: string;
  readonly nombre: string;
  readonly correo: string;
  readonly rol: string;
  readonly idioma: string;
};

/**
 * Los usuarios de SLG: los que pertenecen a una organización de tipo `slg`.
 *
 * **No se listan «todos los usuarios»**, y no es una omisión: los usuarios de
 * cliente se ven desde su empresa, donde la política de fila los acota. Una
 * lista global de personas en HQ es un directorio de los clientes de SLG en una
 * pantalla que se comparte en capturas.
 */
export async function usuariosDeSlg(ctx: AuthContext): Promise<UsuarioDeSlg[]> {
  exigir(ctx, "org.read");
  return withScope(ctx, async (db) => {
    const internas = await db
      .select({ id: organization.id })
      .from(organization)
      .where(eq(organization.type, "slg"));
    if (internas.length === 0) return [];
    const ids = internas.map((o) => o.id);
    const filas = await db
      .selectDistinct({
        id: user.id,
        nombre: user.name,
        correo: user.email,
        rol: user.role,
        idioma: user.locale,
      })
      .from(membership)
      .innerJoin(user, eq(membership.userId, user.id))
      .where(inArray(membership.organizationId, ids))
      .orderBy(user.name);
    return filas;
  });
}

export type InvitacionDeHq = Invitacion & { readonly empresa: string };

export async function invitacionesPendientes(ctx: AuthContext): Promise<InvitacionDeHq[]> {
  exigir(ctx, "org.read");
  const filas = await withScope(ctx, (db) =>
    db
      .select({
        id: invitation.id,
        email: invitation.email,
        organizationId: invitation.organizationId,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        sentAt: invitation.sentAt,
        acceptedAt: invitation.acceptedAt,
        inviterId: invitation.inviterId,
        empresa: organization.name,
      })
      .from(invitation)
      .innerJoin(organization, eq(invitation.organizationId, organization.id))
      .where(eq(invitation.status, "pending"))
      .orderBy(desc(invitation.expiresAt)),
  );
  return filas as unknown as InvitacionDeHq[];
}

/**
 * Invitar a **SLG**. Exige `user.invite.slg`, que solo tiene `slg_admin`.
 *
 * El rechazo de un `slg_operator` **queda auditado** (criterio 4): el intento
 * es la información, no el fallo.
 */
export async function invitarASlg(
  ctx: AuthContext,
  entrada: { email: string; organizationId: string; role: "slg_admin" | "slg_operator"; idioma?: "es" | "en" },
) {
  return conAuditoria(
    ctx,
    { accion: "user.invite.slg", entidad: "invitation", organizationId: entrada.organizationId },
    async () => {
      exigir(ctx, "user.invite.slg");
      return emitirInvitacion(ctx, entrada);
    },
  );
}

/** Invitar a una **empresa cliente**. El alcance lo aplica `lib/invitations`. */
export async function invitarACliente(
  ctx: AuthContext,
  entrada: { email: string; organizationId: string; role: "client_admin" | "client_member"; idioma?: "es" | "en" },
) {
  return conAuditoria(
    ctx,
    { accion: "member.invite", entidad: "invitation", organizationId: entrada.organizationId },
    async () => emitirInvitacion(ctx, entrada),
  );
}

export async function reenviar(ctx: AuthContext, invitationId: string, idioma?: "es" | "en") {
  return conAuditoria(
    ctx,
    { accion: "invitation.resend", entidad: "invitation", entidadId: invitationId },
    async () => reenviarInvitacion(ctx, invitationId, { idioma }),
  );
}

/**
 * Revocar. **Surte efecto de inmediato** (RF-78, criterio 3): `lib/invitations`
 * marca la fila y el enlace deja de servir en la petición siguiente, porque la
 * comprobación del testigo va contra la base, no contra una caché.
 */
export async function revocar(ctx: AuthContext, invitationId: string) {
  return conAuditoria(
    ctx,
    { accion: "invitation.revoke", entidad: "invitation", entidadId: invitationId },
    async () => revocarInvitacion(ctx, invitationId),
  );
}

/** Las empresas a las que se puede invitar, para el desplegable del formulario. */
export async function empresasParaInvitar(
  ctx: AuthContext,
): Promise<{ id: string; nombre: string; tipo: string }[]> {
  exigir(ctx, "org.read");
  return withScope(ctx, (db) =>
    db
      .select({ id: organization.id, nombre: organization.name, tipo: organization.type })
      .from(organization)
      .where(eq(organization.status, "active"))
      .orderBy(organization.name),
  );
}

/**
 * Cuántas invitaciones pendientes hay sin usar `withScope`.
 *
 * Existe **solo para las pruebas y para el barrido**: la pantalla usa siempre
 * la versión con contexto. Se deja aquí, junto a lo que mide, en vez de en un
 * archivo de utilidades que nadie relaciona con esto.
 */
export async function contarPendientes(): Promise<number> {
  return withSystemScope("DU-14 · recuento de invitaciones pendientes.", async (db) => {
    const filas = await db
      .select({ id: invitation.id })
      .from(invitation)
      .where(eq(invitation.status, "pending"));
    return filas.length;
  });
}
