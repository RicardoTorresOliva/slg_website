/**
 * index.ts — Fachada pública del servicio de archivos (FU-09).
 *
 * Todo caso de uso que necesite emitir una URL firmada importa de aquí,
 * nunca de `client.ts` directamente (vigilado por
 * `scripts/files/check-files-encapsulado.ts`).
 */
export { leerFilesConfig, type FilesConfig } from "./config.ts";
export { crearClienteS3 } from "./client.ts";
export { emitirUrlFirmadaDeDescarga, emitirUrlFirmadaDeSubida } from "./signed-urls.ts";
export { limiteDeSubida, HARD_CAP_BYTES, type DestinoDeSubida, type LimiteDeSubida } from "./limits.ts";
export type {
  BucketDeDescarga,
  EmitirDescargaInput,
  EmitirSubidaInput,
  SubidaFirmada,
  UrlFirmada,
} from "./types.ts";
export { MimeNoPermitidoError } from "./types.ts";
