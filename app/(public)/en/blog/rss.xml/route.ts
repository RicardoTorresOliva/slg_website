import { listarArticulos } from "@/lib/content/blog";
import { ruta } from "@/lib/routes/map";

/**
 * Canal RSS de the English articles (DU-11, RF-23).
 *
 * Publica **solo artículos publicados del idioma correspondiente** (criterio
 * 3): `listarArticulos` ya filtra por `status`, así que un borrador no puede
 * colarse aquí ni por descuido. Los dos idiomas tienen canal propio — mezclar
 * ambos en uno obligaría a cada suscriptor a filtrar por su cuenta.
 */
export const dynamic = "force-dynamic";

function escapar(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET(request: Request) {
  const origen = new URL(request.url).origin;
  const articulos = listarArticulos("en");
  const base = `${origen}${ruta("blog", "en")}`;

  const items = articulos
    .map(
      (a) => `    <item>
      <title>${escapar(a.titulo)}</title>
      <link>${base}/${a.slug}</link>
      <guid isPermaLink="true">${base}/${a.slug}</guid>
      <description>${escapar(a.descripcion)}</description>
      <pubDate>${new Date(a.fecha).toUTCString()}</pubDate>
      <author>${escapar(a.autor)}</author>
${a.etiquetas.map((e) => `      <category>${escapar(e)}</category>`).join("\n")}
    </item>`,
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>SLG Agency — Blog</title>
    <link>${base}</link>
    <description>SLG Agency</description>
    <language>en</language>
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
