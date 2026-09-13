/**
 * destino.ts — El destino de las copias: **API S3 genérica, no «Cloudflare R2»**
 * (FU-14 · D-20 · D-21).
 *
 * CAMBIAR DE PROVEEDOR TIENE QUE COSTAR CUATRO VARIABLES Y NINGUNA LÍNEA. Por
 * eso aquí no aparece el nombre del proveedor en ningún sitio salvo en un
 * comentario: endpoint, región, bucket y credenciales entran por entorno. R2 es
 * la elección de hoy (D-21) porque su egreso es $0 —restaurar nunca genera
 * factura, que es justo cuando hay una emergencia—, pero el código no lo sabe.
 *
 * **DOS CREDENCIALES DISTINTAS, Y ESA ES LA MITIGACIÓN** (criterio 4 · R-37). El
 * proceso que **copia** usa una credencial de solo escritura, sin permiso de
 * borrado: aunque alguien se haga con ella, no puede destruir el histórico. El
 * proceso que **purga** usa otra, y corre aparte. Que las dos vivan en este
 * archivo no las mezcla: `clienteDeCopia()` y `clienteDePurga()` leen variables
 * distintas y ninguna función usa las dos.
 *
 * **NO HAY `listar`**, como en `lib/files`. Aquí ni siquiera hace falta: las
 * claves se calculan (`generaciones.ts`). Una credencial que no enumera es una
 * credencial que no le sirve a quien la roba para saber qué hay.
 */
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { Readable } from "node:stream";

function exigir(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) throw new Error(`Falta ${nombre}. Los nombres están en .env.example; los valores, fuera del repositorio.`);
  return valor;
}

export function bucketDeCopias(): string {
  return exigir("BACKUP_S3_BUCKET");
}

function cliente(claveId: string, secreto: string): S3Client {
  return new S3Client({
    endpoint: exigir("BACKUP_S3_ENDPOINT"),
    region: process.env.BACKUP_S3_REGION ?? "auto",
    credentials: { accessKeyId: exigir(claveId), secretAccessKey: exigir(secreto) },
    forcePathStyle: true,
  });
}

/** Solo escritura. **No borra**: la credencial que usa no tiene ese permiso. */
export function clienteDeCopia(): S3Client {
  return cliente("BACKUP_S3_ACCESS_KEY_ID", "BACKUP_S3_SECRET_ACCESS_KEY");
}

/** Otro proceso, otras credenciales. Solo lo usa `scripts/backup/purgar.ts`. */
export function clienteDePurga(): S3Client {
  return cliente("BACKUP_PURGE_ACCESS_KEY_ID", "BACKUP_PURGE_SECRET_ACCESS_KEY");
}

/**
 * Sube un objeto. **`bytes` no es opcional por comodidad**: el cliente de S3 se
 * niega a subir un flujo de longitud desconocida sin negociar `multipart`, y
 * pedir esa negociación por un dump de unos megas serían varias operaciones de
 * clase A por copia — la partida que R2 factura (D-21). Con el tamaño delante,
 * es un `PUT` y ya. Quien llama lo sabe porque cifra a un archivo primero.
 */
export async function subir(cuerpo: Readable | Buffer, clave: string, bytes: number): Promise<void> {
  await clienteDeCopia().send(
    new PutObjectCommand({
      Bucket: bucketDeCopias(),
      Key: clave,
      Body: cuerpo,
      ContentLength: bytes,
      ContentType: "application/octet-stream",
    }),
  );
}

export async function descargar(clave: string): Promise<Buffer> {
  const r = await clienteDeCopia().send(
    new GetObjectCommand({ Bucket: bucketDeCopias(), Key: clave }),
  );
  const trozos: Buffer[] = [];
  for await (const trozo of r.Body as Readable) trozos.push(Buffer.from(trozo as Buffer));
  return Buffer.concat(trozos);
}

/** **Solo desde el proceso de purga.** Con la otra credencial esto falla, y debe. */
export async function borrar(clave: string): Promise<void> {
  await clienteDePurga().send(new DeleteObjectCommand({ Bucket: bucketDeCopias(), Key: clave }));
}

export function hayDestinoConfigurado(): boolean {
  return Boolean(
    process.env.BACKUP_S3_ENDPOINT && process.env.BACKUP_S3_BUCKET && process.env.BACKUP_PUBLIC_KEY,
  );
}
