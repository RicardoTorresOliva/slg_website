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
const fallos: Fallo[] = [];
let revisados = 0;

function ficheros(): string[] {
  if (BARRIDO_NORMAL) {
    return execFileSync("git", ["ls-files", "-z", "*.css", "*.tsx", "*.ts"], {
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
  const lineas = fs.readFileSync(abs, "utf8").split("\n");

  lineas.forEach((linea, i) => {
    const n = i + 1;

    // 1 · `transition-property` y `transition:` con propiedades que reflowean.
    const tp = linea.match(/transition(?:-property)?\s*:\s*([^;!]+)/i);
    if (tp) {
      for (const parte of tp[1].split(",")) {
        const prop = parte.trim().split(/\s+/)[0]?.toLowerCase();
        if (!prop || /^\d|^cubic-bezier|^ease|^linear|^steps|^var\(/.test(prop)) continue;
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
  const esAgarrable = /onPointerDown|setPointerCapture|touchAction|touch-action/.test(
    fs.readFileSync(abs, "utf8"),
  );
  if (esAgarrable && /@keyframes|animation-name\s*:/.test(fs.readFileSync(abs, "utf8"))) {
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
