/**
 * limits.ts — Tipo MIME y tamaño máximo por destino (`data_model` §2.6, D-25).
 *
 * Constante única, referenciada desde el código — nunca repetida a mano
 * (FU-04 criterio 8, mismo mandato que ata `data_model` §2.6). El tope dado
 * aquí es el que valida el servidor ANTES de aceptar el archivo (RNF-25,
 * criterio 4 de FU-09): una petición de subida que lo incumple se rechaza por
 * política de MinIO/S3 (POST policy `content-length-range` + `Content-Type`),
 * no después de escribir el objeto.
 */

const MB = 1024 * 1024;

/** Tope duro del servidor y del proxy — ninguna subida supera esto (§2.6). */
export const HARD_CAP_BYTES = 50 * MB;

export type DestinoDeSubida =
  | { bucket: "downloads" }
  | { bucket: "deliverables"; type: "pdf" | "material" | "html" | "md" };

export type LimiteDeSubida = { mimeTypesPermitidos: string[]; maxBytes: number };

/**
 * MIME de `material` (`data_model` §2.6: "los MIME que FU-09 fije"): el
 * conjunto que cubre lo que un programa de SLG entrega hoy — documento,
 * presentación y vídeo corto. Cambiar esta lista es una línea, no una
 * migración: si un programa futuro necesita otro tipo, se añade aquí.
 */
const MIME_MATERIAL = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "video/mp4",
  "application/zip",
];

export function limiteDeSubida(destino: DestinoDeSubida): LimiteDeSubida {
  if (destino.bucket === "downloads") {
    return { mimeTypesPermitidos: ["application/pdf"], maxBytes: 25 * MB };
  }
  switch (destino.type) {
    case "pdf":
      return { mimeTypesPermitidos: ["application/pdf"], maxBytes: 50 * MB };
    case "material":
      return { mimeTypesPermitidos: MIME_MATERIAL, maxBytes: 50 * MB };
    case "html":
      return { mimeTypesPermitidos: ["text/html"], maxBytes: 5 * MB };
    case "md":
      return { mimeTypesPermitidos: ["text/markdown"], maxBytes: 1 * MB };
  }
}
