import type { CSSProperties } from "react";

/**
 * Componentes 3 a 7 de C.5 — los que no necesitan JavaScript de cliente.
 *
 * Todos son **Server Components** a propósito. El presupuesto del gate D1 va al
 * 89 % con la portada vacía; cada uno de estos que fuera de cliente costaría
 * bytes que no tenemos y no daría nada a cambio: no tienen estado, no escuchan
 * gestos, no leen preferencias en tiempo de ejecución. Lo que sí hacen —el
 * reveal al scroll y el foco— vive en CSS y en `Reveal`.
 */

/* ── 3 · Hero tipográfico ─────────────────────────────────────────────────── */

/**
 * UNA IDEA POR VIEWPORT (RNF-44, criterio 5 de FU-10). El hero no lleva imagen
 * de stock, ni gradiente animado, ni tres mensajes compitiendo: lleva una frase
 * y, como mucho, una línea de apoyo.
 *
 * El titular va en `--blue-deep` (11,9:1 sobre papel) y nunca en `--cyan`, que
 * mide 2,4:1 y es el error que el gate D2 existe para atrapar.
 */
export function HeroTipografico({
  titular,
  apoyo,
  accion,
}: {
  titular: string;
  apoyo?: string;
  accion?: { href: string; etiqueta: string };
}) {
  return (
    <section style={hero}>
      <h1 style={heroTitular}>{titular}</h1>
      {apoyo ? <p style={heroApoyo}>{apoyo}</p> : null}
      {accion ? (
        <p style={{ margin: "1.5rem 0 0" }}>
          <a href={accion.href} style={enlaceDeTexto}>
            {accion.etiqueta}
          </a>
        </p>
      ) : null}
    </section>
  );
}

/* ── 4 · Tarjeta de rama / servicio ───────────────────────────────────────── */

export function TarjetaDeServicio({
  nombre,
  rama,
  resumen,
  href,
}: {
  nombre: string;
  rama?: string;
  resumen: string;
  href: string;
}) {
  return (
    <article className="slg-card" style={tarjeta}>
      {rama ? <p style={etiquetaRama}>{rama}</p> : null}
      <h3 style={tarjetaTitulo}>
        {/* El enlace envuelve el título, no una flecha suelta: el destino se
            anuncia con el nombre del servicio en cualquier lector de pantalla. */}
        <a href={href} style={{ color: "inherit", textDecoration: "none" }}>
          {nombre}
        </a>
      </h3>
      <p style={tarjetaTexto}>{resumen}</p>
    </article>
  );
}

/* ── 5 · Bloque «Qué incluye» ─────────────────────────────────────────────── */

/**
 * Lista, no párrafo. «Qué incluye» es la sección que el comprador escanea antes
 * de decidir si sigue leyendo: en prosa se pierde, y en `<ul>` la recorre un
 * lector de pantalla anunciando cuántos elementos hay.
 */
export function BloqueQueIncluye({ titulo, elementos }: { titulo: string; elementos: readonly string[] }) {
  return (
    <section style={{ margin: "2.5rem 0" }}>
      <h2 style={tituloSeccion}>{titulo}</h2>
      <ul style={listaIncluye}>
        {elementos.map((e) => (
          <li key={e} style={itemIncluye}>
            {e}
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ── 6 · Tarjeta de artículo ──────────────────────────────────────────────── */

export function TarjetaDeArticulo({
  titulo,
  fecha,
  resumen,
  href,
  etiquetas = [],
}: {
  titulo: string;
  fecha: string;
  resumen: string;
  href: string;
  etiquetas?: readonly string[];
}) {
  return (
    <article className="slg-card" style={tarjeta}>
      {/* `<time>` con `dateTime`: la fecha es dato, no adorno. */}
      <time dateTime={fecha} style={etiquetaRama}>
        {fecha}
      </time>
      <h3 style={tarjetaTitulo}>
        <a href={href} style={{ color: "inherit", textDecoration: "none" }}>
          {titulo}
        </a>
      </h3>
      <p style={tarjetaTexto}>{resumen}</p>
      {etiquetas.length > 0 ? (
        <ul style={listaEtiquetas}>
          {etiquetas.map((t) => (
            <li key={t} style={pastilla}>
              {t}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

/* ── 7 · Pie ──────────────────────────────────────────────────────────────── */

export function Pie({
  derechos,
  enlaces,
}: {
  derechos: string;
  enlaces: readonly { href: string; etiqueta: string }[];
}) {
  return (
    <footer style={pie}>
      <div style={pieFila}>
        <p style={{ margin: 0, color: "var(--slg-ink-2)", fontSize: "0.875rem" }}>{derechos}</p>
        <ul style={{ display: "flex", gap: "1.25rem", listStyle: "none", margin: 0, padding: 0 }}>
          {enlaces.map((e) => (
            <li key={e.href}>
              <a href={e.href} style={{ ...enlaceDeTexto, fontSize: "0.875rem" }}>
                {e.etiqueta}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}

/* ── Estilos ──────────────────────────────────────────────────────────────── */

const hero: CSSProperties = { padding: "5rem 0 3rem", maxWidth: "44rem" };

const heroTitular: CSSProperties = {
  margin: 0,
  // Escala fluida: el móvil no es el escritorio encogido (C.6, principio 5).
  fontSize: "clamp(2rem, 6vw, 3.25rem)",
  lineHeight: 1.08,
  letterSpacing: "-0.02em",
  color: "var(--slg-blue-deep)",
  fontWeight: 700,
};

const heroApoyo: CSSProperties = {
  margin: "1.25rem 0 0",
  fontSize: "clamp(1rem, 2.2vw, 1.1875rem)",
  lineHeight: 1.6,
  color: "var(--slg-ink-2)",
};

const enlaceDeTexto: CSSProperties = { color: "var(--slg-link)", textDecoration: "none" };

const tarjeta: CSSProperties = {
  padding: "1.5rem",
  border: "1px solid var(--slg-line)",
  borderRadius: "var(--slg-radius-md)",
  background: "var(--slg-paper)",
  boxShadow: "var(--slg-shadow-sm)",
};

const etiquetaRama: CSSProperties = {
  margin: "0 0 0.5rem",
  fontSize: "0.8125rem",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "var(--slg-ink-2)",
};

const tarjetaTitulo: CSSProperties = {
  margin: "0 0 0.5rem",
  fontSize: "1.25rem",
  color: "var(--slg-indigo)",
  fontWeight: 600,
};

const tarjetaTexto: CSSProperties = {
  margin: 0,
  fontSize: "0.9375rem",
  lineHeight: 1.6,
  color: "var(--slg-ink)",
};

const tituloSeccion: CSSProperties = {
  margin: "0 0 1rem",
  fontSize: "1.5rem",
  color: "var(--slg-blue-deep)",
  fontWeight: 600,
};

const listaIncluye: CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "grid",
  gap: "0.75rem",
};

const itemIncluye: CSSProperties = {
  paddingLeft: "1.25rem",
  borderLeft: "2px solid var(--slg-blue-primary)",
  fontSize: "0.9375rem",
  lineHeight: 1.6,
};

const listaEtiquetas: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "0.5rem",
  listStyle: "none",
  margin: "1rem 0 0",
  padding: 0,
};

const pastilla: CSSProperties = {
  padding: "0.25rem 0.625rem",
  borderRadius: "999px",
  background: "var(--slg-paper-2)",
  fontSize: "0.8125rem",
  color: "var(--slg-ink-2)",
};

const pie: CSSProperties = {
  borderTop: "1px solid var(--slg-line)",
  marginTop: "4rem",
  padding: "2rem 0",
};

const pieFila: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "1rem",
  justifyContent: "space-between",
  alignItems: "center",
  maxWidth: "72rem",
  margin: "0 auto",
  padding: "0 1.25rem",
};
