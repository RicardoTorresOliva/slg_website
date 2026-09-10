/**
 * signed-urls.ts — El servicio de FU-09: emitir, nunca listar.
 *
 * Dos operaciones, igual que el puerto de correo (FU-08) tiene una:
 *
 *   `emitirUrlFirmadaDeDescarga(bucket, key) → URL` — GET presignado, S3 SigV4
 *   estándar. Caduca exactamente al TTL de configuración (RNF-20, D-28):
 *   15 min en `downloads`, 10 min en `deliverables`. Una petición directa al
 *   objeto sin firma, o con una firma caducada, la rechaza MinIO/S3 mismo —
 *   nunca llega a esta aplicación (criterio 1 de FU-09).
 *
 *   `emitirUrlFirmadaDeSubida(destino, key, mimeType) → formulario` — POST
 *   policy, no PUT presignado: es el único mecanismo S3 estándar que hace
 *   que el propio almacenamiento rechace un tipo MIME o un tamaño fuera de
 *   límite ANTES de escribir un solo byte (criterio 4 de FU-09) — un PUT
 *   presignado no soporta `content-length-range`. La validación de
 *   `limits.ts` corre ADEMÁS aquí, antes de pedir la firma: dos capas, la
 *   nuestra y la del almacenamiento.
 *
 * Ninguna función de este archivo lista el contenido de un bucket
 * (RF-123, gate D10) — verificado por `scripts/files/check-files-encapsulado.ts`.
 */
import { GetObjectCommand, type S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";

import type { FilesConfig } from "./config.ts";
import { limiteDeSubida } from "./limits.ts";
import { MimeNoPermitidoError } from "./types.ts";
import type { EmitirDescargaInput, EmitirSubidaInput, SubidaFirmada, UrlFirmada } from "./types.ts";

function bucketDe(cfg: FilesConfig, bucket: EmitirDescargaInput["bucket"]): string {
  return bucket === "downloads" ? cfg.bucketDownloads : cfg.bucketDeliverables;
}

function ttlMinutosDeDescarga(cfg: FilesConfig, bucket: EmitirDescargaInput["bucket"]): number {
  return bucket === "downloads" ? cfg.ttlDownloadMinutes : cfg.ttlDeliverableMinutes;
}

export async function emitirUrlFirmadaDeDescarga(
  client: S3Client,
  cfg: FilesConfig,
  input: EmitirDescargaInput,
): Promise<UrlFirmada> {
  const ttlMinutos = ttlMinutosDeDescarga(cfg, input.bucket);
  const expiresIn = ttlMinutos * 60;
  const url = await getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: bucketDe(cfg, input.bucket), Key: input.key }),
    { expiresIn },
  );
  return { url, expiresAt: new Date(Date.now() + expiresIn * 1000) };
}

export async function emitirUrlFirmadaDeSubida(
  client: S3Client,
  cfg: FilesConfig,
  input: EmitirSubidaInput,
): Promise<SubidaFirmada> {
  const limite = limiteDeSubida(input.destino);
  if (!limite.mimeTypesPermitidos.includes(input.mimeType)) {
    throw new MimeNoPermitidoError(input.mimeType, limite.mimeTypesPermitidos);
  }

  const bucket = input.destino.bucket === "downloads" ? cfg.bucketDownloads : cfg.bucketDeliverables;
  const expiresIn = cfg.ttlUploadMinutes * 60;

  const { url, fields } = await createPresignedPost(client, {
    Bucket: bucket,
    Key: input.key,
    Expires: expiresIn,
    Conditions: [
      ["content-length-range", 0, limite.maxBytes],
      ["eq", "$Content-Type", input.mimeType],
    ],
    Fields: { "Content-Type": input.mimeType },
  });

  return { url, fields, expiresAt: new Date(Date.now() + expiresIn * 1000), maxBytes: limite.maxBytes };
}
