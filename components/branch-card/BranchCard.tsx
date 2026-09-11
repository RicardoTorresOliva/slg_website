/**
 * BranchCard — componente #4 de C.5, "tarjeta de rama/servicio". Un único
 * componente para las dos escalas que muestran los wireframes (§2.1 "dos
 * puertas": SLG_AI/SLG_Holdings; §2.3: los servicios dentro de cada rama) —
 * misma forma en ambas, solo cambia el contenido que llega por props (RF-16).
 *
 * Toda la tarjeta es el enlace (el wireframe solo pinta nombre + frase +
 * `→ /ruta>`, sin un botón aparte dentro) — un único destino, un único
 * elemento con foco. Sin spec de hover propia (ninguna de las tres fuentes
 * de diseño la define): se limita a lo genérico de C.4 (`TAP_FEEDBACK`,
 * RNF-10) más un cambio de sombra sutil para señalar interactividad, sin
 * inventar una animación de elevación no especificada.
 */

import { TAP_FEEDBACK } from "../shared/interaction.ts";

export type BranchCardProps = {
  name: string;
  description: string;
  href: string;
  /** Solo las tarjetas de servicio lo llevan (§2.3): "cada tarjeta nombra su documento de descarga". */
  downloadLabel?: string;
};

export function BranchCard({ name, description, href, downloadLabel }: BranchCardProps) {
  return (
    <a
      href={href}
      className={`group flex flex-col gap-3 rounded-lg border border-line bg-paper p-6 no-underline shadow-sm transition-shadow duration-150 hover:shadow-md ${TAP_FEEDBACK}`}
    >
      <h3 className="text-xl font-bold text-blue-deep">{name}</h3>
      <p className="text-ink-2">{description}</p>
      {downloadLabel && <p className="text-sm text-ink-2">{downloadLabel}</p>}
      <span aria-hidden="true" className="mt-auto text-blue-primary">
        {href} →
      </span>
    </a>
  );
}
