/**
 * prune-backups.ts — La purga de copias antiguas. **Proceso distinto, con
 * credenciales distintas** (mitigación 2 de R-37, `architecture` §9.2,
 * criterio 4 de FU-14).
 *
 * Corre en su PROPIO servicio de Easypanel (`ops/backups/purga/Dockerfile`),
 * nunca junto al de copia y nunca dentro de `slg-web`. Solo ese servicio lleva
 * `R2_ACCESS_KEY_ID_PRUNE`/`R2_SECRET_ACCESS_KEY_PRUNE` en su entorno. Lo que
 * hace que esto no sea una promesa: `leerConfigDeCopia()` lanza si encuentra
 * esas variables, así que montar las dos credenciales juntas rompe la copia de
 * forma visible el mismo día, no en silencio.
 *
 * Este archivo NO importa nada de `lib/backups/destination.ts`: ese puerto
 * solo deposita. Aquí se instancia un cliente propio, con los comandos que la
 * purga necesita y el puerto no tiene — que es justamente por qué son dos
 * cosas separadas.
 *
 * La clave de cifrado no se lee: purgar es borrar objetos por su clave, nunca
 * abrirlos. Este proceso no puede leer un backup ni aunque quisiera.
 *
 *   --dry-run   calcula y enseña, no borra. El modo por defecto de cualquiera
 *               que esté mirando esto por primera vez.
 */
import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";

import { leerConfigDePurga, seleccionarParaPurga } from "../../lib/backups/index.ts";

/** Máximo de claves por `DeleteObjects` en la API S3. */
const LOTE_DE_BORRADO = 1000;

async function listarTodo(cliente: S3Client, bucket: string): Promise<string[]> {
  const claves: string[] = [];
  let continuacion: string | undefined;
  do {
    // Páginas de 1.000, el máximo de la API: D-21 avisa de que en R2 la
    // partida medida son las operaciones. Un listado completo de un año de
    // copias cabe en una o dos peticiones.
    const pagina = await cliente.send(
      new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: continuacion, MaxKeys: 1000 }),
    );
    for (const objeto of pagina.Contents ?? []) if (objeto.Key) claves.push(objeto.Key);
    continuacion = pagina.IsTruncated ? pagina.NextContinuationToken : undefined;
  } while (continuacion);
  return claves;
}

async function main(): Promise<void> {
  const simulacion = process.argv.includes("--dry-run");
  const cfg = leerConfigDePurga();

  const cliente = new S3Client({
    endpoint: cfg.destino.endpoint,
    region: cfg.destino.region,
    forcePathStyle: true,
    credentials: {
      accessKeyId: cfg.destino.accessKeyId,
      secretAccessKey: cfg.destino.secretAccessKey,
    },
  });

  const iniciadoEn = new Date();
  const existentes = await listarTodo(cliente, cfg.destino.bucket);
  const { aBorrar, aConservar, ignoradas } = seleccionarParaPurga(existentes, cfg.retencion);

  if (!simulacion && aBorrar.length > 0) {
    for (let i = 0; i < aBorrar.length; i += LOTE_DE_BORRADO) {
      const lote = aBorrar.slice(i, i + LOTE_DE_BORRADO);
      // Un `DeleteObjects` por lote, no un `DeleteObject` por clave (D-21).
      const respuesta = await cliente.send(
        new DeleteObjectsCommand({
          Bucket: cfg.destino.bucket,
          Delete: { Objects: lote.map((Key) => ({ Key })), Quiet: true },
        }),
      );
      if (respuesta.Errors?.length) {
        throw new Error(
          `El destino rechazó ${respuesta.Errors.length} borrado(s): ` +
            respuesta.Errors.map((e) => `${e.Key}: ${e.Message}`).join("; "),
        );
      }
    }
  }

  console.log(
    JSON.stringify({
      ok: true,
      unidad: "FU-14",
      proceso: "purga",
      simulacion,
      iniciadoEn: iniciadoEn.toISOString(),
      duracionMs: Date.now() - iniciadoEn.getTime(),
      retencion: cfg.retencion,
      existentes: existentes.length,
      conservadas: aConservar.length,
      borradas: simulacion ? 0 : aBorrar.length,
      candidatas: aBorrar,
      // Las claves que no reconoce NUNCA se borran: se enseñan para que alguien
      // decida a mano. Un proceso con permiso de borrado no improvisa.
      ignoradas,
    }),
  );
}

main().catch((error) => {
  console.log(
    JSON.stringify({
      ok: false,
      unidad: "FU-14",
      proceso: "purga",
      error: error instanceof Error ? error.message : String(error),
    }),
  );
  process.exit(1);
});
