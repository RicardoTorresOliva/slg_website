/**
 * config.ts — Variables de entorno del puerto de correo (D-22, D-36, `api_contracts` §11.3).
 *
 * Nombres de transporte, no de marca: `MAIL_SMTP_*`, nunca `RESEND_API_KEY`.
 * Esa ausencia es la decisión (D-36) — cambiar de proveedor cuesta estas
 * variables y ninguna línea de código.
 *
 * `MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME` y `MAIL_REPLY_TO` dependen de P-3/P-4
 * (`docs/decision_log.md`, sub-decisiones abiertas). Sin valor de Ricardo,
 * `send.ts` usa el valor PROVISIONAL de D-54 solo para poder construir y
 * probar el adaptador; nunca hay un valor por defecto aquí — si falta la
 * variable, falla alto y claro, no en silencio.
 */

export type MailConfig = {
  smtpHost: string;
  smtpPort: number;
  smtpUsername: string;
  smtpPassword: string;
  fromAddress: string;
  fromName: string;
  replyTo: string;
  alertsTo: string;
};

function requerida(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor || !valor.trim()) {
    throw new Error(
      `Falta ${nombre}. El puerto de correo (FU-08) no tiene valores por defecto: ver .env.example.`,
    );
  }
  return valor;
}

/**
 * Lee la configuración en cada llamada, nunca en un singleton de módulo: es
 * lo que permite que la suite se ejecute dos veces en el mismo proceso contra
 * dos destinos distintos, cambiando solo variables de entorno (criterio 2).
 */
export function leerMailConfig(): MailConfig {
  return {
    smtpHost: requerida("MAIL_SMTP_HOST"),
    smtpPort: Number(requerida("MAIL_SMTP_PORT")),
    smtpUsername: requerida("MAIL_SMTP_USERNAME"),
    smtpPassword: requerida("MAIL_SMTP_PASSWORD"),
    fromAddress: requerida("MAIL_FROM_ADDRESS"),
    fromName: requerida("MAIL_FROM_NAME"),
    replyTo: requerida("MAIL_REPLY_TO"),
    alertsTo: requerida("MAIL_ALERTS_TO"),
  };
}
