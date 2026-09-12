import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware — FU-05.
 *
 * Hoy contiene UNA sola comprobación: la compuerta de staging (criterio 1).
 * El orden completo de `design_docs/architecture.md` §2 —idioma, sesión, rol,
 * pertenencia, clave de API— entra en FU-06 y se encadena DEBAJO de esta, nunca
 * encima: si staging deja de pedir credenciales, deja de ser staging.
 *
 * Se activa por la PRESENCIA de las dos variables, no por `NODE_ENV` ni por el
 * nombre del host. Producción no las define y no paga nada; `slg-web-staging`
 * las define en Easypanel y queda cerrado. Un despliegue nuevo que olvide
 * definirlas no queda medio protegido: queda abierto y se nota (ver
 * `scripts/check-staging.ts`, que lo comprueba desde fuera).
 */

const REALM = 'Basic realm="slg staging", charset="UTF-8"';

/**
 * `/api/health` queda FUERA de la compuerta a propósito.
 *
 * UptimeRobot (D-49) vigila `staging.softlandingglobal.com` desde fuera del VPS
 * y no lleva credenciales: si la sonda recibiera 401 el monitor estaría midiendo
 * la compuerta, no el servicio. La sonda no devuelve ningún dato de negocio
 * —ver `app/api/health/route.ts`—, así que abrirla no filtra nada.
 */
const SIN_COMPUERTA = ["/api/health"];

/** Comparación en tiempo constante. El runtime edge no trae `timingSafeEqual`. */
function igualEnTiempoConstante(a: string, b: string): boolean {
  const ba = new TextEncoder().encode(a);
  const bb = new TextEncoder().encode(b);
  // La longitud sí se filtra: es información inútil para adivinar la contraseña.
  if (ba.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ba.length; i++) diff |= ba[i] ^ bb[i];
  return diff === 0;
}

function credencialCorrecta(cabecera: string | null, usuario: string, clave: string): boolean {
  if (!cabecera?.startsWith("Basic ")) return false;
  let descifrada: string;
  try {
    descifrada = atob(cabecera.slice(6));
  } catch {
    return false;
  }
  const corte = descifrada.indexOf(":");
  if (corte === -1) return false;
  return (
    igualEnTiempoConstante(descifrada.slice(0, corte), usuario) &&
    igualEnTiempoConstante(descifrada.slice(corte + 1), clave)
  );
}

export function middleware(request: NextRequest) {
  const usuario = process.env.STAGING_BASIC_AUTH_USER;
  const clave = process.env.STAGING_BASIC_AUTH_PASSWORD;

  // Producción: ninguna de las dos está definida. Nada que hacer.
  if (!usuario || !clave) return NextResponse.next();

  const { pathname } = request.nextUrl;

  if (!SIN_COMPUERTA.includes(pathname)) {
    if (!credencialCorrecta(request.headers.get("authorization"), usuario, clave)) {
      return new NextResponse("Authentication required.", {
        status: 401,
        headers: {
          "WWW-Authenticate": REALM,
          // Un 401 también se indexa si algún buscador lo intenta. No.
          "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet",
          "Cache-Control": "no-store",
        },
      });
    }
  }

  // Autenticado (o sonda): pasa, pero NUNCA indexable (RF-122, criterio 1).
  const respuesta = NextResponse.next();
  respuesta.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
  return respuesta;
}

export const config = {
  /**
   * Todo menos los estáticos de Next y el favicon: pedir credenciales para un
   * chunk de JS rompe la carga de la página sin proteger nada que el HTML no
   * proteja ya.
   */
  matcher: ["/((?!_next/static|_next/image|favicon.ico|fonts/).*)"],
};
