import { NextResponse, type NextRequest } from "next/server";

import { tieneCookieDeSesion } from "@/lib/auth/edge";

/**
 * Middleware — FU-05 (compuerta de staging) y FU-06 (clasificación de §2).
 *
 * DOS CAPAS, EN ESTE ORDEN, Y NO AL REVÉS. La compuerta de staging va PRIMERO:
 * si dejara de ser lo primero, una ruta de staging podría responder antes de
 * pedir credenciales y staging dejaría de ser staging.
 *
 * LO QUE ESTE ARCHIVO NO HACE (architecture §2.1). No autoriza. Es un
 * clasificador barato en el borde: mira si la credencial ESTÁ y tiene FORMA, no
 * si vale. La matriz B.3 se aplica en el servidor, en cada acción, y los
 * layouts de `(hq)` y `(portal)` repiten la verificación contra la base de
 * datos. La duplicación es intencionada: si mañana una ruta escapa al
 * emparejado de abajo, sigue protegida.
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

  // Producción: ninguna de las dos está definida. La compuerta de staging no
  // aplica, y se pasa directamente a la clasificación de §2.
  if (!usuario || !clave) return clasificar(request, NextResponse.next());

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

  // Autenticado (o sonda): pasa a la clasificación de §2, pero NUNCA indexable
  // (RF-122, criterio 1). El `noindex` se pone AL FINAL para que la
  // clasificación no pueda ablandarlo.
  const respuesta = clasificar(request, NextResponse.next());
  respuesta.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
  return respuesta;
}

/* ══════════════════════════════════════════════════════════════════════════
 * FU-06 · Clasificación de §2
 * ══════════════════════════════════════════════════════════════════════════ */

/** Prefijos que exigen sesión: `(hq)` y `(portal)` (§2.4, pasos 1 y 2). */
const CON_SESION = ["/hq", "/portal"];

/** Prefijos del grupo `(auth)`: nunca indexables (§2.3, paso 3). */
const GRUPO_AUTH = ["/acceder", "/recuperar", "/invitacion", "/en/sign-in", "/en/recover"];

function clasificar(request: NextRequest, respuesta: NextResponse): NextResponse {
  const { pathname } = request.nextUrl;

  // §2.3 — el grupo (auth) no se indexa nunca. `/invitacion/[token]` se sirve
  // SIEMPRE, con o sin sesión: aceptar una invitación puede exigir cambiar de
  // identidad (RF-61, RF-63).
  if (GRUPO_AUTH.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    respuesta.headers.set("X-Robots-Tag", "noindex, nofollow");
    return respuesta;
  }

  // §2.4, pasos 1 y 2 — presencia y FORMA de la cookie, nada más. Que la sesión
  // exista, no haya expirado y no esté revocada lo comprueba el layout contra
  // la base de datos (paso 6): esto solo evita renderizar de balde.
  if (CON_SESION.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    respuesta.headers.set("X-Robots-Tag", "noindex, nofollow");
    if (!tieneCookieDeSesion(request)) {
      const destino = request.nextUrl.clone();
      destino.pathname = "/acceder";
      // La ruta de retorno viaja en la URL, no en una cookie: una cookie de
      // retorno es un vector de redirección abierta más difícil de auditar.
      destino.search = `?volver=${encodeURIComponent(pathname)}`;
      return NextResponse.redirect(destino);
    }
    return respuesta;
  }

  // §2.5 — `api/v1`: la clave se verifica en el manejador, no aquí. El
  // middleware no puede consultar la base de datos en el borde, y una
  // verificación a medias es peor que ninguna.
  //
  // §2.2 — `(public)`: el idioma es una propiedad de la URL, no una
  // negociación. `/en/...` es inglés, el resto español, y NINGUNA cabecera
  // `Accept-Language` sobrescribe la ruta pedida (RF-03, FU-03 criterio 7).
  // Por eso aquí no hay nada que hacer: no redirigir ES la regla.
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
