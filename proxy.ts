import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * proxy.ts — Protección de staging (FU-05) + clasificador barato de FU-06.
 *
 * Antes era `middleware.ts`; Next 16 renombra la convención a `proxy.ts`
 * (mismo contrato). Se aprovecha el cambio para no dejar dos archivos
 * haciendo el mismo trabajo.
 *
 * FU-06: esto es "un clasificador barato en el borde de la petición, no la
 * autorización" (architecture.md §2) — corre en el runtime `nodejs` pero
 * a propósito NO toca la base de datos aquí. Solo mira si hay una cookie de
 * sesión con forma válida (`getSessionCookie`, sin verificar la firma contra
 * la base de datos) o una cabecera `Authorization`. La comprobación de
 * verdad —¿la sesión sigue viva?, ¿el rol es el de esta superficie?, ¿la
 * clave existe y tiene el alcance?— la repite siempre la capa siguiente:
 * `app/hq/layout.tsx`, `app/portal/layout.tsx`, y cada endpoint de
 * `api/v1` contra `lib/auth/api-keys.ts`. Que este archivo se equivoque no
 * abre nada: en el peor caso, deja pasar una petición que la capa de verdad
 * rechaza después.
 */

const USUARIO = process.env.STAGING_BASIC_AUTH_USER;
const CLAVE = process.env.STAGING_BASIC_AUTH_PASSWORD;
const STAGING_PROTEGIDO = Boolean(USUARIO && CLAVE);

/**
 * Rutas que quedan fuera de la autenticación básica de staging.
 *
 * `/api/health` se excluye a propósito: es la sonda del monitor externo
 * (D-49) y del contenedor. Si pidiera credenciales, el monitor daría el sitio
 * por caído siempre y el aviso dejaría de significar nada. No expone dato
 * alguno: responde `{"status":"ok"}` y nada más.
 */
const RUTAS_ABIERTAS_EN_STAGING = ["/api/health"];

function igualdadConstante(a: string, b: string): boolean {
  const ba = new TextEncoder().encode(a);
  const bb = new TextEncoder().encode(b);
  if (ba.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ba.length; i++) diff |= ba[i] ^ bb[i];
  return diff === 0;
}

function credencialesDeStagingValidas(cabecera: string | null): boolean {
  if (!cabecera?.startsWith("Basic ")) return false;
  try {
    const descifrado = atob(cabecera.slice(6));
    const sep = descifrado.indexOf(":");
    if (sep === -1) return false;
    return (
      igualdadConstante(descifrado.slice(0, sep), USUARIO!) &&
      igualdadConstante(descifrado.slice(sep + 1), CLAVE!)
    );
  } catch {
    return false;
  }
}

function esRutaDe(ruta: string, prefijo: string): boolean {
  return ruta === prefijo || ruta.startsWith(prefijo + "/");
}

export function proxy(request: NextRequest) {
  const ruta = request.nextUrl.pathname;

  // ─── FU-05: staging, primero — nada de lo de abajo importa si esto bloquea ──
  if (STAGING_PROTEGIDO && !RUTAS_ABIERTAS_EN_STAGING.some((r) => esRutaDe(ruta, r))) {
    if (!credencialesDeStagingValidas(request.headers.get("authorization"))) {
      return new NextResponse("Acceso restringido", {
        status: 401,
        headers: {
          // Solo ASCII: una cabecera HTTP es una ByteString (ver historial en
          // work_log.md, FU-05 — una raya larga aquí dio 500, no 401).
          "WWW-Authenticate": 'Basic realm="SLG Agency staging", charset="UTF-8"',
          "X-Robots-Tag": "noindex, nofollow, noarchive",
          "Cache-Control": "no-store",
        },
      });
    }
  }

  // ─── FU-06: api/v1 — sin cabecera, ni se molesta en llegar al handler ──────
  if (esRutaDe(ruta, "/api/v1") && !request.headers.get("authorization")) {
    return NextResponse.json(
      { error: { code: "no_autenticado", message: "Falta la cabecera Authorization." } },
      { status: 401 },
    );
  }

  // ─── FU-06: hq/portal — sin cookie de sesión, directo a /acceder ──────────
  if ((esRutaDe(ruta, "/hq") || esRutaDe(ruta, "/portal")) && !getSessionCookie(request)) {
    const destino = new URL("/acceder", request.url);
    destino.searchParams.set("volver", ruta);
    return NextResponse.redirect(destino);
  }

  const respuesta = NextResponse.next();
  if (STAGING_PROTEGIDO) {
    // Autenticado en staging, o ruta abierta: nunca indexable de todos modos.
    respuesta.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }
  return respuesta;
}

export const config = {
  // `proxy.ts` corre en runtime Node.js por defecto desde Next 16 — fijar
  // `runtime` aquí da error, así que no se declara (docs de Next, "Proxy
  // defaults to using the Node.js runtime").
  // Se excluyen los estáticos de Next y el favicon: pedir credenciales para
  // cada chunk multiplica las peticiones sin proteger nada que no esté ya
  // detrás del 401 de la página que los referencia.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
