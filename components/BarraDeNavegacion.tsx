"use client";

import Link from "next/link";
import { useState } from "react";

import { BanderasDeIdioma } from "./Banderas";
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
  /** El idioma de ESTA página y cómo se llama en sí mismo («Español»). */
  idiomaActual: "es" | "en";
  nombreActual: string;
  /** Lo que se lee tras el nombre del idioma actual («idioma actual»). */
  textoActual: string;
};

export function BarraDeNavegacion({
  enlaces,
  activo,
  acceso,
  conmutador,
  inicio,
  marca,
  textos,
}: {
  enlaces: readonly Enlace[];
  activo?: string;
  acceso: Enlace;
  conmutador: Conmutador;
  /** A dónde lleva el logo: `/` en español, `/en` en inglés. */
  inicio: string;
  /** El nombre y el isotipo de la ficha. Llegan por prop: la ficha no viaja al cliente. */
  marca: { nombre: string; isotipo: string };
  textos: { menu: string; navegacion: string; inicio: string };
}) {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <header className="slg-material" style={barra}>
        <nav style={fila} aria-label={textos.navegacion}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", flexShrink: 0 }}>
            <Link href={inicio} style={{ display: "flex", alignItems: "center", flexShrink: 0 }} aria-label={textos.inicio}>
              <Wordmark label={marca.nombre} isotipo={marca.isotipo} />
            </Link>
            {/* El idioma se elige con dos banderas pegadas al logo, en escritorio
                y en móvil (decisión del 2026-09-17). Fuera del sheet a propósito:
                es lo primero que busca quien llega al idioma equivocado. */}
            <BanderasDeIdioma
              actual={conmutador.idiomaActual}
              href={conmutador.href}
              nombres={{ actual: conmutador.nombreActual, otro: conmutador.etiqueta }}
              textoActual={conmutador.textoActual}
              textoNoDisponible={conmutador.etiquetaNoDisponible}
            />
          </div>

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
  gap: "0.75rem",
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
