/**
 * rss.ts — El canal RSS del blog, por idioma.
 *
 * **Solo artículos publicados, y solo del idioma del canal** (RF-23). Un canal
 * que mezcla idiomas obliga a cada lector a filtrar, y un canal que incluye
 * borradores los publica: el RSS es una superficie pública más, no una copia
 * del repositorio.
 */
import { articulos, prefijo } from "./blog.ts";
import type { Lang } from "./schema.ts";

/** Escapa lo que va dentro de un nodo XML. Sin esto, un `&` rompe el canal entero. */
function xml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const TITULOS: Record<Lang, { titulo: string; descripcion: string }> = {
  es: {
    titulo: "SLG Agency — Blog",
    descripcion: "Criterio para decidir sobre inteligencia artificial, publicado sin venderlo.",
  },
  en: {
    titulo: "SLG Agency — Blog",
    descripcion: "Judgement for deciding on artificial intelligence, published without selling it.",
  },
};

export function canal(lang: Lang, base: string): string {
  const lista = articulos(lang);
  const meta = TITULOS[lang];
  const urlCanal = `${base}${prefijo(lang)}/blog/rss.xml`;

  const items = lista
    .map((a) => {
      const url = `${base}${prefijo(lang)}/blog/${a.slug}`;
      // RFC 822 es lo que exige RSS 2.0; `toUTCString()` lo produce.
      const fecha = new Date(`${a.fecha}T00:00:00Z`).toUTCString();
      const etiquetas = a.etiquetas.map((e) => `    <category>${xml(e)}</category>`).join("\n");
      return [
        "  <item>",
        `    <title>${xml(a.titulo)}</title>`,
        `    <link>${xml(url)}</link>`,
        `    <guid isPermaLink="true">${xml(url)}</guid>`,
        `    <pubDate>${fecha}</pubDate>`,
        `    <description>${xml(a.descripcion)}</description>`,
        etiquetas,
        "  </item>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${xml(meta.titulo)}</title>
  <link>${xml(`${base}${prefijo(lang)}/blog`)}</link>
  <description>${xml(meta.descripcion)}</description>
  <language>${lang}</language>
  <atom:link href="${xml(urlCanal)}" rel="self" type="application/rss+xml" />
${items}
</channel>
</rss>
`;
}

/** La base absoluta del sitio. Los enlaces de un RSS no pueden ser relativos. */
export function baseDelSitio(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://softlandingglobal.com").replace(/\/$/, "");
}
