"use client";

import { useEffect, useRef } from "react";

/**
 * Reveal al scroll (RNF-46): opacidad + 8 px, **una sola vez** por elemento.
 *
 * El observador se desconecta al primer cruce, y eso es la regla, no una
 * optimización: un elemento que se re-anima cada vez que pasa por pantalla
 * convierte el scroll en un parpadeo.
 *
 * Sin parallax, sin fondos en movimiento, sin bucles lentos. Con
 * `prefers-reduced-motion` el desplazamiento desaparece y queda el fundido
 * (`app/motion.css`).
 */
export function Reveal({ children }: { children: React.ReactNode }) {
  const nodo = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = nodo.current;
    if (!el) return;

    // Sin IntersectionObserver —o con el contenido ya visible— se muestra sin
    // animar. Un reveal que no se dispara deja contenido invisible, y eso es
    // peor que no animar.
    if (typeof IntersectionObserver === "undefined") {
      el.dataset.revealed = "true";
      return;
    }

    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (!entrada.isIntersecting) continue;
          el.dataset.revealed = "true";
          observador.disconnect(); // una sola vez
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.01 },
    );
    observador.observe(el);
    return () => observador.disconnect();
  }, []);

  /**
   * Siempre un `<div>`, sin `as`. Un envoltorio polimórfico obliga a que cada
   * uso acierte con la etiqueta semántica correcta, y el día que alguien meta
   * un `<li>` dentro de un `<section>` la lista deja de ser una lista para un
   * lector de pantalla. La semántica la pone quien llama, por dentro.
   */
  return (
    <div ref={nodo} className="slg-reveal" data-revealed="false">
      {children}
    </div>
  );
}
