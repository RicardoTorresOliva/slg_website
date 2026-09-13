/**
 * check-produccion.ts — **DoD #10 medido sobre lo que el sitio SIRVE**, no sobre
 * los archivos de los que sale (DU-25, criterio 1 · RNF-18 · gate D5).
 *
 * POR QUÉ HACÍA FALTA OTRO, HABIENDO YA `check:pending` Y `check:copy`. Los dos
 * miran `content/`, que es de donde sale **casi** todo el texto. «Casi» es el
 * problema: una página compone texto a partir de `content/ui`, de una plantilla,
 * de un valor por defecto escrito en un componente o de un dato de la base. Un
 * `[PENDIENTE]` que entra por cualquiera de esas puertas **no está en
 * `content/`** y los dos gates anteriores lo dan por bueno.
 *
 * El DoD dice, con todas las letras, «ningún `[PENDIENTE]`, lorem ipsum, cifra
 * sin fuente ni nombre de cliente sin autorización **en producción**». En
 * producción, no en el repositorio. Así que esto arranca el servidor real,
 * recorre **todas** las rutas públicas —las dos mitades del sitemap— y lee el
 * **texto visible** de cada una.
 *
 * LEE TEXTO VISIBLE, NO HTML CRUDO. Se quitan `<script>`, `<style>`, los
 * comentarios y todas las etiquetas antes de buscar: un `TODO` dentro de un
 * comentario de HTML o el nombre de una clase CSS que contenga «xxx» no son
 * texto que nadie lea, y un gate que se dispara con ellos es un gate que alguien
 * acaba desactivando.
 *
 * LO QUE NO PUEDE COMPROBAR, y se dice en vez de fingirlo: si una cifra es
 * **cierta**. Comprueba que ninguna viaja **sin declarar su fuente**, que es la
 * parte mecanizable; la veracidad la firma Ricardo en la compuerta de copy.
 */
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
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

/* ── Lo prohibido en producción ───────────────────────────────────────────── */

const MARCADORES: ReadonlyArray<{ re: RegExp; que: string }> = [
  { re: /\[PENDIENTE[^\]]*\]/i, que: "marcador [PENDIENTE]" },
  { re: /\blorem\s+ipsum\b/i, que: "lorem ipsum" },
  { re: /\bTBD\b/, que: "marcador TBD" },
  { re: /\bXXX+\b/, que: "marcador XXX" },
  { re: /\bplaceholder\b/i, que: "texto de relleno" },
];

/**
 * Cifras y afirmaciones que exigen respaldo (RNF-18). Deliberadamente
 * estrechas, las mismas que `check:copy`: un gate que marca cualquier número
 * marcaría también «las 11 dimensiones», que es estructura de la oferta.
 */
const EXIGEN_RESPALDO: ReadonlyArray<{ re: RegExp; que: string }> = [
  { re: /\b\d{1,3}\s?%/, que: "porcentaje" },
  { re: /\b(?:\+|más de|over|more than)\s*\d/i, que: "cifra comparativa" },
  { re: /\b\d+\s?(?:x|veces|times)\b/i, que: "multiplicador" },
  { re: /\b(?:USD|EUR|\$|€)\s?\d/, que: "importe" },
  { re: /\b(?:premio|premiad|award|galard[oó]n)/i, que: "premio" },
  { re: /\b(?:l[ií]der|leading|n[uú]mero uno|number one|the best|el mejor)/i, que: "superlativo" },
  { re: /\b(?:caso de [eé]xito|success story|case study)\b/i, que: "caso de cliente" },
];

/**
 * La marca de fuente que hace legítima una cifra. Es la misma convención que
 * usa el copy: si la afirmación viene con su origen al lado, deja de ser una
 * cifra inventada y pasa a ser un dato citado.
 */
const DECLARA_FUENTE = /\bfuente\s*:|\bsource\s*:|\bseg[uú]n\s+[A-ZÁÉÍÓÚ]|\baccording to\s+[A-Z]/i;

/* ── Servidor real ────────────────────────────────────────────────────────── */

async function puertoLibre(): Promise<number> {
  return new Promise((r) => {
    const s = net.createServer();
    s.listen(0, "127.0.0.1", () => {
      const p = (s.address() as net.AddressInfo).port;
      s.close(() => r(p));
    });
  });
}

async function levantar() {
  const port = await puertoLibre();
  const proc: ChildProcess = spawn(process.execPath, [SERVER], {
    cwd: path.dirname(SERVER),
    env: { ...process.env, PORT: String(port), HOSTNAME: "127.0.0.1", NODE_ENV: "production" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const base = `http://127.0.0.1:${port}`;
  const limite = Date.now() + 30_000;
  while (Date.now() < limite) {
    if (proc.exitCode !== null) throw new Error(`el servidor murió con código ${proc.exitCode}`);
    try {
      await fetch(`${base}/api/health`);
      return { base, parar: () => proc.kill("SIGTERM") };
    } catch {
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  proc.kill("SIGTERM");
  throw new Error("el servidor no respondió en 30 s");
}

/** El texto que una persona lee. Sin scripts, sin estilos, sin etiquetas. */
export function textoVisible(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/** Las frases de un texto, para poder decir DÓNDE está el problema. */
function frases(texto: string): string[] {
  return texto.split(/(?<=[.!?;:])\s+/).filter((f) => f.trim().length > 0);
}

export type Hallazgo = { ruta: string; que: string; frase: string };

export function revisar(ruta: string, html: string): Hallazgo[] {
  const texto = textoVisible(html);
  const hallazgos: Hallazgo[] = [];

  for (const { re, que } of MARCADORES) {
    if (re.test(texto)) {
      const frase = frases(texto).find((f) => re.test(f)) ?? texto.slice(0, 120);
      hallazgos.push({ ruta, que, frase: frase.slice(0, 160) });
    }
  }

  for (const { re, que } of EXIGEN_RESPALDO) {
    for (const frase of frases(texto)) {
      // La fuente puede ir en la misma frase o en la siguiente: se mira la
      // frase y su vecina, que es como se cita de verdad en un texto.
      if (!re.test(frase)) continue;
      const indice = frases(texto).indexOf(frase);
      const vecina = frases(texto)[indice + 1] ?? "";
      if (DECLARA_FUENTE.test(frase) || DECLARA_FUENTE.test(vecina)) continue;
      hallazgos.push({ ruta, que: `${que} sin fuente`, frase: frase.slice(0, 160) });
      break;
    }
  }

  return hallazgos;
}

/**
 * Modo fixture: en vez de levantar el servidor, se leen archivos `.html` de una
 * carpeta. Es lo que usa la prueba negativa (R-26) — un freno que nunca se ha
 * visto en rojo no cuenta como verde, y para verlo hace falta una página que
 * sirva de verdad lo que está prohibido.
 */
function fixture(): { ruta: string; html: string }[] | null {
  const carpeta = process.env.PRODUCCION_FIXTURE;
  if (!carpeta) return null;
  const raiz = path.resolve(carpeta);
  return fs
    .readdirSync(raiz)
    .filter((f) => f.endsWith(".html"))
    .map((f) => ({ ruta: `/${f.replace(/\.html$/, "")}`, html: fs.readFileSync(path.join(raiz, f), "utf8") }));
}

async function main() {
  const paginas = fixture();
  if (paginas) {
    const hallazgos = paginas.flatMap((p) => revisar(p.ruta, p.html));
    console.log(`\nDoD #10 — sobre ${paginas.length} página(s) de fixture:\n`);
    check(
      `ninguna de las ${paginas.length} rutas sirve un marcador ni una cifra sin fuente`,
      hallazgos.length === 0,
      hallazgos.map((h) => `${h.ruta} · ${h.que}\n        «${h.frase}»`).join("\n      "),
    );
    if (fallos > 0) {
      console.error(`\n✗ producción: ${fallos} de ${comprobaciones} comprobaciones fallaron.\n`);
      process.exit(1);
    }
    console.log(`\n✓ producción: ${comprobaciones} comprobaciones sobre el fixture.`);
    process.exit(0);
  }

  const rutas = rutasDelSitemap();
  const servidor = await levantar();
  const hallazgos: Hallazgo[] = [];

  try {
    console.log(`\nDoD #10 — el TEXTO SERVIDO de ${rutas.length} rutas públicas:\n`);

    for (const ruta of rutas) {
      const r = await fetch(`${servidor.base}${ruta}`);
      if (!r.ok) {
        hallazgos.push({ ruta, que: `la ruta no responde (${r.status})`, frase: "" });
        continue;
      }
      hallazgos.push(...revisar(ruta, await r.text()));
    }

    check(
      `ninguna de las ${rutas.length} rutas sirve un marcador ni una cifra sin fuente`,
      hallazgos.length === 0,
      hallazgos.map((h) => `${h.ruta} · ${h.que}\n        «${h.frase}»`).join("\n      "),
    );

    /**
     * Y las dos superficies privadas, que no están en el sitemap: mientras M3 y
     * M4 sigan cerradas devuelven 404, y eso es lo correcto (RF-87). Se
     * comprueba que **siguen cerradas**, porque abrirlas por descuido sería
     * publicar HQ sin que nadie lo hubiera decidido.
     */
    for (const privada of ["/hq", "/portal"]) {
      /**
       * **`redirect: "manual"`, y la primera versión de esto estaba mal.** Con
       * el seguimiento automático, `fetch` iba de `/hq` a `/acceder` y devolvía
       * **200** — el 200 de la pantalla de acceso, no el de HQ—. La comprobación
       * daba en rojo diciendo que HQ era pública, que era exactamente lo
       * contrario de la verdad. Lo que hay que mirar es **la respuesta de esa
       * ruta**, no la del sitio al que te manda.
       */
      const r = await fetch(`${servidor.base}${privada}`, { redirect: "manual" });
      const cerrada = r.status === 404 || (r.status >= 300 && r.status < 400);
      check(
        `«${privada}» no se sirve a quien no ha entrado`,
        cerrada,
        `status ${r.status}${r.headers.get("location") ? ` → ${r.headers.get("location")}` : ""}`,
      );
      // Y que lo que devuelva no lleve dentro el mapa de la superficie privada:
      // un redirect con el menú de HQ en el cuerpo sería una fuga igual.
      const cuerpo = textoVisible(await r.text());
      check(
        `y su respuesta no lleva el contenido de «${privada}»`,
        !/Tablero|Auditoría|Claves|Capturas/.test(cuerpo),
        cuerpo.slice(0, 120),
      );
    }
  } finally {
    servidor.parar();
  }

  if (fallos > 0) {
    console.error(`\n✗ producción: ${fallos} de ${comprobaciones} comprobaciones fallaron.\n`);
    process.exit(1);
  }
  console.log(`\n✓ producción: ${comprobaciones} comprobaciones sobre el texto realmente servido.`);
  process.exit(0);
}

if (process.argv[1]?.endsWith("check-produccion.ts")) await main();
