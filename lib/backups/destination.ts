/**
 * destination.ts — El puerto de destino de copias de `architecture` §8.3.
 *
 * UNA operación: `depositar(clave, contenido) → confirmación`.
 *
 * No lee, no lista, no borra, no sobrescribe. Esa incapacidad no es una
 * omisión: es la mitigación 1 de R-37. Este archivo importa exactamente dos
 * cosas del SDK de S3 — `S3Client` y `PutObjectCommand` — y
 * `scripts/backups/check-backup-encapsulado.ts` falla el pipeline si algún día
 * aparece aquí un `GetObject`, un `ListObjects`, un `DeleteObject` o un
 * `CopyObject`. La restauración y la purga viven en `scripts/backups/`, con
 * credenciales distintas, porque necesitan justo lo que este puerto no tiene.
 *
 * El "no sobrescribe" no depende del permiso del token —R2 no ofrece un nivel
 * "escribe pero no borra" (D-65)—: depende de que cada copia lleve una clave
 * única por marca de tiempo (`generations.ts`). Ninguna copia pisa a otra
 * porque ninguna comparte clave, no porque el almacenamiento lo impida.
 *
 * Protocolo: API S3 genérica (D-20, D-21). Mismo cliente que FU-09 usa contra
 * MinIO, sin una sola línea específica de Cloudflare: cambiar de proveedor es
 * `R2_ENDPOINT` + credenciales.
 */
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

import type { DestinoConfig } from "./config.ts";

/**
 * Qué se deposita. Un archivo se manda en flujo (un volcado cifrado puede no
 * caber en memoria); los objetos pequeños —el manifiesto— van en memoria.
 */
export type ContenidoADepositar =
  | { tipo: "archivo"; ruta: string }
  | { tipo: "memoria"; datos: Buffer };

export type Confirmacion = {
  clave: string;
  bytes: number;
  etag: string | undefined;
  depositadoEn: Date;
};

/**
 * Único lugar del repositorio que instancia el cliente S3 del DESTINO de
 * copias — mismo patrón que `lib/files/client.ts` para FU-09.
 */
export function crearClienteDeDestino(cfg: DestinoConfig): S3Client {
  return new S3Client({
    endpoint: cfg.endpoint,
    region: cfg.region,
    // R2 y MinIO exigen path-style, como ya documenta `lib/files/client.ts`.
    forcePathStyle: true,
    credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
  });
}

/**
 * La única operación del puerto. Una petición PUT por objeto: D-21 avisa de
 * que en R2 la partida medida son las operaciones, y un depósito por copia
 * (3 al día en el peor caso: diaria + semanal + mensual) deja el gasto en el
 * ruido frente al millón mensual del tramo gratuito.
 */
export async function depositar(
  cliente: S3Client,
  cfg: DestinoConfig,
  clave: string,
  contenido: ContenidoADepositar,
): Promise<Confirmacion> {
  const { cuerpo, bytes } =
    contenido.tipo === "memoria"
      ? { cuerpo: contenido.datos as unknown, bytes: contenido.datos.byteLength }
      : { cuerpo: createReadStream(contenido.ruta) as unknown, bytes: (await stat(contenido.ruta)).size };

  const respuesta = await cliente.send(
    new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: clave,
      Body: cuerpo as never,
      ContentLength: bytes,
      // El contenido ya va cifrado (criterio 3): para el destino es binario
      // opaco, y decirlo evita que ningún intermediario lo reinterprete.
      ContentType: "application/octet-stream",
    }),
  );

  return { clave, bytes, etag: respuesta.ETag, depositadoEn: new Date() };
}
