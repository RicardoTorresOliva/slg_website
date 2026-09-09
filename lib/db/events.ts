/**
 * events.ts — Registro de actividad de agentes.
 *
 * FU-04, criterio 7 · RF-146. `agent_event.kind` es un enumerado ABIERTO: un
 * agente Hermes nuevo puede registrar un tipo de actividad **sin migración de
 * esquema**. Lo que sí se exige:
 *
 *   · FORMA del `kind`: `<recurso>.<acción>`, garantizada por un CHECK en la
 *     base de datos, no solo aquí.
 *   · El `payload_json` se valida CONTRA ESQUEMA EN LA ESCRITURA. Validar al
 *     leer llega tarde: para entonces el dato malo ya está guardado y quien lo
 *     escribió ya no está para arreglarlo.
 *
 * La tensión entre «abierto» y «validado» se resuelve así: los tipos conocidos
 * tienen esquema propio y se validan contra él; los desconocidos se aceptan si
 * cumplen la forma y unos límites genéricos de tamaño y profundidad.
 */

import { sql } from "drizzle-orm";

import { agentEvent } from "./schema.ts";
import type { ScopedDb } from "./scope.ts";

/** Forma obligatoria del `kind`. Réplica del CHECK `agent_event_kind_shape`. */
const FORMA_KIND = /^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/;

/** Límites genéricos para cualquier `kind`, conocido o no. */
const MAX_BYTES_PAYLOAD = 16 * 1024;
const MAX_PROFUNDIDAD = 6;
const MAX_CLAVES = 64;

type Validador = (p: Record<string, unknown>) => string | null;

const requiere =
  (...claves: string[]): Validador =>
  (p) => {
    const faltan = claves.filter((k) => p[k] === undefined || p[k] === null);
    return faltan.length ? `faltan campos obligatorios: ${faltan.join(", ")}` : null;
  };

/**
 * Esquemas de los tipos conocidos. Añadir uno aquí NO es requisito para poder
 * registrarlo: es lo que permite validarlo mejor cuando se conoce.
 */
export const ESQUEMAS_CONOCIDOS: Record<string, Validador> = {
  "deliverable.published": requiere("deliverableId", "projectId"),
  "announcement.published": requiere("announcementId"),
  "report.generated": requiere("reportId", "kind"),
  "review.completed": requiere("milestone", "verdict"),
};

function profundidad(v: unknown, nivel = 0): number {
  if (nivel > MAX_PROFUNDIDAD || v === null || typeof v !== "object") return nivel;
  const hijos = Array.isArray(v) ? v : Object.values(v as Record<string, unknown>);
  return hijos.reduce<number>((mx, h) => Math.max(mx, profundidad(h, nivel + 1)), nivel);
}

export type ResultadoValidacion = { ok: true } | { ok: false; motivo: string };

/** Valida `kind` y `payload_json` antes de escribir. */
export function validarEventoDeAgente(
  kind: string,
  payload: Record<string, unknown>,
): ResultadoValidacion {
  if (!FORMA_KIND.test(kind)) {
    return {
      ok: false,
      motivo: `«${kind}» no cumple la forma «<recurso>.<acción>» en minúsculas (RF-146)`,
    };
  }

  const bytes = Buffer.byteLength(JSON.stringify(payload), "utf8");
  if (bytes > MAX_BYTES_PAYLOAD) {
    return {
      ok: false,
      motivo: `payload de ${bytes} bytes supera el máximo de ${MAX_BYTES_PAYLOAD}`,
    };
  }
  if (Object.keys(payload).length > MAX_CLAVES) {
    return { ok: false, motivo: `payload con más de ${MAX_CLAVES} claves de primer nivel` };
  }
  if (profundidad(payload) > MAX_PROFUNDIDAD) {
    return { ok: false, motivo: `payload con más de ${MAX_PROFUNDIDAD} niveles de anidamiento` };
  }

  const esquema = ESQUEMAS_CONOCIDOS[kind];
  if (esquema) {
    const problema = esquema(payload);
    if (problema) return { ok: false, motivo: `«${kind}»: ${problema}` };
  }

  return { ok: true };
}

/**
 * Registra actividad de un agente. Rechaza antes de tocar la base de datos:
 * la validación es de escritura, no de lectura.
 */
export async function registrarEventoDeAgente(
  db: ScopedDb,
  entrada: {
    id: string;
    apiKeyId: string | null;
    organizationId: string | null;
    kind: string;
    payload: Record<string, unknown>;
  },
): Promise<void> {
  const v = validarEventoDeAgente(entrada.kind, entrada.payload);
  if (!v.ok) {
    throw new Error(`Evento de agente rechazado en la escritura: ${v.motivo}`);
  }

  await db.insert(agentEvent).values({
    id: entrada.id,
    apiKeyId: entrada.apiKeyId,
    organizationId: entrada.organizationId,
    kind: entrada.kind,
    payloadJson: entrada.payload,
  });
}

/** `audit_log` no se actualiza ni se borra: la corrección es una fila nueva. */
export const AUDIT_LOG_ES_SOLO_INSERCION = sql`-- RNF-29`;
