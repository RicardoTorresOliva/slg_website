/**
 * rutas.ts — El mapa de rutas de la capa pública, y su pareja de idioma.
 *
 * DOS COSAS QUE ESTE ARCHIVO RESUELVE, Y QUE SI NO VIVEN JUNTAS SE DESINCRONIZAN:
 *
 *   1. **Los cinco destinos del menú** (RF-01). Cinco, ni uno más, y con las
 *      rutas canónicas de `ui_wireframes` §1.1. Las etiquetas NO viven aquí:
 *      viven en `content/ui`, porque RF-16 no admite literales en `.tsx`.
 *   2. **El par de idioma de CADA ruta** (RF-04 y DoD #2): el conmutador tiene
 *      que llevar a **la misma página** en el otro idioma, nunca a la portada.
 *      El par sale del campo `pair` del frontmatter, que es el mismo que
 *      `check:pairs` verifica, así que una página sin pareja no se puede colar.
 *
 * Se resuelve **en tiempo de build**: las páginas públicas se prerrenderizan y
 * nada de esto cuesta una petición.
 */
import { loadCollection } from "./loader";
import { type Lang } from "./schema";

/** Las claves de `content/ui` de los cinco destinos, en el orden de A.1. */
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

/**
 * Rutas que NO salen de la colección `page` y cuyo par se declara a mano: la
 * portada, el índice del blog y las dos pantallas del grupo `(auth)` que sí
 * tienen versión pública en los dos idiomas.
 */
const PARES_FIJOS: ReadonlyArray<readonly [string, string]> = [
  ["/", "/en"],
  ["/blog", "/en/blog"],
  ["/acceder", "/en/sign-in"],
  ["/recuperar", "/en/recover"],
];

/** El idioma es una propiedad de la RUTA, no una negociación (RF-03). */
export function idiomaDeLaRuta(ruta: string): Lang {
  return ruta === "/en" || ruta.startsWith("/en/") ? "en" : "es";
}

type Par = { es: string; en: string };

function paresDePaginas(): Par[] {
  const es = loadCollection<{ pair?: string }>("page", "es");
  const en = loadCollection<{ pair?: string }>("page", "en");
  const slugsEn = new Set(en.map((r) => r.slug));
  const pares: Par[] = [];
  for (const registro of es) {
    const pareja = registro.data.pair;
    // Sin pareja declarada, o con una que no existe, NO se inventa un enlace:
    // la ruta se queda sin par y el conmutador lo dice. Un conmutador que
    // manda a la portada cuando no encuentra la página es peor que uno
    // desactivado, porque el visitante pierde dónde estaba.
    if (!pareja || !slugsEn.has(pareja)) continue;
    pares.push({ es: `/${registro.slug}`, en: `/en/${pareja}` });
  }
  return pares;
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
  for (const p of paresDePaginas()) añadir(p.es, p.en);
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
