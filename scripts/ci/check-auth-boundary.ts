/**
 * check-auth-boundary.ts — El criterio 1 de FU-06, como freno.
 *
 * «Cero lógica de sesión, rol o `organization_id` escrita dentro de una página
 * o de un endpoint: toda pasa por el módulo. Una revisión que encuentre una
 * excepción rechaza la unidad.»
 *
 * Una revisión humana encuentra la primera excepción y se pierde la tercera.
 * Esto la encuentra siempre, y por eso el criterio es verificable en vez de
 * declarativo. Mitiga R-19: el día que haya que sustituir Better Auth, la
 * garantía de que solo hay un sitio que tocar es este archivo, no la memoria.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const SCAN_ROOT = process.env.AUTH_BOUNDARY_ROOT
  ? path.resolve(process.env.AUTH_BOUNDARY_ROOT)
  : REPO_ROOT;

/** Dentro del módulo todo vale: es el sitio donde esta lógica DEBE estar. */
const DENTRO_DEL_MODULO = "lib/auth/";

/**
 * La única ruta del proyecto que puede importar el framework directamente: el
 * manejador que Next exige para los endpoints de Better Auth. No contiene
 * lógica, solo delega. Se le nombra a propósito en vez de permitir un patrón:
 * una excepción con nombre se revisa; un patrón se aprovecha.
 */
const EXCEPCION = "app/api/auth/[...all]/route.ts";

/**
 * El módulo tiene DOS puertas públicas, no una: `@/lib/auth` para el servidor y
 * `@/lib/auth/edge` para el middleware, que corre en un runtime donde la
 * instancia de Better Auth y la conexión a PostgreSQL no existen. `edge` es
 * superficie pública declarada, no un atajo a un archivo interno.
 */
const PUERTAS_PUBLICAS = ["@/lib/auth", "@/lib/auth/edge"];

/** Donde las constructoras del AuthContext se DEFINEN, no se llaman. */
const DEFINE_EL_CONTEXTO = "lib/db/context.ts";

type Regla = {
  readonly nombre: string;
  readonly re: RegExp;
  readonly porQue: string;
  /** Rutas donde la regla no aplica, además del propio módulo. */
  readonly salvo?: readonly string[];
};

const REGLAS: readonly Regla[] = [
  {
    nombre: "importa el framework de identidad",
    re: /from\s+["']better-auth/,
    porQue:
      "solo lib/auth/ conoce la librería. Importarla fuera ata esa página a un " +
      "proveedor concreto y rompe la mitigación de R-19.",
    salvo: [EXCEPCION],
  },
  {
    nombre: "importa un archivo interno del módulo",
    re: /from\s+["'](?:@\/lib\/auth\/|\.\.?\/(?:\.\.\/)*lib\/auth\/)(?!edge["'])[a-z]/,
    porQue:
      "la superficie pública es `@/lib/auth`. Entrar por un archivo interno " +
      "convierte un detalle en contrato y el módulo deja de poder reescribirse.",
  },
  {
    nombre: "fabrica un contexto autenticado",
    re: /(?<!function\s)\b(?:contextoDeSesion|contextoDeClaveApi)\s*\(/,
    porQue:
      "las dos constructoras del AuthContext son la frontera del aislamiento " +
      "(FU-04). Solo el módulo de identidad, que verifica, puede llamarlas.",
  },
  {
    nombre: "consulta directamente las tablas de identidad",
    re: /\bschema\.(?:session|account|verification|apiKey)\b/,
    porQue:
      "sesión y claves se leen por el módulo, que aplica caducidad, revocación " +
      "y límite. Una consulta directa se salta las tres.",
  },
];

type Hallazgo = { archivo: string; linea: number; regla: Regla };

function archivos(): string[] {
  const extensiones = new Set([".ts", ".tsx"]);
  if (SCAN_ROOT === REPO_ROOT) {
    return execFileSync("git", ["ls-files", "-z", "*.ts", "*.tsx"], {
      cwd: REPO_ROOT,
      encoding: "utf8",
    })
      .split("\0")
      .filter(Boolean)
      .map((r) => path.join(REPO_ROOT, r));
  }
  const recorrer = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) return recorrer(abs);
      return extensiones.has(path.extname(e.name)) ? [abs] : [];
    });
  return recorrer(SCAN_ROOT);
}

const hallazgos: Hallazgo[] = [];
let revisados = 0;

for (const abs of archivos()) {
  if (!fs.existsSync(abs)) continue;
  const rel = path.relative(REPO_ROOT, abs).split(path.sep).join("/");

  if (rel.startsWith(DENTRO_DEL_MODULO)) continue;
  // Ahí se DEFINEN las constructoras del contexto; definirlas no es llamarlas.
  if (rel === DEFINE_EL_CONTEXTO) continue;
  // Los propios frenos hablan DE las reglas: nombrarlas no es infringirlas.
  if (rel.startsWith("scripts/ci/")) continue;
  /**
   * Las pruebas del módulo son parte del módulo, no consumidores suyos: tienen
   * que poder entrar por dentro para recorrer la matriz sin levantar Next.
   */
  if (rel.startsWith("scripts/auth/")) continue;

  revisados++;
  const lineas = fs.readFileSync(abs, "utf8").split("\n");
  for (const regla of REGLAS) {
    if (regla.salvo?.includes(rel)) continue;
    lineas.forEach((linea, i) => {
      if (linea.trimStart().startsWith("*") || linea.trimStart().startsWith("//")) return;
      if (regla.re.test(linea)) hallazgos.push({ archivo: rel, linea: i + 1, regla });
    });
  }
}

if (hallazgos.length > 0) {
  console.error(
    `✗ frontera del módulo de identidad: ${hallazgos.length} infracción(es) sobre ${revisados} archivos.\n`,
  );
  for (const h of hallazgos) {
    console.error(`  ${h.archivo}:${h.linea} · ${h.regla.nombre}`);
    console.error(`      ${h.regla.porQue}`);
  }
  console.error(
    `\n  Todo lo de identidad entra por una de las dos puertas públicas del módulo:\n` +
      PUERTAS_PUBLICAS.map((p) => `    ${p}`).join("\n") +
      `\n  (criterio 1 de FU-06).\n`,
  );
  process.exit(1);
}

console.log(
  `✓ frontera del módulo de identidad: ${revisados} archivos fuera de lib/auth/, ninguno la cruza.`,
);
