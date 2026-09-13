/**
 * rutas.ts — El mapa de rutas públicas, y el par de idioma de cada una.
 *
 * **LA TABLA ES EXPLÍCITA, Y ESO ES LA DECISIÓN.** Podría derivarse del slug del
 * registro —`/${slug}`— y así estaba hasta DU-04. No sirve: el Anexo A.2 anida
 * la oferta (`/ai/academy/phoenix-peex`) mientras que el archivo se llama
 * `phoenix-peex.md`, y `/holdings` lo sirve un registro de servicio y no uno de
 * página. Una regla implícita que necesita cuatro excepciones ya no es una
 * regla: es una tabla mal escrita.
 *
 * Aquí está la tabla. Se lee de una vez, se compara con el Anexo A.2 línea a
 * línea, y `check:paginas` comprueba que cada ruta responde y que su par existe.
 */
import { loadCollection } from "./loader.ts";
import type { Lang } from "./schema.ts";

/** Los cinco destinos del menú (RF-01), con sus rutas canónicas de A.1. */
export const DESTINOS = [
  { clave: "nav.ai", es: "/ai", en: "/en/ai" },
  { clave: "nav.holdings", es: "/holdings", en: "/en/holdings" },
  { clave: "nav.doctrine", es: "/doctrina", en: "/en/doctrine" },
  { clave: "nav.blog", es: "/blog", en: "/en/blog" },
  { clave: "nav.about", es: "/nosotros", en: "/en/about" },
] as const;

/**
 * El botón de acceso va aparte de los cinco: es un botón, no un destino de
 * menú, y su peso visual es secundario a propósito (§10-8). **Nunca es rojo**:
 * el CTA de la capa pública es la descarga.
 */
export const ACCESO = { clave: "nav.signin", es: "/acceder", en: "/en/sign-in" } as const;

/** Las tres líneas de `SLG_AI`, con el slug de su registro de página. */
export const RAMAS = [
  { slug: "slg-academy", slugEn: "slg-academy-en", es: "/ai/academy", en: "/en/ai/academy" },
  { slug: "slg-enterprise", slugEn: "slg-enterprise-en", es: "/ai/enterprise", en: "/en/ai/enterprise" },
  { slug: "slg-factory", slugEn: "slg-factory-en", es: "/ai/factory", en: "/en/ai/factory" },
] as const;

export type Rama = (typeof RAMAS)[number];

/**
 * Las once páginas de servicio (A.2), con su ruta anidada bajo la rama.
 *
 * `SLG_Holdings` NO cuelga de `/ai`: es la otra rama de la casa y vive en la
 * raíz. Por eso su ruta se declara aquí y no se compone desde `RAMAS`.
 */
export const SERVICIOS = [
  { slug: "phoenix-peex", rama: "slg-academy", es: "/ai/academy/phoenix-peex" },
  { slug: "phoenix-teax", rama: "slg-academy", es: "/ai/academy/phoenix-teax" },
  { slug: "phoenix-retx", rama: "slg-academy", es: "/ai/academy/phoenix-retx" },
  { slug: "customize-programs", rama: "slg-academy", es: "/ai/academy/customize-programs" },
  { slug: "ai-coaching", rama: "slg-academy", es: "/ai/academy/ai-coaching" },
  { slug: "readiness", rama: "slg-enterprise", es: "/ai/enterprise/readiness" },
  { slug: "implement", rama: "slg-enterprise", es: "/ai/enterprise/implement" },
  { slug: "app-building", rama: "slg-factory", es: "/ai/factory/app-building" },
  { slug: "age-building", rama: "slg-factory", es: "/ai/factory/age-building" },
  { slug: "coo-as-a-service", rama: "slg-factory", es: "/ai/factory/coo-as-a-service" },
  { slug: "slg-holdings", rama: null, es: "/holdings" },
] as const;

export type Servicio = (typeof SERVICIOS)[number];

/** La ruta en inglés de un servicio: la misma, bajo `/en`. */
export const rutaEnDeServicio = (s: Servicio) => `/en${s.es}`;
/** El slug del registro en inglés: el mismo con sufijo, como los creó FU-03. */
export const slugEnDeServicio = (s: Servicio) => `${s.slug}-en`;

/**
 * Las dos páginas legales, con la ruta ANIDADA del Anexo A.2.
 *
 * Son públicas y sin autenticación **por obligación externa**: las pantallas de
 * consentimiento de Google y de Entra ID exigen una URL de privacidad que
 * responda sin sesión (F.2-1, R-13). Si dejan de responder 200, el inicio de
 * sesión social deja de poder configurarse.
 */
export const LEGALES = [
  { slug: "legal-privacidad", slugEn: "legal-privacy", es: "/legal/privacidad", en: "/en/legal/privacy" },
  { slug: "legal-terminos", slugEn: "legal-terms", es: "/legal/terminos", en: "/en/legal/terms" },
] as const;

/**
 * Páginas que NO se sirven desde `/[slug]` porque tienen ruta propia. Si una
 * página aparece en las dos partes, el mismo contenido queda en dos URL: los
 * enlaces se dividen y los buscadores ven contenido duplicado.
 */
export const PAGINAS_CON_RUTA_PROPIA = new Set([
  "home",
  "ai",
  ...RAMAS.map((r) => r.slug),
  ...RAMAS.map((r) => r.slugEn),
  ...LEGALES.map((l) => l.slug),
  ...LEGALES.map((l) => l.slugEn),
  "doctrina",
  "doctrine",
  "nosotros",
  "about",
  "descargas",
  "downloads",
  "gracias",
  "thank-you",
]);

/** Pares declarados a mano: los que no salen de una colección. */
const PARES_FIJOS: ReadonlyArray<readonly [string, string]> = [
  ["/", "/en"],
  ["/ai", "/en/ai"],
  ["/blog", "/en/blog"],
  ["/doctrina", "/en/doctrine"],
  ["/nosotros", "/en/about"],
  ["/descargas", "/en/downloads"],
  ["/gracias", "/en/thank-you"],
  ["/acceder", "/en/sign-in"],
  ["/recuperar", "/en/recover"],
];

/** El idioma es una propiedad de la RUTA, no una negociación (RF-03). */
export function idiomaDeLaRuta(ruta: string): Lang {
  return ruta === "/en" || ruta.startsWith("/en/") ? "en" : "es";
}

let cache: Map<string, string> | null = null;

function mapa(): Map<string, string> {
  if (cache) return cache;
  const m = new Map<string, string>();
  const añadir = (a: string, b: string) => {
    m.set(a, b);
    m.set(b, a);
  };

  for (const [a, b] of PARES_FIJOS) añadir(a, b);
  for (const r of RAMAS) añadir(r.es, r.en);
  for (const l of LEGALES) añadir(l.es, l.en);
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
    añadir(`/descargas/${registro.slug}`, `/en/downloads/${pareja}`);
  }

  // Las páginas sueltas —contacto, gracias, legales— siguen saliendo del campo
  // `pair` del frontmatter, que es el que `check:pairs` verifica.
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
