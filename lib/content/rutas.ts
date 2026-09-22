/**
 * rutas.ts — El mapa de rutas públicas, y el par de idioma de cada una.
 *
 * **LA TABLA ES EXPLÍCITA, Y ESO ES LA DECISIÓN.** Podría derivarse del slug del
 * registro —`/${slug}`— y así estaba hasta DU-04. No sirve: el Anexo A.2 anida
 * la oferta (`/ai/academy/phoenix-peex`) mientras que el archivo se llama
 * `phoenix-peex.md`, y un servicio suelto lo sirve un registro de servicio y no
 * uno de página. Una regla implícita que necesita excepciones ya no es una
 * regla: es una tabla mal escrita.
 *
 * **Y LA TABLA YA NO SE ESCRIBE AQUÍ: SALE DE LA FICHA** (D-165, D-166). La
 * oferta de cada sitio —ejes, líneas, servicios, sus rutas y sus registros— la
 * declara `site.config.ts`; las páginas fijas del motor, `lib/sitio/motor.ts`.
 * Este archivo las junta en la forma que necesitan la barra, el mapa, el
 * regreso, la portada de Servicios y los frenos, y resuelve una ruta pedida en
 * lo que hay que pintar (`resolverRuta`), que es lo que sirve
 * `app/(public)/[...ruta]`. `check:sitio` comprueba que cada fila tiene su
 * contenido, y `check:paginas` que cada ruta responde y que su par existe.
 */
import { idiomaActivo, moduloActivo, serviciosDeLaOferta, sitio } from "../sitio/index.ts";
import { enIdioma, PAGINAS_DEL_MOTOR, rutaDisponible } from "../sitio/motor.ts";
import { loadCollection } from "./loader.ts";
import type { Lang } from "./schema.ts";

/**
 * Los destinos del menú, en el orden de la ficha. En SLG son cuatro (decisión
 * de Ricardo, 2026-09-18): «Empieza aquí» es la portada —el mapa del sitio,
 * poco invasivo—; «Servicios» es la casa comercial; Blog y Nosotros sostienen
 * la propuesta. Doctrina y Descargas se llegan desde Servicios, el mapa y el pie.
 *
 * El destino de un módulo apagado no sale: su ruta responde 404.
 */
export const DESTINOS = sitio.menu
  .filter((d) => rutaDisponible(d.ruta.es))
  .map((d) => ({
    clave: d.clave,
    es: d.ruta.es,
    en: enIdioma(d.ruta, "en"),
  }));

/**
 * Los ejes de la oferta: el nivel más alto, con su página de índice. Ya no son
 * destinos del menú: se entra por Servicios. `slug`/`slugEn` son los registros
 * de `content/pages` que los describen.
 */
export const EJES = sitio.oferta.ejes.map((e) => ({
  clave: e.clave,
  nombre: e.nombre,
  slug: e.pagina.es,
  slugEn: enIdioma(e.pagina, "en"),
  es: e.ruta.es,
  en: enIdioma(e.ruta, "en"),
  foto: e.foto,
}));

export type Eje = (typeof EJES)[number];

/** Las líneas de todos los ejes, con el slug de su registro de página y el eje del que cuelgan. */
export const RAMAS = sitio.oferta.ejes.flatMap((e) =>
  e.lineas.map((l) => ({
    clave: l.clave,
    nombre: l.nombre,
    eje: e.clave,
    slug: l.pagina.es,
    slugEn: enIdioma(l.pagina, "en"),
    es: l.ruta.es,
    en: enIdioma(l.ruta, "en"),
    foto: l.foto,
    enlaceExterno: l.enlaceExterno,
  })),
);

export type Rama = (typeof RAMAS)[number];

/**
 * Todos los servicios de la oferta, con su ruta.
 *
 * `rama` es el slug de la línea de la que cuelgan, o `null` si el servicio es
 * **suelto**: vive al nivel de los ejes (en SLG, `Holdings by SLG` en
 * `/holdings`) y vuelve a Servicios, no a una línea.
 */
export const SERVICIOS = serviciosDeLaOferta().map((s) => ({
  slug: s.slug,
  slugEn: enIdioma(s.pagina, "en"),
  nombre: s.nombre,
  rama: s.linea ? s.linea.pagina.es : null,
  es: s.ruta.es,
  en: enIdioma(s.ruta, "en"),
  foto: s.foto,
}));

export type Servicio = (typeof SERVICIOS)[number];

/** La ruta en inglés de un servicio. */
export const rutaEnDeServicio = (s: Servicio) => s.en;
/** El slug del registro en inglés de un servicio. */
export const slugEnDeServicio = (s: Servicio) => s.slugEn;

/** Doctrina no es destino del menú: se llega desde Servicios, el mapa y el pie. */
export const DOCTRINA = PAGINAS_DEL_MOTOR.doctrina.ruta;

/** La biblioteca de descargas. */
export const DESCARGAS = PAGINAS_DEL_MOTOR.descargas.ruta;

/** La página de Servicios, la casa comercial. */
export const PAGINA_DE_SERVICIOS = PAGINAS_DEL_MOTOR.servicios.ruta;

/** La portada. */
export const INICIO = PAGINAS_DEL_MOTOR.inicio.ruta;

/**
 * El botón de acceso va aparte de los destinos: es un botón, no un destino de
 * menú, y su peso visual es secundario a propósito (§10-8). **Nunca es rojo**:
 * el CTA de la capa pública es la descarga.
 */
export const ACCESO = { clave: "nav.signin", ...PAGINAS_DEL_MOTOR.acceder.ruta } as const;

/**
 * Las dos páginas legales, con la ruta ANIDADA del Anexo A.2.
 *
 * Son públicas y sin autenticación **por obligación externa**: las pantallas de
 * consentimiento de Google y de Entra ID exigen una URL de privacidad que
 * responda sin sesión (F.2-1, R-13). Si dejan de responder 200, el inicio de
 * sesión social deja de poder configurarse.
 */
export const LEGALES = [PAGINAS_DEL_MOTOR.legalPrivacidad, PAGINAS_DEL_MOTOR.legalTerminos].map((l) => ({
  slug: l.registro.es,
  slugEn: l.registro.en,
  es: l.ruta.es,
  en: l.ruta.en,
}));

/**
 * Páginas que NO se sirven como página suelta en `/<slug>` porque las pinta
 * otra ruta: las del motor y los índices de los ejes y las líneas. Si una
 * página aparece en las dos partes, el mismo contenido queda en dos URL: los
 * enlaces se dividen y los buscadores ven contenido duplicado.
 */
export const PAGINAS_CON_RUTA_PROPIA = new Set<string>([
  ...Object.values(PAGINAS_DEL_MOTOR).flatMap((p) => ("registro" in p ? [p.registro.es, p.registro.en] : [])),
  ...EJES.flatMap((e) => [e.slug, e.slugEn]),
  ...RAMAS.flatMap((r) => [r.slug, r.slugEn]),
]);

/** Una salida de la página de error: a dónde, y la clave de `content/ui/error.*.json`. */
export type SalidaDeError = { href: string; clave: string };

/**
 * Las tres salidas de la 404 y la 500 (RF-17), por idioma: la portada, la
 * oferta —el primer eje, o Servicios si el sitio no tiene ejes— y el blog, si
 * el sitio tiene blog.
 */
export function salidasDeError(): Record<Lang, SalidaDeError[]> {
  const para = (lang: Lang): SalidaDeError[] => [
    { href: INICIO[lang], clave: "error.home" },
    { href: EJES[0]?.[lang] || PAGINA_DE_SERVICIOS[lang], clave: "error.ai" },
    ...(moduloActivo("blog") ? [{ href: PAGINAS_DEL_MOTOR.blog.ruta[lang], clave: "error.blog" }] : []),
  ];
  return { es: para("es"), en: para("en") };
}

/** El idioma es una propiedad de la RUTA, no una negociación (RF-03). */
export function idiomaDeLaRuta(ruta: string): Lang {
  return ruta === "/en" || ruta.startsWith("/en/") ? "en" : "es";
}

/* ══════════════════════════════════════════════════════════════════════════
 * Lo que sirve `app/(public)/[...ruta]`
 * ══════════════════════════════════════════════════════════════════════════ */

/**
 * Lo que hay que pintar en una ruta de la ficha. Cuatro clases, y ninguna más:
 * el índice de un eje, el de una línea, la página de un servicio —de línea o
 * suelto— y una página suelta de `content/pages` sin ruta propia.
 */
export type DestinoDeLaFicha =
  | { tipo: "eje"; lang: Lang; eje: Eje }
  | { tipo: "linea"; lang: Lang; linea: Rama }
  | { tipo: "servicio"; lang: Lang; servicio: Servicio }
  | { tipo: "pagina"; lang: Lang; slug: string };

let destinos: Map<string, DestinoDeLaFicha> | null = null;

/**
 * La tabla ruta → destino. **La oferta se registra antes que las páginas
 * sueltas y gana si chocan**: una página que se llamara como un eje no puede
 * quitarle la ruta. Que no choquen lo exige `check:sitio`.
 */
function tablaDeDestinos(): Map<string, DestinoDeLaFicha> {
  if (destinos) return destinos;
  const m = new Map<string, DestinoDeLaFicha>();
  // Un idioma apagado no tiene rutas: ni se prerrenderizan ni se resuelven.
  for (const lang of (["es", "en"] as const).filter(idiomaActivo)) {
    for (const eje of EJES) if (eje[lang]) m.set(eje[lang], { tipo: "eje", lang, eje });
    for (const linea of RAMAS) if (linea[lang]) m.set(linea[lang], { tipo: "linea", lang, linea });
    for (const servicio of SERVICIOS) if (servicio[lang]) m.set(servicio[lang], { tipo: "servicio", lang, servicio });
    for (const p of loadCollection("page", lang)) {
      if (PAGINAS_CON_RUTA_PROPIA.has(p.slug)) continue;
      const ruta = lang === "en" ? `/en/${p.slug}` : `/${p.slug}`;
      if (!m.has(ruta)) m.set(ruta, { tipo: "pagina", lang, slug: p.slug });
    }
  }
  destinos = m;
  return m;
}

/** Qué pintar en esta ruta, o `null` si la ficha no la declara. */
export function resolverRuta(ruta: string): DestinoDeLaFicha | null {
  return tablaDeDestinos().get(normaliza(ruta)) ?? null;
}

/** Todas las rutas que resuelve la ficha en un idioma: el `generateStaticParams` de `[...ruta]`. */
export function rutasDeLaFicha(lang: Lang): string[] {
  return [...tablaDeDestinos()].filter(([, d]) => d.lang === lang).map(([ruta]) => ruta);
}

/* ══════════════════════════════════════════════════════════════════════════
 * Los pares de idioma
 * ══════════════════════════════════════════════════════════════════════════ */

let cache: Map<string, string> | null = null;

function mapa(): Map<string, string> {
  if (cache) return cache;
  const m = new Map<string, string>();
  const añadir = (a: string, b: string) => {
    // Sin la otra mitad no hay par: un enlace inventado es peor que ninguno.
    // Y sin inglés, o con el módulo apagado, la otra mitad no existe.
    if (!a || !b || !rutaDisponible(a) || !rutaDisponible(b)) return;
    m.set(a, b);
    m.set(b, a);
  };

  for (const p of Object.values(PAGINAS_DEL_MOTOR)) añadir(p.ruta.es, p.ruta.en);
  for (const e of EJES) añadir(e.es, e.en);
  for (const r of RAMAS) añadir(r.es, r.en);
  for (const s of SERVICIOS) añadir(s.es, rutaEnDeServicio(s));

  /**
   * Las páginas de documento. Su par sale del campo `pair` del registro de
   * descarga, igual que el de las páginas: sin esto el conmutador salía
   * DESACTIVADO en las once páginas de documento —se vio en una captura— y el
   * visitante inglés se quedaba sin su versión de un documento que existe.
   */
  const descargasEs = loadCollection<{ pair?: string }>("download", "es");
  const slugsDescargaEn = new Set(loadCollection("download", "en").map((r) => r.slug));
  for (const registro of descargasEs) {
    const pareja = registro.data.pair;
    if (!pareja || !slugsDescargaEn.has(pareja)) continue;
    añadir(`${DESCARGAS.es}/${registro.slug}`, `${DESCARGAS.en}/${pareja}`);
  }

  // Las páginas sueltas siguen saliendo del campo `pair` del frontmatter, que
  // es el que `check:pairs` verifica.
  const es = loadCollection<{ pair?: string }>("page", "es");
  const en = loadCollection<{ pair?: string }>("page", "en");
  const slugsEn = new Set(en.map((r) => r.slug));
  for (const registro of es) {
    if (PAGINAS_CON_RUTA_PROPIA.has(registro.slug)) continue;
    const pareja = registro.data.pair;
    // Sin pareja declarada, o con una que no existe, NO se inventa un enlace.
    if (!pareja || !slugsEn.has(pareja)) continue;
    añadir(`/${registro.slug}`, `/en/${pareja}`);
  }

  cache = m;
  return m;
}

/**
 * La misma página en el otro idioma, o `null` si esa página no existe todavía.
 * `null` es un estado legítimo y se dibuja (criterio 6 de DU-02), no se esconde.
 */
export function rutaEnElOtroIdioma(ruta: string): string | null {
  return mapa().get(normaliza(ruta)) ?? null;
}

function normaliza(ruta: string): string {
  if (ruta.length > 1 && ruta.endsWith("/")) return ruta.slice(0, -1);
  return ruta;
}
