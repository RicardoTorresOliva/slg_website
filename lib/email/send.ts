/**
 * send.ts — `enviarCorreo`: el único punto de entrada del puerto de correo.
 *
 * Efecto colateral obligatorio (`architecture` §8.2): siempre escribe la fila
 * de `email_delivery` antes de intentar enviar, con `from_email`/`reply_to`
 * persistidos tal y como se usaron — cambiar la configuración después no
 * reescribe la evidencia de lo ya enviado (`data_model` §5.19).
 *
 * El intento 1 ocurre en la misma llamada (ver nota en `queue.ts` sobre por
 * qué esto NO es D-30): si falla, la operación de negocio que lo originó ya
 * completó igual (criterio 5) y el barrido de `queue.ts` reintenta después.
 */

import { emailDelivery } from "../db/schema.ts";
import { withSystemScope } from "../db/scope.ts";
import type { EnviarCorreoInput, EmailTransport } from "./types.ts";
import { EMAIL_TEMPLATE_KEYS, renderizarEmail } from "./templates.ts";
import { intentarEnvio } from "./queue.ts";
import type { MailConfig } from "./config.ts";

export type ResultadoEnvio = { id: string; entregado: boolean };

export async function enviarCorreo(
  input: EnviarCorreoInput,
  cfg: MailConfig,
  transporte: EmailTransport,
): Promise<ResultadoEnvio> {
  const { subjectKey, templateKey } = EMAIL_TEMPLATE_KEYS[input.kind];
  const render = renderizarEmail(input.kind, input.locale, input.data ?? {});
  const id = crypto.randomUUID();

  return withSystemScope(`enviar correo "${input.kind}" (FU-08)`, async (db) => {
    await db.insert(emailDelivery).values({
      id,
      kind: input.kind,
      toEmail: input.to,
      fromEmail: cfg.fromAddress,
      replyTo: cfg.replyTo,
      templateKey,
      subjectKey,
      locale: input.locale,
      relatedEntityType: input.related?.type ?? null,
      relatedEntityId: input.related?.id ?? null,
      organizationId: input.organizationId ?? null,
      status: "pending",
      attempts: 0,
      nextAttemptAt: new Date(),
    });

    const resultado = await intentarEnvio(
      db,
      { id, toEmail: input.to, fromEmail: cfg.fromAddress, replyTo: cfg.replyTo, attempts: 0 },
      render,
      cfg,
      transporte,
    );
    return { id, entregado: resultado.entregado };
  });
}
