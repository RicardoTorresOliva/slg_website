/**
 * types.ts — Vocabulario del servicio de archivos (FU-09).
 */
import type { DestinoDeSubida } from "./limits.ts";

export type BucketDeDescarga = "downloads" | "deliverables";

export type EmitirDescargaInput = {
  bucket: BucketDeDescarga;
  key: string;
};

export type UrlFirmada = {
  url: string;
  expiresAt: Date;
};

export type EmitirSubidaInput = {
  destino: DestinoDeSubida;
  key: string;
  mimeType: string;
};

/** Subida por formulario (POST policy): campos que deben ir en el `multipart/form-data`, en orden. */
export type SubidaFirmada = {
  url: string;
  fields: Record<string, string>;
  expiresAt: Date;
  maxBytes: number;
};

export class MimeNoPermitidoError extends Error {
  constructor(mimeType: string, permitidos: string[]) {
    super(`Tipo MIME "${mimeType}" no permitido para este destino. Permitidos: ${permitidos.join(", ")}.`);
    this.name = "MimeNoPermitidoError";
  }
}
