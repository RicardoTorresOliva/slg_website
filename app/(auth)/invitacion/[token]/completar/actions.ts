"use server";

import { headers as nextHeaders } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "../../../../../lib/auth/config.ts";
import { completarAceptacionInvitacion } from "../../../../../lib/auth/invitations.ts";
import { superficieDeRol } from "../../../../../lib/auth/permissions.ts";

export type ResultadoConfirmacion = { ok: false };

/** Fallback de RF-63/R-22: el proveedor no verificó el correo, así que lo confirma la persona a mano. */
export async function confirmarCorreoAction(
  token: string,
  correoConfirmado: string,
): Promise<ResultadoConfirmacion> {
  const sesion = await auth.api.getSession({ headers: await nextHeaders() });
  if (!sesion?.user) return { ok: false };

  const resultado = await completarAceptacionInvitacion(
    token,
    { userId: sesion.user.id, email: sesion.user.email, emailVerified: sesion.user.emailVerified },
    correoConfirmado,
  );

  if (resultado.ok) {
    redirect(superficieDeRol(resultado.role));
  }
  return { ok: false };
}
