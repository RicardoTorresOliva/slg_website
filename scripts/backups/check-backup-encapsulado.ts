/**
 * check-backup-encapsulado.ts — Las dos primeras mitigaciones de R-37,
 * vigiladas en CI (criterio 4 de FU-14).
 *
 * Mismo patrón que `check-auth-encapsulado.ts` (FU-06), `check-email-...` (FU-08)
 * y `check-files-...` (FU-09): una regla de diseño que solo vive en un
 * comentario se rompe en tres meses sin que nadie se entere.
 *
 * Comprueba tres cosas:
 *
 *  1. El puerto de §8.3 (`lib/backups/destination.ts`) SOLO deposita. Si algún
 *     día aparece ahí `GetObject`, `ListObjects`, `DeleteObject`(s) o
 *     `CopyObject`, el pipeline falla. Mitigación 1.
 *  2. El proceso de COPIA nunca nombra la credencial de purga. Mitigación 2,
 *     en su versión estática — la dinámica la impone `leerConfigDeCopia()`,
 *     que lanza si esas variables están en el entorno.
 *  3. Nadie fuera de `lib/backups/` y `scripts/backups/` toca el destino de
 *     copias: la aplicación web no tiene por qué saber que existe.
 */
import fs from "node:fs";
import path from "node:path";

const RAIZ = path.resolve(import.meta.dirname, "../..");

const PUERTO = "lib/backups/destination.ts";

// Compuestos a trozos para que esta misma comprobación no se denuncie a sí
// misma, igual que hace `check-files-encapsulado.ts`.
const COMANDOS_PROHIBIDOS_EN_EL_PUERTO = [
  { re: new RegExp("\\bGetObject" + "Command\\b"), que: "lee del destino" },
  { re: new RegExp("\\bListObjects" + "(V2)?Command\\b"), que: "lista el destino" },
  { re: new RegExp("\\bDeleteObjects?" + "Command\\b"), que: "borra del destino" },
  { re: new RegExp("\\bCopyObject" + "Command\\b"), que: "sobrescribe en el destino" },
];

const VARIABLES_DE_PURGA = new RegExp("R2_(?:ACCESS_KEY_ID|SECRET_ACCESS_KEY)_" + "PRUNE");

/** Archivos a los que SÍ corresponde nombrar la credencial de purga. */
const PUEDEN_NOMBRAR_LA_PURGA = new Set([
  "lib/backups/config.ts", // la lee y, sobre todo, la prohíbe en la copia
  "scripts/backups/prune-backups.ts", // el proceso de purga
  "scripts/backups/check-backup-encapsulado.ts", // esta comprobación
  "scripts/backups/test-backups.ts", // la prueba de que la prohibición funciona
]);

function archivosTs(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const resultado: string[] = [];
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entrada.name === "node_modules" || entrada.name.startsWith(".")) continue;
    const ruta = path.join(dir, entrada.name);
    if (entrada.isDirectory()) resultado.push(...archivosTs(ruta));
    else if (/\.(ts|tsx)$/.test(entrada.name)) resultado.push(ruta);
  }
  return resultado;
}

let fallos = 0;

// ── 1. El puerto solo deposita ──────────────────────────────────────────────
const puerto = fs.readFileSync(path.join(RAIZ, PUERTO), "utf8");
for (const { re, que } of COMANDOS_PROHIBIDOS_EN_EL_PUERTO) {
  if (re.test(puerto)) {
    fallos++;
    console.error(
      `  ✗ ${PUERTO} ${que} — el puerto de §8.3 solo expone \`depositar\`. ` +
        `Esa incapacidad es la mitigación 1 de R-37, no un descuido.`,
    );
  }
}

// ── 2 y 3. Credencial de purga y alcance del destino ────────────────────────
for (const carpeta of ["app", "lib", "scripts"]) {
  for (const archivo of archivosTs(path.join(RAIZ, carpeta))) {
    const relativo = path.relative(RAIZ, archivo);
    const contenido = fs.readFileSync(archivo, "utf8");

    if (VARIABLES_DE_PURGA.test(contenido) && !PUEDEN_NOMBRAR_LA_PURGA.has(relativo)) {
      fallos++;
      console.error(
        `  ✗ ${relativo} nombra la credencial de purga — el proceso de copia no puede verla ` +
          `(mitigación 2 de R-37, architecture §9.2).`,
      );
    }

    const esDeBackups = relativo.startsWith("lib/backups/") || relativo.startsWith("scripts/backups/");
    if (!esDeBackups && /\bR2_(?:ENDPOINT|BUCKET|ACCESS_KEY_ID|SECRET_ACCESS_KEY)/.test(contenido)) {
      fallos++;
      console.error(
        `  ✗ ${relativo} usa el destino de copias — solo lib/backups/ y scripts/backups/ lo conocen.`,
      );
    }
  }
}

console.log("Criterio 4 de FU-14 — puerto que solo deposita, credencial de purga aislada\n");
if (fallos) {
  console.error(`\n✗ ${fallos} violación(es) de las mitigaciones 1 y 2 de R-37.\n`);
  process.exit(1);
}
console.log(
  "  ✓ El puerto de §8.3 no lee, no lista, no borra y no sobrescribe.\n" +
    "  ✓ La credencial de purga solo aparece donde le toca.\n",
);
