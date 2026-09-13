/**
 * errores.ts — **Un solo sobre para todos los errores de `/api/v1`**
 * (`api_contracts` §2.5 · RF-108 · RNF-32).
 *
 * DOS REGLAS, Y LAS DOS SON DE SEGURIDAD, NO DE ESTILO:
 *
 *   1. **`code` es estable y es lo que un agente lee.** Cambiarlo es un cambio
 *      incompatible y abriría `/api/v2` (RF-109). Por eso viven aquí, en una
 *      tabla, y no escritos a mano en cada ruta: escritos a mano, dos rutas
 *      acaban devolviendo `not_found` y `notFound` para lo mismo.
 *   2. **`message` nunca lleva nada de dentro.** Ni traza, ni nombre de tabla,
 *      ni consulta, ni versión de dependencia, ni fragmento de la petición. Un
 *      mensaje de error es la superficie que un atacante lee gratis, y lo que
 *      cuenta se lo cuenta a él primero. El motivo de verdad va al `audit_log`,
 *      que es donde sirve.
 *
 * **`details` solo en 422**, y solo con `{ field, code }`: **nunca el valor
 * recibido**, porque repetir el valor es repetir el dato personal (RNF-26).
 */

export const CODIGOS = {
  400: "malformed_request",
  401: "unauthorized",
  403: "insufficient_scope",
  404: "not_found",
  409: "conflict",
  413: "payload_too_large",
  415: "unsupported_media_type",
  422: "validation_failed",
  429: "rate_limited",
  500: "internal_error",
  503: "dependency_unavailable",
} as const;

export type EstadoDeError = keyof typeof CODIGOS;

/**
 * Los mensajes. Uno por código y **el mismo siempre**: que el 403 diga lo mismo
 * para cualquier ruta y cualquier alcance es lo que impide que la respuesta
 * revele qué alcance faltaba (RF-98, gate D9).
 */
export const MENSAJES: Record<EstadoDeError, string> = {
  400: "La petición no se puede interpretar.",
  401: "No autenticado.",
  403: "Esta clave no puede realizar esta operación.",
  404: "No encontrado.",
  409: "El recurso ya está en ese estado.",
  413: "El cuerpo de la petición es demasiado grande.",
  415: "El tipo de contenido no está admitido.",
  422: "La petición no supera la validación.",
  429: "Has superado el límite de peticiones de esta clave. Reintenta más tarde.",
  500: "Error interno.",
  503: "Una dependencia no está disponible.",
};

/** Un campo que no valida. **Sin el valor**: solo dónde y por qué. */
export type DetalleDeValidacion = { readonly field: string; readonly code: string };

export type SobreDeError = {
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly request_id: string;
    readonly details: readonly DetalleDeValidacion[];
  };
};

export function sobreDeError(
  estado: EstadoDeError,
  requestId: string,
  details: readonly DetalleDeValidacion[] = [],
): SobreDeError {
  return {
    error: {
      code: CODIGOS[estado],
      message: MENSAJES[estado],
      request_id: requestId,
      // `details` solo tiene contenido en 422. En el resto viaja vacío y no
      // ausente: un agente que lo lee siempre encuentra un array.
      details: estado === 422 ? details : [],
    },
  };
}

/**
 * El error que una ruta lanza para terminar con un código concreto.
 *
 * Existe para que el cuerpo de un endpoint pueda decir «esto es un 404» sin
 * construir la respuesta —y sin poder olvidarse de la auditoría, de las
 * cabeceras del límite o del `X-Request-Id`, que los pone el manejador—.
 */
export class ErrorDeApi extends Error {
  readonly estado: EstadoDeError;
  readonly details: readonly DetalleDeValidacion[];
  /** Para el registro interno. **Nunca** se serializa. */
  readonly motivoInterno: string;

  constructor(
    estado: EstadoDeError,
    motivoInterno: string,
    details: readonly DetalleDeValidacion[] = [],
  ) {
    super(`api ${estado}: ${motivoInterno}`);
    this.name = "ErrorDeApi";
    this.estado = estado;
    this.details = details;
    this.motivoInterno = motivoInterno;
  }
}
