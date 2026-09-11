/**
 * honeypot.ts — RF-33: campo trampa invisible para personas.
 *
 * Trivial a propósito: un envío con el campo relleno se descarta en
 * silencio (nunca un error, nunca una fila de `lead_capture`) — el llamador
 * decide "descartar" simplemente no siguiendo adelante, no informando al
 * remitente de que lo detectó.
 */
export function esHoneypotRelleno(valor: string | undefined | null): boolean {
  return !!valor && valor.trim().length > 0;
}
