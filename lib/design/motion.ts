/**
 * motion.ts — Las cifras del contrato de movimiento, y la física del gesto.
 *
 * Lo que se puede expresar en CSS vive en `app/motion.css`. Aquí vive lo que
 * NO se puede: la proyección de momentum, el rubber-band y la transferencia de
 * velocidad al spring de cierre. Son las cuatro cláusulas de RNF-45, y son
 * cálculo, no curvas.
 *
 * POR QUÉ NADA DE ESTO ES `@keyframes`. Una interacción agarrable se anima
 * **desde el valor presentado**, nunca desde el objetivo (RNF-12): si el dedo
 * interrumpe a mitad, el elemento continúa desde donde está. Un `@keyframes`
 * no sabe dónde está: sabe dónde empieza y dónde acaba, y al interrumpirlo
 * salta. Por eso el freno `check:motion` los prohíbe en estos componentes.
 */

/** Spring por defecto (RNF-09): amortiguación crítica, sin rebote. */
export const SPRING = {
  damping: 1.0,
  /** Segundos. El rango del contrato es 0.3–0.4; se toma el centro. */
  response: 0.35,
} as const;

/**
 * Rebote. `damping` ~0.8, y **solo** tras un gesto con momentum (RNF-09).
 * No se usa en una transición provocada por un clic: ahí el rebote es confeti.
 */
export const SPRING_CON_REBOTE = { damping: 0.8, response: 0.35 } as const;

/** Feedback a la entrada (RNF-10). */
export const PRESS = { escala: 0.97, ms: 100 } as const;

/** Reveal al scroll (RNF-46): opacidad + 8 px, una sola vez. */
export const REVEAL = { desplazamientoPx: 8, unaVez: true } as const;

/** `prefers-reduced-motion`: todo degrada a cross-fade de 200 ms. */
export const CROSSFADE_MS = 200;

/* ══════════════════════════════════════════════════════════════════════════
 * Las cuatro cláusulas del sheet móvil (RNF-45)
 * ══════════════════════════════════════════════════════════════════════════ */

/**
 * Cláusula 2 · **Proyección de momentum**, `d ≈ 0.998`.
 *
 * Dónde acabaría el sheet si lo soltamos con esta velocidad y lo dejamos
 * deslizarse hasta parar. Es la fórmula de la deceleración exponencial:
 * `proyección = posición + velocidad · d / (1 − d)`.
 *
 * Se decide con la PROYECCIÓN, no con la posición al soltar. Si se decidiera
 * con la posición, un lanzamiento rápido y corto —que es como la gente cierra
 * de verdad— no cerraría, y el sheet volvería a subir contra la intención
 * evidente del dedo.
 */
export const DECELERACION = 0.998;

export function proyectar(posicion: number, velocidadPorMs: number): number {
  return posicion + (velocidadPorMs * DECELERACION) / (1 - DECELERACION);
}

/**
 * Cláusula 3 · **Rubber-band** en el límite.
 *
 * Arrastrar más allá del tope no se bloquea: se resiste. El movimiento sigue
 * al dedo con retorno decreciente, así que el gesto nunca se siente roto, y el
 * elemento comunica «hasta aquí» sin un mensaje.
 *
 * Es la curva de iOS: `(1 − 1/(x·c/d + 1)) · d`, con `c = 0.55`.
 */
export function rubberBand(exceso: number, dimension: number, coeficiente = 0.55): number {
  if (exceso === 0 || dimension <= 0) return 0;
  const signo = Math.sign(exceso);
  const x = Math.abs(exceso);
  return signo * (1 - 1 / ((x * coeficiente) / dimension + 1)) * dimension;
}

/**
 * Cláusula 4 · **Velocidad transferida** al spring de cierre.
 *
 * El spring no arranca en reposo: arranca con la velocidad que traía el dedo.
 * Sin esto hay un micro-parón en el instante de soltar —el gesto acaba, la
 * animación empieza— y es exactamente lo que separa una interfaz que se siente
 * física de una que se siente programada.
 *
 * Devuelve la duración que el spring debe tener para que el arranque case con
 * la velocidad entrante, acotada para que un lanzamiento brutal no produzca un
 * cierre instantáneo ni uno lentísimo.
 */
export function duracionDesdeVelocidad(
  distancia: number,
  velocidadPorMs: number,
  msPorDefecto = SPRING.response * 1000,
): number {
  const v = Math.abs(velocidadPorMs);
  if (v < 0.05 || distancia <= 0) return msPorDefecto;
  return Math.min(600, Math.max(120, distancia / v));
}

/**
 * Cláusula 1 · el seguimiento **1:1** con `setPointerCapture` no es una función:
 * es cómo está escrito el componente. `SheetMovil` aplica el delta del puntero
 * tal cual, sin multiplicadores ni suavizado, salvo en el rubber-band. Que se
 * cumpla se ve cuadro a cuadro, que es como el gate D3 lo exige.
 */

/** ¿El sistema pide menos movimiento? Se consulta en el momento, no se cachea. */
export function prefiereMenosMovimiento(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
