"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  CROSSFADE_MS,
  duracionDesdeVelocidad,
  prefiereMenosMovimiento,
  proyectar,
  rubberBand,
  SPRING,
} from "@/lib/design/motion";

/**
 * 2b · Sheet móvil arrastrable — **las cuatro cláusulas de RNF-45**.
 *
 *   1. **Seguimiento 1:1 con `setPointerCapture`.** El delta del puntero se
 *      aplica tal cual, sin multiplicadores ni suavizado. `setPointerCapture`
 *      es lo que hace que el dedo pueda salirse del elemento —o del
 *      navegador— sin que el gesto se rompa a media pantalla.
 *   2. **Proyección de momentum** con `d ≈ 0.998`: se decide con dónde
 *      ACABARÍA, no con dónde está al soltar. Un lanzamiento rápido y corto
 *      —que es como la gente cierra de verdad— tiene que cerrar.
 *   3. **Rubber-band** en el límite: arrastrar hacia arriba resiste en vez de
 *      bloquearse. El gesto nunca se siente roto.
 *   4. **Velocidad transferida** al spring de cierre: la animación arranca con
 *      la velocidad que traía el dedo. Sin esto hay un micro-parón al soltar, y
 *      es lo que separa una interfaz física de una programada.
 *
 * CERO `@keyframes` (RNF-12): se anima desde el valor presentado. Si el dedo
 * vuelve a agarrar a mitad del cierre, continúa desde donde está.
 */
export function SheetMovil({
  abierto,
  onCerrar,
  etiqueta,
  children,
}: {
  abierto: boolean;
  onCerrar: () => void;
  etiqueta: string;
  children: React.ReactNode;
}) {
  // El panel se MONTA al abrir y se DESMONTA al cerrar. Así el estado del
  // gesto (`y`, `arrastrando`) nace limpio en cada apertura sin tener que
  // reiniciarlo con `setState` dentro de un efecto —que es exactamente el
  // render en cascada que React desaconseja.
  if (!abierto) return null;
  return (
    <PanelArrastrable onCerrar={onCerrar} etiqueta={etiqueta}>
      {children}
    </PanelArrastrable>
  );
}

function PanelArrastrable({
  onCerrar,
  etiqueta,
  children,
}: {
  onCerrar: () => void;
  etiqueta: string;
  children: React.ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const [y, setY] = useState(0);
  const [arrastrando, setArrastrando] = useState(false);
  /**
   * El cierre es ESTADO DE RENDER, no un `style` escrito a mano sobre el nodo.
   *
   * Escribirlo a mano parecía funcionar y no funcionaba: el `setState` del
   * propio gesto provoca un render inmediatamente después, React reescribe las
   * propiedades de `style` que él gestiona y **se lleva por delante la duración
   * recién calculada**. El sheet cerraba siempre en los 350 ms por defecto,
   * daba igual a qué velocidad viniera el dedo —la cláusula 4 incumplida sin
   * que se notara en el código—. Lo encontró la medición cuadro a cuadro de
   * `scripts/ci/test-gesto.ts`, que es exactamente para lo que está.
   */
  const [cierre, setCierre] = useState<{ ms: number; alto: number } | null>(null);
  /**
   * La ENTRADA (plan visual §4.2): el panel nace fuera, abajo, y sube en el
   * fotograma siguiente. Sale por donde entró —coherencia espacial—, también
   * cuando se cierra con Escape o tocando el telón. Quien pide menos movimiento
   * no lo ve subir: nace en su sitio.
   */
  const [entrado, setEntrado] = useState(() => prefiereMenosMovimiento());
  const [asentado, setAsentado] = useState(() => prefiereMenosMovimiento());
  const gesto = useRef({ inicioY: 0, ultimaY: 0, ultimoT: 0, velocidad: 0 });
  const temporizador = useRef<number | null>(null);

  // El alto sólo se lee desde manejadores de evento —nunca durante el
  // render—: un ref no es un valor de render (react-hooks/refs).
  const altoActual = useCallback(() => panel.current?.offsetHeight ?? 320, []);

  const cerrarConVelocidad = useCallback(
    (velocidadPorMs: number, desde: number) => {
      const alto = altoActual();
      const restante = Math.max(0, alto - desde);
      // Cláusula 4: la duración sale de la velocidad entrante. Quien pide menos
      // movimiento no recibe un deslizamiento más rápido, recibe el cross-fade.
      const ms = prefiereMenosMovimiento()
        ? CROSSFADE_MS
        : duracionDesdeVelocidad(restante, velocidadPorMs);
      setCierre({ ms, alto });
      temporizador.current = window.setTimeout(onCerrar, ms);
    },
    [altoActual, onCerrar],
  );

  /** Cierre sin gesto (Escape, telón): el mismo camino de salida, sin velocidad. */
  const cerrarSinGesto = useCallback(() => {
    const ms = prefiereMenosMovimiento() ? CROSSFADE_MS : DURACION_DE_SALIDA_MS;
    setCierre({ ms, alto: altoActual() });
    temporizador.current = window.setTimeout(onCerrar, ms);
  }, [altoActual, onCerrar]);

  useEffect(() => {
    if (entrado) return;
    // Doble `requestAnimationFrame`: el primero deja que el navegador pinte el
    // panel fuera de pantalla; el segundo cambia el destino y la transición
    // arranca desde ahí. Con uno solo, a veces los dos estados caen en el
    // mismo fotograma y el panel aparece sin recorrido.
    let segundo = 0;
    const primero = requestAnimationFrame(() => {
      segundo = requestAnimationFrame(() => setEntrado(true));
    });
    return () => {
      cancelAnimationFrame(primero);
      cancelAnimationFrame(segundo);
    };
  }, [entrado]);

  useEffect(() => {
    /**
     * EL FOCO (WCAG 2.4.3; plan visual §1.3, defecto 4). Un diálogo modal que
     * no mueve el foco deja a quien navega con teclado detrás del telón. Al
     * abrir, el foco pasa al primer enlace; Tab y Mayús+Tab dan la vuelta
     * dentro del panel; el contenido de fondo queda `inert`; y al cerrar, el
     * foco vuelve a quien abrió —el botón «Menú»—.
     */
    const quienAbrio = document.activeElement as HTMLElement | null;
    const enfocables = () =>
      Array.from(
        panel.current?.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])") ??
          [],
      );
    enfocables()[0]?.focus({ preventScroll: true });

    // Nunca un contenedor del propio diálogo: si el sheet vive dentro de
    // `<main>` (el prototipo lo monta ahí), volver `main` inerte lo dejaría
    // sordo al dedo a él también.
    const fondo = Array.from(document.querySelectorAll<HTMLElement>("main, footer, .slg-saltar")).filter(
      (n) => !n.contains(panel.current),
    );
    for (const n of fondo) n.inert = true;

    const alTeclado = (e: KeyboardEvent) => {
      // Escape cierra. «Cómo salgo» es una de las tres preguntas de wayfinding.
      if (e.key === "Escape") {
        cerrarSinGesto();
        return;
      }
      if (e.key !== "Tab") return;
      const lista = enfocables();
      if (lista.length === 0) return;
      const primero = lista[0];
      const ultimo = lista[lista.length - 1];
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      } else if (!panel.current?.contains(document.activeElement)) {
        e.preventDefault();
        primero.focus();
      }
    };
    document.addEventListener("keydown", alTeclado);
    return () => {
      document.removeEventListener("keydown", alTeclado);
      for (const n of fondo) n.inert = false;
      quienAbrio?.focus?.({ preventScroll: true });
    };
  }, [cerrarSinGesto]);

  useEffect(() => () => {
    if (temporizador.current !== null) window.clearTimeout(temporizador.current);
  }, []);

  // La capa solo existe mientras hay movimiento inminente (plan visual §4.6).
  const capaViva = arrastrando || cierre !== null || !asentado;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={etiqueta}
      style={telon}
      onClick={(e) => {
        if (e.target === e.currentTarget) cerrarSinGesto();
      }}
    >
      <div
        ref={panel}
        style={{
          ...panelEstilo,
          transform: cierre
            ? `translate3d(0, ${cierre.alto}px, 0)`
            : entrado
              ? `translate3d(0, ${y}px, 0)`
              : "translate3d(0, 100%, 0)",
          // Durante el arrastre NO hay transición: el panel va donde va el
          // dedo, fotograma a fotograma. Una transición aquí introduce el
          // retardo que rompe el 1:1. La entrada usa la curva de cajón
          // (`--slg-ease-drawer`, 300 ms); el resto, la de siempre.
          transition: arrastrando
            ? "none"
            : !entrado || (y === 0 && !cierre && !asentado)
              ? `transform var(--slg-dur-enter) var(--slg-ease-drawer)`
              : `transform ${cierre ? cierre.ms : SPRING.response * 1000}ms var(--slg-spring)`,
          willChange: (capaViva ? "transform" : "auto"),
        }}
        onTransitionEnd={() => {
          if (entrado && !cierre) setAsentado(true);
        }}
        onPointerDown={(e) => {
          // Cláusula 1: capturar el puntero.
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          // Si el dedo agarra a MITAD DEL CIERRE, el gesto continúa desde donde
          // el panel está AHORA —el valor presentado, leído de la matriz— y no
          // desde donde el estado creía que estaba (RNF-12). Sin esto, volver a
          // agarrar da un salto, que es justo lo que un `@keyframes` haría.
          const desde = panel.current ? traslacionPresentada(panel.current) : y;
          if (temporizador.current !== null) {
            window.clearTimeout(temporizador.current);
            temporizador.current = null;
          }
          setCierre(null);
          setEntrado(true);
          setAsentado(true);
          setY(desde);
          setArrastrando(true);
          gesto.current = {
            // `inicioY` lleva el desplazamiento ya presentado incorporado, así
            // que el delta sigue siendo 1:1 desde el punto en que se agarró.
            inicioY: e.clientY - desde,
            ultimaY: e.clientY,
            ultimoT: e.timeStamp,
            velocidad: 0,
          };
        }}
        onPointerMove={(e) => {
          if (!arrastrando) return;
          const delta = e.clientY - gesto.current.inicioY;
          const dt = e.timeStamp - gesto.current.ultimoT;
          if (dt > 0) {
            gesto.current.velocidad = (e.clientY - gesto.current.ultimaY) / dt;
            gesto.current.ultimaY = e.clientY;
            gesto.current.ultimoT = e.timeStamp;
          }
          // Cláusula 3: hacia abajo, 1:1. Hacia arriba —más allá del tope—,
          // rubber-band: resiste, no se bloquea.
          setY(delta >= 0 ? delta : rubberBand(delta, altoActual()));
        }}
        onPointerUp={(e) => {
          setArrastrando(false);
          // La velocidad CADUCA. Si el dedo arrastró rápido, se paró y soltó
          // un segundo después, ya no lleva momentum: la última muestra sigue
          // diciendo que sí, y sin esto el sheet se cerraría contra un dedo
          // que se había detenido a propósito.
          const quieto = e.timeStamp - gesto.current.ultimoT > VENTANA_DE_VELOCIDAD_MS;
          const velocidad = quieto ? 0 : gesto.current.velocidad;
          // Cláusula 2: decide la PROYECCIÓN, no la posición.
          const alto = altoActual();
          const destino = proyectar(y, velocidad);
          if (destino > alto / 2) cerrarConVelocidad(velocidad, y);
          else setY(0);
        }}
        onPointerCancel={() => {
          setArrastrando(false);
          setY(0);
        }}
      >
        {/* El tirador es el afordance del gesto: sin él, nadie sabe que se arrastra. */}
        <div aria-hidden="true" style={tirador} />
        <div style={{ padding: "0 1.25rem 1.5rem" }}>{children}</div>
      </div>
    </div>
  );
}

/** La traslación vertical que el navegador está PRESENTANDO en este instante. */
function traslacionPresentada(nodo: HTMLElement): number {
  const bruto = getComputedStyle(nodo).transform;
  if (bruto === "none") return 0;
  try {
    return new DOMMatrixReadOnly(bruto).m42;
  } catch {
    return 0;
  }
}

/**
 * Cuánto puede haber pasado desde la última muestra del puntero para que su
 * velocidad todavía cuente como momentum. Por encima, el dedo estaba quieto.
 */
const VENTANA_DE_VELOCIDAD_MS = 100;

/** Salida sin gesto: un poco más rápida que la entrada (plan visual §3.6). */
const DURACION_DE_SALIDA_MS = 240;

const telon: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "var(--slg-scrim)",
  display: "flex",
  alignItems: "flex-end",
  zIndex: 50,
  // La página no se desplaza por detrás del telón.
  overscrollBehavior: "contain",
};

const panelEstilo: React.CSSProperties = {
  width: "100%",
  background: "var(--slg-paper)",
  borderTopLeftRadius: "var(--slg-radius-lg)",
  borderTopRightRadius: "var(--slg-radius-lg)",
  boxShadow: "var(--slg-shadow-lg)",
  // `touch-action: none` es obligatorio: sin él, el navegador se queda el
  // gesto vertical para hacer scroll y el sheet no se mueve.
  touchAction: "none",
};

const tirador: React.CSSProperties = {
  width: "2.25rem",
  height: "0.25rem",
  margin: "0.75rem auto 1rem",
  borderRadius: "var(--slg-radius-full)",
  background: "var(--slg-line)",
};
