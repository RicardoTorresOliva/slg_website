/**
 * rate-limit.ts — Límite de peticiones propio, RF-34.
 *
 * Una fila por intento, no un contador que se lee-modifica-escribe. El límite
 * se aplica por ventana deslizante (cuenta lo ocurrido en los últimos N
 * segundos en el momento de comprobar), no por ventana fija.
 *
 * Contar y luego insertar son dos sentencias — sin más, dos peticiones a la
 * vez para la MISMA clave podrían leer el mismo conteo antes de que ninguna
 * inserte la suya, colando una petición de más justo en el umbral. Se cierra
 * con un bloqueo consultivo de Postgres (`pg_advisory_xact_lock`) sobre un
 * hash de la clave: serializa solo a quienes comparten clave (no bloquea
 * peticiones de otros IPs/correos entre sí) y se libera solo al terminar la
 * transacción, sin necesidad de liberarlo a mano.
 *
 * El resultado deliberadamente NO incluye el umbral ni el conteo (RF-34: "sin
 * revelar el umbral") — así quien llame no puede filtrarlo por accidente en
 * la respuesta HTTP.
 */

import { withSystemScope } from "../db/scope.ts";
import { rateLimitEvent, type RATE_LIMIT_KEY_KINDS } from "../db/schema.ts";
import { and, eq, gt, sql } from "drizzle-orm";

export type ClaveDeLimite = {
  /** Namespace del formulario/ruta protegida — p. ej. "download_form". Los namespaces no se bloquean entre sí. */
  accion: string;
  tipoDeClave: (typeof RATE_LIMIT_KEY_KINDS)[number];
  valorDeClave: string;
  limite: number;
  ventanaSegundos: number;
};

export type ResultadoDeLimite = { permitido: boolean };

/**
 * Comprueba el límite y, si permite la petición, registra el intento en la
 * misma operación (para que dos llamadas concurrentes no puedan colarse las
 * dos contando cero antes de que ninguna haya insertado todavía).
 */
export async function verificarLimiteDePeticiones(clave: ClaveDeLimite): Promise<ResultadoDeLimite> {
  const { accion, tipoDeClave, valorDeClave, limite, ventanaSegundos } = clave;

  return withSystemScope(
    "límite de peticiones de un formulario público (RF-34)",
    async (db) => {
      const clavePlana = `${accion}:${tipoDeClave}:${valorDeClave}`;
      await db.execute(sql`select pg_advisory_xact_lock(hashtext(${clavePlana}))`);

      const desde = sql`now() - (${ventanaSegundos} || ' seconds')::interval`;

      const conteo = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(rateLimitEvent)
        .where(
          and(
            eq(rateLimitEvent.action, accion),
            eq(rateLimitEvent.keyKind, tipoDeClave),
            eq(rateLimitEvent.keyValue, valorDeClave),
            gt(rateLimitEvent.createdAt, desde),
          ),
        );

      if ((conteo[0]?.n ?? 0) >= limite) {
        return { permitido: false };
      }

      await db.insert(rateLimitEvent).values({
        id: crypto.randomUUID(),
        action: accion,
        keyKind: tipoDeClave,
        keyValue: valorDeClave,
      });

      return { permitido: true };
    },
  );
}
