/**
 * limits.ts — Límites numéricos del sistema. Fuente única.
 *
 * FU-04, criterio 8: el tamaño máximo de subida está fijado como número aquí y
 * se **referencia** desde el código, nunca se repite a mano. Un límite escrito
 * en dos sitios acaba siendo dos límites distintos, y el día que diverjan el
 * servidor aceptará lo que la interfaz rechazaba, o al revés.
 *
 * Fuente: design_docs/data_model.md §2.6 (RNF-25) · api_contracts.md §11.9 (RNF-20).
 */

const MB = 1024 * 1024;

/**
 * Tamaño máximo de subida por destino y tipo (RNF-25, D-25).
 *
 * El tope duro existe además de los específicos: es el límite del servidor y
 * del proxy, y ninguna ruta puede superarlo aunque su tipo lo permitiera.
 */
export const UPLOAD_LIMITS = {
  /** Bucket `downloads`: los PDF de los documentos de interés. */
  downloadPdf: 25 * MB,

  /** Bucket `deliverables`, por tipo de entregable. */
  deliverablePdf: 50 * MB,
  deliverableMaterial: 50 * MB,
  deliverableHtml: 5 * MB,
  deliverableMarkdown: 1 * MB,

  /** Tope duro del servidor y del proxy. Nada lo supera. */
  hardCap: 50 * MB,
} as const;

export type UploadKind = keyof Omit<typeof UPLOAD_LIMITS, "hardCap">;

/** Límite efectivo: el del tipo, nunca por encima del tope duro. */
export function uploadLimitFor(kind: UploadKind): number {
  return Math.min(UPLOAD_LIMITS[kind], UPLOAD_LIMITS.hardCap);
}

/**
 * Caducidad de las URL firmadas, en minutos (RNF-20, D-28).
 * Corta a propósito: una URL firmada que vive horas es un enlace público.
 */
export const SIGNED_URL_TTL_MINUTES = {
  /** Descarga de un documento por un visitante. */
  download: 15,
  /** Subida de un entregable por un agente o un operador. */
  upload: 10,
  /** Lectura de un entregable dentro del portal. */
  deliverable: 30,
} as const;

/**
 * Cola de entrega al CRM: los cinco escalones de reintento del brief (B.6).
 * En minutos. Tras agotarlos, la captura queda `failed` y se avisa.
 */
export const CRM_RETRY_BACKOFF_MINUTES = [1, 10, 60, 360, 1440] as const;

/** Número máximo de intentos por ciclo. Coincide con los escalones de backoff. */
export const CRM_MAX_ATTEMPTS = CRM_RETRY_BACKOFF_MINUTES.length;
