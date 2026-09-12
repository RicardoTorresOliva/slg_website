import type { CSSProperties, ReactNode } from "react";

/**
 * 8 · Shell de app — barra lateral, tabla, ficha, estado vacío y estado de error.
 *
 * Es el armazón de HQ y del portal (FU-12 lo consume). Aquí está el sistema;
 * las pantallas son de M3 y M4.
 *
 * **Móvil = rápido, escritorio = profundo** (C.6, principio 5). La tabla de HQ
 * NO se lee en móvil con zoom: por debajo de 48rem cada fila se convierte en
 * una ficha con sus etiquetas, que es la misma información dispuesta para un
 * pulgar. La regla vive en `motion.css` con `data-slg-tabla`.
 */

export function ShellDeApp({
  titulo,
  secciones,
  activa,
  children,
}: {
  titulo: string;
  secciones: readonly { href: string; etiqueta: string }[];
  activa?: string;
  children: ReactNode;
}) {
  return (
    <div style={shell}>
      {/* «Dónde estoy» y «a dónde puedo ir», permanentes y no tras un icono. */}
      <nav style={lateral} aria-label={titulo}>
        <p style={lateralTitulo}>{titulo}</p>
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.125rem" }}>
          {secciones.map((s) => (
            <li key={s.href}>
              <a
                href={s.href}
                aria-current={activa === s.href ? "page" : undefined}
                style={{
                  ...lateralEnlace,
                  background: activa === s.href ? "var(--slg-paper-2)" : "transparent",
                  color: activa === s.href ? "var(--slg-blue-deep)" : "var(--slg-ink-2)",
                  fontWeight: activa === s.href ? 600 : 500,
                }}
              >
                {s.etiqueta}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <main style={{ padding: "1.5rem 1.25rem", minWidth: 0 }}>{children}</main>
    </div>
  );
}

export function TablaDeApp({
  columnas,
  filas,
  etiqueta,
}: {
  columnas: readonly string[];
  filas: readonly (readonly string[])[];
  etiqueta: string;
}) {
  return (
    <table data-slg-tabla style={tabla}>
      <caption style={leyenda}>{etiqueta}</caption>
      <thead>
        <tr>
          {columnas.map((c) => (
            <th key={c} scope="col" style={celdaCabecera}>
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {filas.map((fila, i) => (
          <tr key={i}>
            {fila.map((valor, j) => (
              // `data-label` es lo que permite que en móvil cada celda muestre
              // su columna al apilarse. Sin él, la ficha es una lista de datos
              // sin nombre.
              <td key={j} data-label={columnas[j]} style={celda}>
                {valor}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function FichaDeApp({ titulo, campos }: { titulo: string; campos: readonly { etiqueta: string; valor: string }[] }) {
  return (
    <section className="slg-card" style={ficha}>
      <h2 style={{ margin: "0 0 1rem", fontSize: "1.25rem", color: "var(--slg-blue-deep)" }}>{titulo}</h2>
      {/* `<dl>` y no una tabla: son pares etiqueta-valor, no una matriz. */}
      <dl style={listaCampos}>
        {campos.map((c) => (
          <div key={c.etiqueta} style={{ display: "grid", gap: "0.25rem" }}>
            <dt style={{ fontSize: "0.8125rem", color: "var(--slg-ink-2)" }}>{c.etiqueta}</dt>
            <dd style={{ margin: 0, fontSize: "0.9375rem" }}>{c.valor}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/**
 * Estado vacío. **Nunca una pantalla en blanco**: dice qué falta y cuál es la
 * acción que la llena. Un vacío sin salida es un callejón, y la pregunta
 * «a dónde puedo ir» se queda sin respuesta.
 */
export function EstadoVacio({
  titulo,
  explicacion,
  accion,
}: {
  titulo: string;
  explicacion: string;
  accion?: { href: string; etiqueta: string };
}) {
  return (
    <div style={estado} role="status">
      <p style={estadoTitulo}>{titulo}</p>
      <p style={estadoTexto}>{explicacion}</p>
      {accion ? (
        <p style={{ margin: "1rem 0 0" }}>
          <a href={accion.href} style={{ color: "var(--slg-link)" }}>
            {accion.etiqueta}
          </a>
        </p>
      ) : null}
    </div>
  );
}

/**
 * Estado de error. Dice **qué se puede hacer**, no solo que algo falló, y no
 * describe el sistema por dentro: ningún nombre de tabla, ninguna traza
 * (RNF-32). El identificador es para pedirlo por soporte, no para diagnosticar.
 */
export function EstadoDeError({
  titulo,
  explicacion,
  identificador,
  reintentarHref,
  etiquetaReintentar,
}: {
  titulo: string;
  explicacion: string;
  identificador?: string;
  reintentarHref?: string;
  etiquetaReintentar?: string;
}) {
  return (
    <div style={{ ...estado, borderLeft: "3px solid var(--slg-red)" }} role="alert">
      <p style={estadoTitulo}>{titulo}</p>
      <p style={estadoTexto}>{explicacion}</p>
      {reintentarHref && etiquetaReintentar ? (
        <p style={{ margin: "1rem 0 0" }}>
          <a href={reintentarHref} style={{ color: "var(--slg-link)" }}>
            {etiquetaReintentar}
          </a>
        </p>
      ) : null}
      {identificador ? (
        <p style={{ ...estadoTexto, marginTop: "0.75rem", fontSize: "0.8125rem" }}>
          <code>{identificador}</code>
        </p>
      ) : null}
    </div>
  );
}

const shell: CSSProperties = { display: "grid", gridTemplateColumns: "14rem 1fr", minHeight: "100svh" };

const lateral: CSSProperties = {
  borderRight: "1px solid var(--slg-line)",
  background: "var(--slg-paper-2)",
  padding: "1.25rem 0.75rem",
};

const lateralTitulo: CSSProperties = {
  margin: "0 0 1rem",
  padding: "0 0.5rem",
  fontSize: "0.8125rem",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "var(--slg-ink-2)",
};

const lateralEnlace: CSSProperties = {
  display: "block",
  padding: "0.5rem 0.75rem",
  borderRadius: "var(--slg-radius-sm)",
  textDecoration: "none",
  fontSize: "0.9375rem",
};

const tabla: CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: "0.9375rem" };
const leyenda: CSSProperties = { textAlign: "left", paddingBottom: "0.75rem", color: "var(--slg-ink-2)", fontSize: "0.875rem" };
const celdaCabecera: CSSProperties = {
  textAlign: "left",
  padding: "0.625rem 0.75rem",
  borderBottom: "1px solid var(--slg-line)",
  color: "var(--slg-ink-2)",
  fontWeight: 600,
  fontSize: "0.8125rem",
};
const celda: CSSProperties = { padding: "0.75rem", borderBottom: "1px solid var(--slg-line)" };
const ficha: CSSProperties = { padding: "1.5rem", border: "1px solid var(--slg-line)", borderRadius: "var(--slg-radius-md)" };
const listaCampos: CSSProperties = { display: "grid", gap: "1rem", margin: 0 };
const estado: CSSProperties = {
  padding: "2rem 1.5rem",
  border: "1px solid var(--slg-line)",
  borderRadius: "var(--slg-radius-md)",
  background: "var(--slg-paper-2)",
};
const estadoTitulo: CSSProperties = { margin: 0, fontSize: "1.0625rem", fontWeight: 600, color: "var(--slg-blue-deep)" };
const estadoTexto: CSSProperties = { margin: "0.5rem 0 0", fontSize: "0.9375rem", color: "var(--slg-ink-2)", lineHeight: 1.6 };
