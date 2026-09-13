/**
 * restaurar.ts — **Un backup que no se ha restaurado no cuenta como backup**
 * (FU-14, criterio 6 · RF-125 · DoD #8).
 *
 *   npm run backup:restore -- --fecha 2026-09-01 --generacion mensual --destino <url>
 *
 * SE RESTAURA **DESDE UNA COPIA ANTIGUA, NO SOLO DESDE LA ÚLTIMA** (R-37). La
 * última copia es la que más probablemente esté corrupta si algo va mal: un
 * cifrado malicioso o un `pg_dump` que sale vacío se copian encima de lo nuevo.
 * Por eso este script pide **fecha y generación explícitas** en vez de tener un
 * «restaurar lo último» cómodo: el camino cómodo es el que no prueba nada.
 *
 * **LA CLAVE PRIVADA NO ESTÁ EN EL VPS** (criterio 3). Este script se ejecuta
 * donde esté la clave —el portátil de Ricardo, o staging con la clave puesta a
 * mano para la prueba— y por eso falla con un mensaje claro si no la encuentra,
 * en vez de intentar algo a medias.
 *
 * **EL DESTINO ES EXPLÍCITO Y NUNCA POR DEFECTO.** `--destino` no se puede
 * omitir: una restauración que adivina a dónde va es una restauración que un día
 * va a producción.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { descifrar } from "../../lib/backup/cifrado.ts";
import { descargar } from "../../lib/backup/destino.ts";
import { claveDe, type Generacion, type Pieza } from "../../lib/backup/generaciones.ts";

function argumento(nombre: string): string | null {
  const i = process.argv.indexOf(`--${nombre}`);
  return i >= 0 ? (process.argv[i + 1] ?? null) : null;
}

function decir(linea: string): void {
  console.log(`[restaurar] ${linea}`);
}

export async function traerYDescifrar(
  generacion: Generacion,
  fecha: string,
  pieza: Pieza,
  clavePrivada: string,
): Promise<Buffer> {
  const clave = claveDe(generacion, fecha, pieza);
  const sobre = await descargar(clave);
  // Si el sobre viene manipulado, esto **lanza**: GCM no devuelve basura que
  // parezca un dump. Es la mitad del valor de cifrar con autenticación.
  return descifrar(sobre, clavePrivada);
}

async function restaurarBase(dump: string, destino: string): Promise<void> {
  const binario = process.env.PG_RESTORE_BIN ?? "pg_restore";
  await new Promise<void>((resolver, rechazar) => {
    const proceso = spawn(
      binario,
      ["--clean", "--if-exists", "--no-owner", "--dbname", destino, dump],
      { stdio: ["ignore", "inherit", "inherit"] },
    );
    proceso.on("error", rechazar);
    proceso.on("exit", (codigo) =>
      codigo === 0 ? resolver() : rechazar(new Error(`pg_restore salió con ${codigo}`)),
    );
  });
}

async function main() {
  const fecha = argumento("fecha");
  const generacion = (argumento("generacion") ?? "diaria") as Generacion;
  const destino = argumento("destino");
  const clavePrivada = process.env.BACKUP_PRIVATE_KEY;

  if (!fecha || !destino) {
    console.error(
      "Uso: npm run backup:restore -- --fecha YYYY-MM-DD --generacion diaria|semanal|mensual " +
        "--destino postgresql://…\n\n" +
        "La fecha y el destino son obligatorios a propósito: una restauración que adivina " +
        "a dónde va es una restauración que un día va a producción.",
    );
    process.exit(2);
  }
  if (!clavePrivada) {
    console.error(
      "Falta BACKUP_PRIVATE_KEY. **Y es correcto que no esté en el servidor**: la clave que " +
        "descifra las copias vive fuera (FU-14, criterio 3). Ponla en el entorno de esta " +
        "sesión, restaura, y no la dejes escrita en ningún archivo.",
    );
    process.exit(2);
  }

  const temporal = fs.mkdtempSync(path.join(os.tmpdir(), "slg-restore-"));
  try {
    decir(`trayendo ${generacion}/${fecha}`);
    const dump = await traerYDescifrar(generacion, fecha, "base-de-datos", clavePrivada);
    const ruta = path.join(temporal, "base.dump");
    fs.writeFileSync(ruta, dump);
    decir(`descifrado (${dump.length} bytes)`);
    await restaurarBase(ruta, destino);
    decir("✓ base restaurada. Comprueba los datos ANTES de dar la prueba por buena.");

    try {
      const volumenes = await traerYDescifrar(generacion, fecha, "volumenes", clavePrivada);
      const tarball = path.join(temporal, "volumenes.tgz");
      fs.writeFileSync(tarball, volumenes);
      decir(`volúmenes descargados en ${tarball} — desempaquétalos donde toque, a mano.`);
      // A mano y no automático: desempaquetar encima de un volumen vivo es una
      // operación destructiva, y esa decisión la toma una persona.
      fs.copyFileSync(tarball, path.join(process.cwd(), `volumenes-${fecha}.tgz`));
    } catch {
      decir("no hay pieza de volúmenes en esa copia (o no se pudo traer).");
    }
  } finally {
    fs.rmSync(temporal, { recursive: true, force: true });
  }
}

if (process.argv[1]?.endsWith("restaurar.ts")) await main();
