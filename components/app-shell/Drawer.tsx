"use client";

import { useEffect, useRef, useLayoutEffect } from "react";
import { motion, useReducedMotion, AnimatePresence } from "motion/react";

import { TAP_FEEDBACK } from "../shared/interaction.ts";

/**
 * Drawer — el patrón "panel lateral" del componente #8 de C.5 (`ui_wireframes.md`
 * §5.1): crear o editar, SIN scrim (C.3, el contexto de la lista sigue
 * visible). Esc cierra; con cambios sin guardar, pide confirmación primero.
 *
 * `x` NO se pasa como `useMotionValue` externo por `style` — el mismo error
 * que D-58 encontró y corrigió en `MobileSheet`: Motion no deja que
 * `animate`/`exit` controlen un valor así. Aquí no hace falta arrastre, así
 * que ni siquiera hay razón para plantearlo.
 */

export type DrawerProps = {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  cerrarLabel: string;
  /** Si hay cambios sin guardar, `window.confirm(confirmarCierreLabel)` antes de cerrar. */
  sucio?: boolean;
  confirmarCierreLabel?: string;
  children: React.ReactNode;
};

export function Drawer({ abierto, onCerrar, titulo, cerrarLabel, sucio, confirmarCierreLabel, children }: DrawerProps) {
  const reducirMovimiento = useReducedMotion();
  const contenedorRef = useRef<HTMLDivElement>(null);

  function intentarCerrar() {
    if (sucio && confirmarCierreLabel && !window.confirm(confirmarCierreLabel)) return;
    onCerrar();
  }

  // Vía ref: el listener de teclado debe ver siempre el `sucio` más reciente
  // (puede cambiar mientras el panel sigue abierto, p. ej. al escribir en el
  // formulario), pero el efecto de abajo solo debe engancharse/enfocar una
  // vez por apertura — no en cada tecla que ensucia el formulario.
  const intentarCerrarRef = useRef(intentarCerrar);
  useLayoutEffect(() => {
    intentarCerrarRef.current = intentarCerrar;
  });

  useEffect(() => {
    if (!abierto) return;

    function alTeclado(e: KeyboardEvent) {
      if (e.key === "Escape") intentarCerrarRef.current();
    }
    document.addEventListener("keydown", alTeclado);

    const primerFocal = contenedorRef.current?.querySelector<HTMLElement>("a, button, input, textarea, [tabindex]");
    primerFocal?.focus();

    return () => document.removeEventListener("keydown", alTeclado);
  }, [abierto]);

  const transicion = reducirMovimiento
    ? { duration: 0.2, ease: "linear" as const }
    : { type: "spring" as const, damping: 1, stiffness: 300 };

  return (
    <AnimatePresence>
      {abierto && (
        <motion.div
          key="drawer"
          ref={contenedorRef}
          role="dialog"
          aria-modal="true"
          aria-label={titulo}
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col gap-4 border-l border-line bg-paper p-6 shadow-lg"
          initial={{ x: reducirMovimiento ? 0 : "100%", opacity: reducirMovimiento ? 0 : 1 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: reducirMovimiento ? 0 : "100%", opacity: reducirMovimiento ? 0 : 1 }}
          transition={transicion}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-blue-deep">{titulo}</h3>
            <button
              type="button"
              onClick={intentarCerrar}
              aria-label={cerrarLabel}
              className={`rounded-md border border-line px-2 py-1 ${TAP_FEEDBACK}`}
            >
              ×
            </button>
          </div>
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
