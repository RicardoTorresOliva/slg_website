/**
 * blog.ts — La lógica del blog, en un sitio y no repartida por las rutas.
 *
 * **Una sola regla manda aquí, y es la que DU-11 pone por escrito: publica
 * `status`, no la existencia del archivo** (RF-138, RF-141). Un `.md` en el
 * repositorio con `status: draft` **no se sirve en ninguna parte**: ni en el
 * índice, ni en su URL directa, ni en una etiqueta, ni en el RSS. Si la
 * publicación dependiera del archivo, escribir sería publicar, y nadie podría
 * trabajar un borrador dentro del repositorio.
 *
 * La paridad ES/EN **no es obligatoria en artículos** (RF-26): un artículo
 * puede existir solo en español, y su `pair` vale `null`. Es lo contrario de
 * las páginas, donde un huérfano rompe el build.
 */
import { loadCollection } from "./loader.ts";
import type { Lang } from "./schema.ts";

export type Articulo = {
  slug: string;
  lang: Lang;
  titulo: string;
  descripcion: string;
  fecha: string;
  etiquetas: readonly string[];
  pair: string | null;
  autor: string;
  /**
   * Los tres extractos de A.5. Los lee `post.published` (RF-145) para que un
   * suscriptor pueda publicar en redes **sin leer de vuelta el repositorio**.
   * Se exponen aquí y no se releen aparte: dos lectores del mismo frontmatter
   * es el sitio donde uno de los dos se queda viejo.
   */
  social: { hook: string; linkedin: string; x: string };
  cuerpo: string;
};

type Frontmatter = {
  title: string;
  description: string;
  /**
   * YAML convierte `2026-09-08` sin comillas en un **objeto Date**, no en una
   * cadena. Escribir `fecha.localeCompare(...)` sobre eso rompe la compilación,
   * y rompe solo al ordenar: con un artículo no se nota. Por eso se normaliza
   * aquí, en la frontera, y el resto del código ve siempre una cadena ISO.
   */
  date: string | Date;
  tags?: readonly string[];
  status?: string;
  pair?: string | null;
  author: string;
  social?: { hook?: string; linkedin?: string; x?: string };
};

function fechaISO(valor: string | Date): string {
  if (valor instanceof Date) return valor.toISOString().slice(0, 10);
  return String(valor).slice(0, 10);
}

/** Todos los artículos PUBLICADOS de un idioma, del más nuevo al más viejo. */
export function articulos(lang: Lang): Articulo[] {
  return loadCollection<Frontmatter>("post", lang)
    .filter((p) => p.data.status === "published")
    .map((p) => ({
      slug: p.slug,
      lang: p.lang,
      titulo: p.data.title,
      descripcion: p.data.description,
      fecha: fechaISO(p.data.date),
      etiquetas: p.data.tags ?? [],
      pair: p.data.pair ?? null,
      autor: p.data.author,
      social: {
        hook: p.data.social?.hook ?? "",
        linkedin: p.data.social?.linkedin ?? "",
        x: p.data.social?.x ?? "",
      },
      cuerpo: p.body,
    }))
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
}

/** Un artículo publicado, o `null`. Un borrador devuelve `null`, como si no existiera. */
export function articulo(lang: Lang, slug: string): Articulo | null {
  return articulos(lang).find((a) => a.slug === slug) ?? null;
}

/**
 * Las etiquetas se normalizan para la URL y se conservan tal cual para mostrar.
 * `Agentic Mindset` → `agentic-mindset`, y de vuelta se busca comparando la
 * forma normalizada: así la URL es limpia sin perder la escritura original.
 */
export function paraUrl(etiqueta: string): string {
  return etiqueta
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Todas las etiquetas con artículos publicados, y cuántos tiene cada una. */
export function etiquetas(lang: Lang): { etiqueta: string; url: string; total: number }[] {
  const cuenta = new Map<string, { etiqueta: string; total: number }>();
  for (const a of articulos(lang)) {
    for (const e of a.etiquetas) {
      const url = paraUrl(e);
      const previo = cuenta.get(url);
      cuenta.set(url, { etiqueta: previo?.etiqueta ?? e, total: (previo?.total ?? 0) + 1 });
    }
  }
  return [...cuenta.entries()]
    .map(([url, v]) => ({ url, ...v }))
    .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta));
}

export function articulosDeEtiqueta(lang: Lang, url: string): Articulo[] {
  return articulos(lang).filter((a) => a.etiquetas.some((e) => paraUrl(e) === url));
}

/** El prefijo de ruta del idioma. En español no hay prefijo (§10-5). */
export const prefijo = (lang: Lang) => (lang === "en" ? "/en" : "");

/** La ruta del segmento de etiqueta, que SÍ se traduce: es una palabra, no nomenclatura. */
export const segmentoDeEtiqueta = (lang: Lang) => (lang === "en" ? "tag" : "etiqueta");
