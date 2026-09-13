import type { MetadataRoute } from "next";

import { baseDelSitio } from "@/lib/content/seo";

/**
 * `robots.txt`.
 *
 * **Las tres superficies privadas se declaran fuera del índice**: `/hq`,
 * `/portal` y `/api`. No es la protección —esa es la sesión y la matriz B.3—,
 * es evitar que un buscador publique la existencia de rutas que nadie debería
 * estar buscando.
 *
 * Staging **no llega aquí**: su `noindex` lo pone el middleware en cada
 * respuesta, que es más fuerte que un archivo que un rastreador puede ignorar.
 */
export default function robots(): MetadataRoute.Robots {
  const base = baseDelSitio();
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/hq", "/portal", "/api", "/prototipo"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
