/**
 * check-armazon.ts — El marco público, comprobado sobre el servidor REAL.
 *
 * DU-02 promete cinco cosas que solo se pueden comprobar pidiendo las páginas:
 *
 *   · **criterio 1** — cinco destinos y un botón. Ni uno más. Y ninguna
 *     etiqueta genérica de «Inicio/Home» como destino de menú (RF-01).
 *   · **criterio 2** — desde CADA ruta, el conmutador lleva a **esa misma
 *     página** en el otro idioma, esa página responde 200, y el viaje de
 *     vuelta devuelve a la ruta de partida. No a la portada (RF-04, DoD #2).
 *   · **criterio 3** — español en la raíz, inglés bajo `/en`, y **ninguna
 *     cabecera `Accept-Language` mueve la ruta pedida** (RF-03).
 *   · **criterio 5** — ni la navegación ni el pie enlazan `/hq` ni `/portal`
 *     mientras M3 y M4 sigan abiertos (RF-87).
 *   · **criterio 6** — la ruta sin par de idioma se DIBUJA desactivada, no se
 *     esconde y no manda a la portada.
 *
 * El criterio 4 —las cuatro cláusulas del sheet— no está aquí: se mide cuadro a
 * cuadro en `scripts/ci/test-gesto.ts`, que para eso abre un navegador.
 *
 * Requiere `npm run build:standalone`.
 */
import { spawn, type ChildProcess } from "node:child_process";
import net from "node:net";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const SERVER = path.join(REPO_ROOT, ".next", "standalone", "server.js");

/** Los cinco destinos de RF-01, con sus rutas canónicas (ui_wireframes §1.1). */
const DESTINOS_ES = ["/ai", "/holdings", "/doctrina", "/blog", "/nosotros"];
const DESTINOS_EN = ["/en/ai", "/en/holdings", "/en/doctrine", "/en/blog", "/en/about"];

/** Etiquetas que NO pueden ser destino de menú (RF-01). */
const PROHIBIDAS = [/^inicio$/i, /^home$/i, /^portada$/i];

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
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? "solo-para-comprobar-el-armazon",
      NEXT_PUBLIC_SITE_URL: base,
      // La compuerta de staging apagada: aquí se mide el sitio, no la compuerta.
      STAGING_BASIC_AUTH_USER: "",
      STAGING_BASIC_AUTH_PASSWORD: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const limite = Date.now() + 30_000;
  while (Date.now() < limite) {
    if (proc.exitCode !== null) throw new Error(`el servidor murió con código ${proc.exitCode}`);
    try {
      if ((await fetch(`${base}/api/health`)).ok) {
        return { base, parar: () => proc.kill("SIGTERM") };
      }
    } catch {
      /* aún no escucha */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  proc.kill("SIGTERM");
  throw new Error("el servidor no respondió en 30 s");
}

/* ── Lectura del HTML, sin librerías ─────────────────────────────────────── */

/** Los `href` del `<header>`: la navegación de escritorio y el sheet. */
function hrefsDeLaBarra(html: string): string[] {
  const header = /<header[^>]*>([\s\S]*?)<\/header>/.exec(html)?.[1] ?? "";
  return [...header.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
}

function hrefsDelPie(html: string): string[] {
  const pie = /<footer[^>]*>([\s\S]*?)<\/footer>/.exec(html)?.[1] ?? "";
  return [...pie.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
}

/**
 * El destino del conmutador: el único enlace con `hreflang` de la página.
 *
 * La búsqueda es **insensible a mayúsculas** porque React 19 escribe el
 * atributo tal cual se le pasa —`hrefLang`— y HTML no distingue mayúsculas en
 * los nombres de atributo. Buscarlo en minúsculas daba cero resultados en un
 * marcado perfectamente correcto, que es un falso rojo de los que enseñan a
 * ignorar el freno.
 */
function rutaDelConmutador(html: string): string | null {
  return /<a[^>]+hreflang="[^"]*"[^>]*href="([^"]+)"/i.exec(html)?.[1]
    ?? /<a[^>]+href="([^"]+)"[^>]*hreflang="[^"]*"/i.exec(html)?.[1]
    ?? null;
}

function textosDeLaBarra(html: string): string[] {
  const header = /<header[^>]*>([\s\S]*?)<\/header>/.exec(html)?.[1] ?? "";
  return [...header.matchAll(/>([^<>]+)</g)].map((m) => m[1].trim()).filter(Boolean);
}

/* ── Las comprobaciones ──────────────────────────────────────────────────── */

async function main() {
  // `ARMAZON_BASE` apunta el medidor a otro servidor: es lo que usa su prueba
  // negativa, que sirve un armazón roto a propósito.
  const externo = process.env.ARMAZON_BASE;
  const { base, parar } = externo ? { base: externo, parar: () => {} } : await arrancar();
  try {
    // Todas las rutas públicas, de las dos mitades del sitio.
    const rutas = [
      "/",
      "/en",
      ...DESTINOS_ES,
      ...DESTINOS_EN,
      "/contacto",
      "/descargas",
      "/gracias",
      "/legal/terminos",
      "/legal/privacidad",
      "/ai/academy",
      "/ai/enterprise",
      "/ai/factory",
      "/ai/academy/phoenix-peex",
      "/ai/enterprise/readiness",
      "/ai/factory/app-building",
      "/en/contact",
      "/en/downloads",
      "/en/thank-you",
      "/en/legal/terms",
      "/en/legal/privacy",
      "/en/ai/academy",
      "/en/ai/enterprise",
      "/en/ai/factory",
      "/en/ai/academy/phoenix-peex",
      "/en/ai/enterprise/readiness",
      "/en/ai/factory/app-building",
    ];

    console.log(`\nCriterio 1 — cinco destinos y un botón, en las ${rutas.length} rutas públicas:\n`);
    const portada = await (await fetch(`${base}/`)).text();
    const barraEs = hrefsDeLaBarra(portada);
    for (const d of DESTINOS_ES) {
      check(`la barra en español enlaza ${d}`, barraEs.includes(d), `href vistos: ${barraEs.join(", ")}`);
    }
    check("la barra en español lleva el botón de acceso", barraEs.includes("/acceder"));
    check(
      "el logo vuelve a la portada",
      barraEs.includes("/"),
      "el acceso a la portada es el logo, no un destino de menú",
    );
    const textos = textosDeLaBarra(portada);
    check(
      "ninguna etiqueta genérica de «Inicio/Home» es destino de menú",
      !textos.some((t) => PROHIBIDAS.some((re) => re.test(t))),
      `textos de la barra: ${textos.join(" · ")}`,
    );

    const portadaEn = await (await fetch(`${base}/en`)).text();
    const barraEn = hrefsDeLaBarra(portadaEn);
    for (const d of DESTINOS_EN) {
      check(`la barra en inglés enlaza ${d}`, barraEn.includes(d), `href vistos: ${barraEn.join(", ")}`);
    }

    console.log("\nCriterio 5 — ni la barra ni el pie anuncian `/hq` ni `/portal` (RF-87):\n");
    for (const [nombre, html] of [["español", portada], ["inglés", portadaEn]] as const) {
      const todos = [...hrefsDeLaBarra(html), ...hrefsDelPie(html)];
      const filtrados = todos.filter((h) => h.startsWith("/hq") || h.startsWith("/portal"));
      check(`${nombre}: cero enlaces a superficies cerradas`, filtrados.length === 0, filtrados.join(", "));
    }

    console.log("\nCriterio 2 — el conmutador lleva a la MISMA página, y vuelve:\n");
    for (const ruta of rutas) {
      const r = await fetch(`${base}${ruta}`);
      if (!r.ok) {
        check(`${ruta} responde`, false, `status ${r.status}`);
        continue;
      }
      const html = await r.text();
      const destino = rutaDelConmutador(html);
      if (!destino) {
        check(`${ruta} → el conmutador existe`, false, "ningún enlace con hreflang en la página");
        continue;
      }
      const esPortada = destino === "/" || destino === "/en";
      const partiaDeLaPortada = ruta === "/" || ruta === "/en";
      if (esPortada && !partiaDeLaPortada) {
        check(`${ruta} → ${destino}`, false, "el conmutador manda a la portada en vez de a la misma página");
        continue;
      }
      const ida = await fetch(`${base}${destino}`);
      const vuelta = ida.ok ? rutaDelConmutador(await ida.text()) : null;
      check(
        `${ruta} ⇄ ${destino}`,
        ida.ok && vuelta === ruta,
        `ida: status ${ida.status} · vuelta: ${vuelta ?? "(sin conmutador)"}`,
      );
    }

    console.log("\nCriterio 3 — el idioma es la RUTA, no la cabecera del navegador (RF-03):\n");
    for (const [ruta, marca, idioma] of [
      ["/doctrina", "Doctrina", "en-US,en;q=0.9"],
      ["/en/doctrine", "Doctrine", "es-ES,es;q=0.9"],
    ] as const) {
      const r = await fetch(`${base}${ruta}`, { headers: { "Accept-Language": idioma } });
      const html = await r.text();
      check(
        `${ruta} con Accept-Language «${idioma}» sigue sirviendo su idioma`,
        r.status === 200 && html.includes(marca),
        `status ${r.status}; «${marca}» ${html.includes(marca) ? "presente" : "AUSENTE"}`,
      );
      check(
        `${ruta} no redirige por idioma`,
        r.redirected === false,
        `terminó en ${r.url}`,
      );
    }

    console.log("\nCriterio 6 — estados del armazón:\n");
    // Ruta sin par de idioma: se dibuja DESACTIVADA, no desaparece.
    const sinPar = await (await fetch(`${base}/prototipo`)).text();
    check(
      "la ruta sin par de idioma no inventa un enlace a la portada",
      !/<a[^>]+hreflang="es"/i.test(sinPar) || !sinPar.includes('href="/"'),
      "una página sin pareja no puede enlazar a la portada como si lo fuera",
    );
    // El salto al contenido es la PRIMERA parada del tabulador.
    const primerEnlace = /<a\s[^>]*href="([^"]+)"/.exec(portada)?.[1];
    check(
      "«saltar al contenido» es la primera parada del tabulador",
      primerEnlace === "#contenido",
      `el primer enlace de la página es ${primerEnlace}`,
    );
    check(
      "el destino del salto existe",
      /id="contenido"/.test(portada),
      "el ancla apunta a un id que no está en la página",
    );
  } finally {
    parar();
  }

  if (fallos > 0) {
    console.error(`\n✗ armazón: ${fallos} de ${comprobaciones} comprobaciones fallaron.\n`);
    process.exit(1);
  }
  console.log(`\n✓ armazón: ${comprobaciones} comprobaciones sobre el servidor real, sin fallos.`);
}

await main();
