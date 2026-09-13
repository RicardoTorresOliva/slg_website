import Link from "next/link";

import { loadUiStrings } from "@/lib/content/loader";
import { ACCESO, DESTINOS, idiomaDeLaRuta, rutaEnElOtroIdioma } from "@/lib/content/rutas";

import { BarraDeNavegacion } from "./BarraDeNavegacion";

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
        }}
        textos={{ menu: t["nav.menu"], navegacion: t["nav.aria"], inicio: t["nav.home"] }}
      />

      <main id="contenido">{children}</main>

      <PiePublico idioma={idioma} t={t} />
    </>
  );
}

/**
 * 7 · Pie. Cinco enlaces y una línea de derechos.
 *
 * **No lleva mapa del sitio ni columnas de enlaces**: el sitio tiene cinco
 * destinos, y un pie que repite la navegación con otro formato es ruido. Lo que
 * sí lleva es lo que solo se busca abajo: legales y contacto.
 */
function PiePublico({ idioma, t }: { idioma: "es" | "en"; t: Record<string, string> }) {
  const enlaces =
    idioma === "en"
      ? [
          { href: "/en/doctrine", etiqueta: t["footer.doctrine"] },
          { href: "/en/downloads", etiqueta: t["footer.downloads"] },
          { href: "/en/contact", etiqueta: t["footer.contact"] },
          { href: "/en/legal-terms", etiqueta: t["footer.legalTerms"] },
          { href: "/en/legal-privacy", etiqueta: t["footer.legalPrivacy"] },
        ]
      : [
          { href: "/doctrina", etiqueta: t["footer.doctrine"] },
          { href: "/descargas", etiqueta: t["footer.downloads"] },
          { href: "/contacto", etiqueta: t["footer.contact"] },
          { href: "/legal-terminos", etiqueta: t["footer.legalTerms"] },
          { href: "/legal-privacidad", etiqueta: t["footer.legalPrivacy"] },
        ];

  return (
    <footer style={pie} aria-label={t["footer.aria"]}>
      <div style={pieFila}>
        <p style={{ margin: 0, color: "var(--slg-ink-2)", fontSize: "0.875rem" }}>
          © {new Date().getFullYear()} {t["footer.rights"]}
        </p>
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
  alignItems: "center",
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
