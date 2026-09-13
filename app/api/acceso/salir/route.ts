import { NextResponse, type NextRequest } from "next/server";

import { cerrarSesion, sesionActual } from "@/lib/auth";

/**
 * «Cerrar sesión» — la respuesta a «cómo salgo» (FU-12, RNF-43).
 *
 * **SOLO POST, y por eso el armazón lo pinta como un formulario y no como un
 * enlace.** Un cierre de sesión por GET lo dispara cualquier `<img src>` de
 * cualquier página: no roba nada, pero echa a la gente de su sesión desde
 * fuera, y el usuario lo vive como que «la aplicación se cae sola». Exigir POST
 * lo cierra sin necesidad de ningún testigo adicional.
 *
 * Cierra **esta** sesión y ninguna más. Cerrar todas es `/api/acceso/cerrar-todo`,
 * que es otra cosa y se pide en otro sitio: salir del portátil no puede
 * desconectarte del móvil.
 */
export async function POST(request: NextRequest) {
  const sesion = await sesionActual();
  // Sin sesión, el destino es el mismo: ya está fuera. No hay nada que contarle
  // ni motivo para un error — salir dos veces no es un fallo.
  if (sesion) await cerrarSesion(sesion.sessionId);

  const salida = NextResponse.redirect(new URL("/acceder", request.url), 303);
  salida.cookies.delete("better-auth.session_token");
  salida.cookies.delete("__Secure-better-auth.session_token");
  return salida;
}
