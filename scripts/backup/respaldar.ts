/**
 * respaldar.ts — **La copia diaria** (FU-14 · RF-124 · R-12 · R-20 · R-27).
 *
 *   npm run backup            copia de base de datos y volúmenes
 *   npm run backup -- --antes-de-migrar    lo mismo, como guarda de una migración
 *
 * DOS PIEZAS, Y LAS DOS EN LA MISMA CORRIDA: el `pg_dump` de la base y un `tar`
 * de los volúmenes de archivos. Copiar solo la base deja un sistema que arranca
 * con los entregables rotos, que es peor que no arrancar: parece que funciona.
 *
 * **SE CIFRA ANTES DE SALIR DE LA MÁQUINA**, con la clave pública que vive aquí;
 * la privada está fuera y solo hace falta para restaurar (criterio 3). Y se
 * **transmite cifrado desde el flujo**: el dump en claro no llega a escribirse
 * en disco más que como archivo temporal del propio `pg_dump`, que se borra.
 *
 * **UN FALLO AVISA** (R-27). No basta con salir con código distinto de cero: un
 * cron que falla en silencio es un backup que nadie sabe que no existe. Si hay
 * correo configurado, se manda; si no, se dice por la salida y el código de
 * salida sigue siendo 1 para que el cron lo note.
 *
 * **NO LISTA NADA.** Las claves se calculan (`lib/backup/generaciones.ts`), así
 * que la credencial de este proceso puede ser de solo escritura (criterio 4).
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";

import { cifrarFlujo } from "../../lib/backup/cifrado.ts";
import { hayDestinoConfigurado, subir } from "../../lib/backup/destino.ts";
import { claveDe, fechaDe, generacionesDe, type Pieza } from "../../lib/backup/generaciones.ts";

const ANTES_DE_MIGRAR = process.argv.includes("--antes-de-migrar");

function decir(linea: string): void {
  console.log(`[backup] ${linea}`);
}

async function avisarDelFallo(motivo: string): Promise<void> {
  console.error(`[backup] ✗ ${motivo}`);
  const destinatario = process.env.BACKUP_ALERT_EMAIL;
  if (!destinatario) {
    console.error(
      "[backup] sin BACKUP_ALERT_EMAIL no hay a quién avisar. El código de salida es 1: " +
        "el cron tiene que estar configurado para notificarlo.",
    );
    return;
  }
  try {
    const { enviarCorreo } = await import("../../lib/mail/index.ts");
    await enviarCorreo({
      tipo: "backup_failed_alert",
      para: destinatario,
      idioma: "es",
      // El motivo se recorta: el detalle completo vive en el registro del cron,
      // que no sale de la máquina (RNF-32).
      datos: { fecha: new Date().toISOString().slice(0, 10), motivo: motivo.slice(0, 300) },
    });
    decir(`aviso enviado a ${destinatario}`);
  } catch (e) {
    console.error(`[backup] y el aviso tampoco salió: ${(e as Error).message}`);
  }
}

/** `pg_dump -Fc` a un archivo temporal. El formato comprimido ya viene comprimido. */
async function volcarBase(destino: string): Promise<void> {
  const url = process.env.DATABASE_URL_MIGRATIONS ?? process.env.DATABASE_URL;
  if (!url) throw new Error("falta DATABASE_URL_MIGRATIONS para volcar la base");
  const binario = process.env.PG_DUMP_BIN ?? "pg_dump";
  await new Promise<void>((resolver, rechazar) => {
    const proceso = spawn(binario, ["--format=custom", "--no-owner", "--file", destino, url], {
      stdio: ["ignore", "inherit", "inherit"],
    });
    proceso.on("error", rechazar);
    proceso.on("exit", (codigo) =>
      codigo === 0 ? resolver() : rechazar(new Error(`pg_dump salió con ${codigo}`)),
    );
  });
}

/** `tar` de los volúmenes declarados. Sin ellos, la copia no es una copia. */
async function empaquetarVolumenes(destino: string): Promise<boolean> {
  const rutas = (process.env.BACKUP_VOLUME_PATHS ?? "")
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);
  if (rutas.length === 0) return false;
  const faltan = rutas.filter((r) => !fs.existsSync(r));
  if (faltan.length > 0) throw new Error(`volúmenes declarados que no existen: ${faltan.join(", ")}`);

  await new Promise<void>((resolver, rechazar) => {
    const proceso = spawn("tar", ["-czf", destino, ...rutas], { stdio: ["ignore", "inherit", "inherit"] });
    proceso.on("error", rechazar);
    proceso.on("exit", (codigo) =>
      codigo === 0 ? resolver() : rechazar(new Error(`tar salió con ${codigo}`)),
    );
  });
  return true;
}

async function subirCifrado(
  origen: string,
  pieza: Pieza,
  fecha: string,
  generaciones: string[],
  temporal: string,
) {
  const publica = process.env.BACKUP_PUBLIC_KEY;
  if (!publica) throw new Error("falta BACKUP_PUBLIC_KEY: sin ella no se cifra, y sin cifrar no se sube");

  /**
   * **Se cifra a un archivo y DESPUÉS se sube.** El primer intento subía el
   * flujo cifrado directamente, que es más elegante y no funciona: el cliente de
   * S3 exige saber la longitud, y un flujo cifrado no la sabe hasta terminar.
   * La alternativa era `multipart`, que son varias operaciones de clase A por
   * copia — la partida que R2 factura (D-21). El archivo intermedio **ya está
   * cifrado**: el dump en claro no se copia a ningún sitio nuevo.
   */
  const cifrado = path.join(temporal, `${pieza}.slgbk`);
  await new Promise<void>((resolver, rechazar) => {
    const salida = fs.createWriteStream(cifrado);
    const flujo = cifrarFlujo(fs.createReadStream(origen), publica);
    flujo.on("error", rechazar);
    salida.on("error", rechazar);
    salida.on("finish", resolver);
    flujo.pipe(salida);
  });
  const bytes = fs.statSync(cifrado).size;

  for (const generacion of generaciones) {
    // Un flujo nuevo por generación: un flujo se consume una vez, y reutilizarlo
    // subiría la segunda copia vacía — peor que ninguna, porque el histórico
    // diría que existe.
    await subir(fs.createReadStream(cifrado) as unknown as Readable, claveDe(generacion as never, fecha, pieza), bytes);
    decir(`subido ${generacion}/${fecha}/${pieza} (${bytes} bytes cifrados)`);
  }
}

/**
 * La fecha de la copia. **`BACKUP_DATE_OVERRIDE` existe para el simulacro de
 * restauración** y para nada más: el criterio 6 exige restaurar **desde una
 * copia antigua**, y sin poder fabricar una copia con fecha de hace un mes, esa
 * prueba habría que esperarla un mes o creérsela. Producción no define esta
 * variable — y si la definiera, las copias se apilarían todas en la misma fecha,
 * que es un fallo ruidoso y no silencioso.
 */
function momentoDeLaCopia(): Date {
  const forzada = process.env.BACKUP_DATE_OVERRIDE;
  if (!forzada) return new Date();
  const fecha = new Date(`${forzada}T12:00:00Z`);
  if (Number.isNaN(fecha.getTime())) throw new Error(`BACKUP_DATE_OVERRIDE ilegible: ${forzada}`);
  decir(`⚠ fecha forzada a ${forzada}: esto solo debe pasar en un simulacro.`);
  return fecha;
}

async function main() {
  const momento = momentoDeLaCopia();
  const fecha = fechaDe(momento);
  const generaciones = generacionesDe(momento);

  if (!hayDestinoConfigurado()) {
    /**
     * **En local no hay destino, y eso no puede impedir migrar.** Pero tampoco
     * puede pasar desapercibido: si esto sale en el registro de producción, la
     * copia previa a la migración **no se hizo** y el criterio 7 no se cumple.
     */
    decir("sin destino configurado (BACKUP_S3_ENDPOINT, BACKUP_S3_BUCKET, BACKUP_PUBLIC_KEY).");
    decir(
      ANTES_DE_MIGRAR
        ? "la migración continúa, pero SIN copia previa: en producción esto es un fallo."
        : "nada que hacer.",
    );
    process.exit(0);
  }

  const temporal = fs.mkdtempSync(path.join(os.tmpdir(), "slg-backup-"));
  try {
    const dump = path.join(temporal, "base.dump");
    await volcarBase(dump);
    decir(`base volcada (${fs.statSync(dump).size} bytes)`);
    await subirCifrado(dump, "base-de-datos", fecha, generaciones, temporal);

    const tarball = path.join(temporal, "volumenes.tgz");
    if (await empaquetarVolumenes(tarball)) {
      decir(`volúmenes empaquetados (${fs.statSync(tarball).size} bytes)`);
      await subirCifrado(tarball, "volumenes", fecha, generaciones, temporal);
    } else {
      decir("sin BACKUP_VOLUME_PATHS: solo se copia la base. Declara los volúmenes en producción.");
    }

    decir(`✓ copia de ${fecha} completada en ${generaciones.join(", ")}`);
  } catch (e) {
    await avisarDelFallo((e as Error).message);
    process.exit(1);
  } finally {
    fs.rmSync(temporal, { recursive: true, force: true });
  }
}

await main();
