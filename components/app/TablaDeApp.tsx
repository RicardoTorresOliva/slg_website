import type { CSSProperties } from "react";

/**
 * Tabla y ficha del octavo componente de C.5 — la parte que sobrevivió.
 *
 * VIENEN DE `components/ShellDeApp.tsx`, que era el **prototipo** de FU-10 y ya
 * no existe: FU-12 construyó el armazón de verdad (`ArmazonDeApp`) y los seis
 * estados canónicos (`EstadosCanonicos`), y mantener al lado un armazón de
 * mentira con su propio «estado vacío» y su propio «estado de error» era tener
 * **dos vocabularios para lo mismo** — justo lo que D-96 existe para impedir.
 * Lo que no estaba duplicado es esto: la tabla y la ficha.
 *
 * **Móvil = rápido, escritorio = profundo** (C.6, principio 5). La tabla de HQ
 * NO se lee en móvil con zoom: por debajo de 48rem cada fila se convierte en
 * una ficha con sus etiquetas, que es la misma información dispuesta para un
 * pulgar. La regla vive en `motion.css` con `data-slg-tabla`.
 */

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
