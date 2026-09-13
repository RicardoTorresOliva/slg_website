/**
 * reintento.ts — El **reintento manual** de una captura al CRM (DU-16 · RF-52).
 *
 * CÓMO CONVIVE CON EL TOPE DE CINCO INTENTOS, que es el conflicto CF-1 y la
 * razón de que esta unidad tuviera condición de entrada. `crm_delivery` acota
 * `attempt` a 1…5 y es único por `(captura, ciclo, intento, endpoint)`. Un
 * sexto intento no cabe, y reutilizar el 1 colisionaría con la traza del primer
 * episodio — que es evidencia y no se pisa.
 *
 * La salida es **abrir un CICLO nuevo** (D-50): el contador de intentos vuelve a
 * cero dentro de un ciclo 2, y la escalera de espera vuelve a empezar. Así
 * RF-52 («se puede reintentar a mano») convive con RF-50 («cinco intentos y
 * para») en vez de contradecirlo: son cinco intentos **por episodio**, y quien
 * decide que hay un episodio nuevo es una persona.
 *
 * **ES IDEMPOTENTE SOBRE UNA CAPTURA YA ENTREGADA** (criterio 6). Reintentar
 * algo que ya llegó crearía un contacto duplicado en el CRM, y lo haría en
 * silencio. Se devuelve «ya estaba entregada» y no se toca nada.
 */
import { sql } from "drizzle-orm";

import { exigir } from "../auth/matriz.ts";
import { conAuditoria } from "../auditoria/index.ts";
import type { AuthContext } from "../db/context.ts";
import { withScope } from "../db/scope.ts";

export type ResultadoDeReintento =
  | { readonly ok: true; readonly cicloNuevo: number }
  /** Ya entregada: no se hace nada, y eso NO es un error. */
  | { readonly ok: false; readonly motivo: "ya_entregada" }
  | { readonly ok: false; readonly motivo: "no_encontrada" }
  /** En cola o esperando su próximo intento: el barrendero ya la tiene. */
  | { readonly ok: false; readonly motivo: "en_curso" };

export async function reintentarCaptura(
  ctx: AuthContext,
  leadCaptureId: string,
): Promise<ResultadoDeReintento> {
  return conAuditoria(
    ctx,
    { accion: "capture.retry", entidad: "lead_capture", entidadId: leadCaptureId },
    async () => {
      exigir(ctx, "capture.retry");

      return withScope(ctx, async (db) => {
        const filas = (await db.execute(sql`
          SELECT crm_sync_status, crm_cycle FROM lead_capture WHERE id = ${leadCaptureId}
        `)) as unknown as { crm_sync_status: string; crm_cycle: number }[];
        const actual = filas[0];
        if (!actual) return { ok: false, motivo: "no_encontrada" } as const;
        if (actual.crm_sync_status === "delivered") return { ok: false, motivo: "ya_entregada" } as const;
        if (actual.crm_sync_status !== "failed") return { ok: false, motivo: "en_curso" } as const;

        const cicloNuevo = actual.crm_cycle + 1;
        /**
         * `crm_last_error` se borra a propósito: es el error del ciclo anterior
         * y dejarlo haría que la pantalla enseñara, durante el ciclo nuevo, un
         * error que ya no describe nada. La evidencia del episodio anterior no
         * se pierde: vive en `crm_delivery`, que es donde tiene que estar.
         */
        await db.execute(sql`
          UPDATE lead_capture
             SET crm_sync_status = 'pending',
                 crm_cycle = ${cicloNuevo},
                 crm_attempts = 0,
                 crm_last_error = NULL,
                 crm_next_attempt_at = now()
           WHERE id = ${leadCaptureId}
             AND crm_sync_status = 'failed'
        `);
        return { ok: true, cicloNuevo } as const;
      });
    },
  );
}

export type Intento = {
  readonly ciclo: number;
  readonly intento: number;
  readonly endpoint: string;
  readonly codigo: number | null;
  readonly cuerpoRecibido: string | null;
  readonly creadoEn: string;
};

/**
 * Los intentos de una captura, **tal cual están en `crm_delivery`** (criterio 2).
 *
 * No se resume ni se agrupa: el criterio pide que «refleje exactamente las
 * filas». Un resumen es una interpretación, y lo que hace falta al mirar una
 * entrega que falló es **lo que se llamó y lo que contestó**.
 *
 * **El cuerpo ENVIADO no se muestra.** Lleva el correo, el nombre y el mensaje
 * de la persona, y esta pantalla se comparte en capturas de pantalla; para
 * diagnosticar basta con el endpoint, el código y la respuesta. La fila sigue
 * guardándolo: la evidencia existe, no se enseña de más.
 */
export async function intentosDeCaptura(ctx: AuthContext, leadCaptureId: string): Promise<Intento[]> {
  exigir(ctx, "capture.read");
  const filas = (await withScope(ctx, (db) =>
    db.execute(sql`
      SELECT cycle, attempt, endpoint, response_code, response_body, created_at
        FROM crm_delivery
       WHERE lead_capture_id = ${leadCaptureId}
       ORDER BY cycle, attempt
    `),
  )) as unknown as {
    cycle: number;
    attempt: number;
    endpoint: string;
    response_code: number | null;
    response_body: string | null;
    created_at: Date;
  }[];

  return filas.map((f) => ({
    ciclo: f.cycle,
    intento: f.attempt,
    endpoint: f.endpoint,
    codigo: f.response_code,
    cuerpoRecibido: f.response_body,
    creadoEn: new Date(f.created_at).toISOString(),
  }));
}
