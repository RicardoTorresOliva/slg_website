import { NextResponse, type NextRequest } from "next/server";

/**
 * middleware.ts — Protección de staging.
 *
 * FU-05, criterio 1: staging responde por HTTPS, **pide autenticación básica** y
 * devuelve `noindex`.
 *
 * Por qué importa: en staging vive el copy de la nueva oferta antes de
 * lanzarla. Sin esto, cualquiera que acierte la URL lo lee, y un buscador puede
 * indexarlo — R-34, el repositorio ya es público y no hace falta regalar también
 * el posicionamiento antes de tiempo.
 *
 * Se activa SOLO si las dos variables están presentes. En producción no se
 * definen, así que el sitio público queda abierto, como debe. Es un interruptor
 * por configuración, no por rama: una condición sobre `NODE_ENV` protegería mal
 * el día que staging corra en modo producción, que es justo lo que hace.
 */

const USUARIO = process.env.STAGING_BASIC_AUTH_USER;
const CLAVE = process.env.STAGING_BASIC_AUTH_PASSWORD;
const PROTEGIDO = Boolean(USUARIO && CLAVE);

/**
 * Rutas que quedan fuera de la autenticación.
 *
 * `/api/health` se excluye a propósito: es la sonda del monitor externo
 * (D-49) y del contenedor. Si pidiera credenciales, el monitor daría el sitio
 * por caído siempre y el aviso dejaría de significar nada. No expone dato
 * alguno: responde `{"status":"ok"}` y nada más.
 */
const RUTAS_ABIERTAS = ["/api/health"];

/**
 * Comparación en tiempo constante.
 *
 * Comparar credenciales con `===` filtra información por el tiempo que tarda en
 * fallar: cuanto más acierta el atacante, más tarda en devolver `false`. Con
 * suficientes intentos eso permite deducir el valor carácter a carácter. Aquí el
 * riesgo es bajo —es staging— pero la forma correcta cuesta lo mismo.
 */
function igualdadConstante(a: string, b: string): boolean {
  const ba = new TextEncoder().encode(a);
  const bb = new TextEncoder().encode(b);
  if (ba.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ba.length; i++) diff |= ba[i] ^ bb[i];
  return diff === 0;
}

function credencialesValidas(cabecera: string | null): boolean {
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

export function middleware(request: NextRequest) {
  if (!PROTEGIDO) return NextResponse.next();

  const ruta = request.nextUrl.pathname;

  if (RUTAS_ABIERTAS.some((r) => ruta === r || ruta.startsWith(r + "/"))) {
    return NextResponse.next();
  }

  if (!credencialesValidas(request.headers.get("authorization"))) {
    return new NextResponse("Acceso restringido", {
      status: 401,
      headers: {
        // Solo ASCII: una cabecera HTTP es una ByteString y no admite caracteres
        // de más de un byte. Una raya larga aquí devuelve 500 en vez de 401 —
        // lo encontró la prueba, no la revisión a ojo.
        "WWW-Authenticate": 'Basic realm="SLG Agency staging", charset="UTF-8"',
        // Aunque no haya sesión, un buscador no debe guardar ni el 401.
        "X-Robots-Tag": "noindex, nofollow, noarchive",
        "Cache-Control": "no-store",
      },
    });
  }

  // Autenticado: sirve la página, pero nunca indexable. `X-Robots-Tag` es más
  // fiable que una etiqueta `meta` porque cubre también PDF, imágenes y
  // cualquier respuesta que no sea HTML.
  const respuesta = NextResponse.next();
  respuesta.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return respuesta;
}

export const config = {
  // Se excluyen los estáticos de Next y el favicon: pedir credenciales para cada
  // chunk multiplica las peticiones sin proteger nada que no esté ya detrás del
  // 401 de la página que los referencia.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
