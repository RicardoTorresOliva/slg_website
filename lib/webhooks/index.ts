/**
 * La puerta pública de `lib/webhooks`.
 *
 * Lo que NO se exporta: los secretos de los suscriptores, que solo salen de
 * variables de entorno y solo los lee la cola (criterio 7).
 */
export { arrancarBarrendero, barrerUnaVez, emitir, ESCALERA_MINUTOS, MAX_INTENTOS, pararBarrendero } from "./cola.ts";
export { anunciarArticulosPublicados, urlDelArticulo } from "./articulos.ts";
export { anunciarAviso, anunciarEntregable } from "./emisores.ts";
export { EVENTOS, type Evento, type PayloadDe } from "./eventos.ts";
export {
  CABECERA_EVENTO,
  CABECERA_FIRMA,
  CABECERA_MARCA,
  calcularFirma,
  firmaValida,
} from "./firma.ts";
export { suscriptores, type Suscriptor } from "./suscriptores.ts";
