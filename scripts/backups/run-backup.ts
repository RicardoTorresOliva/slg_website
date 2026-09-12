/**
 * run-backup.ts — El proceso de copia de FU-14. Lo ejecuta el crontab del
 * servicio `slg-backup` de Easypanel (D-66), nunca `slg-web`.
 *
 * Cadena completa, sin escalas: `pg_dump` → gzip → **AES-256-GCM en el VPS**
 * → PUT por el puerto de §8.3 con el token `slg-backup-write`. El texto claro
 * no toca el disco en ningún momento: lo que queda en `/tmp` entre el volcado
 * y la subida ya está cifrado (criterio 3, R-12).
 *
 * Qué copia (§9.1):
 *   · base de datos `slg-db` — volcado lógico coherente
 *   · volúmenes de `slg-files` — objetos de `downloads` y `deliverables`
 *   · un MANIFIESTO por copia —cifrado como todo lo demás—: recuentos por tabla
 *     y lista de claves de objeto. El paso 6 de §9.3 exige comparar los
 *     recuentos restaurados "con los de la copia"; sin manifiesto ese "los de
 *     la copia" no existe y la verificación se reduce a mirar lo restaurado y
 *     darlo por bueno.
 *
 * Qué NO copia, y por qué: contenido, código y migraciones viven en GitHub;
 * los secretos no se copian NUNCA (RNF-26), viven solo en las variables de
 * Easypanel.
 *
 * Modos:
 *   (sin argumentos)        copia diaria completa — base de datos + volúmenes
 *   --pre-migration         solo base de datos, generación `pre-migration`
 *                           (criterio 7, R-20: antes de tocar el esquema)
 *
 * Salida: una línea JSON por ejecución en stdout, para que el registro del
 * servicio sea legible por máquina (criterio 1: "su resultado se registra").
 * Un fallo escribe la línea con `ok:false`, intenta avisar por SMTP (R-27) y
 * termina con código distinto de cero, que es lo que hace que el propio
 * Easypanel marque la ejecución en rojo.
 */
import { spawn } from "node:child_process";
import { createGzip } from "node:zlib";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

import { GetObjectCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";

import {
  cifrarFlujo,
  claveDeCopia,
  crearClienteDeDestino,
  PAPELES_DE_VOLUMEN,
  depositar,
  generacionesDeFecha,
  leerConfigDeCopia,
  nuevaEjecucion,
  selloDeTiempo,
  type Confirmacion,
  type CopiaConfig,
  type Generacion,
  type VolumenesConfig,
} from "../../lib/backups/index.ts";
import { recuentosPorTabla } from "./inventory.ts";

type Registro = {
  ok: boolean;
  unidad: "FU-14";
  iniciadoEn: string;
  ejecucion: string;
  duracionMs: number;
  generaciones: Generacion[];
  depositos: { clave: string; bytes: number }[];
  error?: string;
};

// ── Herramientas externas ───────────────────────────────────────────────────

/**
 * Lanza una orden y devuelve su stdout como flujo. `stderr` se acumula: si el
 * proceso termina mal, el mensaje del propio `pg_dump` es el dato útil, no un
 * "exit 1" pelado.
 */
function flujoDeOrden(orden: string[], args: string[]): { salida: Readable; fin: Promise<void> } {
  const hijo = spawn(orden[0], [...orden.slice(1), ...args], { stdio: ["ignore", "pipe", "pipe"] });
  let errores = "";
  hijo.stderr.on("data", (c) => (errores += String(c)));

  const fin = new Promise<void>((resolver, rechazar) => {
    hijo.once("error", rechazar);
    hijo.once("close", (codigo) =>
      codigo === 0
        ? resolver()
        : rechazar(new Error(`\`${orden.join(" ")}\` terminó con código ${codigo}: ${errores.trim()}`)),
    );
  });

  return { salida: hijo.stdout, fin };
}

// ── Base de datos ───────────────────────────────────────────────────────────

/**
 * Volcado lógico coherente y cifrado, en una sola pasada.
 *
 * `--no-owner --no-privileges`: el volcado se restaura en staging, donde los
 * roles se llaman igual pero no son los mismos objetos; los privilegios los
 * repone `scripts/db/setup-app-role.ts`, que ya existe y es la única fuente
 * de verdad sobre el rol de aplicación (FU-04).
 */
async function volcarBaseDeDatos(cfg: CopiaConfig, destino: string): Promise<number> {
  const { salida, fin } = flujoDeOrden(cfg.pgDump, [
    cfg.databaseUrl,
    "--no-owner",
    "--no-privileges",
    "--format=plain",
  ]);

  const comprimido = salida.pipe(createGzip());
  const [{ bytes }] = await Promise.all([cifrarFlujo(comprimido, destino, cfg.claveDeCifradoHex), fin]);
  return bytes;
}

// ── Volúmenes de archivos ───────────────────────────────────────────────────

function clienteDeVolumenes(cfg: VolumenesConfig): S3Client {
  return new S3Client({
    endpoint: cfg.endpoint,
    region: cfg.region,
    forcePathStyle: true,
    credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
  });
}

/**
 * Descarga los objetos de los cubos de `slg-files` a un directorio temporal.
 *
 * La ruta dentro del paquete es `<PAPEL>/<clave>`, donde el papel es
 * `downloads` o `deliverables` — **no el nombre del cubo**. La diferencia es
 * de seguridad, no de estilo: si el paquete llevara el nombre real del cubo,
 * una restauración lo leería y subiría los objetos a ESE cubo... que es el de
 * producción. Restaurar en staging habría escrito en producción. Guardando el
 * papel, la restauración lo traduce al cubo que diga SU configuración, y por
 * eso `restore-backup.ts` no puede tocar producción aunque se le pida.
 *
 * La clave dentro del papel se conserva EXACTA: `deliverable.file_key` y
 * `download.file_key` apuntan a ella (§9.3 paso 5).
 *
 * El listado va por páginas de 1.000 (el máximo de la API S3): D-21 avisa de
 * que las operaciones son la partida medida, así que se lista en lotes y no
 * objeto a objeto. La descarga sí es un GET por objeto — no hay otra forma de
 * leer contenido en S3— y son operaciones de clase B, las de tramo más ancho.
 */
async function descargarVolumenes(
  cfg: VolumenesConfig,
  directorio: string,
): Promise<{ claves: string[]; bytes: number }> {
  const cliente = clienteDeVolumenes(cfg);
  const claves: string[] = [];
  let bytes = 0;

  for (const [indice, bucket] of cfg.buckets.entries()) {
    const papel = PAPELES_DE_VOLUMEN[indice];
    let continuacion: string | undefined;
    do {
      const pagina = await cliente.send(
        new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: continuacion, MaxKeys: 1000 }),
      );
      for (const objeto of pagina.Contents ?? []) {
        if (!objeto.Key) continue;
        const rutaLocal = path.join(directorio, papel, objeto.Key);
        await mkdir(path.dirname(rutaLocal), { recursive: true });
        const cuerpo = await cliente.send(new GetObjectCommand({ Bucket: bucket, Key: objeto.Key }));
        await pipeline(cuerpo.Body as Readable, createWriteStream(rutaLocal));
        claves.push(`${papel}/${objeto.Key}`);
        bytes += objeto.Size ?? 0;
      }
      continuacion = pagina.IsTruncated ? pagina.NextContinuationToken : undefined;
    } while (continuacion);
  }

  return { claves, bytes };
}

/** `tar` del directorio descargado → gzip → cifrado, sin archivo en claro. */
async function empaquetarVolumenes(
  cfg: CopiaConfig,
  directorio: string,
  destino: string,
): Promise<number> {
  const { salida, fin } = flujoDeOrden(["tar"], ["-cf", "-", "-C", directorio, "."]);
  const comprimido = salida.pipe(createGzip());
  const [{ bytes }] = await Promise.all([cifrarFlujo(comprimido, destino, cfg.claveDeCifradoHex), fin]);
  return bytes;
}

// ── Aviso de fallo (criterio 1, R-27) ───────────────────────────────────────

/**
 * El aviso usa el TRANSPORTE SMTP de FU-08 directamente, no `enviarCorreo()`.
 * La diferencia importa: `enviarCorreo()` escribe en `email_delivery` antes de
 * enviar, y el fallo que más falta hace avisar es justamente "no he podido
 * hablar con la base de datos". Un aviso que necesita la pieza averiada para
 * salir no es un aviso.
 *
 * Si tampoco hay SMTP configurado, el aviso se degrada a stderr + código de
 * salida: el servicio de Easypanel marca la ejecución en rojo igual.
 */
async function avisarDelFallo(error: unknown): Promise<void> {
  const mensaje = error instanceof Error ? error.message : String(error);
  try {
    const { leerMailConfig } = await import("../../lib/email/config.ts");
    const { crearTransporteSmtp } = await import("../../lib/email/smtp-transport.ts");
    const cfg = leerMailConfig();
    await crearTransporteSmtp(cfg).enviar({
      to: cfg.alertsTo,
      from: cfg.fromAddress,
      fromName: cfg.fromName,
      replyTo: cfg.replyTo,
      subject: "[SLG] La copia de seguridad ha fallado (FU-14)",
      text:
        `La copia de seguridad no se ha completado.\n\n${mensaje}\n\n` +
        `Mientras esto no se arregle, no hay copia nueva del día. ` +
        `Las copias anteriores siguen en el destino: la purga borra por conteo, no por antigüedad.\n`,
    });
  } catch (falloDelAviso) {
    console.error(
      "No se pudo enviar el aviso de fallo por SMTP:",
      falloDelAviso instanceof Error ? falloDelAviso.message : falloDelAviso,
    );
  }
}

// ── Programa ────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const soloBaseDeDatos = process.argv.includes("--pre-migration");
  const iniciadoEn = new Date();
  // UNA vez por ejecución, no por objeto: los tres objetos de esta copia
  // comparten identificador, y por eso la purga los conserva o los borra
  // juntos.
  const ejecucion = nuevaEjecucion();
  const registro: Registro = {
    ok: false,
    unidad: "FU-14",
    iniciadoEn: iniciadoEn.toISOString(),
    ejecucion,
    duracionMs: 0,
    generaciones: soloBaseDeDatos ? ["pre-migration"] : generacionesDeFecha(iniciadoEn),
    depositos: [],
  };

  const cfg = leerConfigDeCopia();
  const cliente = crearClienteDeDestino(cfg.destino);
  const trabajo = await mkdtemp(path.join(tmpdir(), "slg-backup-"));

  try {
    // ── Base de datos ───────────────────────────────────────────────────
    const rutaDb = path.join(trabajo, "db.sql.gz.enc");
    await volcarBaseDeDatos(cfg, rutaDb);

    // Se anota cada depósito EN CUANTO ocurre, no al final: una ejecución que
    // falla a mitad ya ha dejado objetos en el destino, y el registro tiene que
    // decir cuáles. Lo enseñó la primera prueba del cron real — el volcado
    // subió, el paso de volúmenes falló, y la línea de registro salió con
    // `depositos: []` como si no hubiera subido nada.
    const confirmaciones: Confirmacion[] = [];
    const anotar = (c: Confirmacion) => {
      confirmaciones.push(c);
      registro.depositos.push({ clave: c.clave, bytes: c.bytes });
      return c;
    };

    for (const generacion of registro.generaciones) {
      anotar(
        await depositar(
          cliente,
          cfg.destino,
          claveDeCopia({ tipo: "db", generacion, fecha: iniciadoEn, ejecucion, extension: "sql.gz.enc" }),
          { tipo: "archivo", ruta: rutaDb },
        ),
      );
    }

    // ── Volúmenes y manifiesto ──────────────────────────────────────────
    let clavesDeObjeto: string[] = [];
    if (!soloBaseDeDatos) {
      const origenes = path.join(trabajo, "volumenes");
      await mkdir(origenes, { recursive: true });
      const descargados = await descargarVolumenes(cfg.volumenes, origenes);
      clavesDeObjeto = descargados.claves;

      const rutaFiles = path.join(trabajo, "files.tar.gz.enc");
      await empaquetarVolumenes(cfg, origenes, rutaFiles);

      for (const generacion of registro.generaciones) {
        anotar(
          await depositar(
            cliente,
            cfg.destino,
            claveDeCopia({ tipo: "files", generacion, fecha: iniciadoEn, ejecucion, extension: "tar.gz.enc" }),
            { tipo: "archivo", ruta: rutaFiles },
          ),
        );
      }
    }

    // El manifiesto va CIFRADO como todo lo demás. No es metadato inocuo: las
    // claves de objeto de `deliverables` llevan el identificador de la empresa
    // cliente, así que una lista en claro en el destino diría quién tiene qué
    // sin necesidad de descifrar una sola copia. Criterio 3 sin excepciones.
    const rutaManifiesto = path.join(trabajo, "manifiesto.json.gz.enc");
    const manifiesto = JSON.stringify(
      {
        unidad: "FU-14",
        sello: selloDeTiempo(iniciadoEn),
        ejecucion,
        papelesDeVolumen: PAPELES_DE_VOLUMEN,
        generaciones: registro.generaciones,
        recuentosPorTabla: await recuentosPorTabla(cfg.databaseUrl),
        clavesDeObjeto,
        claves: confirmaciones.map((c) => c.clave),
      },
      null,
      2,
    );
    await cifrarFlujo(
      Readable.from([Buffer.from(manifiesto, "utf8")]).pipe(createGzip()),
      rutaManifiesto,
      cfg.claveDeCifradoHex,
    );
    for (const generacion of registro.generaciones) {
      anotar(
        await depositar(
          cliente,
          cfg.destino,
          claveDeCopia({
            tipo: "db",
            generacion,
            fecha: iniciadoEn,
            ejecucion,
            extension: "manifiesto.json.gz.enc",
          }),
          { tipo: "archivo", ruta: rutaManifiesto },
        ),
      );
    }

    registro.ok = true;
  } catch (error) {
    registro.error = error instanceof Error ? error.message : String(error);
    await avisarDelFallo(error);
  } finally {
    await rm(trabajo, { recursive: true, force: true });
    registro.duracionMs = Date.now() - iniciadoEn.getTime();
    console.log(JSON.stringify(registro));
  }

  process.exit(registro.ok ? 0 : 1);
}

main().catch(async (error) => {
  console.error("Error inesperado en run-backup.ts:", error);
  await avisarDelFallo(error);
  process.exit(1);
});
