/**
 * restore-backup.ts — El procedimiento de restauración de `architecture` §9.3,
 * ejecutable. *Un backup no restaurado no cuenta como backup.*
 *
 * Tercera credencial, de LECTURA (`R2_*_RESTORE`): §8.3 dice expresamente que
 * restaurar no comparte puerto con copiar, porque restaurar exige leer y el
 * puerto de copia no lee. No usa la de purga tampoco: purgar exige borrar, y
 * una restauración no necesita borrar nada del destino.
 *
 * Los ocho pasos de §9.3, y cuál cubre este script:
 *
 *   0 PREPARAR    ✔ exige `RESTORE_DATABASE_URL` distinta de `DATABASE_URL` y
 *                   el indicador explícito `--staging`. Cronometra.
 *   1 ELEGIR      ✔ `--listar` enumera las generaciones disponibles.
 *   2 UNA ANTIGUA ✔ `--generacion weekly|monthly` + `--indice N`. Por defecto
 *                   NO coge la última: sin `--indice`, coge la más antigua de
 *                   la generación pedida, que es lo que R-37 quiere probar.
 *   3 DESCARGAR   ✔
 *   4 DESCIFRAR   ✔ con la clave custodiada fuera del VPS. Si no aparece, el
 *                   script no arranca — que es el fallo que esta prueba tiene
 *                   que descubrir hoy.
 *   5 RESTAURAR   ✔ base limpia + volcado; objetos a los cubos conservando la
 *                   clave (`deliverable.file_key`/`download.file_key`).
 *   6 VERIFICAR   ✔ parcial: recuentos por tabla contra el MANIFIESTO de la
 *                   copia y presencia de todos los objetos. Las comprobaciones
 *                   funcionales (tres métodos de inicio de sesión, visor
 *                   aislado, batería de FU-13) NO las hace este script: se
 *                   ejecutan sobre el staging restaurado con sus propias
 *                   suites, y así queda anotado en la salida.
 *   7 REGISTRAR   ✔ imprime la línea JSON que va al `work_log` (la duración es
 *                   el dato que falta el día del incidente).
 *   8 LIMPIAR     ✘ deliberadamente manual: devolver staging a su estado
 *                   normal es una decisión de quien restaura, no un efecto
 *                   secundario de una herramienta.
 */
import { spawn } from "node:child_process";
import { createGunzip } from "node:zlib";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { PassThrough, Readable } from "node:stream";

import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import postgres from "postgres";

import {
  analizarClave,
  descifrarArchivo,
  leerConfigDeRestauracion,
  PAPELES_DE_VOLUMEN,
  type Generacion,
  type RestauracionConfig,
} from "../../lib/backups/index.ts";
import { recuentosPorTabla } from "./inventory.ts";

type Argumentos = {
  listar: boolean;
  generacion: Generacion;
  indice: number | null;
  staging: boolean;
};

function leerArgumentos(): Argumentos {
  const argv = process.argv.slice(2);
  const valor = (nombre: string): string | undefined => {
    const i = argv.indexOf(nombre);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const indice = valor("--indice");
  return {
    listar: argv.includes("--listar"),
    generacion: (valor("--generacion") ?? "weekly") as Generacion,
    indice: indice === undefined ? null : Number(indice),
    staging: argv.includes("--staging"),
  };
}

function crearCliente(cfg: RestauracionConfig): S3Client {
  return new S3Client({
    endpoint: cfg.destino.endpoint,
    region: cfg.destino.region,
    forcePathStyle: true,
    credentials: {
      accessKeyId: cfg.destino.accessKeyId,
      secretAccessKey: cfg.destino.secretAccessKey,
    },
  });
}

// ── Paso 1: listar generaciones ─────────────────────────────────────────────

type Ejecucion = { sello: string; ejecucion: string; fecha: Date; claves: string[] };

async function listarEjecuciones(
  cliente: S3Client,
  bucket: string,
  generacion: Generacion,
): Promise<Ejecucion[]> {
  const porEjecucion = new Map<string, Ejecucion>();
  let continuacion: string | undefined;
  do {
    const pagina = await cliente.send(
      new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: continuacion, MaxKeys: 1000 }),
    );
    for (const objeto of pagina.Contents ?? []) {
      if (!objeto.Key) continue;
      const analizada = analizarClave(objeto.Key);
      if (!analizada || analizada.generacion !== generacion) continue;
      // La marca de tiempo sola no identifica una ejecución: tiene resolución
      // de segundo. Se agrupa por marca + identificador de ejecución, igual
      // que hace la purga, para que dos copias del mismo segundo se ofrezcan
      // como dos opciones distintas y no como una revuelta.
      const id = `${analizada.fecha.toISOString()}-${analizada.ejecucion}`;
      if (!porEjecucion.has(id)) {
        porEjecucion.set(id, {
          sello: analizada.fecha.toISOString(),
          ejecucion: analizada.ejecucion,
          fecha: analizada.fecha,
          claves: [],
        });
      }
      porEjecucion.get(id)!.claves.push(objeto.Key);
    }
    continuacion = pagina.IsTruncated ? pagina.NextContinuationToken : undefined;
  } while (continuacion);

  return [...porEjecucion.values()].sort(
    (a, b) => b.fecha.getTime() - a.fecha.getTime() || b.ejecucion.localeCompare(a.ejecucion),
  );
}

// ── Pasos 3 y 4: descargar y descifrar ──────────────────────────────────────

async function descargarYDescifrar(
  cliente: S3Client,
  cfg: RestauracionConfig,
  clave: string,
  destinoRuta: string,
): Promise<void> {
  const cifrado = `${destinoRuta}.enc`;
  const respuesta = await cliente.send(
    new GetObjectCommand({ Bucket: cfg.destino.bucket, Key: clave }),
  );
  await pipeline(respuesta.Body as Readable, createWriteStream(cifrado));

  const descomprimido = createWriteStream(destinoRuta);
  const intermedio = new PassThrough();
  const fin = pipeline(intermedio, createGunzip(), descomprimido);
  await descifrarArchivo(cifrado, intermedio, cfg.claveDeCifradoHex);
  await fin;
  await rm(cifrado, { force: true });
}

// ── Paso 5: restaurar ───────────────────────────────────────────────────────

function ejecutar(orden: string[], args: string[], entrada?: NodeJS.ReadableStream): Promise<void> {
  return new Promise((resolver, rechazar) => {
    const hijo = spawn(orden[0], [...orden.slice(1), ...args], {
      stdio: [entrada ? "pipe" : "ignore", "pipe", "pipe"],
    });
    let errores = "";
    hijo.stderr.on("data", (c) => (errores += String(c)));
    hijo.stdout.resume();
    if (entrada) entrada.pipe(hijo.stdin);
    hijo.once("error", rechazar);
    hijo.once("close", (codigo) =>
      codigo === 0
        ? resolver()
        : rechazar(new Error(`\`${orden.join(" ")}\` terminó con código ${codigo}: ${errores.trim()}`)),
    );
  });
}

/**
 * "Crear una base limpia" (§9.3 paso 5). No se borra la base: se vacía el
 * esquema `public`. Borrar la base exigiría conectarse a otra y tener permiso
 * de `DROP DATABASE`, y un procedimiento de emergencia no debería necesitar
 * más permisos de los imprescindibles.
 */
async function limpiarEsquema(databaseUrl: string): Promise<void> {
  const sql = postgres(databaseUrl, { max: 1, onnotice: () => {} });
  try {
    await sql.unsafe("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function restaurarVolumenes(
  cfg: RestauracionConfig,
  directorio: string,
): Promise<{ subidas: number; claves: string[]; sinPapel: string[] }> {
  const cliente = new S3Client({
    endpoint: cfg.volumenes.endpoint,
    region: cfg.volumenes.region,
    forcePathStyle: true,
    credentials: {
      accessKeyId: cfg.volumenes.accessKeyId,
      secretAccessKey: cfg.volumenes.secretAccessKey,
    },
  });

  const { readdir } = await import("node:fs/promises");
  const claves: string[] = [];

  async function recorrer(dir: string, prefijo: string): Promise<void> {
    for (const entrada of await readdir(dir, { withFileTypes: true })) {
      const ruta = path.join(dir, entrada.name);
      const relativa = prefijo ? `${prefijo}/${entrada.name}` : entrada.name;
      if (entrada.isDirectory()) await recorrer(ruta, relativa);
      else claves.push(relativa);
    }
  }
  await recorrer(directorio, "");

  let subidas = 0;
  const sinPapel: string[] = [];
  for (const relativa of claves) {
    // El paquete conserva `<papel>/<clave>`: el primer segmento es el PAPEL
    // (`downloads` o `deliverables`), NO el nombre del cubo de origen. Aquí se
    // traduce al cubo que dice la configuración de ESTE entorno.
    //
    // Que el paquete no lleve el nombre del cubo es lo que impide que una
    // restauración en staging escriba en los cubos de producción: el nombre
    // de producción no está escrito en ninguna parte del paquete, así que no
    // hay forma de acabar allí ni por descuido ni a propósito. La clave dentro
    // del papel sí se conserva EXACTA — `deliverable.file_key` y
    // `download.file_key` apuntan a ella (§9.3 paso 5).
    const separador = relativa.indexOf("/");
    if (separador < 0) continue;
    const papel = relativa.slice(0, separador);
    const clave = relativa.slice(separador + 1);
    const indice = PAPELES_DE_VOLUMEN.indexOf(papel as (typeof PAPELES_DE_VOLUMEN)[number]);
    if (indice < 0) {
      sinPapel.push(relativa);
      continue;
    }
    const bucket = cfg.volumenes.buckets[indice];
    await cliente.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: clave,
        Body: createReadStream(path.join(directorio, relativa)),
        ContentLength: (await stat(path.join(directorio, relativa))).size,
      }),
    );
    subidas++;
  }

  return { subidas, claves, sinPapel };
}

// ── Programa ────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = leerArgumentos();
  const cfg = leerConfigDeRestauracion();
  const cliente = crearCliente(cfg);

  if (args.listar) {
    const salida: Record<string, { sello: string; objetos: number }[]> = {};
    for (const generacion of ["daily", "weekly", "monthly", "pre-migration"] as Generacion[]) {
      salida[generacion] = (await listarEjecuciones(cliente, cfg.destino.bucket, generacion)).map(
        (e) => ({ sello: e.sello, objetos: e.claves.length }),
      );
    }
    console.log(JSON.stringify({ ok: true, unidad: "FU-14", paso: "1-ELEGIR", generaciones: salida }, null, 2));
    return;
  }

  // Paso 0: PREPARAR. Dos frenos, no uno.
  if (!args.staging) {
    throw new Error(
      "Falta --staging. El paso 0 de §9.3 dice «confirmar que se restaura contra STAGING, " +
        "nunca contra producción»: esa confirmación se escribe, no se supone.",
    );
  }
  if (cfg.databaseUrl === (process.env.DATABASE_URL ?? "").trim()) {
    throw new Error(
      "RESTORE_DATABASE_URL apunta a la MISMA base que DATABASE_URL. Restaurar encima de la " +
        "base en uso destruye justo lo que se está intentando salvar.",
    );
  }

  const iniciadoEn = Date.now();
  const ejecuciones = await listarEjecuciones(cliente, cfg.destino.bucket, args.generacion);
  if (ejecuciones.length === 0) {
    throw new Error(`No hay ninguna copia de la generación \`${args.generacion}\` en el destino.`);
  }

  // Paso 2: ELEGIR UNA ANTIGUA. Sin `--indice`, la MÁS ANTIGUA de la
  // generación pedida, no la última: R-37 dice que restaurar solo la última
  // deja sin verificar justo lo que se guarda por si acaso.
  const indice = args.indice ?? ejecuciones.length - 1;
  const elegida = ejecuciones[indice];
  if (!elegida) throw new Error(`No existe la copia con índice ${indice} en \`${args.generacion}\`.`);

  const trabajo = await mkdtemp(path.join(tmpdir(), "slg-restore-"));
  const informe: Record<string, unknown> = {
    ok: false,
    unidad: "FU-14",
    generacion: args.generacion,
    indice,
    sello: elegida.sello,
    esLaUltima: indice === 0,
  };

  try {
    const claveDb = elegida.claves.find((c) => c.startsWith("db/") && c.endsWith(".sql.gz.enc"));
    const claveFiles = elegida.claves.find((c) => c.startsWith("files/"));
    const claveManifiesto = elegida.claves.find((c) => c.endsWith(".manifiesto.json.gz.enc"));
    if (!claveDb) throw new Error(`La copia ${elegida.sello} no tiene volcado de base de datos.`);

    // Pasos 3 y 4.
    const rutaDb = path.join(trabajo, "db.sql");
    await descargarYDescifrar(cliente, cfg, claveDb, rutaDb);

    let manifiesto: { recuentosPorTabla?: Record<string, number>; clavesDeObjeto?: string[] } = {};
    if (claveManifiesto) {
      const rutaManifiesto = path.join(trabajo, "manifiesto.json");
      await descargarYDescifrar(cliente, cfg, claveManifiesto, rutaManifiesto);
      manifiesto = JSON.parse(await readFile(rutaManifiesto, "utf8"));
    }

    // Paso 5: base de datos.
    await limpiarEsquema(cfg.databaseUrl);
    await ejecutar(
      cfg.psql,
      [cfg.databaseUrl, "-v", "ON_ERROR_STOP=1", "-f", "-"],
      createReadStream(rutaDb),
    );

    // Paso 5: archivos.
    let volumenes: { subidas: number; claves: string[]; sinPapel: string[] } = {
      subidas: 0,
      claves: [],
      sinPapel: [],
    };
    if (claveFiles) {
      const rutaTar = path.join(trabajo, "files.tar");
      await descargarYDescifrar(cliente, cfg, claveFiles, rutaTar);
      const extraidos = path.join(trabajo, "extraidos");
      const { mkdir } = await import("node:fs/promises");
      await mkdir(extraidos, { recursive: true });
      await ejecutar(["tar"], ["-xf", rutaTar, "-C", extraidos]);
      volumenes = await restaurarVolumenes(cfg, extraidos);
    }

    // Paso 6: VERIFICAR (la parte que sí es mecánica).
    const restaurados = await recuentosPorTabla(cfg.databaseUrl);
    const esperados = manifiesto.recuentosPorTabla ?? {};
    const discrepancias = Object.entries(esperados)
      .filter(([tabla, n]) => restaurados[tabla] !== n)
      .map(([tabla, n]) => ({ tabla, enLaCopia: n, restaurado: restaurados[tabla] ?? null }));

    const objetosEsperados = manifiesto.clavesDeObjeto ?? [];
    const objetosFaltantes = objetosEsperados.filter((c) => !volumenes.claves.includes(c));

    informe.recuentosComparados = Object.keys(esperados).length;
    informe.discrepanciasDeRecuento = discrepancias;
    informe.objetosRestaurados = volumenes.subidas;
    informe.objetosSinPapelReconocido = volumenes.sinPapel;
    informe.objetosFaltantes = objetosFaltantes;
    informe.pendienteDeVerificarAMano = [
      "inicio de sesión con los tres métodos (§9.3 paso 6, integridad funcional)",
      "batería de aislamiento de FU-13 sobre los datos restaurados",
      "abrir un PDF de `downloads` por URL firmada y un entregable en el visor aislado",
      "paso 8: devolver staging a su estado normal",
    ];
    informe.ok = discrepancias.length === 0 && objetosFaltantes.length === 0;
  } finally {
    await rm(trabajo, { recursive: true, force: true });
    informe.duracionMs = Date.now() - iniciadoEn;
    // Paso 7: REGISTRAR. Esta línea ES la evidencia del DoD #8.
    console.log(JSON.stringify(informe, null, 2));
  }

  process.exit(informe.ok ? 0 : 1);
}

main().catch((error) => {
  console.error("Error en restore-backup.ts:", error instanceof Error ? error.message : error);
  process.exit(1);
});
