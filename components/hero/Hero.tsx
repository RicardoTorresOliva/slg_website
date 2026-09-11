"use client";

import { motion, useReducedMotion } from "motion/react";

import { TAP_FEEDBACK } from "../shared/interaction.ts";

/**
 * Hero — componente #3 de C.5, "hero tipográfico" (sin imagen ni ilustración:
 * el peso visual lo lleva la escala `--text-hero`, C.2).
 *
 * Contenido por props (RF-16): titular, subtítulo y CTA son propios de cada
 * página (DU-03 Home y cualquier otra que use este armazón) — este componente
 * no lee `content/ui`, no tiene una sola cadena de negocio propia.
 *
 * Aparición al montar: opacidad + 8 px, una sola vez, `damping 1.0`
 * (RNF-46 aplicado a la entrada, no a un scroll — el hero está siempre
 * visible en la carga). Con `prefers-reduced-motion`, cross-fade de 200 ms
 * sin desplazamiento (RNF-06).
 */

export type HeroProps = {
  eyebrow?: string;
  headline: string;
  subheadline?: string;
  ctaLabel?: string;
  ctaHref?: string;
};

export function Hero({ eyebrow, headline, subheadline, ctaLabel, ctaHref }: HeroProps) {
  const reducirMovimiento = useReducedMotion();

  const transicion = reducirMovimiento
    ? { duration: 0.2, ease: "linear" as const }
    : { type: "spring" as const, damping: 1, stiffness: 300 };

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-24 text-center">
      {eyebrow && (
        <motion.p
          initial={{ opacity: 0, y: reducirMovimiento ? 0 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={transicion}
          className="text-sm font-semibold uppercase tracking-wide text-blue-primary"
        >
          {eyebrow}
        </motion.p>
      )}

      <motion.h1
        initial={{ opacity: 0, y: reducirMovimiento ? 0 : 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...transicion, delay: reducirMovimiento ? 0 : 0.05 }}
        className="text-hero font-bold tracking-hero text-blue-deep"
      >
        {headline}
      </motion.h1>

      {subheadline && (
        <motion.p
          initial={{ opacity: 0, y: reducirMovimiento ? 0 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...transicion, delay: reducirMovimiento ? 0 : 0.1 }}
          className="text-lg text-ink-2"
        >
          {subheadline}
        </motion.p>
      )}

      {ctaLabel && ctaHref && (
        <motion.div
          initial={{ opacity: 0, y: reducirMovimiento ? 0 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...transicion, delay: reducirMovimiento ? 0 : 0.15 }}
        >
          <a
            href={ctaHref}
            className={`inline-block rounded-md bg-stop px-6 py-3 font-medium text-paper no-underline ${TAP_FEEDBACK}`}
          >
            {ctaLabel}
          </a>
        </motion.div>
      )}
    </section>
  );
}
