/**
 * config.ts — Variables de entorno del servicio de archivos (`api_contracts` §11.4, FU-09).
 *
 * API S3 genérica (D-20/D-21, mismo principio que el destino de backups):
 * cambiar de proveedor cuesta endpoint + credenciales, ninguna línea de
 * código. D-51: hoy la credencial es la de administrador de MinIO — riesgo
 * R-41 abierto, rotar antes del go-live.
 */

export type FilesConfig = {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketDownloads: string;
  bucketDeliverables: string;
  ttlDownloadMinutes: number;
  ttlDeliverableMinutes: number;
  ttlUploadMinutes: number;
};

function requerida(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor || !valor.trim()) {
    throw new Error(
      `Falta ${nombre}. El servicio de archivos (FU-09) no tiene valores por defecto: ver .env.example.`,
    );
  }
  return valor;
}

function minutosRequeridos(nombre: string): number {
  const valor = Number(requerida(nombre));
  if (!Number.isFinite(valor) || valor <= 0) {
    throw new Error(`${nombre} debe ser un número de minutos positivo.`);
  }
  return valor;
}

export function leerFilesConfig(): FilesConfig {
  return {
    endpoint: requerida("FILES_S3_ENDPOINT"),
    region: requerida("FILES_S3_REGION"),
    accessKeyId: requerida("FILES_S3_ACCESS_KEY_ID"),
    secretAccessKey: requerida("FILES_S3_SECRET_ACCESS_KEY"),
    bucketDownloads: requerida("FILES_BUCKET_DOWNLOADS"),
    bucketDeliverables: requerida("FILES_BUCKET_DELIVERABLES"),
    ttlDownloadMinutes: minutosRequeridos("SIGNED_URL_TTL_DOWNLOAD_MINUTES"),
    ttlDeliverableMinutes: minutosRequeridos("SIGNED_URL_TTL_DELIVERABLE_MINUTES"),
    ttlUploadMinutes: minutosRequeridos("SIGNED_URL_TTL_UPLOAD_MINUTES"),
  };
}
