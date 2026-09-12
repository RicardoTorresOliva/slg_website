/**
 * s3.ts — El adaptador. El ÚNICO archivo que importa el cliente de almacenamiento.
 *
 * API S3 GENÉRICA, no el SDK del producto. Hoy detrás hay MinIO en el mismo VPS
 * (`architecture` §7.1); cambiar de destino es endpoint y credenciales en
 * variables de entorno. Es la misma condición de diseño que D-21 impone al
 * destino de copias, aplicada aquí.
 *
 * LO QUE ESTE ARCHIVO NO HACE. No lista buckets: el cliente tiene `ListObjects`
 * y aquí no se envuelve, porque envolverlo es ofrecerlo. Ver `port.ts`.
 */

import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { ErrorDeAlmacenamiento, type PuertoDeArchivos, type UrlFirmada } from "./port.ts";
import { ttlEnMinutos, ttlEnSegundos, type UsoDeFirma } from "./ttl.ts";
import { DESTINOS, validarSubida, type Bucket, type Destino } from "./validation.ts";

function exigirVariable(nombre: string): string {
  const v = process.env[nombre];
  if (!v) {
    throw new ErrorDeAlmacenamiento(
      "El almacenamiento de archivos no está disponible.",
      `Falta la variable de entorno ${nombre}. Los nombres están en .env.example.`,
    );
  }
  return v;
}

export function clienteS3(): S3Client {
  return new S3Client({
    endpoint: exigirVariable("S3_ENDPOINT"),
    region: process.env.S3_REGION ?? "us-east-1",
    credentials: {
      accessKeyId: exigirVariable("S3_ACCESS_KEY_ID"),
      secretAccessKey: exigirVariable("S3_SECRET_ACCESS_KEY"),
    },
    /**
     * MinIO sirve los buckets por ruta (`/bucket/clave`), no por subdominio.
     * Con el estilo de host, la firma se calcula sobre un host que no existe y
     * todo falla con un error que no dice esto.
     */
    forcePathStyle: true,
  });
}

/** Nombre real del bucket: los dos son configurables por entorno. */
function nombreDeBucket(bucket: Bucket): string {
  return bucket === "downloads"
    ? exigirVariable("S3_BUCKET_DOWNLOADS")
    : exigirVariable("S3_BUCKET_DELIVERABLES");
}

export function adaptadorS3(cliente: S3Client = clienteS3()): PuertoDeArchivos {
  const firmar = async (
    comando: GetObjectCommand | PutObjectCommand,
    uso: UsoDeFirma,
  ): Promise<UrlFirmada> => {
    const ttlMinutos = ttlEnMinutos(uso);
    const url = await getSignedUrl(cliente, comando, { expiresIn: ttlEnSegundos(uso) });
    return { url, ttlMinutos, caducaEn: new Date(Date.now() + ttlMinutos * 60_000) };
  };

  return {
    async firmarDescarga({ bucket, clave, uso, nombreDeDescarga }) {
      return firmar(
        new GetObjectCommand({
          Bucket: nombreDeBucket(bucket),
          Key: clave,
          ...(nombreDeDescarga
            ? {
                ResponseContentDisposition: `attachment; filename="${nombreDeDescarga.replace(/["\\]/g, "")}"`,
              }
            : {}),
        }),
        uso,
      );
    },

    async firmarSubida({ destino, clave, mime, bytes }) {
      /**
       * La validación ocurre AQUÍ, antes de emitir la firma. Sin firma no hay
       * escritura posible, así que rechazar aquí es rechazar antes de que se
       * escriba un solo byte (RNF-25, criterio 4).
       */
      const veredicto = validarSubida({ destino, mime, bytes, clave });
      if (!veredicto.ok) {
        throw new ErrorDeAlmacenamiento(
          veredicto.mensaje,
          `subida rechazada por «${veredicto.motivo}»: destino=${destino} mime=${mime} bytes=${bytes}`,
        );
      }

      return firmar(
        new PutObjectCommand({
          Bucket: nombreDeBucket(DESTINOS[destino as Destino].bucket),
          Key: clave,
          ContentType: mime,
          /**
           * `ContentLength` entra en la firma: una subida que declare 1 MB y
           * mande 40 no coincide con lo firmado y el servidor la rechaza. Sin
           * esto, la validación de tamaño sería una sugerencia.
           */
          ContentLength: bytes,
        }),
        "upload",
      );
    },

    async borrar({ bucket, clave }) {
      await cliente.send(
        new DeleteObjectCommand({ Bucket: nombreDeBucket(bucket), Key: clave }),
      );
    },
  };
}
