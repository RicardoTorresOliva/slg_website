"use client";

import Link from "next/link";
import { useState } from "react";

import { SheetMovil } from "./SheetMovil";
import { Wordmark } from "./Wordmark";

/**
 * 2a · Barra de navegación translúcida + sheet móvil.
 *
 * La translucidez no es decoración: es **wayfinding**. Al hacer scroll, el
 * contenido pasa por debajo y se ve, así que la barra dice «sigues en la misma
 * página» en vez de tapar como una losa. Con `prefers-reduced-transparency` se
 * vuelve sólida, porque para quien lo pide eso es ilegible, no elegante
 * (`app/motion.css`).
 *
 * Las tres preguntas de wayfinding (C.6), respondidas:
 *   · **dónde estoy** — el enlace activo lleva `aria-current="page"`;
 *   · **a dónde puedo ir** — los destinos están a la vista, no tras un icono;
 *   · **cómo salgo** — el wordmark siempre vuelve a la portada.
 */
export type Enlace = { href: string; etiqueta: string };

export function BarraDeNavegacion({
  enlaces,
  activo,
  etiquetaMenu,
  etiquetaIdioma,
  hrefIdioma,
}: {
  enlaces: readonly Enlace[];
  activo?: string;
  etiquetaMenu: string;
  etiquetaIdioma: string;
  hrefIdioma: string;
}) {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <header className="slg-material" style={barra}>
        <nav style={fila} aria-label={etiquetaMenu}>
          <Link href="/" style={{ display: "flex", alignItems: "center" }} aria-label="SLG Agency">
            <Wordmark />
          </Link>

          {/* Escritorio: los destinos a la vista. Móvil = rápido, escritorio =
              profundo (C.6, principio 5). */}
          <ul style={listaEscritorio} data-slg-desktop>
            {enlaces.map((e) => (
              <li key={e.href}>
                <Link
                  href={e.href}
                  aria-current={activo === e.href ? "page" : undefined}
                  style={{
                    ...enlaceEstilo,
                    color: activo === e.href ? "var(--slg-blue-deep)" : "var(--slg-ink-2)",
                    fontWeight: activo === e.href ? 600 : 500,
                  }}
                >
                  {e.etiqueta}
                </Link>
              </li>
            ))}
            <li>
              <Link href={hrefIdioma} style={enlaceEstilo} lang={hrefIdioma.startsWith("/en") ? "en" : "es"}>
                {etiquetaIdioma}
              </Link>
            </li>
          </ul>

          {/* Móvil: un solo botón, y el sheet arrastrable detrás. */}
          <button
            type="button"
            data-slg-mobile
            aria-expanded={abierto}
            aria-haspopup="dialog"
            onClick={() => setAbierto(true)}
            style={botonMenu}
          >
            {etiquetaMenu}
          </button>
        </nav>
      </header>

      <SheetMovil abierto={abierto} onCerrar={() => setAbierto(false)} etiqueta={etiquetaMenu}>
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.25rem" }}>
          {enlaces.map((e) => (
            <li key={e.href}>
              <Link
                href={e.href}
                aria-current={activo === e.href ? "page" : undefined}
                style={{ ...enlaceEstilo, display: "block", padding: "0.875rem 0.5rem", fontSize: "1.0625rem" }}
              >
                {e.etiqueta}
              </Link>
            </li>
          ))}
          <li>
            <Link href={hrefIdioma} style={{ ...enlaceEstilo, display: "block", padding: "0.875rem 0.5rem" }}>
              {etiquetaIdioma}
            </Link>
          </li>
        </ul>
      </SheetMovil>
    </>
  );
}

const barra: React.CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 40,
  borderBottom: "1px solid var(--slg-line)",
};

const fila: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "1rem",
  maxWidth: "72rem",
  margin: "0 auto",
  padding: "0.75rem 1.25rem",
};

const listaEscritorio: React.CSSProperties = {
  display: "flex",
  gap: "1.5rem",
  listStyle: "none",
  margin: 0,
  padding: 0,
  alignItems: "center",
};

const enlaceEstilo: React.CSSProperties = {
  color: "var(--slg-ink-2)",
  textDecoration: "none",
  fontSize: "0.9375rem",
};

const botonMenu: React.CSSProperties = {
  display: "none",
  padding: "0.5rem 0.875rem",
  border: "1px solid var(--slg-line)",
  borderRadius: "var(--slg-radius-sm)",
  background: "transparent",
  color: "var(--slg-ink)",
  font: "inherit",
  fontSize: "0.9375rem",
  cursor: "pointer",
};
