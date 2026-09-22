import type { MetadataRoute } from "next";

import { articulos } from "@/lib/content/blog";
import { rutasDelSitemap } from "@/lib/content/seo";
import { baseDelSitio } from "@/lib/content/sitio";
import { idiomaActivo, moduloActivo } from "@/lib/sitio";

/**
 * `sitemap.xml` — las rutas de **los dos idiomas** (RNF-17).
 *
 * Los borradores del blog no entran, porque no entran en ninguna parte: la
 * lista de artículos sale de `articulos()`, que ya filtra por `status`.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = baseDelSitio();
  const hoy = new Date();

  const paginas = rutasDelSitemap().map((ruta) => ({
    url: `${base}${ruta}`,
    lastModified: hoy,
    changeFrequency: "monthly" as const,
    priority: ruta === "/" || ruta === "/en" ? 1 : 0.7,
  }));

  // Sin blog no hay artículos que anunciar; sin inglés, solo los españoles.
  const idiomas = (["es", "en"] as const).filter(idiomaActivo);
  const posts = (moduloActivo("blog") ? idiomas : []).flatMap((lang) =>
    articulos(lang).map((a) => ({
      url: `${base}${lang === "en" ? "/en" : ""}/blog/${a.slug}`,
      lastModified: new Date(`${a.fecha}T00:00:00Z`),
      changeFrequency: "yearly" as const,
      priority: 0.5,
    })),
  );

  return [...paginas, ...posts];
}
