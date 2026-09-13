/**
 * La firma de los webhooks salientes — **HMAC-SHA256 sobre el cuerpo** (RF-113).
 *
 * Se firma **el cuerpo exacto que se envía**, byte a byte, no un objeto
 * reserializado: si el receptor vuelve a serializar el JSON para verificar, el
 * orden de las claves o un espacio cambian el resultado y la firma falla por un
 * motivo que nadie encuentra. Por eso quien envía firma la **cadena** y quien
 * recibe verifica sobre el **texto crudo** del cuerpo.
 *
 * La marca de tiempo va **dentro de lo firmado**. Sin ella, una petición
 * capturada se puede reenviar mañana con su firma intacta: la firma prueba el
 * origen, no el momento.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export const CABECERA_FIRMA = "x-slg-signature";
export const CABECERA_MARCA = "x-slg-timestamp";
export const CABECERA_EVENTO = "x-slg-event";

/** Lo que se firma: `<marca>.<cuerpo>`. */
export function calcularFirma(cuerpo: string, marca: string, secreto: string): string {
  return `sha256=${createHmac("sha256", secreto).update(`${marca}.${cuerpo}`).digest("hex")}`;
}

/**
 * Verificación, para quien recibe. Vive aquí porque es la otra mitad del
 * contrato y porque es lo que prueban las pruebas: una firma que solo sabe
 * calcular el emisor no se ha comprobado nunca.
 */
export function firmaValida(
  cuerpo: string,
  marca: string,
  secreto: string,
  recibida: string,
): boolean {
  const esperada = Buffer.from(calcularFirma(cuerpo, marca, secreto));
  const dada = Buffer.from(recibida);
  if (esperada.length !== dada.length) return false;
  return timingSafeEqual(esperada, dada);
}
