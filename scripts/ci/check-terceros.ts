/**
 * check-terceros.ts — **CERO TERCEROS en la capa pública**, medido con un
 * navegador de verdad (DU-12 criterio 6 · RF-127 · RF-35 · gate D1).
 *
 * POR QUÉ NO ES UN `grep`. Un tercero no entra solo por un `<script src>`
 * escrito a mano: entra por una fuente pedida a un CDN dentro de un `@import`,
 * por un `<img>` de un píxel de seguimiento, por una librería que en tiempo de
 * ejecución se descarga a sí misma, o por una cookie que escribe un paquete que
 * nadie ha mirado. Nada de eso se ve leyendo el repositorio. **Se ve abriendo
 * la página y mirando qué pide el navegador.**
 *
 * QUÉ SE MIDE, sobre cada página pública:
 *   1. **Toda petición de red** sale del MISMO origen que sirve la página, o
 *      del origen de la analítica autoalojada si está configurado. Cualquier
 *      otro host es un tercero, tanto si responde como si no: lo que delata al
 *      visitante es la petición, no la respuesta.
 *   2. **Ninguna cookie** queda escrita tras cargar y esperar a que la página
 *      termine de arrancar. La capa pública no tiene sesión ni medición con
 *      estado, así que la cifra correcta es **cero**, no «solo las nuestras».
 *
 * PRUEBA NEGATIVA (R-26): `TERCEROS_FIXTURE=…/negative/terceros/roto.html`
 * apunta el MISMO medidor a una página que carga un script de terceros, pide
 * una fuente a un CDN y escribe una cookie de seguimiento. Si no se pone en
 * rojo ahí, el medidor no mide.
 *
 * El fixture **se sirve por HTTP**, no se abre como `file://`, y la diferencia
 * no es cosmética: Chromium **no guarda cookies de un origen `file://`**, así
 * que sobre un archivo suelto la mitad del medidor que busca cookies saldría
 * verde sin haber medido nada. Con eso, la prueba negativa habría certificado
 * un freno medio roto.
 *
 * Necesita `npm run build:standalone` (salvo con `TERCEROS_FIXTURE`) y el
 * Chromium de Playwright.
 */
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import path from "node:path";

import { chromium } from "playwright";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const SERVER = path.join(REPO_ROOT, ".next", "standalone", "server.js");

let fallos = 0;
let comprobaciones = 0;

function check(caso: string, ok: boolean, detalle = "") {
  comprobaciones++;
  if (ok) console.log(`  ✓ ${caso}`);
  else {
    fallos++;
    console.error(`  ✗ ${caso}${detalle ? `\n      ${detalle}` : ""}`);
  }
}

/** Mismo criterio que `test-gesto.ts`: el binario ya instalado antes que la descarga. */
function rutaDeChromium(): string | undefined {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const raiz = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!raiz || !fs.existsSync(raiz)) return undefined;
  const candidatos = fs
    .readdirSync(raiz)
    .filter((d) => d.startsWith("chromium-"))
    .map((d) => path.join(raiz, d, "chrome-linux", "chrome"))
    .filter((f) => fs.existsSync(f));
  return candidatos[0];
}

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

/**
 * Las páginas donde se mide. Una de cada FORMA, no una de cada ruta: portada,
 * una página de contenido, una con formulario —que es la que más librería
 * arrastra—, un artículo y el índice del blog.
 */
const PAGINAS = ["/", "/doctrina", "/descargas", "/contacto", "/blog", "/en"];

async function arrancarServidor(): Promise<{ url: string; parar: () => void }> {
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
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? "solo-para-medir-los-terceros",
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
      const r = await fetch(base);
      if (r.ok) return { url: base, parar: () => proc.kill("SIGTERM") };
    } catch {
      /* todavía no escucha */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  proc.kill("SIGTERM");
  throw new Error("el servidor no respondió en 30 s");
}

/**
 * Los orígenes permitidos: el que sirve la página y, si está configurada, la
 * analítica AUTOALOJADA. La lista no tiene ninguna entrada escrita a mano, y
 * eso es deliberado: en cuanto un dominio se pueda añadir aquí «porque es de
 * confianza», el freno deja de frenar.
 */
function permitidos(base: string): Set<string> {
  const set = new Set<string>();
  try {
    set.add(new URL(base).host);
  } catch {
    /* file:// no tiene host: entonces solo se permite lo sin host */
  }
  const analitica = process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL;
  if (analitica) {
    try {
      set.add(new URL(analitica).host);
    } catch {
      /* mal escrita: no se permite nada */
    }
  }
  return set;
}

/** Sirve UN archivo por HTTP, para que el fixture tenga origen y pueda tener cookies. */
async function servirFixture(archivo: string): Promise<{ url: string; parar: () => void }> {
  const cuerpo = fs.readFileSync(archivo);
  const srv = http.createServer((_req, res) => {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(cuerpo);
  });
  const port = await puertoLibre();
  await new Promise<void>((r) => srv.listen(port, "127.0.0.1", r));
  return { url: `http://127.0.0.1:${port}`, parar: () => srv.close() };
}

async function main() {
  const fixture = process.env.TERCEROS_FIXTURE;
  const servidor = fixture ? await servirFixture(fixture) : await arrancarServidor();
  const base = servidor.url;
  const paginas = fixture ? ["/"] : PAGINAS;
  const blancos = permitidos(base);

  const navegador = await chromium.launch({ executablePath: rutaDeChromium() });

  try {
    for (const pagina of paginas) {
      const destino = `${base}${pagina}`;
      // Contexto NUEVO por página: las cookies de una no pueden enmascarar las
      // de la siguiente, ni al revés.
      const contexto = await navegador.newContext();
      const page = await contexto.newPage();

      const ajenas: string[] = [];
      page.on("request", (r) => {
        const u = r.url();
        // `data:` y `blob:` son del propio documento: no salen a ninguna parte.
        if (u.startsWith("data:") || u.startsWith("blob:") || u.startsWith("file:")) return;
        let host = "";
        try {
          host = new URL(u).host;
        } catch {
          return;
        }
        if (!blancos.has(host)) ajenas.push(`${r.resourceType()} → ${u.slice(0, 120)}`);
      });

      await page.goto(destino, { waitUntil: "load" }).catch(() => {});
      // Un tercero que se carga a sí mismo lo hace DESPUÉS de `load`: sin esta
      // espera, el medidor mira antes de que aparezca lo que busca.
      await page.waitForTimeout(1_500);

      const cookies = await contexto.cookies();

      const nombre = pagina || destino;
      check(
        `${nombre} · ni una sola petición fuera de nuestro origen`,
        ajenas.length === 0,
        ajenas.slice(0, 5).join("\n      "),
      );
      check(
        `${nombre} · ni una sola cookie`,
        cookies.length === 0,
        cookies.map((c) => `${c.name}=${String(c.value).slice(0, 20)} (${c.domain})`).join(" · "),
      );

      await contexto.close();
    }
  } finally {
    await navegador.close();
    servidor.parar();
  }

  if (fallos > 0) {
    console.error(`\n✗ terceros: ${fallos} de ${comprobaciones} comprobaciones fallaron.\n`);
    process.exit(1);
  }
  console.log(
    `\n✓ terceros: ${comprobaciones} comprobaciones en un navegador real; la capa pública no carga ningún script de terceros ni escribe ninguna cookie.`,
  );
}

await main();
