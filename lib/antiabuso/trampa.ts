/**
 * El campo trampa (RF-33).
 *
 * **Se descarta EN SILENCIO.** No devuelve error, no dice «te hemos detectado»
 * y **no crea `lead_capture`**: responde como si todo hubiera ido bien. Decirle
 * a un bot que ha fallado es entrenarlo; el que lo escribió cambia el campo y
 * vuelve. Un silencio que parece éxito es lo único que no da información.
 *
 * **El nombre NO puede parecerse a un dato real** (D-180). Fue `empresa_web`
 * hasta el 2026-11-12: el autocompletar del navegador lo reconocía como
 * «empresa» y lo rellenaba solo, así que personas reales caían en la trampa y
 * se quedaban sin documento. Un bot rellena cualquier campo de texto; no hace
 * falta que el nombre le resulte tentador. Se pinta con `<CampoTrampa>`.
 */
export const NOMBRE_DEL_CAMPO_TRAMPA = "slg_hp";

/**
 * El nombre anterior. Una pestaña abierta antes del despliegue lo sigue
 * enviando: cuenta como «presente» para no tratarla de bot, pero su valor se
 * IGNORA, porque es justo el campo que el autocompletar rellenaba.
 */
export const NOMBRE_ANTERIOR_DEL_CAMPO_TRAMPA = "empresa_web";

export function campoTrampaRelleno(datos: FormData | Record<string, unknown>): boolean {
  const valor =
    datos instanceof FormData ? datos.get(NOMBRE_DEL_CAMPO_TRAMPA) : datos[NOMBRE_DEL_CAMPO_TRAMPA];
  return typeof valor === "string" && valor.trim().length > 0;
}

/**
 * El campo trampa NO VINO en el envio (RF-33, ampliado el 2026-09-21).
 *
 * Todo formulario publico pinta el campo trampa, asi que un navegador real lo
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
  const tiene = (nombre: string) => (datos instanceof FormData ? datos.has(nombre) : nombre in datos);
  return !tiene(NOMBRE_DEL_CAMPO_TRAMPA) && !tiene(NOMBRE_ANTERIOR_DEL_CAMPO_TRAMPA);
}
