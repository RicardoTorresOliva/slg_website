import { NextResponse, type NextRequest } from "next/server";

import { cerrarTodasLasSesiones, sesionActual } from "@/lib/auth";

/**
 * «Cerrar sesión en todos los dispositivos» (RF-66, criterio 7 de DU-01).
 *
 * Borra TODAS las sesiones del usuario, incluida la que hace la petición. Quien
 * pulsa esto acaba de perder el portátil o sospecha que alguien entró: dejar
 * viva la sesión actual «por comodidad» es dejar viva exactamente la que podría
 * ser la del otro.
 *
 * Surte efecto en la petición siguiente porque `session.ts` comprueba contra la
 * base en cada una, no contra una caché.
 */
export async function POST(request: NextRequest) {
  const sesion = await sesionActual();
  if (!sesion) {
    return NextResponse.redirect(new URL("/acceder", request.url), 303);
  }

  await cerrarTodasLasSesiones(sesion.userId);

  const salida = NextResponse.redirect(new URL("/acceder", request.url), 303);
  // La cookie del navegador que pidió el cierre se borra aquí; las de los demás
  // dispositivos ya no valen porque su fila no existe.
  salida.cookies.delete("better-auth.session_token");
  salida.cookies.delete("__Secure-better-auth.session_token");
  return salida;
}
