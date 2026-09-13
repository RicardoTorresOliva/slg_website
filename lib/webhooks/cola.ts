/**
 * La cola de webhooks salientes — la misma forma que la del CRM (architecture §6.1).
 *
 * **El evento se REGISTRA antes de intentar enviarlo**, y se registra aunque no
 * haya ningún suscriptor (RF-115). Es lo que hace cierto que «sin suscriptor
 * configurado el sistema funciona igual»: el registro no depende de que haya
 * alguien escuchando.
 *
 * Una fila por evento **y por destino**: dos suscriptores que reciben el mismo
 * evento son dos entregas con su propio estado, sus propios intentos y su propio
 * error. Compartir fila haría que el fallo de uno marcara al otro.
 */
import { sql } from "drizzle-orm";

import { withSystemScope } from "../db/scope.ts";
import { webhookDelivery } from "../db/schema.ts";

import type { Evento, PayloadDe } from "./eventos.ts";
import { CABECERA_EVENTO, CABECERA_FIRMA, CABECERA_MARCA, calcularFirma } from "./firma.ts";
import { suscriptores } from "./suscriptores.ts";

/** Espera creciente, como la del CRM y por lo mismo (RF-114). */
export const ESCALERA_MINUTOS = [1, 10, 60, 6 * 60, 24 * 60] as const;
export const MAX_INTENTOS = ESCALERA_MINUTOS.length;

const INTERVALO_MS = Number(process.env.WEBHOOK_QUEUE_INTERVAL_MS ?? 20_000);
const LOTE = Number(process.env.WEBHOOK_QUEUE_BATCH ?? 10);
const RESERVA_MINUTOS = 5;

/**
 * Registra el evento para cada suscriptor. **Nunca lanza**: un webhook no puede
 * tumbar la captura de un lead. Si esto fallara y propagara, el visitante
 * perdería su documento por culpa de un flujo externo que es opcional.
 */
export async function emitir<E extends Evento>(evento: E, payload: PayloadDe[E]): Promise<void> {
  try {
    const destinos = suscriptores();
    await withSystemScope(
      "DU-12 · los eventos salientes no pertenecen a ninguna empresa: describen " +
        "hechos del sistema y se registran aunque nadie escuche.",
      async (db) => {
        if (destinos.length === 0) {
          // Sin suscriptor: el evento QUEDA REGISTRADO igual (RF-115), marcado
          // como entregado porque no había a dónde entregarlo. Así el histórico
          // no miente diciendo que hay envíos pendientes que nadie hará.
          await db.insert(webhookDelivery).values({
            id: crypto.randomUUID(),
            event: evento,
            payload: payload as Record<string, unknown>,
            targetUrl: "(sin suscriptor)",
            status: "delivered",
            attempts: 0,
          });
          return;
        }
        for (const destino of destinos) {
          await db.insert(webhookDelivery).values({
            id: crypto.randomUUID(),
            event: evento,
            payload: payload as Record<string, unknown>,
            targetUrl: destino.url,
            status: "pending",
            attempts: 0,
            nextAttemptAt: new Date(),
          });
        }
      },
    );
  } catch {
    // Deliberado y documentado: un fallo aquí no puede propagarse hacia atrás.
  }
}

type Fila = {
  id: string;
  event: string;
  payload: Record<string, unknown>;
  target_url: string;
  attempts: number;
};

async function reclamar(limite: number): Promise<Fila[]> {
  return withSystemScope("DU-12 · barrido de la cola de webhooks.", async (db) => {
    const filas = await db.execute(sql`
      WITH reclamadas AS (
        SELECT id FROM webhook_delivery
         WHERE status = 'pending'
           AND (next_attempt_at IS NULL OR next_attempt_at <= now())
         ORDER BY next_attempt_at NULLS FIRST
         LIMIT ${limite}
         FOR UPDATE SKIP LOCKED
      )
      UPDATE webhook_delivery w
         SET next_attempt_at = now() + ${`${RESERVA_MINUTOS} minutes`}::interval
        FROM reclamadas r
       WHERE w.id = r.id
      RETURNING w.id, w.event, w.payload, w.target_url, w.attempts
    `);
    return filas as unknown as Fila[];
  });
}

async function entregarUna(fila: Fila): Promise<void> {
  const destino = suscriptores().find((s) => s.url === fila.target_url);
  const intento = fila.attempts + 1;

  let ok = false;
  let error: string | null = null;

  if (!destino) {
    // El suscriptor se retiró entre el registro y el envío. No es un fallo del
    // sistema: es una configuración que cambió, y no tiene sentido reintentarlo.
    error = "el suscriptor ya no está configurado";
  } else {
    // El cuerpo se serializa UNA vez y se firma ESE texto. Reserializar para
    // firmar es cómo se producen firmas que no verifican por un espacio.
    const cuerpo = JSON.stringify({ event: fila.event, data: fila.payload });
    const marca = String(Date.now());
    try {
      const r = await fetch(destino.url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          [CABECERA_EVENTO]: fila.event,
          [CABECERA_MARCA]: marca,
          [CABECERA_FIRMA]: calcularFirma(cuerpo, marca, destino.secreto),
        },
        body: cuerpo,
        signal: AbortSignal.timeout(Number(process.env.WEBHOOK_TIMEOUT_MS ?? 10_000)),
      });
      ok = r.ok;
      if (!ok) error = `HTTP ${r.status}`;
    } catch (e) {
      error = (e as Error).message.slice(0, 300);
    }
  }

  await withSystemScope("DU-12 · estado de una entrega de webhook.", async (db) => {
    const agotado = !ok && intento >= MAX_INTENTOS;
    const espera = ESCALERA_MINUTOS[Math.min(intento, MAX_INTENTOS - 1)];
    await db.execute(sql`
      UPDATE webhook_delivery
         SET status = ${ok ? "delivered" : agotado ? "failed" : "pending"},
             attempts = ${intento},
             last_error = ${ok ? null : error},
             next_attempt_at = ${ok || agotado ? null : sql`now() + ${`${espera} minutes`}::interval`}
       WHERE id = ${fila.id}
    `);
  });
}

export async function barrerUnaVez(limite = LOTE): Promise<number> {
  const filas = await reclamar(limite);
  for (const fila of filas) await entregarUna(fila);
  return filas.length;
}

let temporizador: ReturnType<typeof setInterval> | null = null;

export function arrancarBarrendero(): void {
  if (temporizador) return;
  temporizador = setInterval(() => {
    void barrerUnaVez().catch(() => {});
  }, INTERVALO_MS);
  temporizador.unref?.();
}

export function pararBarrendero(): void {
  if (!temporizador) return;
  clearInterval(temporizador);
  temporizador = null;
}
