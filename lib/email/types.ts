/**
 * types.ts — Vocabulario del puerto de correo (`architecture` §8.2, FU-08).
 */

import type { Lang } from "../content/schema.ts";
import type { emailDelivery } from "../db/schema.ts";

/** Una fila real de `email_delivery`, tal y como la lee Drizzle. */
export type FilaEmail = typeof emailDelivery.$inferSelect;

/** Espejo de `email_kind_valid` (`data_model` §5.19, §3.12). */
export const EMAIL_KINDS = [
  "invitation",
  "password_reset",
  "capture_notice",
  "capture_failed_alert",
] as const;
export type EmailKind = (typeof EMAIL_KINDS)[number];

/** Referencia opcional a la fila que originó el envío. Sin FK (§2.4). */
export type EmailRelatedEntity = {
  type: "invitation" | "lead_capture" | "user";
  id: string;
};

export type EnviarCorreoInput = {
  kind: EmailKind;
  to: string;
  locale: Lang;
  /** Variables de interpolación de la plantilla (RF-54). */
  data?: Record<string, string>;
  related?: EmailRelatedEntity;
  organizationId?: string;
};

/**
 * El contrato del puerto (`architecture` §8.2): `enviar(...)` devuelve el
 * identificador del proveedor si aceptó el mensaje, o lanza un error
 * clasificado si no. No promete entrega en bandeja.
 */
export type EmailSendResult = {
  providerMessageId: string;
};

export class EmailSendError extends Error {
  /** Clasificación mínima para decidir si reintentar tiene sentido. */
  readonly clase: "red" | "autenticacion" | "rechazo" | "tiempo_agotado" | "desconocido";

  constructor(mensaje: string, clase: EmailSendError["clase"]) {
    super(mensaje);
    this.name = "EmailSendError";
    this.clase = clase;
  }
}

/**
 * El puerto en sí: la única forma en la que el resto de la aplicación habla
 * con "un proveedor de correo", sin saber cuál es. La interfaz propia del
 * criterio 1 de FU-08.
 */
export type EmailTransport = {
  enviar(msg: {
    to: string;
    from: string;
    fromName: string;
    replyTo: string;
    subject: string;
    text: string;
  }): Promise<EmailSendResult>;
};
