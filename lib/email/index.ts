/**
 * index.ts — Fachada pública del puerto de correo (FU-08).
 *
 * Todo caso de uso que necesite enviar correo importa de aquí, nunca de
 * `smtp-transport.ts` directamente (criterio 1 — vigilado por
 * `scripts/email/check-email-encapsulado.ts`).
 */
export { enviarCorreo, type ResultadoEnvio } from "./send.ts";
export { leerMailConfig, type MailConfig } from "./config.ts";
export { crearTransporteSmtp } from "./smtp-transport.ts";
export {
  registrarReconstructorDeReintento,
  type ReconstructorDeReintento,
} from "./retry-registry.ts";
export { iniciarBarrendero, barrerColaDeCorreo, type SweeperHandle } from "./queue.ts";
export {
  EMAIL_KINDS,
  type EmailKind,
  type EmailRelatedEntity,
  type EnviarCorreoInput,
  type EmailTransport,
  type FilaEmail,
  EmailSendError,
} from "./types.ts";
