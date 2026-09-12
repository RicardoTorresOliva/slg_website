/**
 * encryption.ts — Cifrado EN EL VPS, antes de que el byte salga de la máquina
 * (criterio 3 de FU-14, R-12).
 *
 * AES-256-GCM con `node:crypto`. GCM y no CBC porque el cifrado autentica: si
 * un objeto del destino se altera —o se trunca a medias durante una subida—,
 * el descifrado FALLA en vez de devolver basura que parece un volcado. Un
 * backup corrupto que se descifra "bien" es peor que uno que no se descifra.
 *
 * Formato del objeto cifrado (todo el que hace falta para descifrarlo, salvo
 * la clave, que vive fuera del VPS y fuera del repositorio):
 *
 *     ┌──────────┬────────────┬──────────────┬───────────┐
 *     │ "SLGBK1" │ IV 12 bytes│  cifrado …   │ etiqueta  │
 *     │ 6 bytes  │            │              │ 16 bytes  │
 *     └──────────┴────────────┴──────────────┴───────────┘
 *
 * La etiqueta va al FINAL porque GCM solo la produce cuando ha consumido todo
 * el texto claro: ponerla en la cabecera obligaría a tener el volcado entero
 * en memoria antes de escribir el primer byte, y un volcado no tiene por qué
 * caber en la RAM del VPS.
 *
 * El texto claro nunca toca el disco: `cifrarFlujo` recibe la salida de
 * `pg_dump` (o de `tar`) ya comprimida y escribe directamente el archivo
 * cifrado. Lo que queda en el VPS entre el volcado y la subida ya está
 * cifrado.
 */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { open, stat } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import type { Readable, Writable } from "node:stream";

export const MAGIC = Buffer.from("SLGBK1", "ascii");
const IV_BYTES = 12;
const TAG_BYTES = 16;
export const CABECERA_BYTES = MAGIC.byteLength + IV_BYTES;

export class BackupCifradoInvalidoError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "BackupCifradoInvalidoError";
  }
}

function claveBinaria(claveHex: string): Buffer {
  const clave = Buffer.from(claveHex, "hex");
  if (clave.byteLength !== 32) {
    throw new BackupCifradoInvalidoError(
      "La clave de cifrado debe tener 256 bits (64 caracteres hexadecimales).",
    );
  }
  return clave;
}

/**
 * Cifra `origen` en `destino`. Devuelve los bytes escritos. El flujo de
 * entrada se consume una sola vez: no hay copia intermedia en claro.
 */
export async function cifrarFlujo(
  origen: Readable,
  destinoRuta: string,
  claveHex: string,
): Promise<{ bytes: number }> {
  const clave = claveBinaria(claveHex);
  const iv = randomBytes(IV_BYTES);
  const cifrador = createCipheriv("aes-256-gcm", clave, iv);

  const salida: Writable = createWriteStream(destinoRuta);
  await new Promise<void>((resolver, rechazar) => {
    salida.once("error", rechazar);
    salida.write(Buffer.concat([MAGIC, iv]), (e) => (e ? rechazar(e) : resolver()));
  });

  // `end: false` para poder añadir la etiqueta después del último bloque.
  await pipeline(origen, cifrador, salida, { end: false });

  const etiqueta = cifrador.getAuthTag();
  await new Promise<void>((resolver, rechazar) => {
    salida.end(etiqueta, () => resolver());
    salida.once("error", rechazar);
  });

  return { bytes: (await stat(destinoRuta)).size };
}

/**
 * Descifra `origen` y lo escribe en `destino`. Lanza si la etiqueta no cuadra
 * —objeto manipulado, truncado, o clave equivocada—; nunca devuelve un archivo
 * "a medias".
 */
export async function descifrarArchivo(
  origenRuta: string,
  destino: Writable,
  claveHex: string,
): Promise<void> {
  const clave = claveBinaria(claveHex);
  const tamano = (await stat(origenRuta)).size;
  if (tamano < CABECERA_BYTES + TAG_BYTES) {
    throw new BackupCifradoInvalidoError(
      `${origenRuta} es demasiado corto para ser una copia cifrada (${tamano} bytes).`,
    );
  }

  const manejador = await open(origenRuta, "r");
  try {
    const cabecera = Buffer.alloc(CABECERA_BYTES);
    await manejador.read(cabecera, 0, CABECERA_BYTES, 0);
    if (!cabecera.subarray(0, MAGIC.byteLength).equals(MAGIC)) {
      throw new BackupCifradoInvalidoError(
        `${origenRuta} no lleva la marca ${MAGIC.toString()}: no lo escribió este proceso de copia.`,
      );
    }
    const iv = cabecera.subarray(MAGIC.byteLength);

    const etiqueta = Buffer.alloc(TAG_BYTES);
    await manejador.read(etiqueta, 0, TAG_BYTES, tamano - TAG_BYTES);

    const descifrador = createDecipheriv("aes-256-gcm", clave, iv);
    descifrador.setAuthTag(etiqueta);

    await pipeline(
      createReadStream(origenRuta, { start: CABECERA_BYTES, end: tamano - TAG_BYTES - 1 }),
      descifrador,
      destino,
    );
  } finally {
    await manejador.close();
  }
}
