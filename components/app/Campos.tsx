import type { CSSProperties, ReactNode } from "react";

/**
 * Los campos de formulario de HQ y del portal (FU-12/DU-14).
 *
 * **HTML NATIVO, SIN JAVASCRIPT.** Un `<select>` nativo abre el selector del
 * sistema en el móvil, funciona con teclado sin que nadie programe las flechas
 * y no se rompe si la hidratación falla. Un desplegable de librería es más
 * bonito y es peor en las tres cosas.
 *
 * **LA ETIQUETA ENVUELVE AL CAMPO**, en vez de apuntarle con `htmlFor`. Así no
 * hace falta inventar un `id` único por campo y por fila, y no hay forma de que
 * una etiqueta acabe apuntando al campo equivocado — que es lo que pasa al
 * copiar y pegar una fila de formulario.
 *
 * El error se marca con `aria-invalid` y con un mensaje **debajo del campo**,
 * no en un cartel arriba: un resumen de errores al principio obliga a bajar
 * buscando cuál era.
 */
export function Campo({
  etiqueta,
  error,
  pista,
  children,
}: {
  etiqueta: string;
  error?: string | null;
  pista?: string;
  children: ReactNode;
}) {
  return (
    <label style={{ display: "grid", gap: "0.25rem" }}>
      <span style={textoEtiqueta}>{etiqueta}</span>
      {children}
      {pista ? <span style={textoPista}>{pista}</span> : null}
      {error ? (
        <span role="alert" style={textoError}>
          {error}
        </span>
      ) : null}
    </label>
  );
}

export function Texto(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={{ ...campo, ...props.style }} />;
}

export function Lista({
  opciones,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  opciones: readonly { valor: string; etiqueta: string }[];
}) {
  return (
    <select {...props} style={{ ...campo, ...props.style }}>
      {opciones.map((o) => (
        <option key={o.valor} value={o.valor}>
          {o.etiqueta}
        </option>
      ))}
    </select>
  );
}

export function Boton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props} style={{ ...boton, ...props.style }}>
      {children}
    </button>
  );
}

/** Un formulario que cabe en una rejilla y se apila solo en pantalla estrecha. */
export function Formulario({
  accion,
  children,
}: {
  accion: (datos: FormData) => void | Promise<void>;
  children: ReactNode;
}) {
  return (
    <form action={accion} style={rejilla}>
      {children}
    </form>
  );
}

const textoEtiqueta: CSSProperties = { fontSize: "0.8125rem", color: "var(--slg-ink-2)" };
const textoPista: CSSProperties = { fontSize: "0.75rem", color: "var(--slg-ink-2)" };
const textoError: CSSProperties = { fontSize: "0.75rem", color: "var(--slg-red)" };
const campo: CSSProperties = {
  padding: "0.5rem 0.625rem",
  border: "1px solid var(--slg-line)",
  borderRadius: "var(--slg-radius-sm)",
  fontSize: "0.9375rem",
  fontFamily: "inherit",
  background: "var(--slg-paper)",
  minWidth: 0,
};
const boton: CSSProperties = {
  padding: "0.5rem 1rem",
  border: "1px solid var(--slg-blue-deep)",
  borderRadius: "var(--slg-radius-sm)",
  background: "var(--slg-blue-deep)",
  color: "var(--slg-paper)",
  fontSize: "0.875rem",
  fontFamily: "inherit",
  cursor: "pointer",
  alignSelf: "end",
};
const rejilla: CSSProperties = {
  display: "grid",
  gap: "0.75rem",
  gridTemplateColumns: "repeat(auto-fit, minmax(12rem, 1fr))",
  alignItems: "start",
  padding: "1rem",
  border: "1px solid var(--slg-line)",
  borderRadius: "var(--slg-radius-md)",
  background: "var(--slg-paper-2)",
};
