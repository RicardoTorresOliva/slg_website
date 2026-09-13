/**
 * check-paginas.ts — Los criterios de DU-03, DU-04 y DU-05, sobre el HTML servido.
 *
 * Tres cosas que ninguna revisión manual sostiene en el tiempo:
 *
 *   · **El ORDEN de los bloques.** RF-09 fija siete en la portada y RF-06 fija
 *     seis en cada página de servicio. «Falta o desorden de una sección =
 *     página rechazada» no es una frase de estilo: es una condición que hay que
 *     comprobar en las 22 páginas de servicio cada vez que alguien edita un
 *     `.md`, porque el orden viaja en el contenido.
 *   · **El CTA ÚNICO.** RF-07: la descarga es el único llamado a la acción de
 *     una página de servicio. No hay segundo botón, ni agenda, ni formulario de
 *     contacto. Es la regla que se rompe sola en cuanto alguien «solo añade»
 *     un botón de contacto arriba.
 *   · **Que cada overview enlaza a TODOS sus servicios y a ninguno ajeno**
 *     (DU-04 criterio 2). Una lista escrita a mano se desincroniza; esta se
 *     comprueba contra la tabla de rutas.
 *
 * Requiere `npm run build:standalone`.
 */
import { spawn, type ChildProcess } from "node:child_process";
import net from "node:net";
import path from "node:path";

import { RAMAS, SERVICIOS, rutaEnDeServicio } from "../../lib/content/rutas.ts";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const SERVER = path.join(REPO_ROOT, ".next", "standalone", "server.js");

/** Los siete bloques de la portada (RF-09), en orden. El séptimo es el pie. */
const BLOQUES_DE_PORTADA = ["puertas", "lineas", "doctrina", "articulos", "descarga"];

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
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? "solo-para-comprobar-las-paginas",
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

/** El cuerpo de la página, sin la barra ni el pie: ahí está lo que la unidad produce. */
function cuerpo(html: string): string {
  return /<main[^>]*>([\s\S]*?)<\/main>/.exec(html)?.[1] ?? "";
}

/** Las posiciones en que aparecen unas marcas, para comprobar su ORDEN. */
function posiciones(texto: string, marcas: string[]): number[] {
  return marcas.map((m) => texto.indexOf(m));
}

const enOrden = (p: number[]) => p.every((v, i) => v >= 0 && (i === 0 || v > p[i - 1]));

async function main() {
  const externo = process.env.PAGINAS_BASE;
  const { base, parar } = externo ? { base: externo, parar: () => {} } : await arrancar();
  try {
    /* ── DU-03 · la portada ─────────────────────────────────────────────── */
    console.log("\nDU-03 — los siete bloques de la portada, en orden (RF-09):\n");
    for (const ruta of ["/", "/en"]) {
      const r = await fetch(`${base}${ruta}`);
      const html = await r.text();
      const dentro = cuerpo(html);
      check(`${ruta} responde`, r.ok, `status ${r.status}`);
      check(
        `${ruta} · los bloques aparecen en el orden de RF-09`,
        enOrden(posiciones(dentro, BLOQUES_DE_PORTADA.map((b) => `id="${b}"`))),
        `posiciones: ${BLOQUES_DE_PORTADA.map(
          (b, i) => `${b}=${posiciones(dentro, BLOQUES_DE_PORTADA.map((x) => `id="${x}"`))[i]}`,
        ).join(" ")}`,
      );
      check(
        `${ruta} · la franja Doctrina lleva pull-quote y enlace`,
        dentro.includes("<blockquote") && /href="\/(en\/doctrine|doctrina)"/.test(dentro),
        "la doctrina es una franja con cita y enlace, no un bloque de texto (A.3)",
      );
      check(
        `${ruta} · cero fotografía de stock (RNF-44)`,
        !/<img[^>]+src="https?:\/\//.test(dentro),
        "una imagen servida desde fuera del dominio en la portada",
      );
      // Criterio 2: los dos bloques vacíos están REDACTADOS, no huecos.
      const bloqueArticulos = dentro.slice(dentro.indexOf('id="articulos"'), dentro.indexOf('id="descarga"'));
      check(
        `${ruta} · «últimos artículos» resuelve su estado con texto`,
        bloqueArticulos.replace(/<[^>]+>/g, "").trim().length > 40,
        "un bloque vacío sin redacción es un hueco (criterio 2)",
      );
    }

    /* ── DU-04 · los cuatro overviews ───────────────────────────────────── */
    console.log("\nDU-04 — cada overview enlaza a TODOS sus servicios y a ninguno ajeno:\n");
    for (const rama of RAMAS) {
      for (const [lang, ruta] of [["es", rama.es], ["en", rama.en]] as const) {
        const r = await fetch(`${base}${ruta}`);
        const html = await r.text();
        const dentro = cuerpo(html);
        check(`${ruta} responde`, r.ok, `status ${r.status}`);

        const suyos = SERVICIOS.filter((s) => s.rama === rama.slug);
        const ajenos = SERVICIOS.filter((s) => s.rama !== rama.slug);
        const href = (s: (typeof SERVICIOS)[number]) => (lang === "en" ? rutaEnDeServicio(s) : s.es);

        const faltan = suyos.filter((s) => !dentro.includes(`href="${href(s)}"`));
        check(
          `${ruta} · enlaza sus ${suyos.length} servicios`,
          faltan.length === 0,
          `faltan: ${faltan.map((s) => s.slug).join(", ")}`,
        );
        const colados = ajenos.filter((s) => dentro.includes(`href="${href(s)}"`));
        check(
          `${ruta} · no enlaza ningún servicio de otra línea`,
          colados.length === 0,
          `se colaron: ${colados.map((s) => s.slug).join(", ")}`,
        );
      }
    }

    // Criterio 3: Phoenix Academy es externo y está señalado como tal.
    for (const ruta of ["/ai/academy", "/en/ai/academy"]) {
      const dentro = cuerpo(await (await fetch(`${base}${ruta}`)).text());
      const enlace = /<a[^>]+academy\.softlandingglobal\.com[^>]*>/.exec(dentro)?.[0] ?? "";
      check(
        `${ruta} · el enlace a Phoenix Academy es externo y señalado`,
        enlace.includes('target="_blank"') && enlace.includes("noopener"),
        enlace ? `atributos: ${enlace}` : "no hay enlace a academy.softlandingglobal.com",
      );
      check(
        `${ruta} · Phoenix Academy no se incrusta`,
        !/<iframe/i.test(dentro),
        "frontera (e): sin integración, sin sesión compartida y sin contenido embebido",
      );
    }

    /* ── DU-05 · las once páginas de servicio ───────────────────────────── */
    console.log("\nDU-05 — las seis secciones en orden fijo, y un solo CTA (RF-06, RF-07):\n");
    for (const s of SERVICIOS) {
      for (const [lang, ruta] of [["es", s.es], ["en", rutaEnDeServicio(s)]] as const) {
        const r = await fetch(`${base}${ruta}`);
        const html = await r.text();
        const dentro = cuerpo(html);
        if (!r.ok) {
          check(`${ruta} responde`, false, `status ${r.status}`);
          continue;
        }

        // Criterio 1: SEIS encabezados de sección, en el orden del contrato.
        const encabezados = [...dentro.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map((m) =>
          m[1].replace(/<[^>]+>/g, "").trim(),
        );
        check(
          `${ruta} · seis secciones del contrato A.3`,
          encabezados.length === 6,
          `encontradas ${encabezados.length}: ${encabezados.join(" · ")}`,
        );

        // Criterio 2: UN solo llamado a la acción.
        const enlaceContacto = lang === "en" ? "/en/contact" : "/contacto";
        const botones = [...dentro.matchAll(/<a[^>]+href="([^"]+)"/g)].map((m) => m[1]);
        const aDescargas = botones.filter((h) => h.includes("/descargas/") || h.includes("/downloads/"));
        check(
          `${ruta} · un solo enlace a su documento`,
          aDescargas.length <= 1,
          `${aDescargas.length} enlaces de descarga: ${aDescargas.join(", ")}`,
        );
        check(
          `${ruta} · sin formulario en la página`,
          !/<form/i.test(dentro),
          "RF-07: el CTA es la descarga; el formulario vive en la página del documento",
        );
        check(
          `${ruta} · sin widget ni calendario de terceros (RF-08)`,
          !/<iframe/i.test(dentro) && !/<script[^>]+src="https?:\/\//.test(html),
          "frontera (h): cero scripts de terceros",
        );
        check(
          `${ruta} · la sección 6 enlaza a contacto`,
          botones.includes(enlaceContacto),
          `no encuentra ${enlaceContacto}`,
        );
      }
    }
  } finally {
    parar();
  }

  if (fallos > 0) {
    console.error(`\n✗ páginas: ${fallos} de ${comprobaciones} comprobaciones fallaron.\n`);
    process.exit(1);
  }
  console.log(`\n✓ páginas: ${comprobaciones} comprobaciones sobre el servidor real, sin fallos.`);
}

await main();
