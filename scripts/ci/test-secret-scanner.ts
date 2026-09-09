/**
 * test-secret-scanner.ts — Prueba negativa del freno de secretos.
 *
 * R-26: un freno que nunca se ha visto en rojo no se acepta como verde.
 * Copia un caso con una credencial literal a un directorio temporal, ejecuta el
 * escáner apuntando ahí, y exige que FALLE. Después comprueba que una
 * referencia a variable —que NO es un secreto— pasa sin marcarse.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const AQUI = import.meta.dirname;
const ESCANER = path.join(AQUI, "check-secrets.ts");

function ejecutarSobre(contenido: string): { code: number; salida: string } {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "slg-sec-"));
  fs.writeFileSync(path.join(tmp, "caso.md"), contenido);
  // El escáner recorre desde su propia raíz, así que se copia allí una versión
  // que apunte al temporal.
  const src = fs.readFileSync(ESCANER, "utf8").replace(
    'const RAIZ = path.resolve(import.meta.dirname, "../..");',
    `const RAIZ = ${JSON.stringify(tmp)};`,
  );
  const script = path.join(tmp, "escaner.ts");
  fs.writeFileSync(script, src);
  fs.writeFileSync(path.join(tmp, "package.json"), '{"type":"module"}');
  const r = spawnSync(process.execPath, [script], { encoding: "utf8" });
  fs.rmSync(tmp, { recursive: true, force: true });
  return { code: r.status ?? 0, salida: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}

let fallos = 0;
const ok = (n: string, c: boolean, d = "") => {
  if (c) console.log(`  ✓ ${n}`);
  else { fallos++; console.error(`  ✗ ${n}${d ? ` — ${d}` : ""}`); }
};

console.log("Prueba negativa del freno de secretos\n");

const literal = ejecutarSobre(
  fs.readFileSync(path.join(AQUI, "negativos/con-secreto.md.negativo"), "utf8"),
);
ok("una credencial LITERAL se detecta y falla el pipeline", literal.code === 1, `salió ${literal.code}`);

const clave = ejecutarSobre("CRM_KEY=crm_live_" + "A".repeat(24) + "\n");
ok("una clave del CRM se detecta", clave.code === 1);

const variable = ejecutarSobre(
  'URL="postgresql://${USUARIO}:${CLAVE}@${HOST}:5432/db"\n' +
  'OTRA="postgresql://user:<pon-aqui-la-clave>@host:5432/db"\n',
);
ok("una REFERENCIA a variable no se marca (no es un secreto)", variable.code === 0, variable.salida.slice(0, 200));

const limpio = ejecutarSobre("DATABASE_URL=\nRESEND_API_KEY=\n");
ok("una plantilla sin valores no se marca", limpio.code === 0);

if (fallos) { console.error(`\n✗ ${fallos} fallo(s).\n`); process.exit(1); }
console.log("\n✓ El freno de secretos falla cuando debe y pasa cuando debe.\n");
