/**
 * ArticleCard — componente #6 de C.5, la fila del índice de Blog
 * (`design_docs/ui_wireframes.md` §2.6): portada, fecha · etiquetas, título,
 * descripción a dos líneas. Toda la tarjeta es el enlace al artículo.
 *
 * `RF-22` (solo `status: published` aparece en el índice) es una decisión de
 * qué artículos pasar a este componente, no de este componente — aquí solo
 * se pinta lo que llega. Contenido por props (RF-16): título, descripción,
 * fecha y etiquetas son del artículo real, no de este armazón.
 */

import { TAP_FEEDBACK } from "../shared/interaction.ts";

export type ArticleCardProps = {
  href: string;
  title: string;
  description: string;
  /** Ya formateada por quien la use (locale-aware) — este componente no formatea fechas. */
  fecha: string;
  tags: readonly string[];
  coverSrc?: string;
  coverAlt?: string;
};

export function ArticleCard({ href, title, description, fecha, tags, coverSrc, coverAlt }: ArticleCardProps) {
  return (
    <a
      href={href}
      className={`group flex gap-4 rounded-lg border border-line bg-paper p-4 no-underline shadow-sm transition-shadow duration-150 hover:shadow-md ${TAP_FEEDBACK}`}
    >
      {coverSrc && (
        // eslint-disable-next-line @next/next/no-img-element -- vitrina de FU-10: la página real usa `next/image` (DU-25/D-32)
        <img
          src={coverSrc}
          alt={coverAlt ?? ""}
          className="h-24 w-32 shrink-0 rounded-md object-cover"
        />
      )}
      <div className="flex flex-col gap-1">
        <p className="text-sm text-ink-2">
          <time>{fecha}</time>
          {tags.length > 0 && <span> · {tags.join(", ")}</span>}
        </p>
        <h3 className="font-semibold text-blue-deep">{title}</h3>
        <p className="line-clamp-2 text-sm text-ink-2">{description}</p>
      </div>
    </a>
  );
}
