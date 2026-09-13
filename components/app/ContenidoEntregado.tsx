import type { ReactNode } from "react";

/**
 * Contenido que se muestra **tal como se entregó** (FU-12, criterio 4 · RF-72).
 *
 * LA DISTINCIÓN QUE ESTE COMPONENTE HACE VISIBLE. La interfaz se muestra en el
 * idioma de la preferencia del usuario. **El contenido entregado no**: un
 * entregable redactado en inglés para un cliente se lee en inglés aunque su
 * interfaz esté en español, y un aviso escrito en español no se traduce porque
 * quien lo lee tenga la interfaz en inglés. Traducirlo sería **cambiar lo que
 * se entregó**, y lo que se entregó es el trabajo.
 *
 * QUÉ HACE DE VERDAD, y no es decoración:
 *   · `lang` marca el idioma REAL de este trozo, distinto del de la página. Sin
 *     él, un lector de pantalla lee un texto inglés con fonética española y se
 *     vuelve incomprensible — que es exactamente el caso de un cliente
 *     internacional leyendo su entregable.
 *   · `translate="no"` le dice al traductor automático del navegador que no
 *     toque esto. Es la única defensa contra que Chrome traduzca un entregable
 *     a espaldas de todos y el cliente lea algo que SLG no escribió.
 *
 * Deliberadamente NO lleva un cartel visible diciendo «esto no está traducido»:
 * el contenido es lo principal de la pantalla, no una excepción que justificar.
 * La etiqueta va donde tiene que ir, en el atributo, para quien la necesita.
 */
export function ContenidoEntregado({
  idioma,
  children,
}: {
  /** El idioma del CONTENIDO, no el de la interfaz. */
  idioma: string;
  children: ReactNode;
}) {
  return (
    <div data-slg-entregado lang={idioma} translate="no">
      {children}
    </div>
  );
}
