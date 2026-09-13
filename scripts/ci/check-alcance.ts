/**
 * check-alcance.ts — **La frontera (b) de `scope.md`, como freno** (DU-20,
 * criterios 2, 3 y 4 · RF-91 · RF-144).
 *
 * LA FRONTERA (b) DICE QUE ESTO NO ES UN LMS. Es la frontera más fácil de cruzar
 * de todas, porque se cruza **con buena intención y de una línea en una**:
 * primero un «visto», que es cómodo; luego un porcentaje, que es informativo;
 * luego una cohorte, porque el cliente tiene dos grupos; y para cuando alguien
 * pregunta «¿esto no era un portal de entregables?», el modelo ya es el de una
 * plataforma de formación y hay que mantenerla. Ninguno de esos pasos parece el
 * paso. Por eso la frontera necesita un freno y no una frase.
 *
 * LAS TRES REGLAS, Y QUÉ CRITERIO SOSTIENE CADA UNA:
 *
 *   · **vocabulario de LMS** (criterio 4) — lección, progreso, evaluación,
 *     certificado, matrícula, cohorte, «completado». Se mira en el MODELO y en
 *     el código de aplicación, no en el texto de la web pública: SLG **imparte**
 *     programas, así que la palabra «progreso» en un artículo del blog es su
 *     trabajo, mientras que una columna `progress` es la frontera cruzada.
 *
 *   · **materiales fuera de su proyecto** (criterio 2) — solo
 *     `lib/portal/materiales.ts` puede seleccionar por el tipo `material`, y su
 *     resultado son grupos con proyecto. Cualquier otro sitio que filtre por ese
 *     tipo está construyendo, ahí mismo, la lista plana que el criterio prohíbe.
 *
 *   · **`membership` como matrícula** (criterio 3) — la tabla no puede ganar
 *     columnas de matrícula. La restricción de «una empresa por persona» la
 *     sostiene el índice parcial de la migración 0013; esta regla sostiene la
 *     otra mitad: que la fila no se convierta en un expediente.
 *
 * `ALCANCE_ROOT` apunta el barrido a otra carpeta: es lo que usa su prueba
 * negativa (R-26).
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const SCAN_ROOT = process.env.ALCANCE_ROOT ? path.resolve(process.env.ALCANCE_ROOT) : REPO_ROOT;
const BARRIDO_NORMAL = SCAN_ROOT === REPO_ROOT;

/**
 * Dónde se mira. El texto editorial (`content/`) queda fuera a propósito: ahí
 * «progreso» o «certificado» son palabras del negocio, no del modelo.
 */
const CARPETAS = ["lib/", "app/", "drizzle/"];

/** El único módulo que puede seleccionar materiales, y devuelve grupos. */
const PUERTA_DE_MATERIALES = "lib/portal/materiales.ts";

type Regla = {
  readonly nombre: string;
  readonly re: RegExp;
  readonly porQue: string;
  readonly salvo?: readonly string[];
};

const REGLAS: readonly Regla[] = [
  {
    nombre: "vocabulario de plataforma de formación en el modelo",
    // Identificadores, no prosa: se exige forma de símbolo o de columna.
    re: /\b(?:lesson|leccion|lecciones|curriculum|syllabus|enrollment|enrolment|matricula|cohort|cohorte|quiz|assessment|evaluacion|grade_?book|certificate|certificado|completion|completado|progress|progreso)(?:_[a-z]+)?\s*[:=(]|\b(?:lesson|enrollment|cohort|quiz|certificate|completion|progress)_[a-z_]+\b/i,
    porQue:
      "frontera (b) de scope.md: no hay lecciones, progreso, evaluaciones ni " +
      "certificados. Esto entrega archivos de un proyecto; no imparte un curso.",
  },
  {
    nombre: "selecciona materiales fuera de su módulo",
    // Las TRES formas de construir la lista plana: por el ORM, por SQL, o
    // filtrando en memoria. No se prohíbe *nombrar* el tipo —`destinoDe()` lo
    // necesita para saber a qué bucket sube— sino SELECCIONAR por él.
    re: /eq\(\s*deliverable\.type\s*,\s*["']material["']|\btype\s*=\s*'material'|\.filter\([^\n]*["']material["']/,
    porQue:
      "criterio 2 de DU-20: no existe ruta ni entidad que liste materiales fuera " +
      `del proyecto que los contiene. La única puerta es ${PUERTA_DE_MATERIALES}, ` +
      "que devuelve grupos con su proyecto y no una lista plana.",
    salvo: [PUERTA_DE_MATERIALES],
  },
  {
    nombre: "membership usada como matrícula",
    re: /membership[^\n]{0,80}\b(?:progress|progreso|cohort|cohorte|completed_at|completion|certificate|grade|score)\b/i,
    porQue:
      "criterio 3 de DU-20 (RF-69, RF-144): membership dice de quién es una " +
      "persona, no en qué programas está apuntada ni cómo le va.",
  },
];

function archivos(): string[] {
  if (BARRIDO_NORMAL) {
    return execFileSync(
      "git",
      ["ls-files", "-z", "--cached", "--others", "--exclude-standard", "*.ts", "*.tsx", "*.sql"],
      { cwd: REPO_ROOT, encoding: "utf8" },
    )
      .split("\0")
      .filter(Boolean)
      .filter((r) => CARPETAS.some((c) => r.startsWith(c)))
      .map((r) => path.join(REPO_ROOT, r));
  }
  const extensiones = new Set([".ts", ".tsx", ".sql"]);
  const recorrer = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) return recorrer(abs);
      return extensiones.has(path.extname(e.name)) ? [abs] : [];
    });
  return recorrer(SCAN_ROOT);
}

/**
 * Comentarios y literales fuera. **Este archivo es la prueba de por qué**: casi
 * todo lo que prohíbe está escrito aquí arriba explicándolo, y un freno que se
 * dispara con su propia documentación es un freno que se desactiva el primer
 * día. Lo aprendimos en `test:aislamiento` (criterio 6) por las malas.
 */
function sinComentariosNiTexto(fuente: string): string {
  return fuente
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ")
    .replace(/--[^\n]*/g, " ")
    .replace(/`(?:[^`\\]|\\.)*`/g, "``")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''");
}

/**
 * La regla de los materiales **sí** necesita ver los literales: el tipo va
 * entrecomillado. Se le pasa el texto con los comentarios quitados pero las
 * cadenas intactas.
 */
function soloSinComentarios(fuente: string): string {
  return fuente
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ")
    .replace(/^\s*--[^\n]*/gm, " ");
}

type Hallazgo = { archivo: string; linea: number; regla: Regla };

const hallazgos: Hallazgo[] = [];
let revisados = 0;

for (const abs of archivos()) {
  if (!fs.existsSync(abs)) continue;
  const rel = path.relative(REPO_ROOT, abs).split(path.sep).join("/");
  // El propio freno habla DE las palabras prohibidas: nombrarlas no es usarlas.
  if (BARRIDO_NORMAL && rel.startsWith("scripts/ci/")) continue;

  revisados++;
  const crudo = fs.readFileSync(abs, "utf8");
  const sinTexto = sinComentariosNiTexto(crudo).split("\n");
  const conTexto = soloSinComentarios(crudo).split("\n");

  for (const regla of REGLAS) {
    if (regla.salvo?.some((s) => rel.endsWith(s))) continue;
    const lineas = regla.nombre === "selecciona materiales fuera de su módulo" ? conTexto : sinTexto;
    lineas.forEach((linea, i) => {
      if (regla.re.test(linea)) hallazgos.push({ archivo: rel, linea: i + 1, regla });
    });
  }
}

if (hallazgos.length > 0) {
  console.error(`✗ alcance: ${hallazgos.length} infracción(es) sobre ${revisados} archivos.\n`);
  for (const h of hallazgos) {
    console.error(`  ${h.archivo}:${h.linea} · ${h.regla.nombre}`);
    console.error(`      ${h.regla.porQue}`);
  }
  console.error("");
  process.exit(1);
}

console.log(
  `✓ alcance: ${revisados} archivos del modelo y la aplicación, ninguno cruza la frontera (b) de scope.md.`,
);
