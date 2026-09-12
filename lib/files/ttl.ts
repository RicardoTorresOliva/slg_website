/**
 * ttl.ts — Caducidad de las URL firmadas, leída de configuración.
 *
 * CRITERIO 3 DE FU-09: «la caducidad es exactamente el valor fijado en
 * `api_contracts` y está **leída de configuración, no repetida en el código**».
 * De ahí que existan tres variables de entorno y no tres constantes esparcidas.
 *
 * Los defectos viven en `lib/db/limits.ts`, en un solo sitio, y son los de
 * `api_contracts` §11.9: 15 minutos la descarga pública, 10 el entregable del
 * portal —ahí el usuario ya está autenticado y pide otra firma con un clic—, y
 * 30 la subida, que es la única que atraviesa una transferencia real.
 *
 * LA REGLA QUE VALE TANTO COMO EL NÚMERO (RNF-20): **toda URL de archivo
 * caduca, sin excepción**. No existe URL permanente ni enlace público de ningún
 * objeto, y por eso este módulo no ofrece forma de pedir una.
 */

import { SIGNED_URL_TTL_MINUTES } from "../db/limits.ts";

export type UsoDeFirma = keyof typeof SIGNED_URL_TTL_MINUTES;

const VARIABLES: Readonly<Record<UsoDeFirma, string>> = {
  download: "SIGNED_URL_TTL_DOWNLOAD_MINUTES",
  deliverable: "SIGNED_URL_TTL_DELIVERABLE_MINUTES",
  upload: "SIGNED_URL_TTL_UPLOAD_MINUTES",
};

/** Nadie firma para siempre «por error de configuración». */
const TOPE_EN_MINUTOS = 60;

export function ttlEnMinutos(uso: UsoDeFirma): number {
  const crudo = process.env[VARIABLES[uso]];
  if (crudo === undefined || crudo.trim() === "") return SIGNED_URL_TTL_MINUTES[uso];

  const n = Number(crudo);
  if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
    throw new Error(
      `${VARIABLES[uso]} debe ser un entero de minutos mayor que cero; llegó «${crudo}».`,
    );
  }
  if (n > TOPE_EN_MINUTOS) {
    // Una firma de horas deja de ser una firma: es un enlace público con fecha.
    throw new Error(
      `${VARIABLES[uso]} = ${n} min supera el tope de ${TOPE_EN_MINUTOS}. ` +
        `RNF-20: toda URL de archivo caduca, y una que vive horas ya no protege nada.`,
    );
  }
  return n;
}

export function ttlEnSegundos(uso: UsoDeFirma): number {
  return ttlEnMinutos(uso) * 60;
}

export { VARIABLES as VARIABLES_DE_TTL };
