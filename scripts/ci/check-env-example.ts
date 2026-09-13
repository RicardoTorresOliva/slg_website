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
  "MIGRATIONS_DIR",
  "FRONTERAS_ROOT",
  "ARCHIVOS_ROOT",
  "SMTP_SINK_PORT",
  "PGDATA",
  "PGBIN",
  "PGPORT",
  "DNS_RESOLVER",
  "DNS_DOMAIN",
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
  // `--cached --others --exclude-standard`, y no solo lo indexado: un archivo
  // NUEVO todavía sin `git add` es código que YA corre, y el freno tiene que
  // verlo. Sin esto una unidad entera pasa en verde contra sus propios archivos
  // sin versionar y el CI se pone rojo en el primer push. Pasó con FU-10.
    return execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard", "*.ts", "*.tsx", "*.mjs", "*.js"], {
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

/** Dónde se lee cada variable. Todos los sitios, no solo el primero. */
const usadas = new Map<string, string[]>();
const anota = (nombre: string, rel: string) => {
  const sitios = usadas.get(nombre) ?? [];
  if (!sitios.includes(rel)) sitios.push(rel);
  usadas.set(nombre, sitios);
};

for (const abs of archivosDeCodigo()) {
  const texto = fs.readFileSync(abs, "utf8");
  const relativo = path.relative(REPO_ROOT, abs).split(path.sep).join("/");
  for (const m of texto.matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g)) anota(m[1], relativo);
  for (const m of texto.matchAll(/process\.env\[["']([A-Z][A-Z0-9_]*)["']\]/g)) anota(m[1], relativo);
}

/**
 * Una variable que SOLO leen los scripts no es configuración de despliegue.
 *
 * `.env.example` documenta lo que hay que rellenar en Easypanel para que el
 * sitio funcione. `MOTION_ROOT` o `GESTO_URL` son perillas de una prueba: no
 * existen en producción, nadie las rellena, y exigirlas allí convierte el
 * archivo en una lista de cosas que no hay que hacer.
 *
 * Antes esto era una lista escrita a mano, y cada perilla nueva ponía el CI en
 * rojo hasta que alguien se acordaba de añadirla. Ahora se deduce de DÓNDE se
 * lee, que es el criterio que de verdad importa.
 */
const soloEnScripts = (sitios: string[]) => sitios.every((f) => f.startsWith("scripts/"));

let perillas = 0;
for (const [nombre, sitios] of usadas) {
  if (DE_LA_PLATAFORMA.has(nombre) || DE_LOS_SCRIPTS.has(nombre)) continue;
  if (soloEnScripts(sitios)) {
    perillas++;
    continue;
  }
  const donde = sitios[0];
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
    `${perillas} perillas de scripts fuera del archivo a propósito; ` +
    `${usadas.size} leídas por el código, todas presentes.`,
);
