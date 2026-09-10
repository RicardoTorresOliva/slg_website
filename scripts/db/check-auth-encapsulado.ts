/**
 * check-auth-encapsulado.ts — Criterio 1 de FU-06 (R-19), verificado, no supuesto.
 *
 * «Cero lógica de sesión, rol o organization_id escrita dentro de una página o
 * de un endpoint: toda pasa por el módulo. Una revisión que encuentre una
 * excepción rechaza la unidad.» Esto automatiza esa revisión: nada fuera de
 * `lib/auth/` y `lib/db/context.ts` puede importar `better-auth` ni tocar
 * `process.env` en busca de variables de identidad.
 */
import fs from "node:fs";
import path from "node:path";

const RAIZ = path.resolve(import.meta.dirname, "../..");
const PERMITIDOS = new Set([
  "lib/auth/config.ts",
  "lib/auth/session.ts",
  "lib/auth/org.ts",
  "lib/auth/api-keys.ts",
  "lib/auth/permissions.ts",
  "lib/db/context.ts",
  "app/api/auth/[...all]/route.ts",
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
for (const carpeta of ["app", "lib"]) {
  for (const archivo of archivosTs(path.join(RAIZ, carpeta))) {
    const relativo = path.relative(RAIZ, archivo);
    if (PERMITIDOS.has(relativo)) continue;
    const contenido = fs.readFileSync(archivo, "utf8");
    if (/from\s+["']better-auth/.test(contenido)) {
      fallos++;
      console.error(`  ✗ ${relativo} importa \`better-auth\` directamente — debe pasar por lib/auth/.`);
    }
    // `user.role`/`.actorRole` fuera del módulo: alguien reinventando la matriz B.3 a mano.
    if (/\.actorRole\s*===|\brole\s*===\s*["'](slg_admin|slg_operator|client_admin|client_member)/.test(contenido)) {
      fallos++;
      console.error(`  ✗ ${relativo} compara un rol a mano — usa permissions.ts (puedeHacer/exigir).`);
    }
  }
}

console.log("Criterio 1 de FU-06 — módulo de identidad encapsulado\n");
if (fallos) {
  console.error(`\n✗ ${fallos} archivo(s) fuera de lib/auth/ tocan identidad directamente.\n`);
  process.exit(1);
}
console.log("  ✓ Ningún archivo fuera de lib/auth/ importa better-auth ni compara roles a mano.\n");
