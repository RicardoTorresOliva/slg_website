/**
 * Segunda mitad del FIXTURE NEGATIVO de `check-hq.ts` (R-26).
 *
 * Un lector de métricas que **lee con la clave de captura**. Funciona
 * exactamente igual de bien que con la de solo lectura —ese es el problema—: el
 * fallo no se manifiesta hasta el día que hay que revocar una de las dos y se
 * descubre que apagar la lectura apaga también la captura de leads (RF-56).
 *
 * Vive en esta ruta a propósito: el freno busca el lector por su ruta, así que
 * el fixture tiene que llamarse igual para que la comprobación se ejecute.
 */
import { llamar } from "../../../../../../lib/crm/http.ts";

export async function metricasDelCrm() {
  return llamar("GET", "/dashboard/metrics", undefined, "captura");
}
