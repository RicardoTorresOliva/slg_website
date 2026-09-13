"use client";

import { useEffect, useRef } from "react";

/**
 * Reveal al scroll (RNF-46): opacidad + 8 px, **una sola vez** por elemento.
 *
 * **NACE VISIBLE, y se esconde solo lo que está fuera de pantalla.** Es al
 * revés de como se escribe normalmente, y por una razón que costó una captura
 * de pantalla descubrir: con `opacity: 0` por defecto, el contenido desaparece
 * **para siempre** si el observador no llega a disparar —sin JavaScript, con el
 * script bloqueado, si la hidratación falla, o al imprimir—. La portada entera
 * salía en blanco por debajo del hero.
 *
 * Escondiendo solo lo que ya está fuera de la ventana, el visitante no ve
 * ningún parpadeo —no se puede ver desaparecer algo que no estaba en pantalla—
 * y lo que sí está a la vista no se toca.
 *
 * El observador se desconecta al primer cruce, y eso es la regla, no una
 * optimización: un elemento que se re-anima cada vez que pasa por pantalla
 * convierte el scroll en un parpadeo.
 */
export function Reveal({ children }: { children: React.ReactNode }) {
  const nodo = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = nodo.current;
    if (!el) return;

    // Sin `IntersectionObserver` no se esconde nada: se queda como nació.
    if (typeof IntersectionObserver === "undefined") return;

    // Solo se esconde lo que está POR DEBAJO de la ventana. Lo que ya se ve
    // —o lo que quedó por encima— se queda visible, sin parpadeo.
    const caja = el.getBoundingClientRect();
    const fueraPorAbajo = caja.top > window.innerHeight;
    if (!fueraPorAbajo) return;

    el.dataset.revealed = "false";

    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (!entrada.isIntersecting) continue;
          delete el.dataset.revealed;
          observador.disconnect(); // una sola vez
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.01 },
    );
    observador.observe(el);

    /**
     * Red de seguridad. Si por lo que sea el observador no llega a disparar
     * —una pestaña en segundo plano, un navegador que lo implementa raro—,
     * el contenido aparece igual. **Nunca se queda escondido.**
     */
    const rescate = window.setTimeout(() => {
      delete el.dataset.revealed;
      observador.disconnect();
    }, 3_000);

    return () => {
      window.clearTimeout(rescate);
      observador.disconnect();
    };
  }, []);

  /**
   * Siempre un `<div>`, sin `as`. Un envoltorio polimórfico obliga a que cada
   * uso acierte con la etiqueta semántica correcta, y el día que alguien meta
   * un `<li>` dentro de un `<section>` la lista deja de ser una lista para un
   * lector de pantalla. La semántica la pone quien llama, por dentro.
   */
  return (
    <div ref={nodo} className="slg-reveal">
      {children}
    </div>
  );
}
