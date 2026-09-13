/**
 * El campo trampa (RF-33).
 *
 * **Se descarta EN SILENCIO.** No devuelve error, no dice «te hemos detectado»
 * y **no crea `lead_capture`**: responde como si todo hubiera ido bien. Decirle
 * a un bot que ha fallado es entrenarlo; el que lo escribió cambia el campo y
 * vuelve. Un silencio que parece éxito es lo único que no da información.
 *
 * El nombre del campo parece legítimo a propósito —un bot rellena lo que
 * reconoce—, y se oculta con CSS **y** con `tabindex="-1"` y `autocomplete="off"`:
 * `display:none` a secas lo saltan algunos rellenadores automáticos de
 * formularios, y entonces la trampa la pisa una persona real.
 */
export const NOMBRE_DEL_CAMPO_TRAMPA = "empresa_web";

export function campoTrampaRelleno(datos: FormData | Record<string, unknown>): boolean {
  const valor =
    datos instanceof FormData ? datos.get(NOMBRE_DEL_CAMPO_TRAMPA) : datos[NOMBRE_DEL_CAMPO_TRAMPA];
  return typeof valor === "string" && valor.trim().length > 0;
}
