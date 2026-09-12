/**
 * check-js-budget.ts — Presupuesto de JavaScript inicial (gate D1, RNF-03).
 *
 * Mide lo que el NAVEGADOR descarga, no lo que el bundler dice que pesa: recorre
 * el HTML ya prerenderizado de cada ruta pública, extrae los `<script src>` y los
 * `preload as="script"`, y suma el tamaño COMPRIMIDO de cada chunk distinto.
 *
 * Por qué desde el HTML y no desde los manifiestos de Next: los manifiestos
 * cambian de forma entre versiones —Next 16 con Turbopack ya no emite
 * `app-build-manifest.json`— y un gate que se rompe al actualizar el framework
 * acaba desactivado. El HTML servido es el contrato real con el navegador.
 *
 * Cubre: RNF-03 · gate D1 · FU-05 criterios 4 y 5.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const NEXT_DIR = path.join(REPO_ROOT, ".next");
const HTML_ROOT = path.join(NEXT_DIR, "server", "app");

/**
 * 150 KB comprimidos, el número del Anexo D (gate D1). Sobreescribible SOLO para
 * que la prueba negativa del criterio 5 pueda exigir que el freno frene.
 */
const BUDGET = Number(process.env.JS_BUDGET_BYTES ?? 150 * 1024);

/**
 * Rutas que no son páginas públicas: no llevan presupuesto porque nadie aterriza
 * en ellas desde un buscador.
 */
const EXCLUDED = new Set(["_global-error"]);

type PageReport = { route: string; bytes: number; chunks: number };

function htmlFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) return htmlFiles(abs);
    return e.isFile() && e.name.endsWith(".html") ? [abs] : [];
  });
}

/** Cache de tamaños comprimidos: el mismo chunk aparece en muchas páginas. */
const gzipCache = new Map<string, number>();

function gzippedSize(staticRelPath: string): number {
  const cached = gzipCache.get(staticRelPath);
  if (cached !== undefined) return cached;

  const abs = path.join(NEXT_DIR, staticRelPath);
  if (!fs.existsSync(abs)) {
    // Un chunk referenciado que no existe es un empaquetado roto: el fallo de
    // FU-02 (HTML de una compilación sirviendo chunks de otra) exactamente.
    throw new Error(
      `Chunk referenciado que no existe en el build: ${staticRelPath}\n` +
        `  El HTML apunta a un archivo que no se ha emitido. Compilación inconsistente.`,
    );
  }
  const size = zlib.gzipSync(fs.readFileSync(abs), { level: 9 }).length;
  gzipCache.set(staticRelPath, size);
  return size;
}

function scriptsOf(html: string): string[] {
  const urls = new Set<string>();

  for (const m of html.matchAll(/<script\b([^>]*)>/g)) {
    const attrs = m[1];
    /**
     * `noModule` es el paquete de polyfills para navegadores sin módulos ES. Un
     * navegador moderno lo ignora por completo: no lo pide, no lo analiza, no lo
     * ejecuta. Contarlo mediría un navegador que no es el que el gate D1 vigila
     * —Lighthouse mide el moderno— y el presupuesto se agotaría con 39 KB que
     * nadie de nuestro público descarga.
     */
    if (/\bnoModule\b/i.test(attrs)) continue;
    const src = attrs.match(/\bsrc="(\/_next\/static\/[^"]+)"/);
    if (src) urls.add(src[1]);
  }

  for (const m of html.matchAll(
    /<link[^>]+rel="preload"[^>]+href="(\/_next\/static\/[^"]+)"[^>]*as="script"/g,
  )) {
    urls.add(m[1]);
  }

  return [...urls].map((u) => u.replace("/_next/", ""));
}

function main() {
  const files = htmlFiles(HTML_ROOT);
  if (files.length === 0) {
    console.error(
      `✗ presupuesto de JS: no hay HTML prerenderizado en ${path.relative(REPO_ROOT, HTML_ROOT)}.\n` +
        `  Ejecuta \`npm run build\` antes de este gate.`,
    );
    process.exit(1);
  }

  const pages: PageReport[] = [];
  for (const file of files) {
    const route =
      "/" +
      path
        .relative(HTML_ROOT, file)
        .replace(/\.html$/, "")
        .replace(/(^|\/)index$/, "");
    const name = route.slice(1);
    if (EXCLUDED.has(name)) continue;

    const chunks = scriptsOf(fs.readFileSync(file, "utf8"));
    const bytes = chunks.reduce((sum, c) => sum + gzippedSize(c), 0);
    pages.push({ route: route === "" ? "/" : route, bytes, chunks: chunks.length });
  }

  pages.sort((a, b) => b.bytes - a.bytes);

  const kb = (n: number) => `${(n / 1024).toFixed(1)} KB`;
  console.log(`Presupuesto: ${kb(BUDGET)} comprimidos de JS inicial por ruta (gate D1).\n`);
  for (const p of pages) {
    const pct = Math.round((p.bytes / BUDGET) * 100);
    const mark = p.bytes > BUDGET ? "✗" : "·";
    console.log(
      `  ${mark} ${p.route.padEnd(28)} ${kb(p.bytes).padStart(9)}  ${String(pct).padStart(3)}%  ${p.chunks} chunks`,
    );
  }
  console.log("");

  const overBudget = pages.filter((p) => p.bytes > BUDGET);
  if (overBudget.length > 0) {
    console.error(
      `✗ presupuesto de JS: ${overBudget.length} ruta(s) por encima de ${kb(BUDGET)}.\n` +
        overBudget.map((p) => `    ${p.route} → ${kb(p.bytes)}`).join("\n") +
        `\n\n  El gate D1 no es un aviso: se corrige la ruta o se sube el presupuesto` +
        ` con una decisión escrita en docs/decision_log.md.\n`,
    );
    process.exit(1);
  }

  const peor = pages[0];
  console.log(
    `✓ presupuesto de JS: ${pages.length} rutas bajo presupuesto. ` +
      `La más pesada es ${peor.route} con ${kb(peor.bytes)}.`,
  );
}

try {
  main();
} catch (err) {
  console.error(`✗ presupuesto de JS: ${(err as Error).message}`);
  process.exit(1);
}
