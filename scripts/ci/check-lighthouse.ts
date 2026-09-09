/**
 * check-lighthouse.ts — Gate D1, medido por lo que de verdad importa.
 *
 * D-50 sustituye el presupuesto de JS inicial (RNF-03, retirada) por los
 * umbrales que ya fijaban RNF-01 y RNF-02: Lighthouse móvil ≥ 90 en
 * Performance, Accessibility, Best Practices y SEO, y LCP < 2,5 s. El
 * presupuesto de KB era un proxy mal calibrado — 172 KB de suelo de
 * React 19 + Next 16 App Router, cero librerías propias, con Lighthouse en
 * 98/100/92/100 — no el objetivo. El objetivo es la experiencia de carga
 * real, y eso es lo que este script mide, contra el build real arrancado con
 * `next start`, no una estimación.
 *
 * Rutas medidas hoy: solo Home — es la única página pública que existe en
 * M0-A. RNF-01 exige tres páginas (Home, un servicio, un artículo); DU-07
 * añade las otras dos a esta lista cuando existan, y cierra el gate D1.
 */
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import * as chromeLauncher from "chrome-launcher";
import lighthouse from "lighthouse";

const PUERTO = 4173;
const RUTAS = ["/"];
const UMBRAL_CATEGORIA = 0.9;
const UMBRAL_LCP_MS = 2500;

export interface ResultadoRuta {
  ruta: string;
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  lcpMs: number;
}

/**
 * La lógica del gate, separada de Lighthouse y de Chrome para poder probarla
 * sin arrancar un navegador real (`test-lighthouse-gate.ts`, R-26).
 */
export function evaluar(r: ResultadoRuta): string[] {
  const fallos: string[] = [];
  const pct = (n: number) => Math.round(n * 100);
  if (r.performance < UMBRAL_CATEGORIA) fallos.push(`Performance ${pct(r.performance)} < 90`);
  if (r.accessibility < UMBRAL_CATEGORIA) fallos.push(`Accessibility ${pct(r.accessibility)} < 90`);
  if (r.bestPractices < UMBRAL_CATEGORIA) fallos.push(`Best Practices ${pct(r.bestPractices)} < 90`);
  if (r.seo < UMBRAL_CATEGORIA) fallos.push(`SEO ${pct(r.seo)} < 90`);
  if (r.lcpMs >= UMBRAL_LCP_MS) fallos.push(`LCP ${(r.lcpMs / 1000).toFixed(1)}s ≥ 2,5s`);
  return fallos;
}

async function esperarServidor(url: string, intentos = 40): Promise<void> {
  for (let i = 0; i < intentos; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch {
      // aún no responde
    }
    await new Promise((res) => setTimeout(res, 500));
  }
  throw new Error(`El servidor no respondió en ${url} tras ${intentos * 0.5}s`);
}

async function medirRuta(ruta: string, puertoChrome: number): Promise<ResultadoRuta> {
  const salida = await lighthouse(`http://localhost:${PUERTO}${ruta}`, {
    port: puertoChrome,
    output: "json",
    logLevel: "error",
  });
  if (!salida) throw new Error(`Lighthouse no devolvió resultado para ${ruta}`);
  const { lhr } = salida;
  return {
    ruta,
    performance: lhr.categories.performance?.score ?? 0,
    accessibility: lhr.categories.accessibility?.score ?? 0,
    bestPractices: lhr.categories["best-practices"]?.score ?? 0,
    seo: lhr.categories.seo?.score ?? 0,
    lcpMs: lhr.audits["largest-contentful-paint"]?.numericValue ?? Number.POSITIVE_INFINITY,
  };
}

async function main() {
  console.log("Gate D1 — Lighthouse móvil (D-50)\n");

  let salidaServidor = "";
  const servidor: ChildProcessWithoutNullStreams = spawn(
    "npx",
    ["next", "start", "-p", String(PUERTO)],
    { env: { ...process.env, NODE_ENV: "production" } },
  );
  servidor.stdout.on("data", (d) => (salidaServidor += String(d)));
  servidor.stderr.on("data", (d) => (salidaServidor += String(d)));

  let chrome: chromeLauncher.LaunchedChrome | undefined;
  try {
    await esperarServidor(`http://localhost:${PUERTO}/api/health`);

    chrome = await chromeLauncher.launch({
      chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu"],
    });

    const resultados: ResultadoRuta[] = [];
    for (const ruta of RUTAS) resultados.push(await medirRuta(ruta, chrome.port));

    let fallos = 0;
    const pct = (n: number) => Math.round(n * 100).toString().padStart(3);
    for (const r of resultados) {
      const problemas = evaluar(r);
      console.log(
        `  ${r.ruta.padEnd(16)} Perf ${pct(r.performance)}  A11y ${pct(r.accessibility)}  ` +
          `BP ${pct(r.bestPractices)}  SEO ${pct(r.seo)}  LCP ${(r.lcpMs / 1000).toFixed(1)}s`,
      );
      if (problemas.length) {
        fallos++;
        for (const p of problemas) console.error(`    ✗ ${p}`);
      }
    }

    if (fallos) {
      console.error(`\n✗ ${fallos} ruta(s) por debajo del umbral del gate D1 (RNF-01, RNF-02).\n`);
      process.exitCode = 1;
      return;
    }
    console.log("\n✓ Gate D1 en verde en todas las rutas medidas hoy.\n");
  } catch (e) {
    console.error(`\n✗ ${(e as Error).message}\n${salidaServidor.slice(-2000)}\n`);
    process.exitCode = 1;
  } finally {
    if (chrome) await chrome.kill();
    servidor.kill();
  }
}

// Solo se ejecuta al invocarse directamente, no al importar `evaluar()` desde
// la prueba negativa — si no, cada import arrancaría Chrome y el servidor.
if (import.meta.url === `file://${process.argv[1]}`) main();
