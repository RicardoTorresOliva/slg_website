import { NextResponse, type NextRequest } from "next/server";

import { auth, cerrarTodasLasSesiones, sesionActual } from "@/lib/auth";

/**
 * Aplica la contraseña nueva. El testigo es de **un solo uso**: la librería lo
 * invalida al consumirlo, así que un segundo envío del mismo enlace falla.
 *
 * Y al cambiar la contraseña se cierran **todas** las sesiones. Quien
 * restablece suele hacerlo porque sospecha que alguien entró: dejar vivas las
 * sesiones anteriores deja dentro justamente a quien motivó el cambio.
 */
export async function POST(request: NextRequest) {
  const formulario = await request.formData();
  const token = String(formulario.get("token") ?? "");
  const password = String(formulario.get("password") ?? "");

  const conError = () =>
    NextResponse.redirect(
      new URL(`/restablecer?token=${encodeURIComponent(token)}&error=1`, request.url),
      303,
    );

  if (!token || password.length < 12) return conError();

  try {
    const r = await auth.api.resetPassword({
      body: { newPassword: password, token },
      headers: request.headers,
      asResponse: true,
    });
    if (!r.ok) return conError();
  } catch {
    return conError();
  }

  const sesion = await sesionActual();
  if (sesion) await cerrarTodasLasSesiones(sesion.userId);

  return NextResponse.redirect(new URL("/acceder", request.url), 303);
}
