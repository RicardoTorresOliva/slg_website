/**
 * client.ts — Único archivo que instancia el cliente S3.
 *
 * `scripts/files/check-files-encapsulado.ts` vigila que nadie fuera de aquí
 * importe `@aws-sdk/client-s3` directamente — mismo patrón que
 * `lib/email/smtp-transport.ts` para el puerto de correo (FU-08).
 */
import { S3Client } from "@aws-sdk/client-s3";

import type { FilesConfig } from "./config.ts";

export function crearClienteS3(cfg: FilesConfig): S3Client {
  return new S3Client({
    endpoint: cfg.endpoint,
    region: cfg.region,
    // MinIO y la mayoría de S3-compatibles fuera de AWS exigen path-style
    // (`endpoint/bucket/key`), no el subdominio virtual-hosted de AWS.
    forcePathStyle: true,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  });
}
