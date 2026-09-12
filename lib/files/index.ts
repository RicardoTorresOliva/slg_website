/**
 * index.ts — La superficie pública del almacenamiento de archivos.
 *
 * Ninguna ruta importa el cliente de S3: todas entran por aquí, y el freno
 * `npm run check:fronteras` lo comprueba (criterio 1 del mismo espíritu que
 * FU-06 y FU-08).
 *
 * Y aquí NO hay, ni habrá, una función que liste un bucket ni una que emita una
 * URL sin caducidad. Las dos ausencias son el gate D10.
 */

export { adaptadorS3, clienteS3 } from "./s3.ts";
export {
  ErrorDeAlmacenamiento,
  type PuertoDeArchivos,
  type UrlFirmada,
} from "./port.ts";
export {
  validarSubida,
  BUCKETS,
  DESTINOS,
  type Bucket,
  type Destino,
  type Aceptacion,
  type Rechazo,
} from "./validation.ts";
export { ttlEnMinutos, ttlEnSegundos, VARIABLES_DE_TTL, type UsoDeFirma } from "./ttl.ts";
