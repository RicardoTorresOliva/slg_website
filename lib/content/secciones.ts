/**
 * secciones.ts — El cuerpo de un registro, partido en sus bloques.
 *
 * El contrato A.3 dice que una página de servicio son **seis secciones en orden
 * fijo**, y RF-09 dice que la portada son **siete bloques en orden fijo**. Esa
 * estructura vive en el `.md`, como encabezados de nivel 2, y no en el
 * componente: añadir un servicio es añadir un archivo (RF-27), y eso solo es
 * cierto si la estructura viaja con el contenido.
 *
 * El componente pide los bloques **por posición**, no por título: así el texto
 * del encabezado se puede traducir —«Qué es» / «What it is»— sin que el orden
 * dependa del idioma.
 */

export type Seccion = { titulo: string; cuerpo: string };

/** Parte un cuerpo Markdown por sus encabezados de nivel 2, en orden. */
export function secciones(cuerpo: string): Seccion[] {
  const lineas = cuerpo.split("\n");
  const out: Seccion[] = [];
  let actual: Seccion | null = null;

  for (const linea of lineas) {
    const m = /^##\s+(.+?)\s*$/.exec(linea);
    if (m) {
      if (actual) out.push({ ...actual, cuerpo: actual.cuerpo.trim() });
      actual = { titulo: m[1], cuerpo: "" };
      continue;
    }
    if (actual) actual.cuerpo += `${linea}\n`;
  }
  if (actual) out.push({ ...actual, cuerpo: actual.cuerpo.trim() });
  return out;
}
