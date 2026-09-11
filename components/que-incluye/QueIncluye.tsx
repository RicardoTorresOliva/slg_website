/**
 * QueIncluye — componente #5 de C.5, el bloque «③ QUÉ INCLUYE» del contrato
 * de página de servicio (`design_docs/ui_wireframes.md` §2.2). Cada ítem es
 * un bloque con `border-left 3px` ciclando entre `--blue-primary`, `--cyan`
 * e `--indigo` (patrón del kit, `style_guide.md` §5) y una cifra grande como
 * elemento gráfico — p. ej. "las 11 dimensiones de SLG_Readiness".
 *
 * Contenido por props (RF-16): cada página de servicio trae sus propios
 * ítems — este componente no sabe qué son "las 11 dimensiones" ni ninguna
 * otra oferta.
 */

const COLOR_BORDE = ["border-blue-primary", "border-cyan-brand", "border-indigo-brand"] as const;

export type QueIncluyeItem = {
  /** La "cifra grande": un número, una palabra corta, o un símbolo — nunca una frase. */
  figura: string;
  texto: string;
};

export type QueIncluyeProps = {
  items: readonly QueIncluyeItem[];
};

export function QueIncluye({ items }: QueIncluyeProps) {
  return (
    <ul className="flex flex-col gap-4">
      {items.map((item, i) => (
        <li
          key={i}
          className={`flex items-baseline gap-4 border-l-[3px] pl-4 ${COLOR_BORDE[i % COLOR_BORDE.length]}`}
        >
          <span className="text-3xl font-bold text-indigo-brand">{item.figura}</span>
          <span className="text-ink">{item.texto}</span>
        </li>
      ))}
    </ul>
  );
}
