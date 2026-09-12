/**
 * port.ts — El puerto de almacenamiento de archivos.
 *
 * TRES OPERACIONES, Y LAS TRES QUE FALTAN SON LA DECISIÓN.
 *
 *   · `firmarDescarga`  — emite una URL de lectura con caducidad.
 *   · `firmarSubida`    — emite una URL de escritura con caducidad, ya validada.
 *   · `borrar`          — retira un objeto.
 *
 * **No hay `listar`.** Ninguna ruta de la aplicación lista el contenido de un
 * bucket (RF-123, criterio 2 de FU-09, gate D10), y la forma de garantizarlo no
 * es acordarse de no llamarla: es que no exista. Un puerto sin la operación no
 * se puede usar mal.
 *
 * Tampoco hay `firmarPermanente`: toda URL de archivo caduca, sin excepción
 * (RNF-20).
 */

import type { Bucket } from "./validation.ts";
import type { UsoDeFirma } from "./ttl.ts";

export type UrlFirmada = {
  readonly url: string;
  /** El INSTANTE, que se persiste como evidencia (`download_event`). */
  readonly caducaEn: Date;
  /** Los MINUTOS, que vienen de configuración. Útil para el registro. */
  readonly ttlMinutos: number;
};

export class ErrorDeAlmacenamiento extends Error {
  readonly publico: string;
  constructor(publico: string, interno: string) {
    super(interno);
    this.name = "ErrorDeAlmacenamiento";
    this.publico = publico;
  }
}

export type PuertoDeArchivos = {
  firmarDescarga(entrada: {
    bucket: Bucket;
    clave: string;
    uso: Extract<UsoDeFirma, "download" | "deliverable">;
    /** Nombre con el que el navegador guarda el archivo. */
    nombreDeDescarga?: string;
  }): Promise<UrlFirmada>;

  firmarSubida(entrada: {
    destino: string;
    clave: string;
    mime: string;
    bytes: number;
  }): Promise<UrlFirmada>;

  borrar(entrada: { bucket: Bucket; clave: string }): Promise<void>;
};
