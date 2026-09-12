import { NextResponse, type NextRequest } from "next/server";

import {
  auth,
  esperaPendienteEnSegundos,
  registrarAcierto,
  registrarFallo,
} from "@/lib/auth";

/**
 * Acceso por correo y contraseña. Recibe un `<form method="post">`, no JSON.
 *
 * POR QUÉ UN MANEJADOR PROPIO Y NO EL ENDPOINT DE LA LIBRERÍA DIRECTAMENTE.
 * Tres cosas que son nuestras y no suyas:
 *
 *   1. **El mensaje neutro** (RF-59). La librería distingue «usuario no
 *      encontrado» de «contraseña incorrecta», y esa distinción es justo la que
 *      no puede salir. Aquí todo acaba en el mismo `?error=credenciales`.
 *   2. **El bloqueo progresivo** (RNF-24), que además comparte cerradura con la
 *      recuperación.
 *   3. **Funcionar sin JavaScript**: un formulario nativo que redirige.
 */
export async function POST(request: NextRequest) {
  const formulario = await request.formData();
  const email = String(formulario.get("email") ?? "").trim().toLowerCase();
  const password = String(formulario.get("password") ?? "");
  const lang = formulario.get("lang") === "en" ? "en" : "es";
  const volverCrudo = String(formulario.get("volver") ?? "");

  const acceder = lang === "en" ? "/en/sign-in" : "/acceder";
  const conError = (motivo: string) =>
    NextResponse.redirect(new URL(`${acceder}?error=${motivo}`, request.url), 303);

  if (!email || !password) return conError("credenciales");

  // La espera pendiente se comprueba ANTES de tocar la base: si no, cada
  // intento bloqueado seguiría costando una consulta y un hash.
  const espera = esperaPendienteEnSegundos("acceso", email);
  if (espera > 0) {
    return NextResponse.redirect(new URL(`${acceder}?error=bloqueado`, request.url), 303);
  }

  let respuesta: Response;
  try {
    respuesta = await auth.api.signInEmail({
      body: { email, password },
      headers: request.headers,
      asResponse: true,
    });
  } catch {
    // Cualquier fallo —credenciales, correo sin verificar, cuenta suspendida—
    // sale por la misma puerta y con el mismo texto.
    registrarFallo("acceso", email);
    return conError("credenciales");
  }

  if (!respuesta.ok) {
    registrarFallo("acceso", email);
    return conError("credenciales");
  }

  registrarAcierto("acceso", email);

  /**
   * Destino: solo rutas internas. Un `volver` que llegue por el formulario es
   * entrada del usuario, y aceptarlo tal cual es una redirección abierta —el
   * clásico «entras en nuestro dominio y acabas en otro»—. Se exige que empiece
   * por una sola barra.
   */
  const destino =
    volverCrudo.startsWith("/") && !volverCrudo.startsWith("//") ? volverCrudo : "/";

  const salida = NextResponse.redirect(new URL(destino, request.url), 303);
  // Las cookies de sesión que emitió la librería viajan tal cual: con sus
  // `Secure`, `HttpOnly` y `SameSite` ya puestos en la configuración.
  for (const [clave, valor] of respuesta.headers) {
    if (clave.toLowerCase() === "set-cookie") salida.headers.append("set-cookie", valor);
  }
  return salida;
}
