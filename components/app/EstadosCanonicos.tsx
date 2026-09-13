import type { CSSProperties } from "react";

import { type EstadoCanonico } from "@/lib/app/estados";

/**
 * Los seis estados canónicos, como UN componente (FU-12, criterio 1).
 *
 * ES UNO SOLO Y NO SEIS, y la razón es el criterio: «ninguna pantalla de M3 o
 * M4 inventa el suyo». Con seis componentes sueltos, una pantalla puede
 * importar cinco y escribirse el sexto a mano sin que nada chirríe. Con uno que
 * recibe **el nombre del estado**, la pantalla no tiene dónde inventarse nada:
 * o pasa uno de los seis, o no compila.
 *
 * TODO EL TEXTO VIENE DE FUERA. RF-16 —«ni una cadena escrita a mano»— rige
 * también dentro de la aplicación, y aquí más: el idioma de la interfaz es el
 * de la **preferencia del usuario** (RF-72), así que una cadena escrita aquí
 * saldría en español a alguien que eligió inglés. `check:shell` lo comprueba.
 *
 * EL PAPEL ARIA CAMBIA CON EL ESTADO, y no es decoración:
 *   · `cargando` → `role="status"` + `aria-busy`: un lector de pantalla anuncia
 *     que está esperando, en vez de leer una región vacía.
 *   · los errores → `role="alert"`: interrumpen, porque hay que enterarse.
 *   · los vacíos → `role="status"`: informan sin interrumpir.
 */
export function Estado({
  estado,
  textos,
  accion,
  identificador,
}: {
  estado: EstadoCanonico;
  /** `titulo`, `texto` y, si el estado la ofrece, `accion`. Salen de `content/ui`. */
  textos: { titulo: string; texto: string; accion?: string };
  /** A dónde lleva la salida. Un estado sin salida es un callejón (RNF-43). */
  accion?: { href: string };
  /**
   * Solo en errores: el identificador que se le dice a soporte. **No es un
   * diagnóstico** y no lleva nada del sistema por dentro (RNF-32).
   */
  identificador?: string;
}) {
  const esError = estado === "error_de_carga" || estado === "error_de_accion" || estado === "sin_permiso";
  const cargando = estado === "cargando";

  return (
    <div
      data-slg-estado={estado}
      role={esError ? "alert" : "status"}
      aria-busy={cargando || undefined}
      style={{ ...caja, ...(esError ? { borderLeft: "3px solid var(--slg-red)" } : null) }}
    >
      {cargando ? <Esqueleto /> : null}
      <p style={titulo}>{textos.titulo}</p>
      <p style={texto}>{textos.texto}</p>
      {accion && textos.accion ? (
        <p style={{ margin: "1rem 0 0" }}>
          <a href={accion.href} style={{ color: "var(--slg-link)" }}>
            {textos.accion}
          </a>
        </p>
      ) : null}
      {identificador && esError ? (
        <p style={{ ...texto, marginTop: "0.75rem", fontSize: "0.8125rem" }}>
          <code>{identificador}</code>
        </p>
      ) : null}
    </div>
  );
}

/**
 * El esqueleto de carga. **No parpadea ni pulsa**: RNF-12 prohíbe `@keyframes`
 * en lo que el usuario está esperando, y una animación infinita sobre un
 * contenido que tarda hace que parezca que tarda más. Son tres barras quietas
 * que dicen «aquí va a haber algo con esta forma».
 */
function Esqueleto() {
  return (
    <div aria-hidden="true" style={{ display: "grid", gap: "0.5rem", marginBottom: "1rem" }}>
      {["70%", "90%", "45%"].map((ancho) => (
        <span key={ancho} style={{ ...barra, width: ancho }} />
      ))}
    </div>
  );
}

const caja: CSSProperties = {
  padding: "2rem 1.5rem",
  border: "1px solid var(--slg-line)",
  borderRadius: "var(--slg-radius-md)",
  background: "var(--slg-paper-2)",
};
const titulo: CSSProperties = {
  margin: 0,
  fontSize: "1.0625rem",
  fontWeight: 600,
  color: "var(--slg-blue-deep)",
};
const texto: CSSProperties = {
  margin: "0.5rem 0 0",
  fontSize: "0.9375rem",
  color: "var(--slg-ink-2)",
  lineHeight: 1.6,
};
const barra: CSSProperties = {
  display: "block",
  height: "0.75rem",
  borderRadius: "var(--slg-radius-sm)",
  background: "var(--slg-line)",
};
