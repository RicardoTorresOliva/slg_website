import { loadCollection } from "./loader.ts";
import type { Lang } from "./schema.ts";

/**
 * Lectura de la colección `post` (DU-11).
 *
 * **La publicación depende de `status`, nunca de que el archivo exista**
 * (RF-138, RF-141, criterio 6). Es la diferencia entre un borrador que vive en
 * la rama y un artículo publicado: los dos son archivos en el repositorio, y
 * solo uno se sirve. Si la existencia del archivo publicara, no habría forma
 * de preparar un artículo con antelación.
 */

export type Articulo = {
  slug: string;
  titulo: string;
  descripcion: string;
  fecha: string;
  etiquetas: string[];
  autor: string;
  portada: string | null;
  /** Slug del par en el otro idioma; `null` es legítimo (RF-26). */
  par: string | null;
};

type FrontmatterDePost = {
  title: string;
  description: string;
  date: string;
  tags: string[];
  status: "draft" | "published";
  cover?: string;
  author: string;
  pair: string | null;
};

function aArticulo(slug: string, d: FrontmatterDePost): Articulo {
  return {
    slug,
    titulo: d.title,
    descripcion: d.description,
    fecha: d.date,
    etiquetas: d.tags ?? [],
    autor: d.author,
    portada: d.cover ?? null,
    par: d.pair ?? null,
  };
}

/** Los artículos publicados de un idioma, del más reciente al más antiguo. */
export function listarArticulos(lang: Lang): Articulo[] {
  return loadCollection<FrontmatterDePost>("post", lang)
    .filter((r) => r.data.status === "published")
    .map((r) => aArticulo(r.slug, r.data))
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
}

/**
 * Un artículo por su slug. `null` si no existe **o si es borrador**.
 *
 * Que un borrador devuelva `null` y no el artículo es el criterio 2: no se
 * sirve en ninguna ruta pública, y quien conozca el slug tampoco lo ve.
 */
export function buscarArticulo(slug: string, lang: Lang): Articulo | null {
  const registro = loadCollection<FrontmatterDePost>("post", lang).find((r) => r.slug === slug);
  if (!registro || registro.data.status !== "published") return null;
  return aArticulo(registro.slug, registro.data);
}

/** Las etiquetas en uso por artículos publicados, con su recuento. */
export function listarEtiquetas(lang: Lang): { etiqueta: string; cuantos: number }[] {
  const cuenta = new Map<string, number>();
  for (const a of listarArticulos(lang)) {
    for (const e of a.etiquetas) cuenta.set(e, (cuenta.get(e) ?? 0) + 1);
  }
  return [...cuenta.entries()]
    .map(([etiqueta, cuantos]) => ({ etiqueta, cuantos }))
    .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta));
}

/**
 * Artículos de una etiqueta.
 *
 * La comparación ignora mayúsculas y acentos de URL: la etiqueta viaja en la
 * ruta y un visitante puede llegar con otra caja. Lo que **no** se hace es
 * traducir la etiqueta entre idiomas: es un dato del artículo, no una cadena
 * de interfaz.
 */
export function articulosDeEtiqueta(etiqueta: string, lang: Lang): Articulo[] {
  const buscada = decodeURIComponent(etiqueta).toLowerCase();
  return listarArticulos(lang).filter((a) =>
    a.etiquetas.some((e) => e.toLowerCase() === buscada),
  );
}
