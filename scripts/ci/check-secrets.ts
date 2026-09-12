/**
 * check-secrets.ts — Análisis de secretos, bloqueante (Regla 2, RNF-26, RF-129).
 *
 * Este repositorio es PÚBLICO (START_PROJECT.md §10-6). Un valor filtrado no se
 * arregla borrando el commit: se arregla rotando la credencial. Por eso el freno
 * está aquí, antes del push, y no en una revisión humana.
 *
 * Dos capas, a propósito:
 *   1. Este script, que corre en cualquier máquina y en el gancho de pre-commit.
 *   2. Un escáner dedicado en el pipeline (`.github/workflows/ci.yml`).
 * La primera es la que un desarrollador puede ejecutar sin red; la segunda cubre
 * los patrones que este script no conoce todavía.
 *
 * Cubre: AGENTS.md Regla 2 · RNF-26 · RF-129 · FU-05 criterios 4, 5 y 6.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");

/** Permite apuntar la prueba negativa a un árbol sembrado a propósito. */
const SCAN_ROOT = process.env.SECRETS_SCAN_ROOT
  ? path.resolve(process.env.SECRETS_SCAN_ROOT)
  : REPO_ROOT;

type Rule = { name: string; re: RegExp };

const RULES: ReadonlyArray<Rule> = [
  { name: "clave privada PEM", re: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/ },
  { name: "clave de acceso AWS/S3", re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/ },
  { name: "clave de API de Resend", re: /\bre_[A-Za-z0-9_-]{16,}\b/ },
  { name: "token de GitHub", re: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/ },
  { name: "clave de API de Anthropic", re: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/ },
  { name: "clave de API de OpenAI", re: /\bsk-[A-Za-z0-9]{32,}\b/ },
  { name: "token de Slack", re: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/ },
  { name: "JSON de cuenta de servicio de Google", re: /"type"\s*:\s*"service_account"/ },
  { name: "JWT con carga útil", re: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\./ },
  {
    name: "cadena de conexión con contraseña",
    re: /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|amqp):\/\/[^\s:@/]+:[^\s:@/]+@/,
  },
  {
    /**
     * `SECRET=` con un LITERAL detrás. Dos precisiones que no son laxitud:
     *
     *   · `SECRET=` a secas es exactamente lo que `.env.example` debe tener.
     *   · Asignar desde una variable —`PASSWORD = config.clave`— no es un
     *     secreto en el código: el secreto estará donde se construya esa
     *     variable, y ahí lo pilla esta misma regla o el escáner del pipeline.
     *     Exigir literal es lo que dice el nombre de la regla, «con valor».
     *
     * Sin la segunda precisión la regla marca en rojo todo módulo que lea su
     * configuración, que es justo lo que queremos que la gente haga.
     */
    name: "variable de secreto con valor",
    re: /\b(?:[A-Z0-9_]*(?:SECRET|PASSWORD|PASSWD|TOKEN|API_KEY|ACCESS_KEY|PRIVATE_KEY))\s*[:=]\s*(["'])(?!\s*\1)[^\s"',;)}]{8,}\1/,
  },
];

/**
 * Lo que NO se analiza.
 *
 * `scripts/ci/negative/` contiene fixtures con secretos FALSOS: su razón de ser
 * es que este script los encuentre cuando se le apunta ahí a propósito
 * (criterio 5). Si se analizaran siempre, el gate estaría permanentemente rojo.
 */
const SKIP_DIRS = new Set([".git", "node_modules", ".next", "dist", "build", "coverage"]);

/**
 * `negative/` se salta en el barrido normal del repositorio, y SOLO ahí: cuando
 * `SECRETS_SCAN_ROOT` apunta a los fixtures, el escáner tiene que verlos. Si se
 * saltara siempre, la prueba negativa del criterio 5 sería un verde vacío
 * —escanear cero archivos y anunciar que no hay secretos—, que es justo el falso
 * verde que R-26 describe.
 */
const BARRIDO_NORMAL = SCAN_ROOT === REPO_ROOT;
if (BARRIDO_NORMAL) SKIP_DIRS.add("negative");

const SKIP_FILES = new Set(["package-lock.json", "skills-lock.json"]);
const TEXT_EXT = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".md", ".mdx",
  ".yml", ".yaml", ".sql", ".sh", ".css", ".env", ".example", ".txt", ".toml",
]);

/**
 * Ficheros seguidos por git, si estamos en un repositorio. Lo que git ignora no
 * se publica, y `.env` está ignorado: analizarlo produciría un falso positivo
 * ruidoso en cada máquina de desarrollo.
 */
function trackedFiles(): string[] | null {
  if (SCAN_ROOT !== REPO_ROOT) return null;
  try {
    return execFileSync("git", ["ls-files", "-z"], { cwd: REPO_ROOT, encoding: "utf8" })
      .split("\0")
      .filter(Boolean)
      .map((rel) => path.join(REPO_ROOT, rel));
  } catch {
    return null;
  }
}

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (SKIP_DIRS.has(e.name)) return [];
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) return walk(abs);
    return e.isFile() ? [abs] : [];
  });
}

function scannable(abs: string): boolean {
  const base = path.basename(abs);
  if (SKIP_FILES.has(base)) return false;
  if (base.startsWith(".env") ) return base === ".env.example";
  const ext = path.extname(abs);
  if (ext === "" ) return false;
  if (!TEXT_EXT.has(ext)) return false;
  // Un archivo enorme suele ser un artefacto; y un secreto no vive en 5 MB.
  return fs.statSync(abs).size < 2 * 1024 * 1024;
}

const files = (trackedFiles() ?? walk(SCAN_ROOT))
  .filter((f) => fs.existsSync(f))
  .filter((f) => !f.split(path.sep).some((seg) => SKIP_DIRS.has(seg)))
  .filter(scannable);

const hits: string[] = [];
let scanned = 0;

for (const abs of files) {
  scanned++;
  const rel = path.relative(REPO_ROOT, abs);
  const lines = fs.readFileSync(abs, "utf8").split("\n");
  lines.forEach((line, i) => {
    for (const rule of RULES) {
      if (rule.re.test(line)) {
        // Nunca se imprime la línea: eso publicaría el secreto en el log de CI,
        // que suele ser tan público como el repositorio.
        hits.push(`${rel}:${i + 1} · ${rule.name}`);
        return;
      }
    }
  });
}

if (hits.length > 0) {
  console.error(`✗ análisis de secretos: ${hits.length} coincidencia(s) sobre ${scanned} archivos.\n`);
  for (const h of hits) console.error(`  ${h}`);
  console.error(
    `\n  El contenido NO se imprime a propósito: el log de CI es tan público como el repo.\n` +
      `  Si es un secreto real: ROTA la credencial primero, y solo después limpia el historial.\n` +
      `  Si es un falso positivo: mueve el fixture bajo scripts/ci/negative/.\n`,
  );
  process.exit(1);
}

console.log(`✓ análisis de secretos: ${scanned} archivos, sin coincidencias.`);
