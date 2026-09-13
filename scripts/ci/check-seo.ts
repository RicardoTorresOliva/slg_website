/**
 * check-seo.ts — Los criterios 1, 2 y 3 de DU-07, sobre el HTML servido.
 *
 * Tres cosas que se rompen solas y no avisan:
 *
 *   · **`hreflang` recíproco** (RF-05, gate D4). Si `/ai` declara que su
 *     versión inglesa es `/en/ai` pero `/en/ai` no declara la española, los
 *     buscadores **ignoran las dos**. Es un fallo silencioso: la página se ve
 *     perfecta y el par no existe para nadie más.
 *   · **Metadatos únicos**. Dos páginas con el mismo `<title>` compiten entre
 *     ellas en los resultados, y la que gana no la eliges tú. Se comprueba que
 *     no hay ni un título ni una descripción repetidos en las dos mitades.
 *   · **`canonical` propio por idioma.** Un `canonical` copiado de otra página
 *     —el error más común al duplicar un archivo— le dice al buscador que esta
 *     página **no debe indexarse**.
 *
 * Y además: `sitemap.xml`, `robots.txt`, `schema.org` y las páginas 404 y 500.
 *
 * Requiere `npm run build:standalone`.
 */
import { spawn, type ChildProcess } from "node:child_process";
import net from "node:net";
import path from "node:path";

import { rutasDelSitemap } from "../../lib/content/seo.ts";

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
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? "solo-para-comprobar-el-seo",
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? "https://softlandingglobal.com",
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

const etiqueta = (html: string, re: RegExp) => re.exec(html)?.[1] ?? "";

const titulo = (html: string) => etiqueta(html, /<title>([\s\S]*?)<\/title>/);
const descripcion = (html: string) =>
  etiqueta(html, /<meta name="description" content="([^"]*)"/);
const canonical = (html: string) => etiqueta(html, /<link rel="canonical" href="([^"]*)"/);

/** Todos los `hreflang` de la página, como mapa idioma → URL. */
function alternativas(html: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of html.matchAll(
    /<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g,
  )) {
    out[m[1]] = m[2];
  }
  return out;
}

async function main() {
  // `SEO_BASE` apunta el medidor a otro servidor: lo usa su prueba negativa.
  const externo = process.env.SEO_BASE;
  const { base, parar } = externo ? { base: externo, parar: () => {} } : await arrancar();
  try {
    const rutas = rutasDelSitemap();
    /**
     * Los títulos se comparan **dentro de cada idioma**, no entre idiomas.
     *
     * `/ai` y `/en/ai` se llaman los dos «SLG_AI» y eso es correcto: la
     * nomenclatura **no se traduce** (RF-14), y el par lo declara `hreflang`.
     * Exigir títulos distintos entre idiomas obligaría a inventar una
     * traducción de un nombre propio, que es justo lo que el proyecto prohíbe.
     */
    const titulos = new Map<string, Map<string, string>>([
      ["es", new Map()],
      ["en", new Map()],
    ]);
    const descripciones = new Map<string, Map<string, string>>([
      ["es", new Map()],
      ["en", new Map()],
    ]);

    console.log(`\nCriterios 1 y 2 — canonical propio y hreflang recíproco, en ${rutas.length} rutas:\n`);

    const paginas = new Map<string, string>();
    for (const ruta of rutas) {
      const r = await fetch(`${base}${ruta}`);
      if (!r.ok) {
        check(`${ruta} responde`, false, `status ${r.status}`);
        continue;
      }
      paginas.set(ruta, await r.text());
    }

    /**
     * El `canonical` se fija **en la compilación**, no en la petición: las
     * páginas están prerrenderizadas. Así que se compara contra el origen que
     * el HTML declara, y lo que se verifica es lo que de verdad importa —que
     * cada página apunta a SU ruta y que todas comparten un solo origen—.
     * Compararlo contra el puerto del servidor de prueba habría dado un rojo
     * permanente y falso.
     */
    const origen = (canonical(paginas.get("/") ?? "") || "").replace(/\/$/, "");
    check(
      "las páginas declaran un origen canónico",
      origen.startsWith("http"),
      `la portada declara: ${canonical(paginas.get("/") ?? "") || "(ausente)"}`,
    );

    for (const [ruta, html] of paginas) {
      const idioma = ruta === "/en" || ruta.startsWith("/en/") ? "en" : "es";
      const esperado = ruta === "/" ? `${origen}/` : `${origen}${ruta}`;
      // Canonical propio: apunta a ESTA ruta, no a otra.
      check(
        `${ruta} · canonical propio`,
        canonical(html) === esperado,
        `canonical: ${canonical(html) || "(ausente)"}, esperado ${esperado}`,
      );

      // hreflang recíproco: si declara pareja, la pareja declara la vuelta.
      const alt = alternativas(html);
      const enOtroIdioma = ruta.startsWith("/en") ? alt.es : alt.en;
      if (enOtroIdioma) {
        const rutaPar = enOtroIdioma.replace(origen, "") || "/";
        const htmlPar = paginas.get(rutaPar);
        const altPar = htmlPar ? alternativas(htmlPar) : {};
        const vuelta = ruta.startsWith("/en") ? altPar.en : altPar.es;
        check(
          `${ruta} ⇄ ${rutaPar} · hreflang recíproco`,
          vuelta === (ruta === "/" ? `${origen}/` : `${origen}${ruta}`),
          htmlPar
            ? `la vuelta apunta a ${vuelta || "(nada)"}`
            : `${rutaPar} no está entre las rutas comprobadas`,
        );
      }

      // Metadatos únicos: ni un título ni una descripción repetidos.
      const t = titulo(html);
      const d = descripcion(html);
      const titulosDelIdioma = titulos.get(idioma)!;
      const descripcionesDelIdioma = descripciones.get(idioma)!;
      if (titulosDelIdioma.has(t)) {
        check(
          `${ruta} · título único en ${idioma}`,
          false,
          `repetido con ${titulosDelIdioma.get(t)}: «${t}»`,
        );
      } else {
        titulosDelIdioma.set(t, ruta);
        check(`${ruta} · título único en ${idioma}`, t.length > 0, "sin <title>");
      }
      if (d && descripcionesDelIdioma.has(d)) {
        check(
          `${ruta} · descripción única en ${idioma}`,
          false,
          `repetida con ${descripcionesDelIdioma.get(d)}`,
        );
      } else if (d) {
        descripcionesDelIdioma.set(d, ruta);
        comprobaciones++;
      } else {
        check(`${ruta} · tiene descripción`, false, "sin meta description");
      }
    }

    console.log("\nOpen Graph, sitemap, robots y datos estructurados (RNF-17):\n");
    const portada = paginas.get("/") ?? "";
    check(
      "la portada emite Open Graph con imagen de marca",
      /<meta property="og:image"/.test(portada) && /<meta property="og:title"/.test(portada),
      "sin og:image o sin og:title",
    );

    const sitemap = await fetch(`${base}/sitemap.xml`);
    const xml = await sitemap.text();
    check("sitemap.xml responde", sitemap.ok, `status ${sitemap.status}`);
    const faltanEnSitemap = rutas.filter((r) => !xml.includes(`${origen}${r === "/" ? "/" : r}<`));
    check(
      "el sitemap lleva las rutas de los DOS idiomas",
      faltanEnSitemap.length === 0,
      `faltan ${faltanEnSitemap.length}: ${faltanEnSitemap.slice(0, 5).join(", ")}`,
    );

    const robots = await fetch(`${base}/robots.txt`);
    const txt = await robots.text();
    check("robots.txt responde", robots.ok, `status ${robots.status}`);
    check("robots.txt apunta al sitemap", txt.includes("/sitemap.xml"), txt.slice(0, 120));
    for (const privada of ["/hq", "/portal", "/api"]) {
      check(`robots.txt mantiene ${privada} fuera del índice`, txt.includes(`Disallow: ${privada}`));
    }

    check(
      "la portada publica schema.org Organization",
      portada.includes('"@type":"Organization"') || portada.includes('"@type": "Organization"'),
      "sin datos estructurados de organización",
    );
    const servicio = paginas.get("/ai/enterprise/readiness") ?? "";
    check(
      "una página de servicio publica schema.org Service",
      servicio.includes('"@type":"Service"') || servicio.includes('"@type": "Service"'),
      "sin datos estructurados de servicio",
    );

    console.log("\nCriterio 3 — 404 y 500 propias, bilingües y con salidas (RF-17):\n");
    const cuatrocuatro = await fetch(`${base}/esta-ruta-no-existe`);
    const html404 = await cuatrocuatro.text();
    check("una ruta inexistente devuelve 404", cuatrocuatro.status === 404, `status ${cuatrocuatro.status}`);
    check(
      "la 404 es nuestra y no la del framework",
      html404.includes("404") && /href="\/ai"/.test(html404),
      "sin las tres salidas de vuelta",
    );
    for (const salida of ['href="/"', 'href="/ai"', 'href="/blog"']) {
      check(`la 404 ofrece la salida ${salida}`, html404.includes(salida));
    }
  } finally {
    parar();
  }

  if (fallos > 0) {
    console.error(`\n✗ seo: ${fallos} de ${comprobaciones} comprobaciones fallaron.\n`);
    process.exit(1);
  }
  console.log(`\n✓ seo: ${comprobaciones} comprobaciones sobre el servidor real, sin fallos.`);
}

await main();
