import { NextResponse, type NextRequest } from "next/server";

import { auth, marcarCorreoVerificado } from "@/lib/auth";
import { aceptarInvitacion, consultarTestigo } from "@/lib/invitations";

/**
 * La ÚNICA vía a una cuenta nueva (§10-10: el acceso es solo por invitación).
 *
 * El alta pública de la librería está cerrada en el middleware; aquí se llama a
 * la librería **por dentro**, que es una llamada de función y no una petición,
 * después de comprobar el testigo. El orden importa y no es intercambiable:
 *
 *   1. se valida el testigo — sin él no se crea nada;
 *   2. se crea la cuenta;
 *   3. se canjea la invitación, que en UNA transacción la consume, crea la
 *      pertenencia y hereda el rol (RF-61).
 *
 * Si el paso 3 falla —por ejemplo porque alguien canjeó el mismo enlace entre
 * medias— queda una cuenta sin pertenencia, que no puede entrar a ninguna
 * superficie y a la que se puede volver a invitar. Es el fallo menos malo de
 * los tres posibles: la alternativa sería una pertenencia sin cuenta.
 */
export async function POST(request: NextRequest) {
  const formulario = await request.formData();
  const token = String(formulario.get("token") ?? "");
  const nombre = String(formulario.get("nombre") ?? "").trim();
  const password = String(formulario.get("password") ?? "");

  const volverAlEnlace = (motivo: string) =>
    NextResponse.redirect(new URL(`/invitacion/${token}?error=${motivo}`, request.url), 303);

  const estado = await consultarTestigo(token);
  if (!estado.valido) return volverAlEnlace("enlace");
  if (!nombre || password.length < 12) return volverAlEnlace("datos");

  let respuesta: Response;
  try {
    respuesta = await auth.api.signUpEmail({
      // El correo NO sale del formulario: sale de la invitación. Aceptarlo del
      // cliente permitiría tomar una invitación con otra dirección.
      body: { email: estado.invitacion.email, password, name: nombre },
      headers: request.headers,
      asResponse: true,
    });
  } catch {
    return volverAlEnlace("datos");
  }
  if (!respuesta.ok) return volverAlEnlace("datos");

  const creado = (await respuesta.clone().json().catch(() => null)) as
    | { user?: { id?: string } }
    | null;
  const userId = creado?.user?.id;
  if (!userId) return volverAlEnlace("datos");

  /**
   * El correo queda verificado por el propio canje: la invitación se envió A esa
   * dirección, así que llegar con su testigo ya prueba que la persona la
   * controla. Pedir además un correo de verificación es pedir dos veces la
   * misma prueba, y el segundo es el que la gente no encuentra.
   */
  await marcarCorreoVerificado(userId);

  const aceptada = await aceptarInvitacion({
    testigo: token,
    userId,
    // El correo viene de la propia invitación: la coincidencia es exacta por
    // construcción, no por confianza en lo que escribió nadie.
    correoVerificado: estado.invitacion.email,
  });
  if (!aceptada.aceptada) return volverAlEnlace("enlace");

  const salida = NextResponse.redirect(new URL("/", request.url), 303);
  for (const [clave, valor] of respuesta.headers) {
    if (clave.toLowerCase() === "set-cookie") salida.headers.append("set-cookie", valor);
  }
  return salida;
}
