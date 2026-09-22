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

/**
 * El campo trampa NO VINO en el envio (RF-33, ampliado el 2026-09-21).
 *
 * Todo formulario publico pinta `empresa_web`, asi que un navegador real lo
 * manda SIEMPRE —vacio, pero lo manda—. Un script que arma el cuerpo a mano
 * contra `/api/contacto` solo envia los campos que le interesan y se salta el
 * que nunca vio: la AUSENCIA delata al bot igual de bien que el relleno.
 *
 * Es la capa que faltaba, y se supo por el unico camino que ensena algo: el
 * 17 y 18 de septiembre de 2026 entraron cinco registros basura al CRM. Ninguno
 * relleno la trampa —no la vieron, postearon directo a la API—; ninguno repitio
 * correo ni IP lo suficiente para tocar el limite; y sus dominios eran
 * desechables recien inventados, fuera de toda lista. Las tres capas
 * funcionaban. Las tres los dejaron pasar.
 *
 * Se descarta igual que el relleno: EN SILENCIO, con la misma respuesta. Un bot
 * que recibe un error distinto aprende cual de las dos cosas hizo mal.
 */
export function campoTrampaAusente(datos: FormData | Record<string, unknown>): boolean {
  return datos instanceof FormData
    ? !datos.has(NOMBRE_DEL_CAMPO_TRAMPA)
    : !(NOMBRE_DEL_CAMPO_TRAMPA in datos);
}
