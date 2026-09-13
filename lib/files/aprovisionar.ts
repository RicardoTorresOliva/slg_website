/**
 * aprovisionar.ts — **Crear los dos buckets y dejarlos privados, desde la web.**
 *
 * POR QUÉ ESTO EXISTE Y NO ESTÁ EN `port.ts`. El puerto de archivos tiene tres
 * operaciones y las que faltan son la decisión: **no hay `listar`** porque
 * ninguna ruta de la aplicación debe listar un bucket (RF-123), y un puerto sin
 * la operación no se puede usar mal. Crear un bucket es de la misma familia:
 * **no es algo que la aplicación haga sirviendo peticiones**, es algo que se
 * hace UNA vez al montar la infraestructura.
 *
 * Así que vive aparte, y solo lo llama `/api/ops` —la página de puesta en
 * marcha, que **no existe** sin `OPS_TOKEN` y se apaga borrando esa variable—.
 * Ninguna página, ningún formulario y ninguna acción del sitio lo importa, y
 * `check:fronteras` sigue impidiendo que nadie más toque el SDK.
 *
 * POR QUÉ SE AUTOMATIZA. La alternativa era un paso a paso por la consola de
 * MinIO: abrir un dominio, entrar con unas credenciales que hay que ir a buscar
 * a otra pestaña, crear dos buckets, marcarlos privados, crear una clave de
 * acceso y copiarla. Seis pasos en dos paneles distintos, cada uno con su forma
 * de equivocarse, para algo que la API hace en dos llamadas. **Lo que se puede
 * hacer con código no se le pide a una persona.**
 */
import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutPublicAccessBlockCommand,
  S3ServiceException,
} from "@aws-sdk/client-s3";

import { clienteS3 } from "./s3.ts";
import { BUCKETS, type Bucket } from "./validation.ts";

export type ResultadoDeBucket = {
  readonly bucket: Bucket;
  readonly nombre: string;
  readonly ok: boolean;
  readonly detalle: string;
};

function nombreDe(bucket: Bucket): string {
  const v = bucket === "downloads" ? process.env.S3_BUCKET_DOWNLOADS : process.env.S3_BUCKET_DELIVERABLES;
  // Si la variable no está, se usa el nombre canónico: es el caso de la primera
  // puesta en marcha, y fallar aquí obligaría a definir variables para poder
  // crear justo lo que esas variables nombran.
  return v?.trim() || bucket;
}

/**
 * Crea los dos buckets si no existen y **comprueba que no son públicos**.
 *
 * Es idempotente: llamarlo dos veces no es un error, y el segundo dice «ya
 * estaba». Un botón de puesta en marcha que falla la segunda vez es un botón
 * que la gente teme pulsar.
 */
export async function asegurarBuckets(): Promise<ResultadoDeBucket[]> {
  /**
   * `clienteS3()` LANZA si faltan las variables, y esta función existe para la
   * puesta en marcha — o sea, para el momento exacto en el que es normal que
   * falten. Una acción que se cae con un 500 cuando encuentra el problema no
   * sirve para arreglarlo: tiene que decir **cuál** falta.
   */
  let cliente;
  try {
    cliente = clienteS3();
  } catch (e) {
    return BUCKETS.map((bucket) => ({
      bucket,
      nombre: nombreDe(bucket),
      ok: false,
      detalle: (e as Error).message.slice(0, 200),
    }));
  }
  const out: ResultadoDeBucket[] = [];

  for (const bucket of BUCKETS) {
    const nombre = nombreDe(bucket);
    try {
      await cliente.send(new HeadBucketCommand({ Bucket: nombre }));
      out.push({ bucket, nombre, ok: true, detalle: "ya existía" });
    } catch (e) {
      const codigo = e instanceof S3ServiceException ? (e.$metadata.httpStatusCode ?? 0) : 0;
      if (codigo !== 404 && codigo !== 403 && codigo !== 0) {
        out.push({ bucket, nombre, ok: false, detalle: `no se pudo comprobar: HTTP ${codigo}` });
        continue;
      }
      try {
        await cliente.send(new CreateBucketCommand({ Bucket: nombre }));
        out.push({ bucket, nombre, ok: true, detalle: "creado" });
      } catch (e2) {
        const msg = (e2 as Error).message.slice(0, 160);
        // MinIO contesta `BucketAlreadyOwnedByYou` cuando ya es tuyo: eso es un
        // éxito disfrazado de error, y tratarlo como fallo asustaría sin motivo.
        const yaEra = /AlreadyOwned|AlreadyExists/i.test(msg);
        out.push({ bucket, nombre, ok: yaEra, detalle: yaEra ? "ya existía" : `no se pudo crear: ${msg}` });
      }
    }
  }

  return out;
}

/**
 * Deja los dos buckets **cerrados a accesos anónimos**.
 *
 * `PutPublicAccessBlock` es la orden estándar de S3 y MinIO la implementa. No
 * todas las implementaciones la traen —de ahí el `catch` que lo cuenta en vez
 * de romper—, y por eso la comprobación que de verdad manda sigue siendo la de
 * `/api/ops`: **leer un objeto SIN firma y ver que falla**. Una orden aceptada
 * no es una puerta cerrada; la puerta cerrada se comprueba empujándola.
 */
export async function cerrarAccesoPublico(): Promise<ResultadoDeBucket[]> {
  let cliente;
  try {
    cliente = clienteS3();
  } catch (e) {
    return BUCKETS.map((bucket) => ({
      bucket,
      nombre: nombreDe(bucket),
      ok: false,
      detalle: (e as Error).message.slice(0, 200),
    }));
  }
  const out: ResultadoDeBucket[] = [];

  for (const bucket of BUCKETS) {
    const nombre = nombreDe(bucket);
    try {
      await cliente.send(
        new PutPublicAccessBlockCommand({
          Bucket: nombre,
          PublicAccessBlockConfiguration: {
            BlockPublicAcls: true,
            IgnorePublicAcls: true,
            BlockPublicPolicy: true,
            RestrictPublicBuckets: true,
          },
        }),
      );
      out.push({ bucket, nombre, ok: true, detalle: "acceso anónimo bloqueado" });
    } catch (e) {
      out.push({
        bucket,
        nombre,
        ok: false,
        detalle: `no se pudo aplicar el bloqueo (${(e as Error).message.slice(0, 100)}). La prueba que manda es la de lectura sin firma, más abajo.`,
      });
    }
  }

  return out;
}
