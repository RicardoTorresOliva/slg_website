/**
 * index.ts — Fachada pública del anti-abuso propio (FU-11).
 *
 * Todo formulario público que necesite RF-31 a RF-35 importa de aquí, nunca
 * de los archivos internos directamente.
 */
export { esDominioDeCorreoGratuito } from "./free-email-domains.ts";
export { verificarLimiteDePeticiones, type ClaveDeLimite, type ResultadoDeLimite } from "./rate-limit.ts";
export { esHoneypotRelleno } from "./honeypot.ts";
