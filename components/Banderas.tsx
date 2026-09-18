import Link from "next/link";

/**
 * Las dos banderas junto al logo: el conmutador de idioma (RF-04, DoD #2).
 *
 * Decisión de Ricardo (2026-09-17): el idioma se elige con las banderas de
 * España y de Estados Unidos, pegadas al logo, en escritorio y en móvil. Antes
 * era un enlace de texto al final del menú, que en móvil quedaba dentro del
 * sheet: dos toques para algo que se busca nada más llegar.
 *
 * Lo que NO cambia respecto al conmutador anterior:
 *   · Lleva a **la misma página** en el otro idioma, nunca a la portada.
 *   · Cuando esa página no existe todavía, la bandera se dibuja **desactivada**
 *     y dice por qué en el `title`; no desaparece (`check:armazon`, criterio 6).
 *   · Es el ÚNICO enlace con `hreflang` de la página: así lo encuentra
 *     `check:armazon` (criterio 2). La bandera del idioma actual no es un enlace.
 *
 * NI UNA CADENA DE TEXTO SE ESCRIBE AQUÍ (RF-16): los nombres de los idiomas
 * llegan por props desde `content/ui`. Las banderas son SVG en línea, sin
 * petición ni tercero (RF-127), y llevan `aria-hidden`: el nombre accesible lo
 * da el elemento que las envuelve.
 */
export type Idioma = "es" | "en";

export type PropsDeBanderas = {
  /** El idioma de ESTA página. Su bandera se marca como actual y no enlaza. */
  actual: Idioma;
  /** A dónde lleva la otra bandera; `null` si la página no existe en el otro idioma. */
  href: string | null;
  /** Nombre del idioma actual y del otro, en el idioma de cada uno. */
  nombres: { readonly actual: string; readonly otro: string };
  /** Lo que se lee tras el nombre del idioma actual («idioma actual»). */
  textoActual: string;
  /** Qué se lee cuando no hay pareja. */
  textoNoDisponible: string;
};

export function BanderasDeIdioma({ actual, href, nombres, textoActual, textoNoDisponible }: PropsDeBanderas) {
  const otro: Idioma = actual === "es" ? "en" : "es";
  return (
    <span style={grupo}>
      <span role="img" aria-label={`${nombres.actual} · ${textoActual}`} aria-current="true" style={banderaActual}>
        <Bandera idioma={actual} />
      </span>
      {href ? (
        <Link href={href} hrefLang={otro} lang={otro} aria-label={nombres.otro} title={nombres.otro} style={banderaEnlace}>
          <Bandera idioma={otro} />
        </Link>
      ) : (
        <span role="img" aria-label={nombres.otro} title={textoNoDisponible} style={banderaApagada}>
          <Bandera idioma={otro} />
        </span>
      )}
    </span>
  );
}

/** Las banderas, simplificadas al tamaño de un icono: sin escudo ni estrellas contables. */
function Bandera({ idioma }: { idioma: Idioma }) {
  return idioma === "es" ? (
    <svg viewBox="0 0 24 16" width="24" height="16" aria-hidden="true" focusable="false" style={svg}>
      <rect width="24" height="16" fill="#AA151B" />
      <rect y="4" width="24" height="8" fill="#F1BF00" />
      <rect x="0.5" y="0.5" width="23" height="15" rx="2" fill="none" style={borde} />
    </svg>
  ) : (
    <svg viewBox="0 0 24 16" width="24" height="16" aria-hidden="true" focusable="false" style={svg}>
      <rect width="24" height="16" fill="#FFFFFF" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <rect key={i} y={(i * 16) / 6.5} width="24" height={16 / 13} fill="#B22234" />
      ))}
      <rect width="10" height={(16 * 7) / 13} fill="#3C3B6E" />
      {[2, 5, 8].flatMap((x) => [2, 4.6, 7.2].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="0.6" fill="#FFFFFF" />))}
      <rect x="0.5" y="0.5" width="23" height="15" rx="2" fill="none" style={borde} />
    </svg>
  );
}

const grupo: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.375rem",
  marginLeft: "0.25rem",
};

const svg: React.CSSProperties = {
  display: "block",
  borderRadius: "2px",
};

const borde: React.CSSProperties = {
  stroke: "var(--slg-line)",
  strokeWidth: 1,
};

const base: React.CSSProperties = {
  display: "inline-flex",
  padding: "0.25rem",
  borderRadius: "var(--slg-radius-sm)",
  lineHeight: 0,
};

const banderaActual: React.CSSProperties = {
  ...base,
  boxShadow: "inset 0 -2px 0 var(--slg-blue-deep)",
};

const banderaEnlace: React.CSSProperties = {
  ...base,
  opacity: 0.72,
};

const banderaApagada: React.CSSProperties = {
  ...base,
  opacity: 0.35,
  filter: "grayscale(1)",
  cursor: "not-allowed",
};
