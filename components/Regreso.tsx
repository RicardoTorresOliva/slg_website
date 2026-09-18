import Link from "next/link";

import { loadCollection } from "@/lib/content/loader";
import { DESCARGAS, DESTINOS, EJES, RAMAS, SERVICIOS, rutaEnDeServicio } from "@/lib/content/rutas";

/**
 * El regreso al nivel inmediato anterior (decisión de Ricardo, 2026-09-18).
 *
 * El sitio está anidado —Servicios → eje → línea → servicio; Blog → artículo;
 * Descargas → documento— y la barra solo enseña cuatro destinos. Sin esto,
 * desde `/ai/academy` no había forma de volver a `/ai` salvo el botón del
 * navegador. Una sola línea, siempre en el mismo sitio, que dice A DÓNDE vuelve:
 * «Volver a VoltAi by SLG», no un «Atrás» genérico.
 *
 * **El padre sale de la tabla de rutas**, no de partir la URL: `/holdings` no
 * cuelga de `/ai` aunque ambos sean servicios, y `/ai/academy/phoenix-peex`
 * vuelve a su línea y no a `/ai`. Es la misma tabla que dibuja la barra y el
 * mapa (`lib/content/rutas.ts`).
 *
 * NI UNA CADENA DE TEXTO ESCRITA AQUÍ (RF-16): «Volver a» viene de `content/ui`
 * y el nombre del destino, del registro de contenido o de la propia barra.
 */
type Lang = "es" | "en";

type Padre = { href: string; nombre: string };

const BLOG = { es: "/blog", en: "/en/blog" } as const;

export function padreDe(ruta: string, lang: Lang, t: Record<string, string>): Padre | null {
  const inicio = DESTINOS[0][lang];
  const servicios = DESTINOS[1][lang];
  if (ruta === inicio) return null;

  const paginas = loadCollection<{ title: string }>("page", lang);
  const tituloDePagina = (slug: string, porDefecto: string) =>
    paginas.find((p) => p.slug === slug)?.data.title ?? porDefecto;

  // Un servicio vuelve a su línea; Holdings, a Servicios.
  for (const s of SERVICIOS) {
    const propia = lang === "en" ? rutaEnDeServicio(s) : s.es;
    if (ruta !== propia) continue;
    const rama = RAMAS.find((r) => r.slug === s.rama);
    if (!rama) return { href: servicios, nombre: t["nav.services"] };
    return { href: rama[lang], nombre: tituloDePagina(lang === "en" ? rama.slugEn : rama.slug, rama.slug) };
  }
  // Una línea vuelve al eje de inteligencia artificial.
  if (RAMAS.some((r) => r[lang] === ruta)) {
    return { href: EJES.voltai[lang], nombre: tituloDePagina("ai", t["nav.services"]) };
  }
  // Los dos ejes vuelven a Servicios.
  if (ruta === EJES.voltai[lang] || ruta === EJES.holdings[lang]) {
    return { href: servicios, nombre: t["nav.services"] };
  }
  // Un artículo o una etiqueta vuelven al blog; un documento, a la biblioteca.
  if (ruta.startsWith(`${BLOG[lang]}/`)) return { href: BLOG[lang], nombre: t["nav.blog"] };
  if (ruta.startsWith(`${DESCARGAS[lang]}/`)) return { href: DESCARGAS[lang], nombre: t["footer.downloads"] };
  // Todo lo demás cuelga de la portada.
  return { href: inicio, nombre: t["nav.start"] };
}

export function Regreso({ ruta, lang, t }: { ruta: string; lang: Lang; t: Record<string, string> }) {
  const padre = padreDe(ruta, lang, t);
  if (!padre) return null;
  return (
    <nav aria-label={t["nav.backAria"]} style={marco}>
      <Link href={padre.href} style={enlace}>
        {t["nav.backTo"]} {padre.nombre}
      </Link>
    </nav>
  );
}

const marco: React.CSSProperties = {
  maxWidth: "72rem",
  margin: "0 auto",
  padding: "1rem 1.25rem 0",
};

const enlace: React.CSSProperties = {
  display: "inline-block",
  color: "var(--slg-ink-2)",
  fontSize: "0.9375rem",
  textDecoration: "none",
};
