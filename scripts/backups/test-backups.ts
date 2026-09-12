/**
 * test-backups.ts — Pruebas de FU-14, contra piezas REALES.
 *
 * El destino es un MinIO local, no un mock: MinIO y R2 hablan la misma API S3,
 * que es justamente lo que el diseño exige (D-20, D-21), y FU-09 ya sentó el
 * precedente de probar así. Un mock de S3 solo demostraría que el mock hace lo
 * que le he dicho que haga.
 *
 * La base de datos es el PostgreSQL 16 real del proyecto: el volcado lo hace
 * `pg_dump` de verdad y la restauración la carga `psql` de verdad, en una base
 * aparte que esta suite crea y destruye.
 *
 *  A. Cifrado: lo depositado NO es texto claro; el objeto empieza por la marca
 *     del formato y no por `--` de un volcado SQL (criterio 3).
 *  B. Ida y vuelta del cifrado: descifrar devuelve byte a byte lo cifrado.
 *  C. Un objeto MANIPULADO no se descifra: GCM lo detecta. Un backup corrupto
 *     que se abre "bien" es peor que uno que no se abre.
 *  D. Una clave EQUIVOCADA no descifra.
 *  E. Mitigación 2 de R-37: `leerConfigDeCopia()` LANZA si la credencial de
 *     purga está en el entorno (criterio 4).
 *  F. Mitigación 2, segunda mitad: `leerConfigDePurga()` lanza si el token de
 *     purga es el mismo que el de escritura.
 *  G. Generaciones: tres el día 1 en domingo, dos el domingo normal, una el
 *     resto (criterio 5) — y ninguna copia pisa a otra: 30 días seguidos
 *     producen 30 claves distintas.
 *  H. Retención por generaciones: la purga conserva N EJECUCIONES por
 *     generación y borra el resto; nunca toca una clave que no reconoce.
 *  I. Copia completa de punta a punta contra MinIO real: se ejecuta
 *     `run-backup.ts` como proceso, y el destino acaba con volcado, volúmenes
 *     y manifiesto (criterios 1 y 2).
 *  J. Restauración desde una copia ANTIGUA, no la última (criterio 6,
 *     mitigación 4 de R-37): se fabrican dos generaciones, se restaura la
 *     vieja y se comprueba que los datos que vuelven son los de ESA copia y
 *     no los de la reciente. Es la prueba que el diseño llama "lo que de
 *     verdad se mide".
 *  K. El puerto de §8.3 no puede borrar: no expone la operación (criterio 4,
 *     mitigación 1) — lo verifica además `check-backup-encapsulado.ts`.
 *
 * NO cubre, y se declara: R2 real (hace falta el token que Ricardo custodia),
 * la ejecución del cron dentro de Easypanel, y las comprobaciones funcionales
 * del paso 6 de §9.3 (tres métodos de inicio de sesión, visor aislado), que
 * son suites propias sobre el staging restaurado.
 */
import { spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable, Writable } from "node:stream";

import {
  CreateBucketCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import postgres from "postgres";

import {
  MAGIC,
  analizarClave,
  cifrarFlujo,
  claveDeCopia,
  descifrarArchivo,
  nuevaEjecucion,
  generacionesDeFecha,
  seleccionarParaPurga,
} from "../../lib/backups/index.ts";

let fallos = 0;
function ok(nombre: string, condicion: boolean, detalle = "") {
  if (condicion) console.log(`  ✓ ${nombre}`);
  else {
    fallos++;
    console.error(`  ✗ ${nombre}${detalle ? ` — ${detalle}` : ""}`);
  }
}

const RAIZ = path.resolve(import.meta.dirname, "../..");

/** Lanza un script del proyecto con un entorno controlado y espera su fin. */
function ejecutarScript(
  script: string,
  args: string[],
  entorno: Record<string, string>,
): Promise<{ codigo: number; salida: string; errores: string }> {
  return new Promise((resolver) => {
    const hijo = spawn(process.execPath, [path.join(RAIZ, script), ...args], {
      cwd: RAIZ,
      // Entorno EXPLÍCITO, nunca `...process.env`: media suite comprueba qué
      // pasa cuando una variable está o no está, y heredar el entorno de quien
      // ejecuta las pruebas convertiría eso en una lotería.
      env: { PATH: process.env.PATH ?? "", ...entorno },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let salida = "";
    let errores = "";
    hijo.stdout.on("data", (c) => (salida += String(c)));
    hijo.stderr.on("data", (c) => (errores += String(c)));
    hijo.once("close", (codigo) => resolver({ codigo: codigo ?? -1, salida, errores }));
  });
}

function bufferWritable(): { flujo: Writable; leer: () => Buffer } {
  const trozos: Buffer[] = [];
  const flujo = new Writable({
    write(trozo, _cod, cb) {
      trozos.push(Buffer.from(trozo));
      cb();
    },
  });
  return { flujo, leer: () => Buffer.concat(trozos) };
}

async function main() {
  console.log("FU-14 — copias cifradas a destino externo y restauración probada\n");

  const trabajo = await mkdtemp(path.join(tmpdir(), "slg-test-backups-"));
  const claveDePrueba = randomBytes(32).toString("hex"); // NUNCA la real (D-66).

  // ── A-D. Cifrado ────────────────────────────────────────────────────────
  console.log("A-D. Cifrado en el VPS antes de subir (criterio 3)");

  const claro = Buffer.from("-- volcado de PostgreSQL\nCREATE TABLE demo (id int);\n".repeat(200));
  const cifrado = path.join(trabajo, "prueba.enc");
  await cifrarFlujo(Readable.from([claro]), cifrado, claveDePrueba);

  const bytesCifrados = readFileSync(cifrado);
  ok(
    "el objeto cifrado NO contiene el texto claro del volcado",
    !bytesCifrados.includes(Buffer.from("CREATE TABLE demo")),
  );
  ok(
    "el objeto empieza por la marca del formato, no por SQL",
    bytesCifrados.subarray(0, MAGIC.byteLength).equals(MAGIC),
  );

  const vuelta = bufferWritable();
  await descifrarArchivo(cifrado, vuelta.flujo, claveDePrueba);
  ok("descifrar devuelve exactamente lo cifrado", vuelta.leer().equals(claro));

  const manipulado = path.join(trabajo, "manipulado.enc");
  const copia = Buffer.from(bytesCifrados);
  copia[copia.length - 40] ^= 0xff; // un bit en el cuerpo, no en la etiqueta
  writeFileSync(manipulado, copia);
  let detectado = false;
  try {
    await descifrarArchivo(manipulado, bufferWritable().flujo, claveDePrueba);
  } catch {
    detectado = true;
  }
  ok("un objeto manipulado NO se descifra: AES-GCM lo detecta", detectado);

  let claveMalaRechazada = false;
  try {
    await descifrarArchivo(cifrado, bufferWritable().flujo, randomBytes(32).toString("hex"));
  } catch {
    claveMalaRechazada = true;
  }
  ok("con la clave equivocada no se descifra", claveMalaRechazada);

  // ── E-F. Mitigación 2 de R-37 ───────────────────────────────────────────
  console.log("\nE-F. La credencial de purga no entra en el proceso de copia (criterio 4)");

  const entornoBase: Record<string, string> = {
    R2_ENDPOINT: process.env.FILES_S3_ENDPOINT ?? "http://127.0.0.1:9500",
    R2_REGION: process.env.FILES_S3_REGION ?? "us-east-1",
    R2_BUCKET: `slg-test-backups-${randomUUID().slice(0, 8)}`,
    R2_ACCESS_KEY_ID_WRITE: process.env.FILES_S3_ACCESS_KEY_ID ?? "",
    R2_SECRET_ACCESS_KEY_WRITE: process.env.FILES_S3_SECRET_ACCESS_KEY ?? "",
    R2_ACCESS_KEY_ID_RESTORE: process.env.FILES_S3_ACCESS_KEY_ID ?? "",
    R2_SECRET_ACCESS_KEY_RESTORE: process.env.FILES_S3_SECRET_ACCESS_KEY ?? "",
    BACKUP_ENCRYPTION_KEY: claveDePrueba,
    FILES_S3_ENDPOINT: process.env.FILES_S3_ENDPOINT ?? "",
    FILES_S3_REGION: process.env.FILES_S3_REGION ?? "",
    FILES_S3_ACCESS_KEY_ID: process.env.FILES_S3_ACCESS_KEY_ID ?? "",
    FILES_S3_SECRET_ACCESS_KEY: process.env.FILES_S3_SECRET_ACCESS_KEY ?? "",
    FILES_BUCKET_DOWNLOADS: process.env.FILES_BUCKET_DOWNLOADS ?? "",
    FILES_BUCKET_DELIVERABLES: process.env.FILES_BUCKET_DELIVERABLES ?? "",
  };

  // La comprobación se hace sobre el PROCESO real, no llamando a la función
  // en este mismo intérprete: es el arranque del servicio lo que tiene que
  // romperse si alguien monta las dos credenciales juntas.
  const conPurga = await ejecutarScript("scripts/backups/run-backup.ts", [], {
    ...entornoBase,
    BACKUP_DATABASE_URL: "postgresql://no/importa",
    R2_ACCESS_KEY_ID_PRUNE: "el-token-de-purga",
    R2_SECRET_ACCESS_KEY_PRUNE: "el-secreto-de-purga",
  });
  ok(
    "el proceso de copia NO arranca si ve la credencial de purga",
    conPurga.codigo !== 0 && /mitigación 2 de R-37/.test(conPurga.errores + conPurga.salida),
    `código ${conPurga.codigo}`,
  );

  const purgaConTokenRepetido = await ejecutarScript("scripts/backups/prune-backups.ts", ["--dry-run"], {
    ...entornoBase,
    R2_ACCESS_KEY_ID_PRUNE: entornoBase.R2_ACCESS_KEY_ID_WRITE,
    R2_SECRET_ACCESS_KEY_PRUNE: entornoBase.R2_SECRET_ACCESS_KEY_WRITE,
    BACKUP_RETENTION_DAILY: "14",
    BACKUP_RETENTION_WEEKLY: "8",
    BACKUP_RETENTION_MONTHLY: "12",
    BACKUP_RETENTION_PRE_MIGRATION: "30",
  });
  ok(
    "la purga NO arranca si su token es el mismo que el de escritura",
    purgaConTokenRepetido.codigo !== 0 &&
      /mismo token/.test(purgaConTokenRepetido.salida + purgaConTokenRepetido.errores),
  );

  // ── G. Generaciones: ninguna copia pisa a otra ──────────────────────────
  console.log("\nG. Retención por generaciones, no un destino sobrescrito (criterio 5)");

  ok(
    "el día 1 en domingo produce las tres generaciones",
    generacionesDeFecha(new Date("2026-11-01T02:15:00Z")).join(",") === "daily,weekly,monthly",
    generacionesDeFecha(new Date("2026-11-01T02:15:00Z")).join(","),
  );
  ok(
    "un domingo normal produce diaria y semanal",
    generacionesDeFecha(new Date("2026-09-13T02:15:00Z")).join(",") === "daily,weekly",
  );
  ok(
    "un día cualquiera produce solo la diaria",
    generacionesDeFecha(new Date("2026-09-10T02:15:00Z")).join(",") === "daily",
  );

  const claves30 = new Set<string>();
  for (let d = 0; d < 30; d++) {
    const fecha = new Date(Date.UTC(2026, 8, 1, 2, 15, 0) + d * 86400000);
    for (const generacion of generacionesDeFecha(fecha)) {
      claves30.add(
        claveDeCopia({
          tipo: "db",
          generacion,
          fecha,
          ejecucion: nuevaEjecucion(),
          extension: "sql.gz.enc",
        }),
      );
    }
  }
  ok(
    "30 días seguidos producen 30 claves diarias distintas: ninguna copia pisa a otra",
    [...claves30].filter((c) => c.startsWith("db/daily/")).length === 30,
  );
  ok(
    "una clave se puede volver a analizar hasta la fecha exacta",
    analizarClave("db/weekly/20260913T021500Z-7f3a2b.sql.gz.enc")?.fecha.toISOString() ===
      "2026-09-13T02:15:00.000Z" &&
      analizarClave("db/weekly/20260913T021500Z-7f3a2b.sql.gz.enc")?.ejecucion === "7f3a2b",
  );

  // ── H. Qué borra la purga ───────────────────────────────────────────────
  console.log("\nH. La purga conserva ejecuciones, no objetos");

  const inventario: string[] = [];
  for (let d = 0; d < 20; d++) {
    const fecha = new Date(Date.UTC(2026, 8, 1, 2, 15, 0) + d * 86400000);
    const ejecucion = nuevaEjecucion();
    for (const extension of ["sql.gz.enc", "manifiesto.json.gz.enc"]) {
      inventario.push(claveDeCopia({ tipo: "db", generacion: "daily", fecha, ejecucion, extension }));
    }
    inventario.push(
      claveDeCopia({ tipo: "files", generacion: "daily", fecha, ejecucion, extension: "tar.gz.enc" }),
    );
  }
  inventario.push("un-objeto-que-nadie-reconoce.txt");

  const retencion = { daily: 5, weekly: 8, monthly: 12, "pre-migration": 30 };
  const seleccion = seleccionarParaPurga(inventario, retencion);
  ok(
    "conserva las 5 ejecuciones más recientes ENTERAS (3 objetos cada una)",
    seleccion.aConservar.length === 15,
    `conservadas: ${seleccion.aConservar.length}`,
  );
  ok("borra las 15 ejecuciones restantes (45 objetos)", seleccion.aBorrar.length === 45);
  ok(
    "NUNCA borra una clave que no reconoce",
    seleccion.ignoradas.length === 1 && !seleccion.aBorrar.includes("un-objeto-que-nadie-reconoce.txt"),
  );
  ok(
    "la ejecución más reciente está entre las conservadas",
    seleccion.aConservar.some((c) => c.includes("20260920T021500Z")),
  );

  // ── I-J. Punta a punta contra MinIO y PostgreSQL reales ─────────────────
  console.log("\nI-J. Copia y restauración de verdad (criterios 1, 2 y 6)");

  const urlBase = process.env.DATABASE_URL_MIGRATIONS;
  const pgDump = process.env.BACKUP_PG_DUMP_BIN;
  const psql = process.env.BACKUP_PSQL_BIN;
  if (!urlBase || !pgDump || !psql) {
    console.log(
      "  ⚠ Se omiten I-J: faltan DATABASE_URL_MIGRATIONS, BACKUP_PG_DUMP_BIN o BACKUP_PSQL_BIN.\n" +
        "    NO cuentan como verdes — la suite termina en rojo para que no pase por buena.",
    );
    fallos++;
  } else {
    const sufijo = randomUUID().replace(/-/g, "").slice(0, 10);
    const baseOrigen = `slg_fu14_origen_${sufijo}`;
    const baseDestino = `slg_fu14_restaurada_${sufijo}`;
    const bucketDestino = entornoBase.R2_BUCKET;
    // Dos cubos distintos a propósito: `downloads` y `deliverables` son dos
    // papeles, y la prueba de que el paquete guarda el PAPEL y no el nombre
    // del cubo solo vale si los nombres no coinciden.
    const bucketDescargas = `slg-fu14-descargas-${sufijo}`;
    const bucketEntregables = `slg-fu14-entregables-${sufijo}`;

    const admin = postgres(urlBase, { max: 1, onnotice: () => {} });
    const urlDe = (base: string) => urlBase.replace(/\/[^/]+$/, `/${base}`);

    const cliente = new S3Client({
      endpoint: entornoBase.FILES_S3_ENDPOINT,
      region: entornoBase.FILES_S3_REGION,
      forcePathStyle: true,
      credentials: {
        accessKeyId: entornoBase.FILES_S3_ACCESS_KEY_ID,
        secretAccessKey: entornoBase.FILES_S3_SECRET_ACCESS_KEY,
      },
    });

    try {
      await admin.unsafe(`DROP DATABASE IF EXISTS "${baseOrigen}"`);
      await admin.unsafe(`DROP DATABASE IF EXISTS "${baseDestino}"`);
      await admin.unsafe(`CREATE DATABASE "${baseOrigen}"`);
      await admin.unsafe(`CREATE DATABASE "${baseDestino}"`);

      for (const bucket of [bucketDestino, bucketDescargas, bucketEntregables]) {
        try {
          await cliente.send(new CreateBucketCommand({ Bucket: bucket }));
        } catch (e) {
          if (!(e instanceof Error) || !e.name.includes("BucketAlreadyOwnedByYou")) throw e;
        }
      }

      const entornoCopia = {
        ...entornoBase,
        R2_BUCKET: bucketDestino,
        BACKUP_DATABASE_URL: urlDe(baseOrigen),
        BACKUP_PG_DUMP_BIN: pgDump,
        BACKUP_PSQL_BIN: psql,
        FILES_BUCKET_DOWNLOADS: bucketDescargas,
        FILES_BUCKET_DELIVERABLES: bucketEntregables,
      };

      // ── Copia ANTIGUA: dos filas y un objeto. ──────────────────────────
      const origen = postgres(urlDe(baseOrigen), { max: 1, onnotice: () => {} });
      await origen.unsafe(`
        CREATE TABLE cliente (id serial PRIMARY KEY, nombre text NOT NULL);
        INSERT INTO cliente (nombre) VALUES ('empresa antigua A'), ('empresa antigua B');
      `);
      await origen.end({ timeout: 5 });

      const { PutObjectCommand } = await import("@aws-sdk/client-s3");
      await cliente.send(
        new PutObjectCommand({
          Bucket: bucketEntregables,
          Key: "org-1/entregable-antiguo.html",
          Body: "<html>el de la copia antigua</html>",
        }),
      );

      const copiaAntigua = await ejecutarScript("scripts/backups/run-backup.ts", [], entornoCopia);
      const registroAntiguo = JSON.parse(copiaAntigua.salida.trim().split("\n").pop() ?? "{}");
      ok(
        "la copia se ejecuta sin intervención y registra su resultado (criterio 1)",
        copiaAntigua.codigo === 0 && registroAntiguo.ok === true,
        `código ${copiaAntigua.codigo}: ${copiaAntigua.errores.slice(0, 300)}`,
      );
      ok(
        "deposita volcado, volúmenes y manifiesto",
        ["db/", "files/"].every((p) =>
          (registroAntiguo.depositos ?? []).some((d: { clave: string }) => d.clave.startsWith(p)),
        ) &&
          (registroAntiguo.depositos ?? []).some((d: { clave: string }) =>
            d.clave.endsWith("manifiesto.json.gz.enc"),
          ),
      );

      const { CopyObjectCommand } = await import("@aws-sdk/client-s3");
      const clavesSemanales: string[] = [];
      /**
       * Fabrica a mano una generación `weekly` a partir de una ejecución
       * diaria ya depositada: sin esto habría que esperar a un domingo para
       * poder probar el paso 2 de §9.3. Se hará con las DOS ejecuciones, para
       * que la más antigua no sea también la última.
       */
      async function promoverASemanal(depositos: { clave: string }[]) {
        for (const deposito of depositos) {
          const semanal = deposito.clave.replace("/daily/", "/weekly/");
          await cliente.send(
            new CopyObjectCommand({
              Bucket: bucketDestino,
              CopySource: `/${bucketDestino}/${deposito.clave}`,
              Key: semanal,
            }),
          );
          clavesSemanales.push(semanal);
        }
      }
      await promoverASemanal(registroAntiguo.depositos as { clave: string }[]);

      // ── Copia RECIENTE: datos distintos. Si la restauración cogiera la
      //    última en vez de la antigua, estas filas aparecerían.
      const origen2 = postgres(urlDe(baseOrigen), { max: 1, onnotice: () => {} });
      await origen2.unsafe(`INSERT INTO cliente (nombre) VALUES ('empresa RECIENTE C');`);
      await origen2.end({ timeout: 5 });
      await cliente.send(
        new PutObjectCommand({
          Bucket: bucketEntregables,
          Key: "org-1/entregable-reciente.html",
          Body: "<html>el de la copia reciente</html>",
        }),
      );
      const copiaReciente = await ejecutarScript("scripts/backups/run-backup.ts", [], entornoCopia);
      ok("la segunda copia diaria tampoco pisa a la primera", copiaReciente.codigo === 0);
      const registroReciente = JSON.parse(copiaReciente.salida.trim().split("\n").pop() ?? "{}");
      await promoverASemanal(registroReciente.depositos as { clave: string }[]);

      const listado = await cliente.send(new ListObjectsV2Command({ Bucket: bucketDestino }));
      const clavesEnDestino = (listado.Contents ?? []).map((o) => o.Key!);
      ok(
        "el destino conserva las dos ejecuciones diarias, no una sobrescrita",
        new Set(clavesEnDestino.filter((c) => c.startsWith("db/daily/"))).size >= 4,
        `claves db/daily: ${clavesEnDestino.filter((c) => c.startsWith("db/daily/")).length}`,
      );

      // ── Restauración DESDE LA COPIA ANTIGUA (mitigación 4 de R-37) ─────
      const bucketRestaurado = `slg-fu14-restaurados-${sufijo}`;
      await cliente.send(new CreateBucketCommand({ Bucket: bucketRestaurado }));
      await cliente.send(new CreateBucketCommand({ Bucket: `${bucketRestaurado}-descargas` }));

      const restauracion = await ejecutarScript(
        "scripts/backups/restore-backup.ts",
        ["--staging", "--generacion", "weekly"],
        {
          ...entornoCopia,
          RESTORE_DATABASE_URL: urlDe(baseDestino),
          // Cubos de STAGING, distintos de los de origen: si el paquete
          // llevara el nombre del cubo de origen en vez del papel, los objetos
          // acabarían de vuelta en los de producción y esta comprobación lo
          // destaparía.
          FILES_BUCKET_DOWNLOADS: `${bucketRestaurado}-descargas`,
          FILES_BUCKET_DELIVERABLES: bucketRestaurado,
        },
      );
      const informe = JSON.parse(
        restauracion.salida.slice(restauracion.salida.indexOf("{")) || "{}",
      );
      ok(
        "la restauración se ejecuta y verifica los recuentos contra el manifiesto (criterio 6)",
        restauracion.codigo === 0 && informe.ok === true,
        `código ${restauracion.codigo}: ${restauracion.errores.slice(0, 400)}`,
      );
      ok(
        "restaura desde una copia ANTIGUA, no desde la última (mitigación 4 de R-37)",
        informe.esLaUltima === false && informe.generacion === "weekly",
        `esLaUltima=${informe.esLaUltima}, generación=${informe.generacion}`,
      );

      const restaurada = postgres(urlDe(baseDestino), { max: 1, onnotice: () => {} });
      const filas = await restaurada.unsafe<{ nombre: string }[]>(
        "SELECT nombre FROM cliente ORDER BY id",
      );
      await restaurada.end({ timeout: 5 });
      ok(
        "los datos que vuelven son los de la copia ANTIGUA, íntegros",
        filas.length === 2 && filas.every((f) => f.nombre.includes("antigua")),
        `filas: ${filas.map((f) => f.nombre).join(", ")}`,
      );
      ok(
        "y NO trae los datos de la copia reciente: se restauró la vieja de verdad",
        !filas.some((f) => f.nombre.includes("RECIENTE")),
      );

      const objetosRestaurados = await cliente.send(
        new ListObjectsV2Command({ Bucket: bucketRestaurado }),
      );
      const clavesRestauradas = (objetosRestaurados.Contents ?? []).map((o) => o.Key!);
      ok(
        "los archivos vuelven con su clave EXACTA (deliverable.file_key sigue valiendo)",
        clavesRestauradas.includes("org-1/entregable-antiguo.html"),
        `claves: ${clavesRestauradas.join(", ")}`,
      );
      ok(
        "y el entregable de la copia reciente no está: de nuevo, se restauró la antigua",
        !clavesRestauradas.includes("org-1/entregable-reciente.html"),
      );

      // ── Purga sobre el destino real ────────────────────────────────────
      const purga = await ejecutarScript("scripts/backups/prune-backups.ts", [], {
        R2_ENDPOINT: entornoBase.R2_ENDPOINT,
        R2_REGION: entornoBase.R2_REGION,
        R2_BUCKET: bucketDestino,
        R2_ACCESS_KEY_ID_PRUNE: entornoBase.R2_ACCESS_KEY_ID_WRITE,
        R2_SECRET_ACCESS_KEY_PRUNE: entornoBase.R2_SECRET_ACCESS_KEY_WRITE,
        // Token distinto declarado: aquí el MinIO local solo tiene una
        // credencial (D-51), así que se omite `_WRITE` del entorno para que
        // la comprobación de "dos tokens distintos" no salte. En producción
        // son dos servicios y el problema no existe.
        BACKUP_RETENTION_DAILY: "1",
        BACKUP_RETENTION_WEEKLY: "8",
        BACKUP_RETENTION_MONTHLY: "12",
        BACKUP_RETENTION_PRE_MIGRATION: "30",
      });
      const informePurga = JSON.parse(purga.salida.trim().split("\n").pop() ?? "{}");
      ok(
        "la purga borra las diarias sobrantes y conserva la semanal (retención por generación)",
        purga.codigo === 0 && informePurga.borradas > 0,
        `código ${purga.codigo}: ${purga.salida.slice(0, 300)}`,
      );

      const tras = await cliente.send(new ListObjectsV2Command({ Bucket: bucketDestino }));
      const quedan = (tras.Contents ?? []).map((o) => o.Key!);
      ok(
        "la copia semanal sigue ahí tras la purga: la retención es por generación",
        clavesSemanales.every((c) => quedan.includes(c)),
      );
    } finally {
      const limpiar = postgres(urlBase, { max: 1, onnotice: () => {} });
      await limpiar.unsafe(`DROP DATABASE IF EXISTS "${baseOrigen}" WITH (FORCE)`).catch(() => {});
      await limpiar.unsafe(`DROP DATABASE IF EXISTS "${baseDestino}" WITH (FORCE)`).catch(() => {});
      await limpiar.end({ timeout: 5 });
      await admin.end({ timeout: 5 }).catch(() => {});
    }
  }

  // ── K. El puerto no puede borrar ────────────────────────────────────────
  console.log("\nK. El puerto de §8.3 solo deposita (criterio 4, mitigación 1)");
  const puerto = await import("../../lib/backups/destination.ts");
  ok(
    "el puerto exporta `depositar` y nada de leer, listar o borrar",
    typeof puerto.depositar === "function" &&
      !Object.keys(puerto).some((k) => /leer|listar|borrar|purgar|eliminar/i.test(k)),
    `exporta: ${Object.keys(puerto).join(", ")}`,
  );

  await rm(trabajo, { recursive: true, force: true });
  console.log(fallos ? `\n✗ ${fallos} comprobación(es) fallida(s).\n` : "\n✓ Todo correcto.\n");
  process.exit(fallos ? 1 : 0);
}

main().catch((error) => {
  console.error("Error inesperado en test-backups.ts:", error);
  process.exit(1);
});
