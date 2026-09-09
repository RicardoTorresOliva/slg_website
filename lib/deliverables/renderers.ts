/**
 * renderers.ts — Cómo se entrega cada tipo de entregable.
 *
 * FU-04, criterio 6 · RF-142. `deliverable.type` es un VALOR DE DATOS, nunca una
 * rama de código. Añadir un tipo es añadir una entrada a este mapa; si la
 * decisión de tipo aparece repartida en `if`/`switch` por el código, la unidad
 * se rechaza en revisión.
 *
 * Por qué importa más de lo que parece: §5.3 del brief deja «previsto» alojar el
 * reporte `SLG_Readiness` de forma nativa. Ese día habrá un tipo nuevo. Si el
 * tipo vive en el mapa, es una línea; si vive repartido en condicionales, es una
 * cacería por todo el código.
 */

import { UPLOAD_LIMITS, SIGNED_URL_TTL_MINUTES } from "../db/limits.ts";
import type { DeliverableType } from "../db/schema.ts";

/** Cómo llega el contenido al consumidor. */
export type ModoDeEntrega =
  /** Descarga directa por URL firmada. */
  | "descarga"
  /** Visor aislado en un origen separado (D-45). */
  | "visor-aislado"
  /** Se renderiza dentro del portal. */
  | "render-en-portal"
  /** Enlace externo: no alojamos nada. */
  | "enlace-externo";

export type EspecificacionDeTipo = {
  /** Etiqueta para la interfaz. El texto visible vive en `content/ui`. */
  claveDeEtiqueta: string;
  modo: ModoDeEntrega;
  /** Null cuando no subimos archivo (el caso de `link`). */
  limiteDeSubidaBytes: number | null;
  mimesAceptados: readonly string[] | null;
  ttlUrlFirmadaMinutos: number;
  /**
   * Si el contenido puede traer marcado activo. `html` puede, y por eso D-45 lo
   * manda a un origen separado además del `iframe sandbox`.
   */
  contenidoActivo: boolean;
};

/**
 * EL MAPA. Único sitio donde el tipo decide algo.
 * `Record<DeliverableType, …>` obliga a que añadir un tipo al esquema sin
 * declararlo aquí **no compile**.
 */
export const RENDERIZADORES: Record<DeliverableType, EspecificacionDeTipo> = {
  pdf: {
    claveDeEtiqueta: "deliverable.type.pdf",
    modo: "descarga",
    limiteDeSubidaBytes: UPLOAD_LIMITS.deliverablePdf,
    mimesAceptados: ["application/pdf"],
    ttlUrlFirmadaMinutos: SIGNED_URL_TTL_MINUTES.deliverable,
    contenidoActivo: false,
  },

  html: {
    claveDeEtiqueta: "deliverable.type.html",
    modo: "visor-aislado",
    limiteDeSubidaBytes: UPLOAD_LIMITS.deliverableHtml,
    mimesAceptados: ["text/html"],
    ttlUrlFirmadaMinutos: SIGNED_URL_TTL_MINUTES.deliverable,
    // Parte de estos entregables los generan agentes Hermes: origen separado
    // más iframe sandbox y CSP estricta, como defensa en profundidad (D-45).
    contenidoActivo: true,
  },

  md: {
    claveDeEtiqueta: "deliverable.type.md",
    modo: "render-en-portal",
    limiteDeSubidaBytes: UPLOAD_LIMITS.deliverableMarkdown,
    mimesAceptados: ["text/markdown", "text/plain"],
    ttlUrlFirmadaMinutos: SIGNED_URL_TTL_MINUTES.deliverable,
    contenidoActivo: false,
  },

  link: {
    claveDeEtiqueta: "deliverable.type.link",
    modo: "enlace-externo",
    limiteDeSubidaBytes: null,
    mimesAceptados: null,
    ttlUrlFirmadaMinutos: 0,
    contenidoActivo: false,
  },

  material: {
    claveDeEtiqueta: "deliverable.type.material",
    modo: "descarga",
    limiteDeSubidaBytes: UPLOAD_LIMITS.deliverableMaterial,
    // La lista cerrada de MIME la fija FU-09 con la validación de subida.
    mimesAceptados: null,
    ttlUrlFirmadaMinutos: SIGNED_URL_TTL_MINUTES.deliverable,
    contenidoActivo: false,
  },
};

export function especificacionDe(tipo: DeliverableType): EspecificacionDeTipo {
  return RENDERIZADORES[tipo];
}

/**
 * Valida una subida contra el tipo. El límite se lee del mapa, que a su vez lo
 * lee de `limits.ts`: el número existe en un solo sitio (criterio 8).
 */
export function validarSubida(
  tipo: DeliverableType,
  bytes: number,
  mime: string | null,
): { ok: true } | { ok: false; motivo: string } {
  const spec = RENDERIZADORES[tipo];

  if (spec.limiteDeSubidaBytes === null) {
    return { ok: false, motivo: `el tipo «${tipo}» no admite archivo, solo URL` };
  }
  const limite = Math.min(spec.limiteDeSubidaBytes, UPLOAD_LIMITS.hardCap);
  if (bytes > limite) {
    return {
      ok: false,
      motivo: `${(bytes / 1048576).toFixed(1)} MB supera el límite de ${(limite / 1048576).toFixed(0)} MB para «${tipo}»`,
    };
  }
  if (spec.mimesAceptados && (!mime || !spec.mimesAceptados.includes(mime))) {
    return {
      ok: false,
      motivo: `tipo de archivo «${mime ?? "desconocido"}» no aceptado para «${tipo}»`,
    };
  }
  return { ok: true };
}
