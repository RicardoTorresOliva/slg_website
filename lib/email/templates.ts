/**
 * templates.ts — Asunto y cuerpo de cada tipo de correo, desde `content/ui`.
 *
 * RF-16 y RF-54: ningún texto de negocio vive en código. `template_key` y
 * `subject_key` son claves de `content/ui/<lang>.json` (`loadUiStrings`, ya
 * valida paridad ES/EN en build — FU-03, RF-140). El cuerpo se reconstruye
 * aquí; `email_delivery` nunca guarda el texto (`data_model` §5.19).
 *
 * El copy real de estas claves depende de la compuerta de copy (FU-01, aún
 * `pending`): mientras tanto llevan `[PENDIENTE: copy FU-01]`, exactamente
 * como cualquier otra página construida antes de esa compuerta
 * (`knowledge/content-schema.md` §5).
 */

import { loadUiStrings } from "../content/loader.ts";
import type { Lang } from "../content/schema.ts";
import type { EmailKind } from "./types.ts";

/** `template_key`/`subject_key` que persiste `email_delivery` por tipo. */
export const EMAIL_TEMPLATE_KEYS: Record<EmailKind, { subjectKey: string; templateKey: string }> = {
  invitation: { subjectKey: "email.invitation.subject", templateKey: "email.invitation.body" },
  password_reset: {
    subjectKey: "email.passwordReset.subject",
    templateKey: "email.passwordReset.body",
  },
  capture_notice: {
    subjectKey: "email.captureNotice.subject",
    templateKey: "email.captureNotice.body",
  },
  capture_failed_alert: {
    subjectKey: "email.captureFailedAlert.subject",
    templateKey: "email.captureFailedAlert.body",
  },
};

/** Sustituye `{{clave}}` por `data[clave]`. Sin motor de plantillas: RF-54 pide variables, no lógica. */
function interpolar(texto: string, data: Record<string, string>): string {
  return texto.replace(/\{\{\s*(\w+)\s*\}\}/g, (coincide, clave: string) =>
    Object.prototype.hasOwnProperty.call(data, clave) ? data[clave] : coincide,
  );
}

export type RenderizadoEmail = { subject: string; text: string };

export function renderizarEmail(
  kind: EmailKind,
  locale: Lang,
  data: Record<string, string>,
): RenderizadoEmail {
  const { subjectKey, templateKey } = EMAIL_TEMPLATE_KEYS[kind];
  const cadenas = loadUiStrings()[locale];

  const asunto = cadenas[subjectKey];
  const cuerpo = cadenas[templateKey];
  if (asunto === undefined || cuerpo === undefined) {
    throw new Error(
      `Faltan las claves de contenido para "${kind}" en content/ui/${locale}.json: ` +
        `${subjectKey}, ${templateKey}.`,
    );
  }

  return { subject: interpolar(asunto, data), text: interpolar(cuerpo, data) };
}
