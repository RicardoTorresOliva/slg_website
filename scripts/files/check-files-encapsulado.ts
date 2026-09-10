/**
 * check-files-encapsulado.ts — Encapsulación del servicio de archivos (FU-09).
 *
 * Ningún caso de uso importa el SDK de S3 directamente, y ninguna ruta lista
 * el contenido de un bucket (RF-123, gate D10): nada fuera de `lib/files/`
 * puede importar `@aws-sdk/client-s3`, y ningún archivo de `app/`/`lib/`
 * puede nombrar el comando de listado (compuesto a trozos para no
 * autodetectarse en esta misma comprobación).
 *
 * Igual que `scripts/db/check-auth-encapsulado.ts` (FU-06): solo se barre
 * `app/` y `lib/`. Los propios scripts de prueba (`scripts/files/test-files.ts`)
 * SÍ necesitan el SDK real para crear buckets y verificar objetos — la
 * excepción es la misma que ya vale para `scripts/db/test-auth.ts` con
 * `postgres`/`drizzle-orm/postgres-js`.
 */
import fs from "node:fs";
import path from "node:path";

const RAIZ = path.resolve(import.meta.dirname, "../..");
const PERMITIDOS = new Set(["lib/files/client.ts", "lib/files/signed-urls.ts"]);
const COMANDO_DE_LISTADO = new RegExp("\\bListObjects" + "(V2)?Command\\b");

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
for (const carpeta of ["app", "lib"]) {
  for (const archivo of archivosTs(path.join(RAIZ, carpeta))) {
    const relativo = path.relative(RAIZ, archivo);
    const contenido = fs.readFileSync(archivo, "utf8");

    if (!PERMITIDOS.has(relativo) && /from\s+["']@aws-sdk\/client-s3["']/.test(contenido)) {
      fallos++;
      console.error(`  ✗ ${relativo} importa \`@aws-sdk/client-s3\` directamente — debe pasar por lib/files/.`);
    }
    if (COMANDO_DE_LISTADO.test(contenido)) {
      fallos++;
      console.error(`  ✗ ${relativo} lista el contenido de un bucket (RF-123, gate D10) — prohibido.`);
    }
  }
}

console.log("Criterios 1 y 2 de FU-09 — servicio de archivos encapsulado, sin listado\n");
if (fallos) {
  console.error(`\n✗ ${fallos} archivo(s) violan el encapsulamiento del servicio de archivos.\n`);
  process.exit(1);
}
console.log("  ✓ Ningún archivo de app/lib fuera de lib/files/ importa el SDK de S3 ni lista un bucket.\n");
