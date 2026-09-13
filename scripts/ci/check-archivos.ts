/**
 * check-archivos.ts — Los criterios 2 y 5 de FU-09, como freno.
 *
 *   · Criterio 2 — **no existe** ningún endpoint que devuelva el listado de un
 *     bucket (RF-123, gate D10).
 *   · Criterio 5 — cero PDF de descarga y cero entregables de cliente en
 *     control de versiones (RNF-27).
 *
 * El criterio 5 dice literalmente «un `grep` del repositorio confirma». Esto ES
 * ese grep, corriendo en cada push en vez de cuando alguien se acuerde. Importa
 * porque el repositorio es **público**: un entregable de cliente subido por
 * error no se arregla borrándolo, se arregla avisando al cliente.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const SCAN_ROOT = process.env.ARCHIVOS_ROOT ? path.resolve(process.env.ARCHIVOS_ROOT) : REPO_ROOT;
const BARRIDO_NORMAL = SCAN_ROOT === REPO_ROOT;

type Fallo = { detalle: string };
const fallos: Fallo[] = [];
let revisados = 0;

/* ── Criterio 2 · nadie lista un bucket ──────────────────────────────────── */

/**
 * Las órdenes de listado de la API S3. Buscar el nombre del comando es lo más
 * cercano a «no existe el endpoint» que se puede comprobar por texto: para
 * listar hay que nombrarlas.
 */
const ORDENES_DE_LISTADO = [
  "ListObjectsCommand",
  "ListObjectsV2Command",
  "ListBucketsCommand",
  "ListMultipartUploadsCommand",
];

/**
 * `lib/files/s3.ts` es el único que podría envolverlas, y precisamente por eso
 * se revisa también: la garantía es que NADIE las use, ni el propio adaptador.
 */
function ficheros(): string[] {
  if (BARRIDO_NORMAL) {
  // `--cached --others --exclude-standard`, y no solo lo indexado: un archivo
  // NUEVO todavía sin `git add` es código que YA corre, y el freno tiene que
  // verlo. Sin esto una unidad entera pasa en verde contra sus propios archivos
  // sin versionar y el CI se pone rojo en el primer push. Pasó con FU-10.
    return execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { cwd: REPO_ROOT, encoding: "utf8" })
      .split("\0")
      .filter(Boolean)
      .map((r) => path.join(REPO_ROOT, r));
  }
  const recorrer = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const abs = path.join(dir, e.name);
      return e.isDirectory() ? recorrer(abs) : [abs];
    });
  return recorrer(SCAN_ROOT);
}

/**
 * En el barrido del repositorio se salta `scripts/ci/negative/`: ahí viven, a
 * propósito, un archivo que lista un bucket y un PDF de mentira, para que este
 * freno demuestre que sabe ponerse rojo. Solo en el barrido normal — con
 * `ARCHIVOS_ROOT` apuntando ahí, tiene que verlos, o la prueba negativa
 * escanearía cero archivos y anunciaría verde (R-26).
 */
const todos = ficheros()
  .filter((f) => fs.existsSync(f))
  .filter((f) => {
    if (!BARRIDO_NORMAL) return true;
    const rel = path.relative(REPO_ROOT, f).split(path.sep).join("/");
    return !rel.startsWith("scripts/ci/negative/");
  });

for (const abs of todos.filter((f) => /\.(ts|tsx|js|mjs)$/.test(f))) {
  const rel = path.relative(REPO_ROOT, abs).split(path.sep).join("/");
  // Este propio freno nombra las órdenes para poder buscarlas.
  if (BARRIDO_NORMAL && rel === "scripts/ci/check-archivos.ts") continue;
  revisados++;
  const texto = fs.readFileSync(abs, "utf8");
  for (const orden of ORDENES_DE_LISTADO) {
    if (texto.includes(orden)) {
      fallos.push({
        detalle:
          `${rel} usa ${orden}: ninguna ruta de la aplicación lista el contenido ` +
          `de un bucket (RF-123, gate D10). El acceso es solo por URL firmada.`,
      });
    }
  }
}

/* ── Criterio 5 · nada gated en control de versiones ─────────────────────── */

/**
 * Extensiones de contenido entregable. `public/` queda fuera: ahí viven las
 * fuentes y el favicon, que son del sitio y no de un cliente.
 */
const EXTENSIONES_GATED = [".pdf", ".docx", ".pptx", ".xlsx"];
const CARPETAS_PERMITIDAS = ["public/"];

for (const abs of todos) {
  const rel = path.relative(REPO_ROOT, abs).split(path.sep).join("/");
  const ext = path.extname(rel).toLowerCase();
  if (!EXTENSIONES_GATED.includes(ext)) continue;
  if (CARPETAS_PERMITIDAS.some((c) => rel.startsWith(c))) continue;

  fallos.push({
    detalle:
      `${rel} está en control de versiones. Los documentos de descarga y los ` +
      `entregables de cliente viven en los buckets privados, NUNCA en el repo, ` +
      `que es público (RNF-27, criterio 5 de FU-09).`,
  });
}

if (fallos.length > 0) {
  console.error(`✗ archivos: ${fallos.length} fallo(s) sobre ${revisados} archivos de código.\n`);
  for (const f of fallos) console.error(`  · ${f.detalle}`);
  console.error("");
  process.exit(1);
}

console.log(
  `✓ archivos: ${revisados} archivos de código sin órdenes de listado, y cero documentos ` +
    `gated en control de versiones.`,
);
