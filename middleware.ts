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

/* ══════════════════════════════════════════════════════════════════════════
 * CSP — dos políticas, según la superficie
 * ══════════════════════════════════════════════════════════════════════════ */

/**
 * POR QUÉ LA CSP SE EMITE AQUÍ Y NO EN `next.config.ts`.
 *
 * Hallazgo de FU-10, medido con un navegador real: con `script-src 'self'` a
 * secas, Chromium **rechaza los scripts en línea que Next inyecta** —los que
 * llevan los datos de la página— y la hidratación muere con el error 412 de
 * React. El HTML se ve; **nada funciona**. Ni el formulario de descarga, ni el
 * sheet, ni el conmutador de idioma: el sitio entero queda mudo en producción,
 * y ninguna comprobación que no abra un navegador lo ve. Por eso existe
 * `scripts/ci/test-gesto.ts`.
 *
 * LA POLÍTICA NO PUEDE SER LA MISMA EN LAS DOS MITADES DEL SITIO, y la razón es
 * de arquitectura, no de comodidad:
 *
 *   · Las páginas públicas se **prerrenderizan en la compilación**. Su HTML es
 *     un archivo escrito antes de que exista la petición, así que **no puede
 *     llevar un nonce por petición**: el nonce que el navegador exigiría no
 *     estaría en el archivo. Lo que sí es cierto de ellas es que su contenido
 *     sale de `content/` —del repositorio, revisado— y **no refleja ni un solo
 *     dato que venga de fuera**. Ahí `'unsafe-inline'` no abre ninguna puerta
 *     que el atacante pueda cruzar: no hay por dónde inyectar.
 *   · Las superficies que **sí** renderizan datos de personas —`(auth)`,
 *     `(hq)`, `(portal)` y la API— se renderizan por petición. Ahí manda la
 *     política ESTRICTA: nonce nuevo en cada respuesta, `'strict-dynamic'` y
 *     **sin `'unsafe-inline'`**. Son justo las que un XSS querría.
 *
 * La alternativa —hacer dinámica toda la web pública para poder ponerle nonce—
 * cambiaría el renderizado de 26 páginas de marketing por una protección que
 * en esas páginas no protege de nada.
 *
 * `style-src` conserva `'unsafe-inline'` en ambas **a propósito**: los estilos
 * en línea de React (`style={{…}}`) son atributos, y un nonce no los cubre.
 */
/**
 * El origen de la analítica autoalojada (DU-12).
 *
 * SE LEE DE LA MISMA VARIABLE QUE USA EL COMPONENTE. Escribir el dominio a mano
 * aquí sería la forma exacta de que, el día que la instancia cambie de
 * subdominio, la etiqueta se emita y la CSP la bloquee: un fallo que no rompe
 * la página, solo deja de medir, y por eso tarda meses en notarse.
 *
 * Sin variable devuelve cadena vacía y la política NO se ensancha ni un byte:
 * el caso por defecto sigue siendo `'self'` a secas.
 */
function origenDeAnalitica(): string {
  const url = process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL;
  if (!url) return "";
  try {
    return new URL(url).origin;
  } catch {
    // Una URL mal escrita no puede tumbar el middleware: sin origen, sin
    // permiso. El script no cargará y se verá en la consola, que es donde se
    // arregla, en vez de quedarse el sitio entero sin responder.
    return "";
  }
}

const ANALITICA = origenDeAnalitica();
/** El sufijo que se añade a una directiva: `" https://…"` o nada. */
const CON_ANALITICA = ANALITICA ? ` ${ANALITICA}` : "";

const BASE_CSP = [
  "default-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  // Montserrat se sirve desde nuestro dominio (RNF-14): sin terceros.
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
];

/**
 * Prefijos que se renderizan por petición. Todo lo que pueda mostrar un dato
 * que no venga del repositorio tiene que estar en esta lista: entrar aquí
 * ENDURECE la política, nunca la relaja.
 */
const SUPERFICIES_DINAMICAS = [
  "/hq",
  "/portal",
  "/api",
  "/acceder",
  "/recuperar",
  "/restablecer",
  "/invitacion",
  "/en/sign-in",
  "/en/recover",
  "/prototipo",
];

function esDinamica(pathname: string): boolean {
  return SUPERFICIES_DINAMICAS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function politicaEstricta(nonce: string): string {
  // `'strict-dynamic'` es lo que permite que el bootstrap con nonce cargue los
  // chunks; sin él habría que nombrar cada uno. `'self'` queda detrás como
  // repliegue para navegadores que no entienden `'strict-dynamic'`.
  // LA ANALÍTICA NO SE NOMBRA AQUÍ, y es a propósito: `<Analitica />` solo
  // cuelga de `ArmazonPublico`, que es la capa pública. Las superficies que
  // muestran datos de personas —`(auth)`, `(hq)`, `(portal)`, la API— no se
  // miden, así que permitirles hablar con el servidor de analítica sería
  // ensanchar la política estricta para algo que nunca ocurre. Verificado en un
  // navegador: con la analítica configurada, `/acceder` no la carga.
  return [`script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`, ...BASE_CSP].join("; ");
}

function politicaPublica(): string {
  // Las dos directivas que necesita la analítica autoalojada, y solo aquí:
  // `script-src` para cargar la etiqueta y `connect-src` porque manda sus
  // mediciones por `fetch` a su propio servidor. Sin la segunda, el script
  // carga, no da error visible y NINGUNA visita se registra.
  return [
    `script-src 'self' 'unsafe-inline'${CON_ANALITICA}`,
    `connect-src 'self'${CON_ANALITICA}`,
    ...BASE_CSP.filter((d) => !d.startsWith("connect-src")),
  ].join("; ");
}

function nonceNuevo(): string {
  // El runtime edge no trae `node:crypto`; `crypto` global sí está.
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let bruto = "";
  for (const b of bytes) bruto += String.fromCharCode(b);
  return btoa(bruto);
}

/**
 * La respuesta base de toda petición. En las superficies dinámicas el nonce
 * viaja en la cabecera de PETICIÓN —de ahí lo lee Next para firmar sus propios
 * scripts— y la política en la de RESPUESTA, que es la que aplica el navegador.
 */
function respuestaBase(request: NextRequest): NextResponse {
  if (!esDinamica(request.nextUrl.pathname)) {
    const respuesta = NextResponse.next();
    respuesta.headers.set("Content-Security-Policy", politicaPublica());
    return respuesta;
  }
  const nonce = nonceNuevo();
  const politica = politicaEstricta(nonce);
  const cabeceras = new Headers(request.headers);
  cabeceras.set("x-nonce", nonce);
  cabeceras.set("Content-Security-Policy", politica);
  /**
   * La ruta pedida, para el armazón de HQ y del portal (FU-12).
   *
   * Un layout de Next **no recibe la ruta de su hija**, y sin ella la barra
   * lateral no puede saber cuál de sus enlaces está activo: «dónde estoy» se
   * quedaría sin respuesta justo en las pantallas que la necesitan. Se pone
   * aquí y no se lee de `usePathname()` porque el armazón es de servidor.
   *
   * Solo viaja en superficies que YA se renderizan por petición: no convierte
   * nada en dinámico que no lo fuera.
   */
  cabeceras.set("x-slg-ruta", request.nextUrl.pathname);
  const respuesta = NextResponse.next({ request: { headers: cabeceras } });
  respuesta.headers.set("Content-Security-Policy", politica);
  return respuesta;
}

export function middleware(request: NextRequest) {
  const usuario = process.env.STAGING_BASIC_AUTH_USER;
  const clave = process.env.STAGING_BASIC_AUTH_PASSWORD;

  // Producción: ninguna de las dos está definida. La compuerta de staging no
  // aplica, y se pasa directamente a la clasificación de §2.
  if (!usuario || !clave) return clasificar(request, respuestaBase(request));

  const { pathname } = request.nextUrl;

  if (!SIN_COMPUERTA.includes(pathname)) {
    if (!credencialCorrecta(request.headers.get("authorization"), usuario, clave)) {
      return new NextResponse("Authentication required.", {
        status: 401,
        headers: {
          "WWW-Authenticate": REALM,
          // Un 401 no ejecuta nada, pero se sirve desde el mismo origen: la
          // política no se relaja por ser una página de error.
          "Content-Security-Policy": politicaEstricta(nonceNuevo()),
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
  const respuesta = clasificar(request, respuestaBase(request));
  respuesta.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
  return respuesta;
}

/* ══════════════════════════════════════════════════════════════════════════
 * FU-06 · Clasificación de §2
 * ══════════════════════════════════════════════════════════════════════════ */

/**
 * NO EXISTE REGISTRO PÚBLICO (§10-10, RF-59).
 *
 * Better Auth publica `POST /api/auth/sign-up/email`, y con él cualquiera se
 * daría de alta en un sitio cuyo acceso es **solo por invitación**. Aquí deja de
 * existir: 404, no 403, porque un 403 confirma que la ruta está ahí.
 *
 * La única vía a una cuenta es `/api/acceso/invitacion`, que exige un testigo
 * válido y llama a la librería **por dentro** —una llamada de función, no una
 * petición—, así que este bloqueo no le afecta.
 */
const ALTA_PUBLICA = "/api/auth/sign-up";

/** Prefijos que exigen sesión: `(hq)` y `(portal)` (§2.4, pasos 1 y 2). */
const CON_SESION = ["/hq", "/portal"];

/** Prefijos del grupo `(auth)`: nunca indexables (§2.3, paso 3). */
const GRUPO_AUTH = [
  "/acceder",
  "/recuperar",
  "/invitacion",
  "/en/sign-in",
  "/en/recover",
  /**
   * `/prototipo` está aquí y ya no en el grupo `(auth)`: salió de ahí para
   * poder revisarse a ancho completo (FU-12), y su `noindex` no puede depender
   * de en qué carpeta viva. Es una herramienta de revisión, no una página.
   */
  "/prototipo",
];

function clasificar(request: NextRequest, respuesta: NextResponse): NextResponse {
  const { pathname } = request.nextUrl;

  if (pathname === ALTA_PUBLICA || pathname.startsWith(`${ALTA_PUBLICA}/`)) {
    return new NextResponse(null, {
      status: 404,
      headers: { "X-Robots-Tag": "noindex, nofollow" },
    });
  }

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
