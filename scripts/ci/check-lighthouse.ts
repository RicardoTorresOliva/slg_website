/**
 * check-lighthouse.ts — La medición de rendimiento, **ahora y no al final**.
 *
 * El criterio 6 de DU-03 lo dice con todas las letras: «Lighthouse móvil se mide
 * **aquí, ya**, no al final: es la primera medición del proyecto». Es la
 * mitigación de **R-21** — descubrir en la última semana que el sitio no llega
 * al umbral, cuando ya no queda margen para cambiar nada estructural.
 *
 * Se mide en **móvil**, con la simulación de red y CPU que Lighthouse aplica por
 * defecto: medir en escritorio con fibra es medirse a uno mismo.
 *
 * Umbrales del gate D6 (`RNF-01`…`RNF-03`): se leen de las variables
 * `LH_MIN_*` para poder endurecerlos sin tocar el script.
 */
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";

import { chromium, type Browser } from "playwright";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const SERVER = path.join(REPO_ROOT, ".next", "standalone", "server.js");

/** Las tres páginas que el gate D1/D6 exige: portada, servicio y artículo. */
const PAGINAS = ["/", "/ai/enterprise/readiness", "/blog/mes-cuatro"];

const MINIMOS = {
  performance: Number(process.env.LH_MIN_PERFORMANCE ?? 90),
  accessibility: Number(process.env.LH_MIN_ACCESSIBILITY ?? 95),
  "best-practices": Number(process.env.LH_MIN_BEST_PRACTICES ?? 90),
  seo: Number(process.env.LH_MIN_SEO ?? 90),
};

let fallos = 0;

async function puertoLibre(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const dir = srv.address();
      if (typeof dir === "object" && dir) {
        const p = dir.port;
        srv.close(() => resolve(p));
      } else reject(new Error("sin puerto"));
    });
  });
}

function rutaDeChromium(): string | undefined {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const raiz = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!raiz || !fs.existsSync(raiz)) return undefined;
  return fs
    .readdirSync(raiz)
    .filter((d) => d.startsWith("chromium-"))
    .map((d) => path.join(raiz, d, "chrome-linux", "chrome"))
    .find((f) => fs.existsSync(f));
}

async function arrancar() {
  const port = await puertoLibre();
  const base = `http://127.0.0.1:${port}`;
  const proc: ChildProcess = spawn(process.execPath, [SERVER], {
    cwd: path.dirname(SERVER),
    env: {
      ...process.env,
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
      NODE_ENV: "production",
      BETTER_AUTH_URL: base,
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? "solo-para-medir",
      NEXT_PUBLIC_SITE_URL: base,
      STAGING_BASIC_AUTH_USER: "",
      STAGING_BASIC_AUTH_PASSWORD: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const limite = Date.now() + 30_000;
  while (Date.now() < limite) {
    if (proc.exitCode !== null) throw new Error(`el servidor murió con código ${proc.exitCode}`);
    try {
      if ((await fetch(`${base}/api/health`)).ok) return { base, parar: () => proc.kill("SIGTERM") };
    } catch {
      /* aún no escucha */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  proc.kill("SIGTERM");
  throw new Error("el servidor no respondió en 30 s");
}

async function main() {
  const { default: lighthouse } = await import("lighthouse");
  const { base, parar } = await arrancar();
  let navegador: Browser | null = null;

  try {
    const puertoDepuracion = await puertoLibre();
    navegador = await chromium.launch({
      executablePath: rutaDeChromium(),
      args: ["--no-sandbox", `--remote-debugging-port=${puertoDepuracion}`],
    });

    console.log("Lighthouse — móvil, con la simulación de red y CPU por defecto.\n");
    console.log(
      `Umbrales: rendimiento ${MINIMOS.performance} · accesibilidad ${MINIMOS.accessibility} · ` +
        `buenas prácticas ${MINIMOS["best-practices"]} · SEO ${MINIMOS.seo}\n`,
    );

    for (const ruta of PAGINAS) {
      const resultado = await lighthouse(
        `${base}${ruta}`,
        { port: puertoDepuracion, output: "json", logLevel: "error" },
        undefined,
      );
      const categorias = resultado?.lhr.categories;
      if (!categorias) {
        console.error(`  ✗ ${ruta}: Lighthouse no devolvió resultado`);
        fallos++;
        continue;
      }

      const linea: string[] = [];
      let rutaOk = true;
      for (const [clave, minimo] of Object.entries(MINIMOS)) {
        const puntuacion = Math.round((categorias[clave]?.score ?? 0) * 100);
        linea.push(`${clave.slice(0, 4)} ${String(puntuacion).padStart(3)}`);
        if (puntuacion < minimo) {
          rutaOk = false;
          fallos++;
        }
      }
      console.log(`  ${rutaOk ? "✓" : "✗"} ${ruta.padEnd(34)} ${linea.join(" · ")}`);
    }
  } finally {
    await navegador?.close();
    parar();
  }

  if (fallos > 0) {
    console.error(`\n✗ lighthouse: ${fallos} categoría(s) por debajo del umbral.\n`);
    console.error("  R-21: esto se mide AHORA para que quede margen de corregirlo.\n");
    process.exit(1);
  }
  console.log("\n✓ lighthouse: las tres páginas sobre los umbrales del gate D6.");
}

await main();
