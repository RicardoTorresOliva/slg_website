import Link from "next/link";

import { loadUiStrings } from "@/lib/content/loader";
import { ACCESO, DESTINOS, idiomaDeLaRuta, rutaEnElOtroIdioma } from "@/lib/content/rutas";
import { organizacionJsonLd } from "@/lib/content/seo";

import { Analitica } from "./Analitica";
import { BarraDeNavegacion } from "./BarraDeNavegacion";
import { DatosEstructurados } from "./DatosEstructurados";
import { Fotografia } from "./Fotografia";

/**
 * El marco por el que se navega todo lo demás (DU-02).
 *
 * ES UN COMPONENTE DE SERVIDOR, Y ESO ES LA DECISIÓN. Podría haber vivido en
 * `app/(public)/layout.tsx` leyendo la ruta de una cabecera, pero leer una
 * cabecera **convierte la página en dinámica**: las 26 rutas públicas dejarían
 * de prerrenderizarse y cada visita pasaría por el VPS. Así que la ruta llega
 * como prop desde cada página, que la conoce en tiempo de build, y el sitio
 * público sigue siendo estático.
 *
 * NI UNA CADENA DE TEXTO ESCRITA AQUÍ (RF-16). Todas salen de `content/ui`, y
 * `check:cadenas` falla si alguien escribe una a mano en este archivo o en los
 * de navegación y pie.
 *
 * NO ENLAZA `/hq` NI `/portal` (RF-87, criterio 5). Mientras M3 y M4 sigan
 * abiertos, esas superficies no se anuncian: existen, responden, y no se dicen.
 */
export function ArmazonPublico({
  ruta,
  children,
}: {
  /** La ruta de ESTA página, tal cual se sirve. Ej.: `/doctrina`, `/en/about`. */
  ruta: string;
  children: React.ReactNode;
}) {
  const idioma = idiomaDeLaRuta(ruta);
  const t = loadUiStrings()[idioma];
  const otra = rutaEnElOtroIdioma(ruta);

  const enlaces = DESTINOS.map((d) => ({ href: d[idioma], etiqueta: t[d.clave] }));

  return (
    <>
      <DatosEstructurados datos={organizacionJsonLd()} />

      {/* Primera parada del tabulador: saltar la navegación. Para quien navega
          con teclado, recorrer cinco destinos en cada página es el equivalente
          a que la barra midiera media pantalla. */}
      <a href="#contenido" className="slg-saltar">
        {t["nav.skip"]}
      </a>

      <BarraDeNavegacion
        enlaces={enlaces}
        activo={ruta}
        acceso={{ href: ACCESO[idioma], etiqueta: t["nav.signin"] }}
        inicio={idioma === "en" ? "/en" : "/"}
        conmutador={{
          href: otra,
          etiqueta: t["nav.lang"],
          etiquetaNoDisponible: t["nav.langUnavailable"],
          idiomaDestino: idioma === "es" ? "en" : "es",
          idiomaActual: idioma,
          nombreActual: t["nav.langName"],
          textoActual: t["nav.langCurrent"],
        }}
        textos={{ menu: t["nav.menu"], navegacion: t["nav.aria"], inicio: t["nav.home"] }}
      />

      <main id="contenido">
        <Fotografia ruta={ruta} />
        {children}
      </main>

      <PiePublico idioma={idioma} t={t} />

      {/* Sin variable, esto no emite nada: la capa pública se sirve sin un solo
          script de terceros (RF-127). */}
      <Analitica />
    </>
  );
}

/**
 * 7 · Pie. Seis enlaces y una línea de derechos.
 *
 * **No lleva columnas de enlaces**: el sitio tiene cinco destinos, y un pie que
 * repite la navegación con otro formato es ruido. Lo que sí lleva es lo que solo
 * se busca abajo: legales y contacto, y la puerta al mapa del sitio
 * («Empieza aquí»), que vive en el pie y no en la barra para que los destinos
 * del menú sigan siendo cinco (RF-01).
 */
function PiePublico({ idioma, t }: { idioma: "es" | "en"; t: Record<string, string> }) {
  const enlaces =
    idioma === "en"
      ? [
          { href: "/en/start-here", etiqueta: t["footer.startHere"] },
          { href: "/en/doctrine", etiqueta: t["footer.doctrine"] },
          { href: "/en/downloads", etiqueta: t["footer.downloads"] },
          { href: "/en/contact", etiqueta: t["footer.contact"] },
          { href: "/en/legal/terms", etiqueta: t["footer.legalTerms"] },
          { href: "/en/legal/privacy", etiqueta: t["footer.legalPrivacy"] },
        ]
      : [
          { href: "/empieza-aqui", etiqueta: t["footer.startHere"] },
          { href: "/doctrina", etiqueta: t["footer.doctrine"] },
          { href: "/descargas", etiqueta: t["footer.downloads"] },
          { href: "/contacto", etiqueta: t["footer.contact"] },
          { href: "/legal/terminos", etiqueta: t["footer.legalTerms"] },
          { href: "/legal/privacidad", etiqueta: t["footer.legalPrivacy"] },
        ];

  return (
    <footer style={pie} aria-label={t["footer.aria"]}>
      <div style={pieFila}>
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {/* El logotipo corporativo completo, con lema, va en el pie por decisión
              de Ricardo (2026-09-17). La barra sigue llevando el isotipo con la
              marca pública «SLG Agency» (§10-4); aquí abajo firma la matriz.
              `<img>` y no `next/image`: un WebP de 35 KB servido tal cual, sin
              el optimizador ni un componente cliente para una imagen estática. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/marca/logo-softlanding-global.webp"
            alt={t["footer.logoAlt"]}
            width={600}
            height={163}
            style={{ height: "2.75rem", width: "auto", display: "block" }}
          />
          <p style={{ margin: 0, color: "var(--slg-ink-2)", fontSize: "0.875rem" }}>
            © {new Date().getFullYear()} {t["footer.rights"]}
          </p>
        </div>
        <ul style={pieLista}>
          {enlaces.map((e) => (
            <li key={e.href}>
              <Link href={e.href} style={enlaceDePie}>
                {e.etiqueta}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}

const pie: React.CSSProperties = {
  borderTop: "1px solid var(--slg-line)",
  marginTop: "4rem",
  background: "var(--slg-paper-2)",
};

const pieFila: React.CSSProperties = {
  maxWidth: "72rem",
  margin: "0 auto",
  padding: "2rem 1.25rem",
  display: "flex",
  flexWrap: "wrap",
  gap: "1rem",
  alignItems: "flex-end",
  justifyContent: "space-between",
};

const pieLista: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "1.25rem",
  listStyle: "none",
  margin: 0,
  padding: 0,
};

const enlaceDePie: React.CSSProperties = {
  color: "var(--slg-ink-2)",
  textDecoration: "none",
  fontSize: "0.875rem",
};
