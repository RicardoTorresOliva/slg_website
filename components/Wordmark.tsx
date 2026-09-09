/**
 * Wordmark — Marca denominativa provisional de SLG Agency.
 *
 * PROVISIONAL POR DISEÑO. El Anexo I-5 del brief deja pendiente el logo de
 * SLG Agency en SVG/PNG, y el propio brief define este respaldo: wordmark
 * tipográfico «SLG Agency» en Montserrat 700 sobre `--slg-blue-deep`.
 *
 * Está aislado en un componente y un token justamente para que sustituirlo por
 * el logo real sea cambiar un archivo, sin tocar ninguna página (R-35).
 *
 * Reglas del kit que este componente hereda (gate D2b):
 *   · El logo solo va sobre `--slg-paper` o `--slg-paper-2`. Nunca sobre
 *     fondo oscuro, ni dentro de una sección en `--slg-blue-deep` o
 *     `--slg-indigo`.
 *   · Margen de respeto = 1 altura de la «S». Se aplica con `padding`, no con
 *     márgenes externos, para que no colapse.
 *   · Nunca deformado: sin `scale` no uniforme, sin `transform` de anchura.
 *
 * Nota: la marca pública es **SLG Agency** (§10-4). «Softlanding Global» solo
 * se usa en el contexto de `SLG_Holdings`.
 */

type WordmarkProps = {
  /** Etiqueta accesible. Por defecto, el nombre de la marca. */
  label?: string;
  /** Clases adicionales del contenedor. No usar para recolorear la marca. */
  className?: string;
};

export function Wordmark({ label = "SLG Agency", className = "" }: WordmarkProps) {
  return (
    <span
      className={className}
      style={{
        // El margen de respeto del kit: 1 altura de la «S» ≈ 0.72em
        padding: "0.72em",
        display: "inline-block",
        color: "var(--slg-blue-deep)",
        fontFamily: "var(--slg-font-sans)",
        fontWeight: 700,
        fontSize: "1.25rem",
        letterSpacing: "-0.01em",
        lineHeight: 1,
        // Sin deformación: la caja se adapta al texto, no al revés
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

export default Wordmark;
