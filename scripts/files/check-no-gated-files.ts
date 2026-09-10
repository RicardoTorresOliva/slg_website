/**
 * check-no-gated-files.ts — Criterio 5 de FU-09 (RNF-27).
 *
 * «Un grep del repositorio confirma cero PDF de descarga y cero entregables
 * de cliente en control de versiones.» Recorre `git ls-files` —lo que de
 * verdad entra en un commit, no el directorio de trabajo— y falla si aparece
 * alguna de las extensiones que `lib/files/limits.ts` acepta como entregable
 * o documento de descarga.
 */
import { execFileSync } from "node:child_process";

const EXTENSIONES_PROHIBIDAS = [".pdf", ".docx", ".pptx", ".mp4", ".zip"];

const archivos = execFileSync("git", ["ls-files"], { encoding: "utf8" })
  .split("\n")
  .filter(Boolean);

const encontrados = archivos.filter((f) =>
  EXTENSIONES_PROHIBIDAS.some((ext) => f.toLowerCase().endsWith(ext)),
);

console.log("Criterio 5 de FU-09 — cero archivos gated en control de versiones (RNF-27)\n");
if (encontrados.length) {
  for (const f of encontrados) console.error(`  ✗ ${f}`);
  console.error(`\n✗ ${encontrados.length} archivo(s) gated en el repositorio.\n`);
  process.exit(1);
}
console.log(`  ✓ ${archivos.length} archivos en control de versiones, ninguno con extensión gated.\n`);
