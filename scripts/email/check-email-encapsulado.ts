/**
 * check-email-encapsulado.ts — Criterio 1 de FU-08 (D-22, D-36), verificado.
 *
 * «Ningún caso de uso importa el cliente del proveedor: todos hablan con la
 * interfaz propia. Una revisión que encuentre una importación directa
 * rechaza la unidad.» Esto automatiza esa revisión: nada fuera de
 * `lib/email/smtp-transport.ts` puede importar `nodemailer`.
 */
import fs from "node:fs";
import path from "node:path";

const RAIZ = path.resolve(import.meta.dirname, "../..");
const PERMITIDOS = new Set(["lib/email/smtp-transport.ts"]);

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
for (const carpeta of ["app", "lib", "scripts"]) {
  for (const archivo of archivosTs(path.join(RAIZ, carpeta))) {
    const relativo = path.relative(RAIZ, archivo);
    if (PERMITIDOS.has(relativo)) continue;
    const contenido = fs.readFileSync(archivo, "utf8");
    if (/from\s+["']nodemailer["']/.test(contenido)) {
      fallos++;
      console.error(`  ✗ ${relativo} importa \`nodemailer\` directamente — debe pasar por lib/email/.`);
    }
  }
}

console.log("Criterio 1 de FU-08 — puerto de correo encapsulado\n");
if (fallos) {
  console.error(`\n✗ ${fallos} archivo(s) fuera de lib/email/smtp-transport.ts importan el proveedor.\n`);
  process.exit(1);
}
console.log("  ✓ Ningún archivo fuera de lib/email/smtp-transport.ts importa nodemailer.\n");
