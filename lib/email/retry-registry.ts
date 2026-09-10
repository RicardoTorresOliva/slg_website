/**
 * retry-registry.ts — Cómo reconstruir el asunto y el cuerpo de un reintento.
 *
 * `email_delivery` no guarda el cuerpo del correo (`data_model` §5.19): solo
 * `template_key`, `subject_key` y `locale`. Eso basta para el intento 1, que
 * ocurre en la misma llamada que `enviarCorreo` (send.ts) y ya tiene los
 * datos de interpolación en memoria. Pero el barrido de reintentos (queue.ts)
 * corre después, posiblemente en otro arranque del proceso, y no tiene esos
 * datos — por eso la tabla lleva `related_entity_type`/`related_entity_id`
 * (data_model §5.19, "la consulta que justifica la tabla"): son la forma de
 * volver a encontrar el hecho de negocio y reconstruir el correo a partir de
 * él, no de datos guardados aquí.
 *
 * FU-08 no tiene todavía ningún llamador real (FU-07, DU-01 y DU-09, que
 * envían invitación, recuperación y avisos de captura, no están construidos).
 * Por eso este módulo es solo el registro: cada unidad que envíe un tipo de
 * correo debe registrar aquí cómo reconstruirlo a partir de
 * `related_entity_id` antes de que sus reintentos funcionen. Sin registro
 * para un `kind`, el barrido NO marca la fila `failed` — la deja `pending`
 * para el siguiente barrido (nunca se pierde el hecho de negocio) y avisa por
 * log, que es una señal de configuración incompleta, no de un correo perdido.
 */

import type { EmailKind, FilaEmail } from "./types.ts";

export type ReconstructorDeReintento = (
  fila: FilaEmail,
) => Promise<{ subject: string; text: string }> | { subject: string; text: string };

const registro = new Map<EmailKind, ReconstructorDeReintento>();

export function registrarReconstructorDeReintento(kind: EmailKind, fn: ReconstructorDeReintento): void {
  registro.set(kind, fn);
}

export function obtenerReconstructor(kind: EmailKind): ReconstructorDeReintento | undefined {
  return registro.get(kind);
}

/** Solo para pruebas: vuelve a dejar el registro vacío entre suites. */
export function limpiarRegistroDeReintentos(): void {
  registro.clear();
}
