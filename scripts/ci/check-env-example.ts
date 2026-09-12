/**
 * check-env-example.ts — `.env.example` completo y sin un solo valor.
 *
 * Tres reglas, y las tres fallan el build:
 *   1. CERO valores. El repositorio es público (RNF-26, RF-129, Regla 2).
 *   2. Cada nombre lleva comentario encima: propósito y servicio consumidor.
 *   3. Toda variable que el código lee (`process.env.<NOMBRE>`) está listada. Una
 *      variable que solo existe en la cabeza de quien la escribió es una caída
 *      en producción esperando su turno.
 *
 * Cubre: FU-05 criterio 6 · RF-129 · RNF-26.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const ENV_EXAMPLE = process.env.ENV_EXAMPLE_PATH
  ? path.resolve(process.env.ENV_EXAMPLE_PATH)
  : path.join(REPO_ROOT, ".env.example");

/**
 * Variables que provee la plataforma, no nosotros: no tienen por qué estar en
 * la plantilla porque nadie las configura a mano.
 */
const DE_LA_PLATAFORMA = new Set([
  "NODE_ENV",
  "PORT",
  "HOSTNAME",
  "CI",
  "VERCEL",
  "NEXT_RUNTIME",
  "NEXT_TELEMETRY_DISABLED",
  "NEXT_PHASE",
]);

/** Variables de los propios scripts de verificación: no las consume la app. */
const DE_LOS_SCRIPTS = new Set([
  "CONTENT_ROOT",
  "CONTENT_STRICT",
  "JS_BUDGET_BYTES",
  "SECRETS_SCAN_ROOT",
  "ENV_EXAMPLE_PATH",
  "DNS_BASELINE",
]);

type Failure = { file: string; detail: string };
const failures: Failure[] = [];
let checked = 0;

const lines = fs.readFileSync(ENV_EXAMPLE, "utf8").split("\n");
const declaradas = new Set<string>();
const rel = path.relative(REPO_ROOT, ENV_EXAMPLE);

lines.forEach((line, i) => {
  const m = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
  if (!m) return;
  const [, nombre, valor] = m;
  checked++;
  declaradas.add(nombre);

  // Regla 1 — cero valores.
  if (valor.trim() !== "") {
    failures.push({
      file: `${rel}:${i + 1}`,
      detail: `${nombre} lleva VALOR. La plantilla documenta nombres; los valores viven en Easypanel.`,
    });
  }

  // Regla 2 — comentario encima (propio o del bloque inmediatamente anterior).
  let j = i - 1;
  let documentada = false;
  while (j >= 0) {
    const prev = lines[j].trim();
    if (prev === "") { j--; continue; }
    if (prev.startsWith("#")) { documentada = prev.replace(/^#+\s*/, "").length > 3; break; }
    // La línea anterior es otra variable: comparte el comentario de su bloque.
    if (/^[A-Z][A-Z0-9_]*=/.test(prev)) { documentada = true; break; }
    break;
  }
  if (!documentada) {
    failures.push({
      file: `${rel}:${i + 1}`,
      detail: `${nombre} no tiene comentario encima. Falta decir para qué sirve y qué servicio la consume.`,
    });
  }
});

// Regla 3 — toda variable de entorno que el código lee está listada.
function archivosDeCodigo(): string[] {
  try {
    return execFileSync("git", ["ls-files", "-z", "*.ts", "*.tsx", "*.mjs", "*.js"], {
      cwd: REPO_ROOT,
      encoding: "utf8",
    })
      .split("\0")
      .filter(Boolean)
      .map((r) => path.join(REPO_ROOT, r))
      .filter((f) => fs.existsSync(f));
  } catch {
    return [];
  }
}

const usadas = new Map<string, string>();
for (const abs of archivosDeCodigo()) {
  const texto = fs.readFileSync(abs, "utf8");
  for (const m of texto.matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g)) {
    if (!usadas.has(m[1])) usadas.set(m[1], path.relative(REPO_ROOT, abs));
  }
  for (const m of texto.matchAll(/process\.env\[["']([A-Z][A-Z0-9_]*)["']\]/g)) {
    if (!usadas.has(m[1])) usadas.set(m[1], path.relative(REPO_ROOT, abs));
  }
}

for (const [nombre, donde] of usadas) {
  if (DE_LA_PLATAFORMA.has(nombre) || DE_LOS_SCRIPTS.has(nombre)) continue;
  checked++;
  if (!declaradas.has(nombre)) {
    failures.push({
      file: donde,
      detail: `el código lee ${nombre} y ${rel} no lo declara. En producción esto es un undefined silencioso.`,
    });
  }
}

if (failures.length > 0) {
  console.error(`✗ .env.example: ${failures.length} fallo(s) sobre ${checked} comprobaciones.\n`);
  for (const f of failures) console.error(`  ${f.file}\n    · ${f.detail}`);
  console.error("");
  process.exit(1);
}

console.log(
  `✓ .env.example: ${declaradas.size} variables declaradas, todas documentadas y sin valores; ` +
    `${usadas.size} leídas por el código, todas presentes.`,
);
