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
  } catch (e) {
    // Cualquier fallo —credenciales, correo sin verificar, cuenta suspendida—
    // sale por la misma puerta y con el mismo texto.
    registrarFallo("acceso", email);
    /**
     * **PERO EN EL REGISTRO DEL SERVIDOR SÍ SE DICE POR QUÉ**, y no es una
     * contradicción con RNF-32: lo que no puede filtrarse es la RESPUESTA, que
     * sigue siendo la misma para todos los motivos. Sin esta línea, una base
     * caída y una contraseña mal son **indistinguibles también para quien
     * administra**: el 18-09 costó una vuelta entera de diagnóstico averiguar
     * cuál de las dos era, porque el fallo no dejaba rastro en ninguna parte.
     *
     * Va el motivo, nunca el correo ni la contraseña (RNF-26): quién lo
     * intentó ya lo cuenta el antiabuso, y aquí lo que falta es el QUÉ.
     */
    console.error(`[acceso] signInEmail lanzó: ${(e as Error).message?.slice(0, 200) ?? e}`);
    return conError("credenciales");
  }

  if (!respuesta.ok) {
    registrarFallo("acceso", email);
    // Un 401 de la librería es «credenciales mal»; cualquier otro código es un
    // problema del servidor disfrazado de credenciales, y hay que poder verlo.
    if (respuesta.status !== 401) {
      console.error(`[acceso] signInEmail respondió ${respuesta.status}`);
    }
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
