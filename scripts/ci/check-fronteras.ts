/**
 * check-fronteras.ts — Las fronteras de los módulos encapsulados, como freno.
 *
 * DOS UNIDADES PIDEN LO MISMO, PALABRA POR PALABRA:
 *
 *   · FU-06, criterio 1: «Cero lógica de sesión, rol o `organization_id` escrita
 *     dentro de una página o de un endpoint: toda pasa por el módulo. Una
 *     revisión que encuentre una excepción rechaza la unidad.»
 *   · FU-08, criterio 1: «Ningún caso de uso importa el cliente del proveedor:
 *     todos hablan con la interfaz propia. Una revisión que encuentre una
 *     importación directa rechaza la unidad.»
 *
 * Una revisión humana encuentra la primera excepción y se pierde la tercera. Un
 * freno la encuentra siempre, y por eso los dos criterios son verificables en
 * vez de declarativos. Es la mitigación de R-19 y de R-05: el día que haya que
 * sustituir el proveedor de identidad o el de correo, la garantía de que solo
 * hay un sitio que tocar es este archivo, no la memoria de nadie.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const SCAN_ROOT = process.env.FRONTERAS_ROOT
  ? path.resolve(process.env.FRONTERAS_ROOT)
  : REPO_ROOT;

/** Dentro de su módulo todo vale: es el sitio donde esa lógica DEBE estar. */
const MODULOS = ["lib/auth/", "lib/mail/", "lib/files/"];

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

/**
 * Un módulo hermano dentro de `lib/` entra por `../auth/index.ts`, que es la
 * MISMA puerta que `@/lib/auth` escrita en relativo: `lib/` no puede usar el
 * alias `@/` sin volverse dependiente de la configuración de rutas de Next.
 * Lo que sigue prohibido es entrar por cualquier OTRO archivo del módulo.
 */

/** Donde las constructoras del AuthContext se DEFINEN, no se llaman. */
const DEFINE_EL_CONTEXTO = "lib/db/context.ts";

/** `true` cuando se barre el repositorio; `false` cuando se apunta a fixtures. */
const BARRIDO_NORMAL = SCAN_ROOT === REPO_ROOT;

type Regla = {
  readonly nombre: string;
  readonly re: RegExp;
  readonly porQue: string;
  /** Rutas donde la regla no aplica, además del propio módulo. */
  readonly salvo?: readonly string[];
};

const REGLAS: readonly Regla[] = [
  {
    nombre: "importa el cliente de almacenamiento",
    re: /from\s+["']@aws-sdk\/(?:client-s3|s3-request-presigner)/,
    porQue:
      "solo lib/files/s3.ts conoce el cliente de S3. Importarlo fuera pone al " +
      "alcance de esa ruta `ListObjects`, y ninguna ruta lista un bucket (RF-123, gate D10).",
  },
  {
    nombre: "importa un archivo interno del módulo de archivos",
    re: /from\s+["'](?:@\/lib\/files\/|(?:\.\.?\/)+(?:lib\/)?files\/)(?!index\.ts["'])[a-z]/,
    porQue:
      "la superficie pública es `@/lib/files`. Entrar por un archivo interno " +
      "convierte un detalle en contrato y el módulo deja de poder reescribirse.",
  },
  {
    nombre: "importa el transporte de correo",
    re: /from\s+["']nodemailer/,
    porQue:
      "solo lib/mail/smtp.ts sabe cómo se transporta un correo. Importarlo fuera " +
      "ata ese caso de uso a un transporte concreto y rompe D-36: cambiar de " +
      "proveedor debe costar cuatro variables de entorno y ninguna línea de código.",
  },
  {
    nombre: "importa un archivo interno del módulo de correo",
    re: /from\s+["'](?:@\/lib\/mail\/|(?:\.\.?\/)+(?:lib\/)?mail\/)(?!index\.ts["'])[a-z]/,
    porQue:
      "la superficie pública es `@/lib/mail`. Entrar por un archivo interno " +
      "convierte un detalle en contrato y el módulo deja de poder reescribirse.",
  },
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
    // También los relativos que NO llevan el prefijo `lib/`: desde `lib/algo/`,
    // `../auth/db.ts` entra igual de dentro y el gate no lo veía.
    re: /from\s+["'](?:@\/lib\/auth\/|(?:\.\.?\/)+(?:lib\/)?auth\/)(?!(?:edge|index\.ts)["'])[a-z]/,
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

  if (MODULOS.some((m) => rel.startsWith(m))) continue;

  /**
   * Las exenciones de abajo valen para el barrido del repositorio, no cuando
   * `FRONTERAS_ROOT` apunta a los fixtures: si valieran siempre, la prueba
   * negativa escanearía cero archivos y anunciaría verde, que es el falso verde
   * de R-26 —y ya pasó una vez con el escáner de secretos—.
   */
  if (BARRIDO_NORMAL) {
  // Ahí se DEFINEN las constructoras del contexto; definirlas no es llamarlas.
  if (rel === DEFINE_EL_CONTEXTO) continue;
    // Los propios frenos hablan DE las reglas: nombrarlas no es infringirlas.
    if (rel.startsWith("scripts/ci/")) continue;
    /**
     * Las pruebas de un módulo son parte del módulo, no consumidores suyos:
     * tienen que poder entrar por dentro para recorrer la matriz o sembrar un
     * fixture sin levantar Next.
     */
    if (
      rel.startsWith("scripts/auth/") ||
      rel.startsWith("scripts/mail/") ||
      rel.startsWith("scripts/invitations/") ||
      rel.startsWith("scripts/files/")
    ) {
      continue;
    }
  }

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
    `✗ fronteras de módulo: ${hallazgos.length} infracción(es) sobre ${revisados} archivos.\n`,
  );
  for (const h of hallazgos) {
    console.error(`  ${h.archivo}:${h.linea} · ${h.regla.nombre}`);
    console.error(`      ${h.regla.porQue}`);
  }
  console.error(
    `\n  Todo lo de identidad entra por una de las dos puertas públicas del módulo:\n` +
      [...PUERTAS_PUBLICAS, "@/lib/mail", "@/lib/files"].map((p) => `    ${p}`).join("\n") +
      `\n  (criterio 1 de FU-06 y criterio 1 de FU-08).\n`,
  );
  process.exit(1);
}

console.log(
  `✓ fronteras de módulo: ${revisados} archivos fuera de ${MODULOS.join(" y ")}, ninguno las cruza.`,
);
