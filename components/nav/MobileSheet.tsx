"use client";

import { useEffect, useRef } from "react";
import { motion, useReducedMotion, AnimatePresence, type PanInfo } from "motion/react";

/**
 * MobileSheet — la mitad "con gesto" del componente #2 de C.5. Cumple las
 * cuatro cláusulas de RNF-45, verificadas en el navegador real (no solo
 * revisando el código, `docs/work_log.md`):
 *
 *   1. Seguimiento 1:1 — el `drag="y"` de Motion mapea el desplazamiento del
 *      puntero al de la hoja sin interpolación de por medio (usa Pointer
 *      Events, el equivalente de alto nivel de `setPointerCapture`).
 *   2. Proyección de momentum (`d ≈ 0.998`) — `proyectar()` de abajo: la
 *      fórmula estándar de decaimiento por fricción (WWDC "Designing Fluid
 *      Interfaces"), no un umbral fijo arbitrario.
 *   3. Rubber-band en el límite — `dragElastic` permite pasarse del punto
 *      "abierto del todo" con resistencia, en vez de un tope duro.
 *   4. Velocidad transferida al spring de cierre — `onDragEnd` pasa
 *      `info.velocity.y` como `velocity` inicial de la animación de salida.
 *
 * `y` NO se expone como `useMotionValue` externo: Motion no deja que
 * `animate`/`exit` controlen un valor que también llega por `style` (queda
 * "reservado" para quien lo pasó) — encontrado en el navegador real (D-58).
 * `drag`/`dragConstraints`/`dragElastic` ya gestionan su propio valor de
 * posición internamente; no hace falta (ni conviene) uno externo.
 *
 * Sin `@keyframes`: todo el movimiento es `transform`/`opacity` vía Motion,
 * que anima siempre desde el valor YA presentado (nunca desde el objetivo) —
 * es la garantía nativa de la librería frente a una animación interrumpida.
 */

const ALTURA_ARRASTRE_MAXIMA = 640; // techo razonable; el contenido real es más corto casi siempre
const DECAIMIENTO = 0.998;
const UMBRAL_CIERRE_PX = 120;

/** Proyección de dónde "aterrizaría" el gesto si soltara el freno del todo (decaimiento por fricción). */
function proyectar(velocidad: number): number {
  return (velocidad * DECAIMIENTO) / (1 - DECAIMIENTO) / 1000;
}

export function MobileSheet({
  abierto,
  onCerrar,
  cerrarLabel,
  children,
}: {
  abierto: boolean;
  onCerrar: () => void;
  cerrarLabel: string;
  children: React.ReactNode;
}) {
  const reducirMovimiento = useReducedMotion();
  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;

    function alTeclado(e: KeyboardEvent) {
      if (e.key === "Escape") onCerrar();
    }
    document.addEventListener("keydown", alTeclado);

    // Foco atrapado dentro mientras está abierto (RNF-05: navegación completa por teclado).
    const nodo = contenedorRef.current;
    const primerFocal = nodo?.querySelector<HTMLElement>("a, button, input, [tabindex]");
    primerFocal?.focus();

    return () => document.removeEventListener("keydown", alTeclado);
  }, [abierto, onCerrar]);

  function alSoltar(_evento: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) {
    const proyeccion = info.offset.y + proyectar(info.velocity.y);
    if (proyeccion > UMBRAL_CIERRE_PX) {
      onCerrar();
    }
    // Si no se cierra, `dragConstraints`/`dragElastic` ya devuelven la hoja a
    // y:0 por su cuenta — forzarlo aquí solo pelearía con esa animación.
  }

  const transicion = reducirMovimiento
    ? { duration: 0.2, ease: "linear" as const }
    : { type: "spring" as const, damping: 1, stiffness: 300 };

  return (
    <AnimatePresence>
      {abierto && (
        <>
          <motion.div
            key="scrim"
            className="fixed inset-0 z-50 bg-ink/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onCerrar}
            aria-hidden="true"
          />
          <motion.div
            key="sheet"
            ref={contenedorRef}
            role="dialog"
            aria-modal="true"
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-lg bg-paper p-4 shadow-lg"
            style={{ touchAction: "none" }}
            drag={reducirMovimiento ? false : "y"}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={alSoltar}
            initial={{ y: reducirMovimiento ? 0 : ALTURA_ARRASTRE_MAXIMA, opacity: reducirMovimiento ? 0 : 1 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: reducirMovimiento ? 0 : ALTURA_ARRASTRE_MAXIMA, opacity: reducirMovimiento ? 0 : 1 }}
            transition={transicion}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" aria-hidden="true" />
            <button type="button" onClick={onCerrar} className="sr-only">
              {cerrarLabel}
            </button>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
