import { textoPlano } from "./inline.ts";

/**
 * Troceo de un cuerpo markdown en bloques renderizables (DU-06, DU-11).
 *
 * Deliberadamente **no** es un renderizador de markdown: reconoce encabezados
 * `##`, listas con `-` y párrafos, y nada más. Meter una biblioteca que
 * interprete markdown completo traería consigo HTML arbitrario dentro del
 * contenido, y el contenido es la única superficie de este sitio que se
 * escribe a mano — sería la vía de inyección más cómoda que podríamos abrir
 * (frontera (h) de `scope.md`: cero scripts de terceros en la capa pública).
 *
 * Lo que no reconoce se muestra como texto. Un formato que no se entiende se
 * ve raro; uno que se interpreta a medias se ejecuta.
 */

export type Bloque =
  | { tipo: "encabezado"; texto: string }
  | { tipo: "parrafo"; texto: string }
  | { tipo: "lista"; elementos: string[] };

/** Quita el énfasis `**...**`, que aquí no tiene render propio. */
function sinEnfasis(texto: string): string {
  return textoPlano(texto).replace(/\*\*(.+?)\*\*/g, "$1");
}

export function bloquesDe(cuerpo: string): Bloque[] {
  return cuerpo
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((b): Bloque => {
      if (b.startsWith("## ")) {
        return { tipo: "encabezado", texto: sinEnfasis(b.slice(3).trim()) };
      }
      const lineas = b.split("\n").map((l) => l.trim());
      if (lineas.every((l) => l.startsWith("- "))) {
        return { tipo: "lista", elementos: lineas.map((l) => sinEnfasis(l.slice(2).trim())) };
      }
      return { tipo: "parrafo", texto: sinEnfasis(b.replace(/\s+/g, " ")) };
    });
}
