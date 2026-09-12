/**
 * validation.ts — Tipo y tamaño, comprobados EN EL SERVIDOR antes de aceptar un
 * solo byte (RNF-25, criterio 4 de FU-09).
 *
 * POR QUÉ ANTES Y NO DESPUÉS. Validar al terminar la subida significa haber
 * escrito el archivo para luego borrarlo: se paga el ancho de banda, se paga el
 * almacenamiento y, sobre todo, existe una ventana en la que un archivo no
 * validado está en el bucket. Aquí se decide **antes de emitir la firma**: sin
 * firma no hay escritura posible.
 *
 * Los números NO viven aquí: viven en `lib/db/limits.ts`, que es su fuente única
 * desde FU-04 (criterio 8). Un límite escrito en dos sitios acaba siendo dos
 * límites distintos.
 */

import { UPLOAD_LIMITS, uploadLimitFor, type UploadKind } from "../db/limits.ts";

/** Los dos buckets, los dos PRIVADOS. No hay un tercero ni uno público. */
export const BUCKETS = ["downloads", "deliverables"] as const;
export type Bucket = (typeof BUCKETS)[number];

/**
 * Destino de una subida: bucket + tipo. Es lo que decide límite y MIME, porque
 * `data_model` §2.6 los fija por destino, no por bucket.
 */
export const DESTINOS = {
  "downloads:pdf": { bucket: "downloads", kind: "downloadPdf", mimes: ["application/pdf"] },
  "deliverables:pdf": { bucket: "deliverables", kind: "deliverablePdf", mimes: ["application/pdf"] },
  "deliverables:html": { bucket: "deliverables", kind: "deliverableHtml", mimes: ["text/html"] },
  "deliverables:md": {
    bucket: "deliverables",
    kind: "deliverableMarkdown",
    mimes: ["text/markdown"],
  },
  /**
   * `material` es el único destino con varios MIME: son los anexos de un
   * proyecto. La lista se declara aquí —`data_model` §2.6 decía «los MIME que
   * FU-09 fije para material»— y es CERRADA a propósito: sin ejecutables, sin
   * archivos comprimidos con contenido arbitrario y sin SVG, que es HTML con
   * otro nombre y se ejecutaría en el origen del visor.
   */
  "deliverables:material": {
    bucket: "deliverables",
    kind: "deliverableMaterial",
    mimes: [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/webp",
      "text/plain",
      "text/markdown",
      "text/csv",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
  },
} as const satisfies Record<string, { bucket: Bucket; kind: UploadKind; mimes: readonly string[] }>;

export type Destino = keyof typeof DESTINOS;

export type Rechazo = {
  readonly ok: false;
  /** Público: suficiente para corregir, sin describir el sistema. */
  readonly mensaje: string;
  readonly motivo: "destino" | "mime" | "tamano" | "tope" | "clave";
};

export type Aceptacion = {
  readonly ok: true;
  readonly bucket: Bucket;
  readonly limite: number;
};

/**
 * La clave del objeto la fija el servidor, nunca el cliente. Se comprueba igual:
 * un `..` o una barra inicial en una clave permiten escribir donde no toca.
 */
const CLAVE_VALIDA = /^[a-z0-9][a-z0-9._/-]{0,200}$/;

export function validarSubida(entrada: {
  destino: string;
  mime: string;
  bytes: number;
  clave: string;
}): Aceptacion | Rechazo {
  const destino = DESTINOS[entrada.destino as Destino];
  if (!destino) {
    return { ok: false, motivo: "destino", mensaje: "Destino de subida no admitido." };
  }

  if (!CLAVE_VALIDA.test(entrada.clave) || entrada.clave.includes("..")) {
    return { ok: false, motivo: "clave", mensaje: "Nombre de objeto no admitido." };
  }

  // El tope duro primero: rechaza antes de mirar nada más, igual que el proxy.
  if (!Number.isFinite(entrada.bytes) || entrada.bytes <= 0) {
    return { ok: false, motivo: "tamano", mensaje: "Tamaño de archivo no válido." };
  }
  if (entrada.bytes > UPLOAD_LIMITS.hardCap) {
    return {
      ok: false,
      motivo: "tope",
      mensaje: `El archivo supera el máximo de ${mb(UPLOAD_LIMITS.hardCap)}.`,
    };
  }

  // El MIME se compara EXACTO y sin parámetros: `text/html; charset=utf-8` se
  // normaliza, pero `text/html-algo` no cuela.
  const mime = entrada.mime.split(";")[0].trim().toLowerCase();
  if (!(destino.mimes as readonly string[]).includes(mime)) {
    return { ok: false, motivo: "mime", mensaje: "Tipo de archivo no admitido para este destino." };
  }

  const limite = uploadLimitFor(destino.kind);
  if (entrada.bytes > limite) {
    return { ok: false, motivo: "tamano", mensaje: `El archivo supera el máximo de ${mb(limite)}.` };
  }

  return { ok: true, bucket: destino.bucket, limite };
}

function mb(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}
