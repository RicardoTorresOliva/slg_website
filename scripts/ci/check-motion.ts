/**
 * check-motion.ts — Las reglas de C.4 que se pueden comprobar leyendo, y solo
 * esas. Criterios 8, 9 y 11 de FU-10.
 *
 * LO QUE ESTE FRENO **NO** HACE, y conviene que quede escrito: no sustituye la
 * revisión cuadro a cuadro que el gate D3 exige para el sheet y el hero
 * (RNF-45, criterio 10). Un fotograma perdido no se ve en el código. Lo que sí
 * se ve en el código son los tres errores que producen fotogramas perdidos, y
 * esos son los que se atrapan aquí:
 *
 *   1. **Animar algo que no sea `transform` u `opacity`** (RNF-11). Animar
 *      `width`, `height`, `top` o `margin` provoca reflow en cada fotograma.
 *   2. **`@keyframes` en una interacción agarrable** (RNF-12). Un keyframe sabe
 *      dónde empieza y dónde acaba, no dónde ESTÁ: al interrumpirlo, salta.
 *   3. **`will-change` repartido** (RNF-11). Puesto donde el movimiento no es
 *      inminente, reserva capas de composición que no se usan y empeora
 *      exactamente lo que pretendía mejorar.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const SCAN_ROOT = process.env.MOTION_ROOT ? path.resolve(process.env.MOTION_ROOT) : REPO_ROOT;
const BARRIDO_NORMAL = SCAN_ROOT === REPO_ROOT;

/** Propiedades que sí se pueden animar. Cualquier otra provoca reflow o repaint. */
const ANIMABLES = new Set(["transform", "opacity", "none", "all-unset"]);

type Fallo = { archivo: string; linea: number; detalle: string };
/**
 * Propiedades CSS que este freno reconoce como tales. No es la lista completa
 * de CSS: es la de las que aparecen en una transición y **provocan reflow**,
 * que son las que RNF-11 persigue. Lo que no esté aquí ni en `ANIMABLES`, en un
 * archivo de código, es una variable.
 */
const PROPIEDADES_CSS = new Set([
  "all",
  "background",
  "background-color",
  "border",
  "border-color",
  "border-radius",
  "bottom",
  "box-shadow",
  "color",
  "filter",
  "flex",
  "font-size",
  "gap",
  "grid-template-columns",
  "height",
  "inset",
  "left",
  "margin",
  "max-height",
  "max-width",
  "min-height",
  "min-width",
  "padding",
  "right",
  "top",
  "visibility",
  "width",
  "z-index",
]);

/** Quita comentarios de bloque y de línea, conservando el número de líneas. */
function sinComentarios(fuente: string): string {
  return fuente
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1: string) => p1 + " ".repeat(m.length - p1.length));
}

const fallos: Fallo[] = [];
let revisados = 0;

function ficheros(): string[] {
  if (BARRIDO_NORMAL) {
  // `--cached --others --exclude-standard`, y no solo lo indexado: un archivo
  // NUEVO todavía sin `git add` es código que YA corre, y el freno tiene que
  // verlo. Sin esto una unidad entera pasa en verde contra sus propios archivos
  // sin versionar y el CI se pone rojo en el primer push. Pasó con FU-10.
    return execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard", "*.css", "*.tsx", "*.ts"], {
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
      return e.isDirectory() ? recorrer(abs) : [abs];
    });
  return recorrer(SCAN_ROOT);
}

for (const abs of ficheros()) {
  if (!fs.existsSync(abs)) continue;
  const rel = path.relative(REPO_ROOT, abs).split(path.sep).join("/");
  // El propio freno nombra las propiedades para poder buscarlas.
  if (BARRIDO_NORMAL && rel === "scripts/ci/check-motion.ts") continue;
  if (BARRIDO_NORMAL && rel.startsWith("scripts/ci/negative/")) continue;
  if (rel.startsWith("node_modules/")) continue;

  revisados++;
  const fuente = fs.readFileSync(abs, "utf8");
  /**
   * Se barre el código SIN COMENTARIOS.
   *
   * Los comentarios de estos archivos hablan de lo que el freno prohíbe —«cero
   * `@keyframes`», «un `@keyframes` no sabe dónde está»—, y el freno los leía
   * como infracciones. Un freno que se pone rojo por la documentación de la
   * regla que vigila enseña a ignorarlo, que es peor que no tenerlo.
   */
  const codigo = sinComentarios(fuente);
  const lineas = codigo.split("\n");

  lineas.forEach((linea, i) => {
    const n = i + 1;

    // 1 · `transition-property` y `transition:` con propiedades que reflowean.
    const tp = linea.match(/transition(?:-property)?\s*:\s*([^;!]+)/i);
    if (tp) {
      for (const parte of tp[1].split(",")) {
        const prop = parte.trim().split(/\s+/)[0]?.toLowerCase();
        if (!prop || /^\d|^cubic-bezier|^ease|^linear|^steps|^var\(/.test(prop)) continue;
        // En un `.tsx`, lo que sigue a `transition:` puede ser una EXPRESIÓN y
        // no una lista de propiedades: `transition: arrastrando ? "none" : …`.
        // `arrastrando` no es una propiedad CSS, es una variable, y tratarla
        // como propiedad es un rojo falso. Se distingue por lista explícita y
        // no por heurística: `width` y `height` también son identificadores sin
        // guion, y esos SÍ hay que atraparlos.
        const esExpresion = !rel.endsWith(".css") && !ANIMABLES.has(prop) && !PROPIEDADES_CSS.has(prop);
        if (esExpresion) continue;
        if (!ANIMABLES.has(prop)) {
          fallos.push({
            archivo: rel,
            linea: n,
            detalle:
              `anima «${prop}»: solo se animan transform y opacity (RNF-11). ` +
              `Todo lo demás provoca reflow en cada fotograma.`,
          });
        }
      }
    }

    // 3 · `will-change` solo donde el movimiento es inminente.
    const wc = linea.match(/will-?[Cc]hange\s*[:=]\s*["']?([a-z, -]+)/);
    if (wc) {
      for (const prop of wc[1].split(",").map((p) => p.trim().toLowerCase())) {
        if (prop && prop !== "auto" && !ANIMABLES.has(prop)) {
          fallos.push({
            archivo: rel,
            linea: n,
            detalle: `will-change: «${prop}» — solo transform u opacity, y solo donde el movimiento es inminente (RNF-11).`,
          });
        }
      }
    }
  });

  // 2 · `@keyframes` en un componente agarrable.
  const esAgarrable = /onPointerDown|setPointerCapture|touchAction|touch-action/.test(codigo);
  // `animationName` —la forma que toma en un `.tsx`— NO estaba en esta regla:
  // el freno solo veía `animation-name`, que es la forma de CSS, así que un
  // componente de React con un keyframe pasaba entero. Lo descubrió su propio
  // fixture al dejar de disparar desde un comentario.
  if (esAgarrable && /@keyframes|animation-?[Nn]ame\s*[:=]/.test(codigo)) {
    fallos.push({
      archivo: rel,
      linea: 0,
      detalle:
        `usa @keyframes en un componente agarrable (RNF-12). Una interacción que ` +
        `se puede interrumpir se anima desde el valor PRESENTADO; un keyframe no ` +
        `sabe dónde está y salta.`,
    });
  }
}

if (fallos.length > 0) {
  console.error(`✗ motion: ${fallos.length} infracción(es) sobre ${revisados} archivos.\n`);
  for (const f of fallos) {
    console.error(`  ${f.archivo}${f.linea ? `:${f.linea}` : ""}\n      ${f.detalle}`);
  }
  console.error(
    `\n  Estas tres reglas son las que producen fotogramas perdidos. La revisión\n` +
      `  cuadro a cuadro del gate D3 sigue siendo obligatoria: este freno no la sustituye.\n`,
  );
  process.exit(1);
}

console.log(
  `✓ motion: ${revisados} archivos — solo transform y opacity animados, ` +
    `sin @keyframes en interacciones agarrables, will-change acotado.`,
);
