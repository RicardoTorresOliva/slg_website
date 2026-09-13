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
 *   · **a dónde puedo ir** — los cinco destinos están a la vista, no tras un
 *     icono ni tras un desplegable, que convertiría cinco en dieciséis (RF-01);
 *   · **cómo salgo** — el wordmark siempre vuelve a la portada.
 *
 * NI UNA CADENA DE TEXTO SE ESCRIBE AQUÍ (RF-16). Todas llegan por props desde
 * `ArmazonPublico`, que las lee de `content/ui`. Lo vigila `check:cadenas`.
 */
export type Enlace = { href: string; etiqueta: string };

export type Conmutador = {
  /** `null` cuando esta página todavía no existe en el otro idioma. */
  href: string | null;
  etiqueta: string;
  /** Qué se lee cuando no hay pareja. Se dibuja; no se esconde. */
  etiquetaNoDisponible: string;
  /** El idioma AL QUE lleva, para el atributo `hreflang`. */
  idiomaDestino: string;
};

export function BarraDeNavegacion({
  enlaces,
  activo,
  acceso,
  conmutador,
  inicio,
  textos,
}: {
  enlaces: readonly Enlace[];
  activo?: string;
  acceso: Enlace;
  conmutador: Conmutador;
  /** A dónde lleva el logo: `/` en español, `/en` en inglés. */
  inicio: string;
  textos: { menu: string; navegacion: string; inicio: string };
}) {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <header className="slg-material" style={barra}>
        <nav style={fila} aria-label={textos.navegacion}>
          <Link href={inicio} style={{ display: "flex", alignItems: "center" }} aria-label={textos.inicio}>
            <Wordmark />
          </Link>

          {/* Escritorio: los cinco destinos a la vista. Móvil = rápido,
              escritorio = profundo (C.6, principio 5). */}
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
              <ConmutadorDeIdioma conmutador={conmutador} />
            </li>
            <li>
              {/* Secundario a propósito: el CTA de la capa pública es la
                  descarga, no el login (§10-8). Nunca rojo. */}
              <Link href={acceso.href} style={botonAcceso}>
                {acceso.etiqueta}
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
            {textos.menu}
          </button>
        </nav>
      </header>

      <SheetMovil abierto={abierto} onCerrar={() => setAbierto(false)} etiqueta={textos.navegacion}>
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.25rem" }}>
          {enlaces.map((e) => (
            <li key={e.href}>
              <Link
                href={e.href}
                aria-current={activo === e.href ? "page" : undefined}
                style={enlaceDeSheet}
              >
                {e.etiqueta}
              </Link>
            </li>
          ))}
          <li>
            <Link href={acceso.href} style={enlaceDeSheet}>
              {acceso.etiqueta}
            </Link>
          </li>
          <li style={{ paddingTop: "0.5rem", borderTop: "1px solid var(--slg-line)" }}>
            <ConmutadorDeIdioma conmutador={conmutador} bloque />
          </li>
        </ul>
      </SheetMovil>
    </>
  );
}

/**
 * El conmutador lleva a **la misma página** en el otro idioma (RF-04, DoD #2).
 *
 * Cuando esa página no existe todavía, **no se enlaza a la portada**: se dibuja
 * desactivado y se dice por qué. Mandar al visitante a la portada porque su
 * página no está traducida le hace perder dónde estaba, y encima sin avisar.
 */
function ConmutadorDeIdioma({ conmutador, bloque }: { conmutador: Conmutador; bloque?: boolean }) {
  const base = bloque ? enlaceDeSheet : enlaceEstilo;
  if (!conmutador.href) {
    return (
      <span
        aria-disabled="true"
        title={conmutador.etiquetaNoDisponible}
        style={{ ...base, color: "var(--slg-ink-3, var(--slg-ink-2))", opacity: 0.55, cursor: "not-allowed" }}
      >
        {conmutador.etiqueta}
      </span>
    );
  }
  return (
    <Link href={conmutador.href} hrefLang={conmutador.idiomaDestino} lang={conmutador.idiomaDestino} style={base}>
      {conmutador.etiqueta}
    </Link>
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

const enlaceDeSheet: React.CSSProperties = {
  ...enlaceEstilo,
  display: "block",
  padding: "0.875rem 0.5rem",
  fontSize: "1.0625rem",
};

const botonAcceso: React.CSSProperties = {
  ...enlaceEstilo,
  padding: "0.5rem 0.875rem",
  border: "1px solid var(--slg-line)",
  borderRadius: "var(--slg-radius-sm)",
  color: "var(--slg-ink)",
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
