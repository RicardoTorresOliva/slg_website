/**
 * cifrado.ts — **El backup se cifra ANTES de salir de la máquina, y la clave que
 * lo descifra no vive en la máquina** (FU-14, criterio 3 · R-12).
 *
 * EL PROBLEMA QUE RESUELVE LA ASIMETRÍA. El criterio pide dos cosas que con
 * cifrado simétrico son incompatibles: que el VPS cifre, y que **la clave no
 * esté en el VPS**. Con una contraseña compartida, quien entre en el VPS la lee
 * de las variables de entorno y se lleva los backups descifrados — que es
 * exactamente el escenario del que un backup debería salvarnos.
 *
 * Con cifrado asimétrico no hay contradicción: en el VPS vive la **clave
 * pública**, que no es un secreto y no descifra nada; la **privada** vive fuera,
 * con Ricardo, y solo hace falta el día que haya que restaurar. Es el mismo
 * diseño de `age`, implementado aquí con `node:crypto` para no depender de un
 * binario que mañana no esté instalado en el contenedor.
 *
 * FORMA DEL SOBRE (todo en un flujo, sin cargar el archivo en memoria):
 *
 *   `SLGBK1` · long(clave efímera) · clave efímera · salt(16) · iv(12) · …datos… · tag(16)
 *
 * X25519 para acordar el secreto, HKDF-SHA256 para derivarlo y **AES-256-GCM**
 * para cifrar: GCM y no CBC porque un backup tiene que detectar la manipulación,
 * no solo esconder el contenido. Un byte cambiado en tránsito hace que el
 * descifrado **falle**, en vez de devolver basura que parece un dump.
 */
import {
  createCipheriv,
  createDecipheriv,
  createPublicKey,
  createPrivateKey,
  diffieHellman,
  generateKeyPairSync,
  hkdfSync,
  randomBytes,
  type KeyObject,
} from "node:crypto";
import { Readable, Transform, type Duplex } from "node:stream";

const MARCA = Buffer.from("SLGBK1");
const BYTES_SALT = 16;
const BYTES_IV = 12;
const BYTES_TAG = 16;

/** Un par nuevo. La pública va al VPS; la privada, fuera y solo para restaurar. */
export function generarParDeClaves(): { publica: string; privada: string } {
  const { publicKey, privateKey } = generateKeyPairSync("x25519");
  return {
    publica: publicKey.export({ type: "spki", format: "pem" }).toString(),
    privada: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
  };
}

function derivar(secreto: Buffer, salt: Buffer): Buffer {
  return Buffer.from(hkdfSync("sha256", secreto, salt, Buffer.from("slg-backup-v1"), 32));
}

/**
 * Cifra un flujo. Devuelve un flujo legible: el dump nunca se materializa
 * entero en memoria ni en un archivo intermedio sin cifrar.
 */
export function cifrarFlujo(entrada: Readable, clavePublicaPem: string): Readable {
  const destino: KeyObject = createPublicKey(clavePublicaPem);
  const efimero = generateKeyPairSync("x25519");
  const secreto = diffieHellman({ privateKey: efimero.privateKey, publicKey: destino });
  const salt = randomBytes(BYTES_SALT);
  const iv = randomBytes(BYTES_IV);
  const cifrador = createCipheriv("aes-256-gcm", derivar(secreto, salt), iv);

  const publicaEfimera = efimero.publicKey.export({ type: "spki", format: "der" }) as Buffer;
  const longitud = Buffer.alloc(2);
  longitud.writeUInt16BE(publicaEfimera.length);

  /**
   * La cabecera va **por delante y sin cifrar**: contiene la clave pública
   * efímera, el salt y el IV, que no son secretos y son imprescindibles para
   * descifrar. El `tag` va al final porque GCM no lo conoce hasta terminar.
   */
  const cabecera = Buffer.concat([MARCA, longitud, publicaEfimera, salt, iv]);

  const salida = new Transform({
    transform(trozo, _codificacion, siguiente) {
      siguiente(null, trozo);
    },
  });

  salida.push(cabecera);
  entrada.on("error", (e) => salida.destroy(e));
  cifrador.on("error", (e) => salida.destroy(e));
  entrada.pipe(cifrador);
  cifrador.on("data", (trozo: Buffer) => salida.push(trozo));
  cifrador.on("end", () => {
    salida.push(cifrador.getAuthTag());
    salida.push(null);
  });
  return salida;
}

/**
 * Descifra un sobre completo. **Exige el archivo entero** porque el `tag` de GCM
 * va al final: verificar antes de entregar un solo byte es el punto — un dump
 * manipulado tiene que fallar, no restaurarse a medias.
 */
export function descifrar(sobre: Buffer, clavePrivadaPem: string): Buffer {
  if (sobre.length < MARCA.length + 2 || !sobre.subarray(0, MARCA.length).equals(MARCA)) {
    throw new Error("el archivo no es un sobre de backup de este sistema");
  }
  let cursor = MARCA.length;
  const longitud = sobre.readUInt16BE(cursor);
  cursor += 2;
  const publicaEfimera = sobre.subarray(cursor, cursor + longitud);
  cursor += longitud;
  const salt = sobre.subarray(cursor, cursor + BYTES_SALT);
  cursor += BYTES_SALT;
  const iv = sobre.subarray(cursor, cursor + BYTES_IV);
  cursor += BYTES_IV;
  const tag = sobre.subarray(sobre.length - BYTES_TAG);
  const datos = sobre.subarray(cursor, sobre.length - BYTES_TAG);

  const privada = createPrivateKey(clavePrivadaPem);
  const publica = createPublicKey({ key: publicaEfimera, type: "spki", format: "der" });
  const secreto = diffieHellman({ privateKey: privada, publicKey: publica });

  const descifrador = createDecipheriv("aes-256-gcm", derivar(secreto, salt), iv);
  descifrador.setAuthTag(tag);
  return Buffer.concat([descifrador.update(datos), descifrador.final()]);
}

/** Para las pruebas: cifra un búfer completo con el mismo formato. */
export async function cifrar(datos: Buffer, clavePublicaPem: string): Promise<Buffer> {
  const flujo: Duplex = cifrarFlujo(Readable.from([datos]), clavePublicaPem) as Duplex;
  const trozos: Buffer[] = [];
  for await (const trozo of flujo) trozos.push(trozo as Buffer);
  return Buffer.concat(trozos);
}
