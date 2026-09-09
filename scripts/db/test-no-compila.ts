/**
 * test-no-compila.ts — Prueba del criterio 5 de FU-04 (RF-71).
 *
 * «Una prueba que intenta pasar `organization_id` por parámetro no compila o
 * falla». Aquí no compila, y esta prueba lo demuestra: copia el caso negativo a
 * un directorio temporal, lo compila con `tsc`, y exige que FALLE.
 *
 * Si algún día alguien relaja el tipo de `AuthContext` para «arreglar» un
 * error de compilación, este test se pone rojo. Ese es el punto.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const AQUI = import.meta.dirname;
const REPO = path.resolve(AQUI, "../..");
const caso = path.join(AQUI, "negativos/organizationId-por-parametro.ts.negativo");

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "slg-negativo-"));
const destino = path.join(tmp, "caso.ts");
fs.writeFileSync(
  destino,
  fs.readFileSync(caso, "utf8").replace("../../../lib/db/scope.ts", path.join(REPO, "lib/db/scope.ts")),
);

const res = spawnSync(
  "npx",
  ["tsc", "--noEmit", "--strict", "--target", "es2022", "--module", "nodenext",
   "--moduleResolution", "nodenext", "--allowImportingTsExtensions", destino],
  { cwd: REPO, encoding: "utf8" },
);

const salida = `${res.stdout ?? ""}${res.stderr ?? ""}`;
fs.rmSync(tmp, { recursive: true, force: true });

console.log("Criterio 5 · pasar organization_id por parámetro NO debe compilar\n");

if (res.status === 0) {
  console.error("  ✗ COMPILÓ. La capa de acceso admite un contexto fabricado a mano.");
  console.error("    RF-71 exige que el organization_id salga del contexto verificado.\n");
  process.exit(1);
}

const porElMotivo = /AuthContext|verificado|unique symbol|not assignable/i.test(salida);
console.log(`  ✓ no compila (tsc salió con ${res.status})`);
console.log(
  porElMotivo
    ? "  ✓ falla por el motivo correcto: el contexto no se puede fabricar a mano\n"
    : `  ⚠ falla, pero conviene revisar el motivo:\n${salida.split("\n").slice(0, 5).map((l) => "      " + l).join("\n")}\n`,
);
process.exit(porElMotivo ? 0 : 1);
