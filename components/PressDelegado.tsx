"use client";

import { useEffect } from "react";

/**
 * El press, UNO SOLO para toda la capa pública (plan visual §4.3, RNF-10).
 *
 * Un escuchador delegado en el documento pone `data-pressed="true"` en el
 * `.slg-pressable` más cercano en `pointerdown` —no en `click`, no en `:active`,
 * que en iOS llega tarde— y lo quita al soltar o al cancelar. El CSS
 * (`motion.css`) hace el resto: escala 0.97 en 100 ms al bajar, regreso en
 * 160 ms al soltar.
 *
 * Escuchadores pasivos: nunca bloquean el scroll ni el gesto. Un componente que
 * ya gestiona su propio press (el formulario de descarga) lo declara con
 * `data-press="propio"` y aquí no se toca.
 *
 * No pinta nada.
 */
export function PressDelegado() {
  useEffect(() => {
    let actual: HTMLElement | null = null;

    const soltar = () => {
      if (actual) actual.dataset.pressed = "false";
      actual = null;
    };
    const apretar = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const el = (e.target as Element | null)?.closest<HTMLElement>(".slg-pressable");
      if (!el || el.dataset.press === "propio") return;
      soltar();
      actual = el;
      el.dataset.pressed = "true";
    };

    const opciones = { passive: true } as const;
    document.addEventListener("pointerdown", apretar, opciones);
    document.addEventListener("pointerup", soltar, opciones);
    document.addEventListener("pointercancel", soltar, opciones);
    // Arrastrar fuera del objetivo cancela el press, como en un botón nativo.
    document.addEventListener("pointerleave", soltar, opciones);
    return () => {
      document.removeEventListener("pointerdown", apretar);
      document.removeEventListener("pointerup", soltar);
      document.removeEventListener("pointercancel", soltar);
      document.removeEventListener("pointerleave", soltar);
    };
  }, []);

  return null;
}
