import Link from "next/link";

import { loadCollection } from "@/lib/content/loader";
import {
  DESCARGAS,
  EJES,
  INICIO,
  PAGINA_DE_SERVICIOS,
  RAMAS,
  SERVICIOS,
  rutaEnDeServicio,
} from "@/lib/content/rutas";
import { PAGINAS_DEL_MOTOR } from "@/lib/sitio/motor";

/**
 * El regreso al nivel inmediato anterior (decisión de Ricardo, 2026-09-18).
 *
 * El sitio está anidado —Servicios → eje → línea → servicio; Blog → artículo;
 * Descargas → documento— y la barra solo enseña cuatro destinos. Sin esto,
 * desde `/ai/academy` no había forma de volver a `/ai` salvo el botón del
 * navegador. Una sola línea, siempre en el mismo sitio, que dice A DÓNDE vuelve:
 * «Volver a VoltAi by SLG», no un «Atrás» genérico.
 *
 * **El padre sale de la tabla de rutas**, no de partir la URL: un servicio
 * suelto (`/holdings`) no cuelga de un eje (`/ai`) aunque ambos sean oferta, y
 * `/ai/academy/phoenix-peex` vuelve a su línea y no al eje. Es la misma tabla
 * que dibuja la barra y el mapa (`lib/content/rutas.ts`), y la tabla sale de la
 * ficha del sitio.
 *
 * NI UNA CADENA DE TEXTO ESCRITA AQUÍ (RF-16): «Volver a» viene de `content/ui`
 * y el nombre del destino, del registro de contenido o de la propia barra.
 */
type Lang = "es" | "en";

type Padre = { href: string; nombre: string };

const BLOG = PAGINAS_DEL_MOTOR.blog.ruta;

export function padreDe(ruta: string, lang: Lang, t: Record<string, string>): Padre | null {
  const inicio = INICIO[lang];
  const servicios = PAGINA_DE_SERVICIOS[lang];
  if (ruta === inicio) return null;

  const paginas = loadCollection<{ title: string }>("page", lang);
  const tituloDePagina = (slug: string, porDefecto: string) =>
    paginas.find((p) => p.slug === slug)?.data.title ?? porDefecto;

  // Un servicio vuelve a su línea; uno suelto, a Servicios.
  for (const s of SERVICIOS) {
    const propia = lang === "en" ? rutaEnDeServicio(s) : s.es;
    if (ruta !== propia) continue;
    const rama = RAMAS.find((r) => r.slug === s.rama);
    if (!rama) return { href: servicios, nombre: t["nav.services"] };
    return { href: rama[lang], nombre: tituloDePagina(lang === "en" ? rama.slugEn : rama.slug, rama.slug) };
  }
  // Una línea vuelve a su eje.
  const linea = RAMAS.find((r) => r[lang] === ruta);
  const suEje = linea ? EJES.find((e) => e.clave === linea.eje) : undefined;
  if (suEje) {
    return {
      href: suEje[lang],
      nombre: tituloDePagina(lang === "en" ? suEje.slugEn : suEje.slug, t["nav.services"]),
    };
  }
  // Los ejes vuelven a Servicios.
  if (EJES.some((e) => e[lang] === ruta)) {
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
