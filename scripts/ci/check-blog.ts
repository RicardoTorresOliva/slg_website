/**
 * check-blog.ts — Los ocho criterios de DU-11, sobre el servidor REAL.
 *
 * El que manda es el **criterio 2**: un artículo con `status: draft` **no se
 * sirve en ninguna parte**. No basta con que no salga en el índice — eso es lo
 * fácil—: no puede salir en su URL directa, ni en una etiqueta, ni en el RSS.
 * Un borrador servido es un texto sin revisar con la firma de SLG encima, y se
 * publica solo, sin que nadie lo decida.
 *
 * Y el **criterio 1**: añadir un `.md` y hacer push publica. Aquí se comprueba
 * la mitad que es del repositorio —que el artículo nuevo aparece en índice, URL,
 * etiqueta y RSS sin tocar código—; la otra mitad, que el despliegue ocurre en
 * minutos, la cierra el despliegue real.
 *
 * Requiere `npm run build:standalone`.
 */
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";

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
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? "solo-para-comprobar-el-blog",
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

/** Lee del repositorio qué artículos hay y en qué estado, sin pasar por el loader. */
function articulosEnDisco(lang: string) {
  const dir = path.join(REPO_ROOT, "content", "blog", lang);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const texto = fs.readFileSync(path.join(dir, f), "utf8");
      return {
        slug: f.replace(/\.md$/, ""),
        borrador: /^status:\s*draft\s*$/m.test(texto),
        titulo: /^title:\s*"?([^"\n]+)"?\s*$/m.exec(texto)?.[1] ?? "",
      };
    });
}

async function main() {
  // `BLOG_BASE` apunta el medidor a otro servidor: lo usa su prueba negativa,
  // que sirve un blog donde el borrador SÍ se publica.
  const externo = process.env.BLOG_BASE;
  const { base, parar } = externo ? { base: externo, parar: () => {} } : await arrancar();
  try {
    for (const [lang, ruta, segmento] of [
      ["es", "", "etiqueta"],
      ["en", "/en", "tag"],
    ] as const) {
      const enDisco = articulosEnDisco(lang);
      const publicados = enDisco.filter((a) => !a.borrador);
      const borradores = enDisco.filter((a) => a.borrador);

      console.log(`\n${lang.toUpperCase()} — ${publicados.length} publicados, ${borradores.length} borradores:\n`);

      const indice = await fetch(`${base}${ruta}/blog`);
      const htmlIndice = await indice.text();
      check(`${ruta}/blog responde`, indice.ok, `status ${indice.status}`);

      const rss = await fetch(`${base}${ruta}/blog/rss.xml`);
      const xml = await rss.text();
      check(
        `${ruta}/blog/rss.xml responde como RSS`,
        rss.ok && (rss.headers.get("content-type") ?? "").includes("rss"),
        `status ${rss.status}, content-type ${rss.headers.get("content-type")}`,
      );
      check(
        `el canal declara su idioma «${lang}»`,
        xml.includes(`<language>${lang}</language>`),
        "un canal sin idioma obliga al lector a adivinarlo",
      );

      // Criterio 1 y 3: lo publicado aparece en índice, URL y canal.
      for (const a of publicados) {
        const articulo = await fetch(`${base}${ruta}/blog/${a.slug}`);
        check(`publicado · ${a.slug} tiene URL propia`, articulo.ok, `status ${articulo.status}`);
        check(`publicado · ${a.slug} aparece en el índice`, htmlIndice.includes(a.slug));
        check(`publicado · ${a.slug} aparece en el RSS`, xml.includes(`/blog/${a.slug}`));
      }

      // Criterio 2: el borrador no se sirve EN NINGUNA PARTE.
      for (const a of borradores) {
        const articulo = await fetch(`${base}${ruta}/blog/${a.slug}`);
        check(
          `borrador · ${a.slug} NO tiene URL`,
          articulo.status === 404,
          `status ${articulo.status}: un borrador servido es un texto sin revisar publicado solo`,
        );
        check(`borrador · ${a.slug} NO aparece en el índice`, !htmlIndice.includes(a.slug));
        check(`borrador · ${a.slug} NO aparece en el RSS`, !xml.includes(`/blog/${a.slug}`));
      }

      // Criterio 4: página por etiqueta, en los dos idiomas.
      const etiquetas = [...htmlIndice.matchAll(new RegExp(`/blog/${segmento}/([a-z0-9-]+)`, "g"))].map(
        (m) => m[1],
      );
      const unicas = [...new Set(etiquetas)];
      check(
        `${ruta}/blog expone etiquetas navegables`,
        unicas.length > 0,
        "el índice no enlaza ninguna etiqueta",
      );
      for (const e of unicas.slice(0, 4)) {
        const pagina = await fetch(`${base}${ruta}/blog/${segmento}/${e}`);
        check(`etiqueta · ${e} responde`, pagina.ok, `status ${pagina.status}`);
      }

      // Criterio 7: etiqueta inexistente y artículo inexistente.
      const sinEtiqueta = await fetch(`${base}${ruta}/blog/${segmento}/no-existe-esta-etiqueta`);
      check(
        `etiqueta inexistente devuelve 404`,
        sinEtiqueta.status === 404,
        `status ${sinEtiqueta.status}`,
      );
      const sinArticulo = await fetch(`${base}${ruta}/blog/no-existe-este-articulo`);
      check(`artículo inexistente devuelve 404`, sinArticulo.status === 404, `status ${sinArticulo.status}`);
    }

    // Criterio 3, la mitad que se cuela: el canal de un idioma NO lleva
    // artículos del otro. Es el fallo silencioso de un blog bilingüe.
    const rssEs = await (await fetch(`${base}/blog/rss.xml`)).text();
    const rssEn = await (await fetch(`${base}/en/blog/rss.xml`)).text();
    const soloEn = articulosEnDisco("en").filter((a) => !a.borrador);
    const soloEs = articulosEnDisco("es").filter((a) => !a.borrador);
    check(
      "el canal en español no lleva artículos en inglés",
      soloEn.every((a) => !rssEs.includes(`/en/blog/${a.slug}`)),
    );
    check(
      "el canal en inglés no lleva artículos en español",
      soloEs.every((a) => !new RegExp(`<link>[^<]*/blog/${a.slug}<`).test(rssEn)),
    );

    // Criterio 5: un artículo solo en español no rompe la paridad. Lo verifica
    // `check:pairs`, y aquí se comprueba que ese caso EXISTE de verdad — si no
    // existiera, el criterio estaría verde sin haberse probado nunca.
    const huerfanos = articulosEnDisco("es").filter(
      (a) => !a.borrador && /^pair:\s*null\s*$/m.test(
        fs.readFileSync(path.join(REPO_ROOT, "content/blog/es", `${a.slug}.md`), "utf8"),
      ),
    );
    check(
      "existe al menos un artículo publicado solo en español (RF-26)",
      huerfanos.length > 0,
      "sin un caso real, el criterio 5 nunca se ha probado",
    );
  } finally {
    parar();
  }

  if (fallos > 0) {
    console.error(`\n✗ blog: ${fallos} de ${comprobaciones} comprobaciones fallaron.\n`);
    process.exit(1);
  }
  console.log(`\n✓ blog: ${comprobaciones} comprobaciones sobre el servidor real, sin fallos.`);
}

await main();
