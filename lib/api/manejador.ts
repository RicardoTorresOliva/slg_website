/**
 * manejador.ts — **El armazón de `/api/v1`**: lo que toda ruta hace igual
 * (`api_contracts` §2 · DU-22).
 *
 * EXISTE PARA QUE NINGUNA RUTA PUEDA OLVIDARSE DE NADA. Autenticar, cobrar el
 * límite, exigir el alcance, auditar **y** poner las cabeceras son cinco cosas
 * que hay que hacer en **todas** las respuestas, incluidas las que fallan. Con
 * cada ruta haciéndolas por su cuenta, la que se escriba con prisa hará cuatro.
 *
 * EL ORDEN ES EL DE `architecture` §2.5, Y NO ES ESTÉTICO:
 *
 *   1. **401** — clave ausente, desconocida, revocada o caducada. Las cinco
 *      formas dan el mismo cuerpo: distinguirlas le diría a quien sondea cuáles
 *      existieron (§2.2).
 *   2. **429** — el límite va **antes** que el alcance (D-39). Al revés, una
 *      clave podría martillear endpoints prohibidos sin gastar cuota, y el
 *      límite dejaría de serlo.
 *   3. **403** — alcance insuficiente, **sin decir cuál faltaba** (RF-98, D9).
 *   4. El cuerpo de la ruta.
 *
 * LA AUDITORÍA SE ESCRIBE ANTES DE RESPONDER, y no es un detalle de orden: su
 * identificador **es** el `request_id` del cuerpo del error y el `X-Request-Id`
 * de toda respuesta (§2.8). Auditar después obligaría a inventar otro
 * identificador, y entonces el que el agente ve no serviría para encontrar la
 * llamada.
 *
 * **UN FALLO NO PREVISTO SALE COMO 500 SIN CONTAR NADA** (RF-108, RNF-32). El
 * motivo de verdad va al registro de auditoría, que es donde sirve; lo que
 * viaja por HTTP es una frase y un identificador.
 */
import { ErrorDeAutorizacion, exigir, verificarClave, type Accion, type EstadoDelLimite } from "../auth/index.ts";
import { auditarLlamadaDeApi } from "../auditoria/index.ts";
import type { AuthContext } from "../db/context.ts";

import { ErrorDeApi, sobreDeError, type DetalleDeValidacion, type EstadoDeError } from "./errores.ts";

export type Contrato = {
  /** La acción de B.3 que gobierna la ruta. De ahí sale el alcance exigido. */
  readonly accion: Accion;
  /** Para `audit_log.action`: `capture.list`, `deliverable.create`… */
  readonly apunte: string;
  /** Para `audit_log.entity`. */
  readonly entidad: string;
};

/** La IP del cliente. El primer valor de `x-forwarded-for`; el resto son proxies. */
function ipDe(request: Request): string | null {
  const cabecera =
    request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "";
  const primera = cabecera.split(",")[0]?.trim();
  return primera && primera.length > 0 ? primera.slice(0, 100) : null;
}

function cabecerasComunes(requestId: string, limite?: EstadoDelLimite): Headers {
  const h = new Headers({
    "content-type": "application/json; charset=utf-8",
    // Ninguna respuesta de esta API es cacheable por un intermediario: todas
    // llevan datos de un cliente y todas dependen de la clave (§2.9).
    "cache-control": "no-store",
    "x-request-id": requestId,
  });
  if (limite) {
    h.set("ratelimit-limit", String(limite.max));
    h.set("ratelimit-remaining", String(limite.restantes));
    h.set("ratelimit-reset", String(limite.resetEnSegundos));
  }
  return h;
}

export type Resultado = {
  readonly cuerpo: unknown;
  /** Identificador de la entidad tocada, para el registro. Nulo en listados. */
  readonly entidadId?: string | null;
  readonly organizationId?: string | null;
  readonly estado?: 200 | 201;
  /** Solo en 201: la ruta de lectura del recurso creado. */
  readonly location?: string;
};

/**
 * Envuelve una ruta de `/api/v1`.
 *
 * `fn` recibe el contexto de la clave ya verificado y con su alcance exigido.
 * Si necesita terminar con un código concreto, lanza `ErrorDeApi`: el sobre, la
 * auditoría y las cabeceras los pone esta función.
 */
export async function manejar(
  request: Request,
  contrato: Contrato,
  fn: (ctx: AuthContext) => Promise<Resultado>,
): Promise<Response> {
  const ruta = new URL(request.url).pathname;
  const ip = ipDe(request);

  const responder = async (
    estado: EstadoDeError,
    quien: Parameters<typeof auditarLlamadaDeApi>[0],
    motivoInterno: string,
    extra: { limite?: EstadoDelLimite; details?: readonly DetalleDeValidacion[]; reintentarEn?: number },
  ): Promise<Response> => {
    const requestId = await auditarLlamadaDeApi(quien, {
      accion: contrato.apunte,
      entidad: contrato.entidad,
      ip,
      metadata: {
        status: estado,
        path: ruta,
        method: request.method,
        // El alcance EXIGIDO, no el que la clave tiene: saber qué pedía la ruta
        // es lo que hace útil el registro; enumerar los de la clave sería
        // copiar una credencial al registro.
        required_action: contrato.accion,
        // El motivo interno vive AQUÍ y no en la respuesta (RNF-32).
        reason: motivoInterno.slice(0, 300),
      },
    });
    const cabeceras = cabecerasComunes(requestId, extra.limite);
    if (estado === 401) cabeceras.set("www-authenticate", "Bearer");
    if (extra.reintentarEn !== undefined) cabeceras.set("retry-after", String(extra.reintentarEn));
    return new Response(JSON.stringify(sobreDeError(estado, requestId, extra.details)), {
      status: estado,
      headers: cabeceras,
    });
  };

  // ── 1 y 2 · clave y límite ───────────────────────────────────────────────
  const verificada = await verificarClave(request.headers);
  if (!verificada.ok) {
    const fallo = verificada.fallo;
    /**
     * Sin clave resuelta, el actor **no puede ser `api_key`**: la fila mentiría
     * diciendo que había una clave. Es `system` con `actor_id = unknown` (§2.8).
     */
    const quien =
      fallo.clave === undefined
        ? { actorType: "system" as const, actorId: "unknown", actorLabel: null }
        : { actorType: "api_key" as const, actorId: fallo.clave.id, actorLabel: fallo.clave.nombre };
    return responder(fallo.status === 429 ? 429 : 401, quien, fallo.motivoInterno, {
      limite: fallo.limite,
      reintentarEn: fallo.reintentarEn,
    });
  }

  const quien = {
    actorType: "api_key" as const,
    actorId: verificada.claveId,
    actorLabel: verificada.nombre,
  };

  // ── 3 · alcance ──────────────────────────────────────────────────────────
  try {
    exigir(verificada.ctx, contrato.accion);
  } catch (e) {
    if (!(e instanceof ErrorDeAutorizacion)) throw e;
    return responder(403, quien, e.motivoInterno, { limite: verificada.limite });
  }

  // ── 4 · el cuerpo de la ruta ─────────────────────────────────────────────
  let salida: Resultado;
  try {
    salida = await fn(verificada.ctx);
  } catch (e) {
    if (e instanceof ErrorDeApi) {
      return responder(e.estado, quien, e.motivoInterno, {
        limite: verificada.limite,
        details: e.details,
      });
    }
    if (e instanceof ErrorDeAutorizacion) {
      // Un recurso que la política de fila no devuelve es un 404, no un 403:
      // un 403 confirmaría que esa empresa existe (§2.5, RF-71).
      return responder(e.status === 403 ? 404 : 404, quien, e.motivoInterno, {
        limite: verificada.limite,
      });
    }
    return responder(500, quien, (e as Error).message, { limite: verificada.limite });
  }

  const requestId = await auditarLlamadaDeApi(quien, {
    accion: contrato.apunte,
    entidad: contrato.entidad,
    entidadId: salida.entidadId ?? null,
    organizationId: salida.organizationId ?? null,
    ip,
    metadata: {
      status: salida.estado ?? 200,
      path: ruta,
      method: request.method,
      required_action: contrato.accion,
    },
  });

  const cabeceras = cabecerasComunes(requestId, verificada.limite);
  if (salida.location) cabeceras.set("location", salida.location);
  return new Response(JSON.stringify(salida.cuerpo), {
    status: salida.estado ?? 200,
    headers: cabeceras,
  });
}
