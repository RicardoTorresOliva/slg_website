/**
 * test-respaldos.ts — **La copia, el cifrado, la purga y la RESTAURACIÓN**
 * (FU-14 · RF-124 · RF-125 · R-12 · R-37 · DoD #8).
 *
 * LO QUE ESTA PRUEBA HACE Y NINGUNA REVISIÓN PUEDE HACER: **restaura de verdad**,
 * desde una copia **antigua**, en una base de datos **distinta**, y comprueba que
 * los datos que había entonces están y los de después no. Un backup que no se ha
 * restaurado no es un backup: es un archivo grande del que nadie sabe nada.
 *
 * Y comprueba las dos mitades de la mitigación de R-37, que es lo que sustituye
 * al Object Lock que R2 no ofrece:
 *
 *   · la credencial que **copia** no puede borrar —el doble de almacenamiento
 *     responde 403 si lo intenta—;
 *   · la que **purga** sí, y corre en otro proceso.
 *
 * Necesita `bash scripts/db/local-pg.sh up` y `pg_dump`/`pg_restore` en el PATH.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";

import postgres from "postgres";

import { cifrar, descifrar, generarParDeClaves } from "../../lib/backup/cifrado.ts";
import { claveDe, clavesCaducadas, generacionesDe } from "../../lib/backup/generaciones.ts";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");

let fallos = 0;
let comprobaciones = 0;

function check(caso: string, ok: boolean, detalle = "") {
  comprobaciones++;
  if (ok) console.log(`  ✓ ${caso}`);
  else {
    fallos++;
    console.error(`  ✗ ${caso}${detalle ? `\n      ${detalle}` : ""}`);
  }
}

const URL_DUENO = process.env.DATABASE_URL_MIGRATIONS;
if (!URL_DUENO) throw new Error("Falta DATABASE_URL_MIGRATIONS.");
const dueno = postgres(URL_DUENO, { max: 2 });

/** Valores falsos, en constantes de nombre neutro: `check:secrets` tiene razón. */
const ACCESO_DE_COPIA = "acceso-de-copia-para-esta-prueba";
const SECRETO_DE_COPIA = "solo-para-esta-prueba-copia-00000";
const ACCESO_DE_PURGA = "acceso-de-purga-para-esta-prueba";
const SECRETO_DE_PURGA = "solo-para-esta-prueba-purga-00000";
const BUCKET = "copias";

/* ── Doble de almacenamiento que distingue credenciales ───────────────────── */

type Almacen = {
  puerto: number;
  objetos: Map<string, Buffer>;
  intentosDeBorrado: { clave: string; credencial: string; permitido: boolean }[];
  parar: () => Promise<void>;
};

async function puertoLibre(): Promise<number> {
  return new Promise((r) => {
    const s = net.createServer();
    s.listen(0, "127.0.0.1", () => {
      const p = (s.address() as net.AddressInfo).port;
      s.close(() => r(p));
    });
  });
}

/**
 * El doble **lee la credencial de la cabecera `Authorization`** y aplica la
 * política que en producción aplica el proveedor: la clave de copia puede
 * `PUT` y `GET` pero **no `DELETE`**. Sin esta distinción, el criterio 4 sería
 * una intención escrita en un comentario.
 */
/** Deshace el marcado `aws-chunked` de una subida en flujo. */
function desmarcar(crudo: Buffer): Buffer {
  const partes: Buffer[] = [];
  let cursor = 0;
  while (cursor < crudo.length) {
    const finDeLinea = crudo.indexOf("\r\n", cursor);
    if (finDeLinea < 0) break;
    const cabecera = crudo.subarray(cursor, finDeLinea).toString("utf8");
    const tamano = parseInt(cabecera.split(";")[0] ?? "", 16);
    if (!Number.isFinite(tamano)) break;
    cursor = finDeLinea + 2;
    if (tamano === 0) break;
    partes.push(crudo.subarray(cursor, cursor + tamano));
    cursor += tamano + 2;
  }
  return Buffer.concat(partes);
}

async function levantarAlmacen(): Promise<Almacen> {
  const puerto = await puertoLibre();
  const objetos = new Map<string, Buffer>();
  const intentosDeBorrado: Almacen["intentosDeBorrado"] = [];

  const servidor = http.createServer((req, res) => {
    const ruta = decodeURIComponent(new URL(req.url ?? "/", `http://127.0.0.1:${puerto}`).pathname)
      .replace(`/${BUCKET}/`, "")
      .replace(/^\//, "");
    const credencial = /Credential=([^/]+)\//.exec(req.headers.authorization ?? "")?.[1] ?? "";

    if (req.method === "PUT") {
      const trozos: Buffer[] = [];
      req.on("data", (t) => trozos.push(t as Buffer));
      req.on("end", () => {
        const crudo = Buffer.concat(trozos);
        /**
         * **`aws-chunked`, y el doble tenía que aprender a leerlo.** Subiendo un
         * flujo, el cliente de S3 envuelve el cuerpo en marcos
         * `<tamaño>;chunk-signature=…` que el proveedor de verdad deshace. El
         * doble no lo hacía, así que guardaba el objeto **con los marcos
         * dentro** y la restauración decía «esto no es un sobre de backup».
         * Parecía un fallo del cifrado y era un fallo del doble: el código de
         * producción estaba bien. Queda escrito para no volver a buscarlo ahí.
         */
        const cuerpo = String(req.headers["content-encoding"] ?? "").includes("aws-chunked")
          ? desmarcar(crudo)
          : crudo;
        if (process.env.DEPURAR_ALMACEN) console.log(`[doble] PUT ${ruta} (${cuerpo.length})`);
        objetos.set(ruta, cuerpo);
        res.writeHead(200).end();
      });
      return;
    }
    req.resume();
    if (req.method === "GET") {
      const objeto = objetos.get(ruta);
      if (process.env.DEPURAR_ALMACEN) console.log(`[doble] GET ${ruta} -> ${objeto ? objeto.length : "404"}`);
      if (!objeto) {
        res.writeHead(404, { "content-type": "application/xml" }).end("<Error><Code>NoSuchKey</Code></Error>");
        return;
      }
      res.writeHead(200, { "content-type": "application/octet-stream" }).end(objeto);
      return;
    }
    if (req.method === "DELETE") {
      const permitido = credencial === ACCESO_DE_PURGA;
      intentosDeBorrado.push({ clave: ruta, credencial, permitido });
      if (!permitido) {
        res.writeHead(403, { "content-type": "application/xml" }).end("<Error><Code>AccessDenied</Code></Error>");
        return;
      }
      objetos.delete(ruta);
      res.writeHead(204).end();
      return;
    }
    res.writeHead(405).end();
  });

  await new Promise<void>((r) => servidor.listen(puerto, "127.0.0.1", r));
  return { puerto, objetos, intentosDeBorrado, parar: () => new Promise<void>((r) => servidor.close(() => r())) };
}

/* ── Ejecutar los scripts como los ejecuta el cron ────────────────────────── */

/**
 * **Asíncrono, y no `spawnSync`.** El doble de almacenamiento vive en ESTE
 * proceso: `spawnSync` bloquea el bucle de eventos, así que el servidor no podía
 * contestar al `PUT` del script y la prueba se quedaba colgada esperándose a sí
 * misma. Costó un rato encontrarlo y por eso queda escrito.
 */
function correr(
  script: string,
  args: string[],
  env: Record<string, string>,
): Promise<{ status: number; stdout: string; stderr: string }> {
  return new Promise((resolver) => {
    const proceso = spawn(process.execPath, [path.join(REPO_ROOT, "scripts/backup", script), ...args], {
      cwd: REPO_ROOT,
      env: { ...process.env, ...env },
    });
    let stdout = "";
    let stderr = "";
    proceso.stdout.on("data", (t) => (stdout += String(t)));
    proceso.stderr.on("data", (t) => (stderr += String(t)));
    proceso.on("close", (codigo) => resolver({ status: codigo ?? -1, stdout, stderr }));
  });
}

async function main() {
  const claves = generarParDeClaves();
  const almacen = await levantarAlmacen();
  const volumen = fs.mkdtempSync(path.join(os.tmpdir(), "slg-vol-"));
  fs.writeFileSync(path.join(volumen, "entregable.txt"), "contenido de un volumen");

  const entorno = {
    BACKUP_S3_ENDPOINT: `http://127.0.0.1:${almacen.puerto}`,
    BACKUP_S3_REGION: "auto",
    BACKUP_S3_BUCKET: BUCKET,
    BACKUP_S3_ACCESS_KEY_ID: ACCESO_DE_COPIA,
    BACKUP_S3_SECRET_ACCESS_KEY: SECRETO_DE_COPIA,
    BACKUP_PURGE_ACCESS_KEY_ID: ACCESO_DE_PURGA,
    BACKUP_PURGE_SECRET_ACCESS_KEY: SECRETO_DE_PURGA,
    BACKUP_PUBLIC_KEY: claves.publica,
    BACKUP_VOLUME_PATHS: volumen,
    DATABASE_URL_MIGRATIONS: URL_DUENO!,
  };

  try {
    console.log("\nCriterio 3 — el cifrado, y por qué es asimétrico:\n");

    const secreto = Buffer.from("un dump que no puede leerse en el destino");
    const sobre = await cifrar(secreto, claves.publica);
    check("el sobre no contiene el texto en claro", !sobre.includes(secreto));
    check("y se descifra con la privada", descifrar(sobre, claves.privada).equals(secreto));
    const otro = generarParDeClaves();
    let fallaConOtra = false;
    try {
      descifrar(sobre, otro.privada);
    } catch {
      fallaConOtra = true;
    }
    check("con OTRA clave privada no se abre", fallaConOtra);
    const manipulado = Buffer.from(sobre);
    manipulado[manipulado.length - 20] ^= 0xff;
    let detectaManipulacion = false;
    try {
      descifrar(manipulado, claves.privada);
    } catch {
      detectaManipulacion = true;
    }
    check(
      "un byte cambiado hace que el descifrado FALLE, en vez de devolver basura",
      detectaManipulacion,
      "es la mitad del valor de cifrar con autenticación",
    );
    check(
      "cifrar solo necesita la pública: en el VPS no hace falta ninguna clave que descifre",
      typeof claves.publica === "string" && !claves.publica.includes("PRIVATE"),
    );

    console.log("\nCriterio 5 — tres generaciones, y las claves se calculan sin listar:\n");

    check("un martes cualquiera es solo diaria", generacionesDe(new Date("2026-09-08T12:00:00Z")).join(",") === "diaria");
    check("un lunes es diaria y semanal", generacionesDe(new Date("2026-09-07T12:00:00Z")).join(",") === "diaria,semanal");
    check(
      "y el día 1 en lunes es las tres",
      generacionesDe(new Date("2026-06-01T12:00:00Z")).join(",") === "diaria,semanal,mensual",
    );
    check(
      "las claves caducadas se calculan, no se buscan",
      clavesCaducadas("diaria", new Date("2026-09-13T12:00:00Z")).includes(
        claveDe("diaria", "2026-08-29", "base-de-datos"),
      ),
    );

    console.log("\nCriterios 1 y 6 — se copia, y se RESTAURA desde una copia antigua:\n");

    // Estado A: la marca que tiene que volver.
    await dueno`delete from organization where slug in ('marca-antigua','marca-nueva')`;
    await dueno`insert into organization (id, name, slug, type, status)
                values ('org-bk-old', 'Antes del backup', 'marca-antigua', 'client', 'active')`;

    const antigua = await correr("respaldar.ts", [], { ...entorno, BACKUP_DATE_OVERRIDE: "2026-08-01" });
    check("la copia antigua se ejecuta sin error", antigua.status === 0, antigua.stderr || antigua.stdout);
    check(
      "y sube las dos piezas: base y volúmenes",
      almacen.objetos.has(claveDe("mensual", "2026-08-01", "base-de-datos")) &&
        almacen.objetos.has(claveDe("mensual", "2026-08-01", "volumenes")),
      [...almacen.objetos.keys()].join(" "),
    );
    check(
      "el objeto subido está cifrado: no contiene el nombre de la tabla en claro",
      !almacen.objetos.get(claveDe("mensual", "2026-08-01", "base-de-datos"))!.includes(Buffer.from("organization")),
    );

    // Estado B: cambia el mundo. Si la restauración trae esto, no restauró la antigua.
    await dueno`delete from organization where slug = 'marca-antigua'`;
    await dueno`insert into organization (id, name, slug, type, status)
                values ('org-bk-new', 'Después del backup', 'marca-nueva', 'client', 'active')`;
    const reciente = await correr("respaldar.ts", [], { ...entorno, BACKUP_DATE_OVERRIDE: "2026-09-12" });
    check("la copia reciente también", reciente.status === 0, reciente.stderr || reciente.stdout);

    // Restaurar la ANTIGUA en otra base.
    await dueno.unsafe("drop database if exists slg_restaurada").catch(() => {});
    await dueno.unsafe("create database slg_restaurada");
    const destino = URL_DUENO!.replace(/\/[^/]+$/, "/slg_restaurada");
    const restauracion = await correr("restaurar.ts", ["--fecha", "2026-08-01", "--generacion", "mensual", "--destino", destino], {
      ...entorno,
      BACKUP_PRIVATE_KEY: claves.privada,
    });
    check("la restauración se ejecuta sin error", restauracion.status === 0, restauracion.stderr || restauracion.stdout);

    const restaurada = postgres(destino, { max: 1 });
    try {
      const filas = (await restaurada`select slug from organization where slug like 'marca-%'`) as unknown as { slug: string }[];
      const slugs = filas.map((f) => f.slug);
      check("vuelve lo que había en la copia ANTIGUA", slugs.includes("marca-antigua"), slugs.join(","));
      check(
        "y NO vuelve lo de después: se restauró la antigua, no la última",
        !slugs.includes("marca-nueva"),
        slugs.join(","),
      );
      const tablas = (await restaurada`
        select count(*)::text as n from information_schema.tables where table_schema = 'public'
      `) as unknown as { n: string }[];
      check("la base restaurada tiene el esquema entero, no media tabla", Number(tablas[0]!.n) >= 18, tablas[0]?.n);
    } finally {
      await restaurada.end({ timeout: 5 });
    }

    const volumenRestaurado = path.join(REPO_ROOT, "volumenes-2026-08-01.tgz");
    check("y los volúmenes también vuelven, para desempaquetarlos a mano", fs.existsSync(volumenRestaurado));
    fs.rmSync(volumenRestaurado, { force: true });

    console.log("\nCriterio 4 — quien copia NO puede borrar; quien borra es otro proceso:\n");

    const purga = await correr("purgar.ts", [], {
      ...entorno,
      BACKUP_RETENTION_DAILY: "1",
      BACKUP_RETENTION_WEEKLY: "1",
      BACKUP_RETENTION_MONTHLY: "1",
    });
    check("la purga se ejecuta", purga.status === 0, purga.stderr || purga.stdout);
    check(
      "y borra con la credencial de PURGA, no con la de copia",
      almacen.intentosDeBorrado.length > 0 &&
        almacen.intentosDeBorrado.every((i) => i.credencial === ACCESO_DE_PURGA && i.permitido),
      JSON.stringify(almacen.intentosDeBorrado.slice(0, 2)),
    );

    // Y la prueba negativa de la mitigación: con la credencial de copia, no.
    const { S3Client, DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    const conCredencialDeCopia = new S3Client({
      endpoint: entorno.BACKUP_S3_ENDPOINT,
      region: "auto",
      credentials: { accessKeyId: ACCESO_DE_COPIA, secretAccessKey: SECRETO_DE_COPIA },
      forcePathStyle: true,
    });
    let rechazado = false;
    try {
      await conCredencialDeCopia.send(
        new DeleteObjectCommand({ Bucket: BUCKET, Key: claveDe("mensual", "2026-08-01", "base-de-datos") }),
      );
    } catch {
      rechazado = true;
    }
    check(
      "con la credencial del proceso de copia, BORRAR se rechaza (R-37)",
      rechazado,
      "es lo que sustituye al Object Lock que R2 no ofrece",
    );
    check(
      "y el objeto sigue ahí después del intento",
      almacen.objetos.has(claveDe("mensual", "2026-08-01", "base-de-datos")),
    );

    console.log("\nCriterio 8 — cero valores de credencial en el repositorio:\n");

    const scripts = ["respaldar.ts", "restaurar.ts", "purgar.ts"].map((f) =>
      fs.readFileSync(path.join(REPO_ROOT, "scripts/backup", f), "utf8"),
    );
    const modulos = ["cifrado.ts", "destino.ts", "generaciones.ts"].map((f) =>
      fs.readFileSync(path.join(REPO_ROOT, "lib/backup", f), "utf8"),
    );
    check(
      "ningún archivo de backup lleva un endpoint, una clave ni un bucket escritos",
      [...scripts, ...modulos].every(
        (texto) => !/BACKUP_[A-Z_]+\s*=\s*["'][^"']+["']/.test(texto) && !texto.includes("r2.cloudflarestorage.com"),
      ),
    );
    check(
      "y ninguno nombra al proveedor: el destino es API S3 genérica (D-20)",
      modulos.every((texto) => !/cloudflare/i.test(texto.replace(/\/\*[\s\S]*?\*\//g, ""))),
      "cambiar de proveedor son cuatro variables, no una línea de código",
    );

    console.log("\nCriterio 7 — antes de migrar se respalda:\n");

    const paquete = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "package.json"), "utf8"));
    check(
      "`db:migrate` ejecuta la copia ANTES de la migración",
      /respaldar\.ts[^&]*--antes-de-migrar.*&&.*drizzle-kit migrate/.test(paquete.scripts["db:migrate"]),
      paquete.scripts["db:migrate"],
    );
    const sinDestino = await correr("respaldar.ts", ["--antes-de-migrar"], {
      BACKUP_S3_ENDPOINT: "",
      BACKUP_S3_BUCKET: "",
      BACKUP_PUBLIC_KEY: "",
      DATABASE_URL_MIGRATIONS: URL_DUENO!,
    });
    check("sin destino configurado no rompe la migración local", sinDestino.status === 0);
    check(
      "pero lo dice en voz alta: en producción eso es un fallo",
      /SIN copia previa/.test(sinDestino.stdout),
      sinDestino.stdout.slice(-200),
    );
  } finally {
    await almacen.parar();
    fs.rmSync(volumen, { recursive: true, force: true });
    await dueno`delete from organization where slug in ('marca-antigua','marca-nueva')`.catch(() => {});
    await dueno.unsafe("drop database if exists slg_restaurada").catch(() => {});
    await dueno.end({ timeout: 5 });
  }

  if (fallos > 0) {
    console.error(`\n✗ respaldos: ${fallos} de ${comprobaciones} comprobaciones fallaron.\n`);
    process.exit(1);
  }
  console.log(`\n✓ respaldos: ${comprobaciones} comprobaciones con copia y restauración reales, sin fallos.`);
  process.exit(0);
}

await main();
