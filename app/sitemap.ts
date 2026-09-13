import type { MetadataRoute } from "next";

import { articulos } from "@/lib/content/blog";
import { baseDelSitio, rutasDelSitemap } from "@/lib/content/seo";

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

  const posts = (["es", "en"] as const).flatMap((lang) =>
    articulos(lang).map((a) => ({
      url: `${base}${lang === "en" ? "/en" : ""}/blog/${a.slug}`,
      lastModified: new Date(`${a.fecha}T00:00:00Z`),
      changeFrequency: "yearly" as const,
      priority: 0.5,
    })),
  );

  return [...paginas, ...posts];
}
