import { bloquesDe, trozosDeLinea } from "@/lib/content/markdown-seguro";

/**
 * Markdown.tsx — El subconjunto de Markdown que el contenido de SLG usa.
 *
 * POR QUÉ NO HAY LIBRERÍA. El presupuesto de JS inicial está en el 91 % del
 * gate D1, y un parser de Markdown completo en el cliente se lo come. Pero la
 * razón de fondo es otra: **una librería de Markdown acepta HTML embebido**, y
 * el contenido del blog acabará pasando por manos que no son las nuestras. Este
 * conversor **nunca produce HTML arbitrario**: construye elementos de React, así
 * que un `<script>` escrito dentro de un `.md` sale como texto y no como script.
 *
 * Lo que soporta es lo que el contenido usa, y nada más: encabezados de nivel 2
 * y 3, párrafos, listas con y sin número, citas en bloque, tablas, negrita,
 * cursiva, código en línea y enlaces. Las tres últimas piezas de bloque
 * entraron el 2026-09-18, cuando los documentos de autoridad pasaron al blog;
 * se amplía aquí y se ve en la revisión — que es justo lo que una librería no
 * deja hacer. El troceado en bloques vive en `markdown-seguro.ts` (probable
 * sin navegador); aquí solo se pinta.
 *
 * **EL ANÁLISIS Y LA DECISIÓN DE SEGURIDAD VIVEN EN
 * `lib/content/markdown-seguro.ts`**, no aquí. Este archivo es JSX y un script
 * de Node no lo puede cargar, así que con la regla dentro solo se podía probar
 * abriendo un navegador — y «qué `href` se pinta y cuál no» es justo la clase
 * de regla que hay que poder probar caso a caso. Aquí queda el pintado.
 */
/**
 * Una línea suelta con sus marcas en línea resueltas.
 *
 * Existe porque hay sitios que muestran **una sola línea** de un registro —la
 * bajada de un bloque de la portada, el resumen de una tarjeta— y ahí el
 * párrafo completo sobra. Sin esto, un `VoltAi by SLG` entre acentos graves se
 * publicaba con los acentos a la vista.
 */
export function MarkdownEnLinea({ texto }: { texto: string }) {
  return <Linea texto={texto} />;
}

function Linea({ texto }: { texto: string }) {
  return (
    <>
      {trozosDeLinea(texto).map((t, i) => {
        if (t.tipo === "negrita") return <strong key={i}>{t.texto}</strong>;
        if (t.tipo === "cursiva") return <em key={i}>{t.texto}</em>;
        if (t.tipo === "codigo")
          return (
            <code key={i} style={codigo}>
              {t.texto}
            </code>
          );
        if (t.tipo === "enlace")
          return (
            <a key={i} href={t.href} style={{ color: "var(--slg-link)" }}>
              {t.texto}
            </a>
          );
        return <span key={i}>{t.texto}</span>;
      })}
    </>
  );
}

export function Markdown({ texto }: { texto: string }) {
  const bloques = bloquesDe(texto);
  return (
    <div style={{ fontSize: "1.0625rem", lineHeight: 1.7, color: "var(--slg-ink)" }}>
      {bloques.map((b, i) => {
        if (b.tipo === "h3") return <h3 key={i} style={h3}><Linea texto={b.texto} /></h3>;
        if (b.tipo === "h2") return <h2 key={i} style={h2}><Linea texto={b.texto} /></h2>;
        if (b.tipo === "lista" || b.tipo === "lista-numerada") {
          const Etiqueta = b.tipo === "lista" ? "ul" : "ol";
          return (
            <Etiqueta key={i} style={lista}>
              {b.items.map((item, j) => (
                <li key={j} style={{ marginBottom: "0.5rem" }}>
                  <Linea texto={item} />
                </li>
              ))}
            </Etiqueta>
          );
        }
        if (b.tipo === "cita") {
          return (
            <blockquote key={i} style={cita}>
              <Linea texto={b.texto} />
            </blockquote>
          );
        }
        if (b.tipo === "tabla") {
          return (
            <div key={i} style={tablaEnvoltorio}>
              <table style={tabla}>
                <thead>
                  <tr>
                    {b.cabecera.map((c, j) => (
                      <th key={j} style={celdaCabecera} scope="col">
                        <Linea texto={c} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {b.filas.map((fila, j) => (
                    <tr key={j}>
                      {fila.map((c, k) => (
                        <td key={k} style={celda}>
                          <Linea texto={c} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        if (b.tipo === "parrafo") {
          return (
            <p key={i} style={{ margin: "0 0 1.25rem" }}>
              <Linea texto={b.texto} />
            </p>
          );
        }
        return null;
      })}
    </div>
  );
}

const h2: React.CSSProperties = {
  margin: "2.5rem 0 1rem",
  fontSize: "1.5rem",
  lineHeight: 1.25,
  letterSpacing: "-0.01em",
  color: "var(--slg-blue-deep)",
  fontWeight: 700,
};

const h3: React.CSSProperties = { ...h2, fontSize: "1.1875rem", margin: "2rem 0 0.75rem" };

const lista: React.CSSProperties = { margin: "0 0 1.25rem", paddingLeft: "1.25rem" };

// La cita de entrada es la tesis del documento: se lee antes que nada, con el
// mismo filete azul que en el PDF.
const cita: React.CSSProperties = {
  margin: "0 0 1.5rem",
  padding: "0.25rem 0 0.25rem 1rem",
  borderLeft: "2px solid var(--slg-blue-primary)",
  color: "var(--slg-blue-deep)",
  fontSize: "1.125rem",
};

// La tabla se desplaza en horizontal en móvil en vez de romper la página.
const tablaEnvoltorio: React.CSSProperties = { overflowX: "auto", margin: "0 0 1.5rem" };
const tabla: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "0.9375rem",
  lineHeight: 1.5,
};
const celda: React.CSSProperties = {
  padding: "0.6rem 0.75rem",
  borderTop: "1px solid var(--slg-line)",
  verticalAlign: "top",
};
const celdaCabecera: React.CSSProperties = {
  ...celda,
  borderTop: "none",
  borderBottom: "1px solid var(--slg-ink-2)",
  textAlign: "left",
  fontWeight: 600,
  color: "var(--slg-blue-deep)",
};

const codigo: React.CSSProperties = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: "0.9em",
  background: "var(--slg-paper-2)",
  padding: "0.1em 0.35em",
  borderRadius: "var(--slg-radius-sm)",
};
