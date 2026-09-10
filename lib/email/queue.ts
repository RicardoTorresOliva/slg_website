/**
 * queue.ts — Reintento de `email_delivery` con espera creciente.
 *
 * Misma forma que las otras dos colas (`data_model` §3.9, `architecture` §6):
 * reserva con plazo (§6.3), cinco intentos (§3.9 "Cinco intentos fallidos"),
 * daño máximo de un reinicio = retraso o duplicado, nunca pérdida (§6.4).
 *
 * DIFERENCIA deliberada con la cola del CRM (D-30, específica de esa cola):
 * aquí el primer intento es INMEDIATO, no diferido un minuto. D-30 diferó el
 * primer intento del CRM para que sus cinco esperas de RF-50 encajaran en el
 * tope de cinco intentos; ese problema es suyo, no de correo — nada exige
 * que una invitación espere un minuto para su primer intento, y hacerlo sería
 * peor experiencia sin ganar nada. `enviarCorreo` (send.ts) hace el intento 1
 * en la misma llamada; esta cola solo cubre los reintentos 2 a 5, reconstruidos
 * vía `retry-registry.ts` porque el cuerpo no se persiste (`data_model` §5.19).
 *
 * Escalón por intento fallido, mismo vocabulario que `api_contracts` §8.1:
 *   intento 1 falla → espera 1 min  → intento 2
 *   intento 2 falla → espera 10 min → intento 3
 *   intento 3 falla → espera 1 h    → intento 4
 *   intento 4 falla → espera 6 h    → intento 5
 *   intento 5 falla → status = 'failed' (sin próximo intento)
 */

import { and, asc, eq, inArray, lte } from "drizzle-orm";

import { emailDelivery } from "../db/schema.ts";
import { withSystemScope, type ScopedDb } from "../db/scope.ts";
import type { EmailKind, EmailTransport, FilaEmail } from "./types.ts";
import type { MailConfig } from "./config.ts";
import { obtenerReconstructor } from "./retry-registry.ts";

/** Minutos de espera antes del intento N+1, indexados por intentos ya consumidos (1..4). */
const ESCALON_MINUTOS = [1, 10, 60, 360] as const;
export const INTENTOS_MAXIMOS = 5;

/** Tamaño de lote y plazo de reserva de esta cola (parámetros propios de FU-08, no de DU-09/DU-12). */
const TAMANO_LOTE = 20;
const PLAZO_RESERVA_MINUTOS = 2;
const INTERVALO_BARRIDO_MS = 20_000; // < 60 s: menor que el escalón más corto (RF-50).

const MAX_ERROR_CHARS = 500;

/** Trunca y quita el secreto SMTP configurado, si por accidente apareciera en el mensaje. */
function sanearError(mensaje: string, cfg: MailConfig): string {
  const sinSecreto = cfg.smtpPassword
    ? mensaje.split(cfg.smtpPassword).join("[secreto]")
    : mensaje;
  return sinSecreto.slice(0, MAX_ERROR_CHARS);
}

/**
 * Hace el intento de envío de una fila ya reservada y escribe el resultado.
 * Compartida por el intento inmediato de `send.ts` y por el barrido de esta
 * cola: es literalmente "el mismo intento", en dos momentos distintos.
 */
export async function intentarEnvio(
  db: ScopedDb,
  fila: Pick<FilaEmail, "id" | "toEmail" | "fromEmail" | "replyTo" | "attempts">,
  render: { subject: string; text: string },
  cfg: MailConfig,
  transporte: EmailTransport,
): Promise<{ entregado: boolean }> {
  try {
    const resultado = await transporte.enviar({
      to: fila.toEmail,
      from: fila.fromEmail,
      fromName: cfg.fromName,
      replyTo: fila.replyTo ?? cfg.replyTo,
      subject: render.subject,
      text: render.text,
    });
    await db
      .update(emailDelivery)
      .set({
        status: "delivered",
        providerMessageId: resultado.providerMessageId,
        sentAt: new Date(),
        nextAttemptAt: null,
      })
      .where(eq(emailDelivery.id, fila.id));
    return { entregado: true };
  } catch (error) {
    const intentosConsumidos = fila.attempts + 1;
    const agotado = intentosConsumidos >= INTENTOS_MAXIMOS;
    const mensaje = sanearError(error instanceof Error ? error.message : String(error), cfg);
    await db
      .update(emailDelivery)
      .set({
        attempts: intentosConsumidos,
        lastError: mensaje,
        status: agotado ? "failed" : "pending",
        nextAttemptAt: agotado
          ? null
          : new Date(Date.now() + ESCALON_MINUTOS[intentosConsumidos - 1] * 60_000),
      })
      .where(eq(emailDelivery.id, fila.id));
    return { entregado: false };
  }
}

/**
 * Un barrido: reclama un lote vencido con `FOR UPDATE SKIP LOCKED` (§6.3),
 * reintenta cada fila fuera de la transacción de reclamación, y
 * `intentarEnvio` escribe el resultado en su propia transacción corta.
 *
 * Una fila cuyo `kind` no tiene reconstructor registrado (`retry-registry.ts`)
 * se deja tal cual — vuelve a la cola cuando venza el plazo de reserva. No es
 * un fallo del correo, es una unidad llamadora que aún no registró cómo
 * reconstruir sus reintentos; marcarla `failed` perdería la visibilidad de
 * que sigue pendiente de verdad.
 */
export async function barrerColaDeCorreo(
  cfg: MailConfig,
  transporte: EmailTransport,
): Promise<{ procesadas: number; sinReconstructor: number }> {
  return withSystemScope("barrido de la cola de correo (FU-08)", async (db) => {
    const reservadas = await db.transaction(async (tx) => {
      const filas = await tx
        .select()
        .from(emailDelivery)
        .where(and(eq(emailDelivery.status, "pending"), lte(emailDelivery.nextAttemptAt, new Date())))
        .orderBy(asc(emailDelivery.nextAttemptAt))
        .limit(TAMANO_LOTE)
        .for("update", { skipLocked: true });

      if (filas.length === 0) return filas;

      const ids = filas.map((f) => f.id);
      await tx
        .update(emailDelivery)
        .set({ nextAttemptAt: new Date(Date.now() + PLAZO_RESERVA_MINUTOS * 60_000) })
        .where(inArray(emailDelivery.id, ids));
      return filas;
    });

    let procesadas = 0;
    let sinReconstructor = 0;
    for (const fila of reservadas) {
      const reconstruir = obtenerReconstructor(fila.kind as EmailKind);
      if (!reconstruir) {
        sinReconstructor++;
        console.warn(
          `[email:barrendero] "${fila.kind}" no tiene reconstructor de reintento registrado ` +
            `(retry-registry.ts). Fila ${fila.id} sigue pendiente.`,
        );
        continue;
      }
      const render = await reconstruir(fila);
      await intentarEnvio(db, fila, render, cfg, transporte);
      procesadas++;
    }
    return { procesadas, sinReconstructor };
  });
}

export type SweeperHandle = { detener(): void };

/**
 * Arranca el barrendero (`architecture` §6.2, A-01): un temporizador dentro
 * del propio proceso de `slg-web`, sin orquestador externo. Se arranca desde
 * `instrumentation.ts` al levantar el servicio.
 */
export function iniciarBarrendero(cfg: MailConfig, transporte: EmailTransport): SweeperHandle {
  const temporizador = setInterval(() => {
    barrerColaDeCorreo(cfg, transporte).catch((error) => {
      console.error("[email:barrendero] fallo del barrido:", error);
    });
  }, INTERVALO_BARRIDO_MS);
  // No debe mantener vivo el proceso solo por sí mismo (p. ej. en scripts de un solo uso).
  temporizador.unref?.();
  return { detener: () => clearInterval(temporizador) };
}
