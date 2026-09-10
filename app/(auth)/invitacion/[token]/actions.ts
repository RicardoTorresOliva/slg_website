"use server";

import { redirect } from "next/navigation";

import { aceptarInvitacionConContrasena } from "../../../../lib/auth/invitations.ts";
import { superficieDeRol } from "../../../../lib/auth/permissions.ts";

export type ResultadoAccion = { ok: false; mensaje: "invalida" | "correo_no_coincide" | "error" };

/** Acepta por contraseña (uno de los tres métodos, criterio 2). Redirige en éxito. */
export async function aceptarConContrasenaAction(
  token: string,
  password: string,
): Promise<ResultadoAccion> {
  if (password.length < 12) return { ok: false, mensaje: "error" };

  let resultado;
  try {
    resultado = await aceptarInvitacionConContrasena(token, password);
  } catch {
    return { ok: false, mensaje: "error" };
  }

  if (!resultado.ok) {
    return { ok: false, mensaje: resultado.razon === "invalida" ? "invalida" : "correo_no_coincide" };
  }

  redirect(superficieDeRol(resultado.role));
}
