/**
 * check-sitio.ts — La ficha del sitio es coherente consigo misma, con el
 * contenido y con las rutas de `app/` (D-165, D-166).
 *
 * **POR QUÉ HACE FALTA UN FRENO PROPIO.** Desde D-166 la estructura pública
 * sale de `site.config.ts`: la oferta la sirve `app/(public)/[...ruta]` a partir
 * de la ficha, y ya no hay una carpeta por página que falle al compilar si le
 * falta su texto. Una ficha que declara un servicio sin registro, una foto que
 * no existe o una ruta que ya ocupa una carpeta del motor **compila**: sale una
 * página vacía, una imagen rota o una ruta que nunca se sirve, y nadie se entera
 * hasta que alguien la visita. Este freno lo dice antes, y lo dice para
 * cualquier cliente: no sabe nada de ninguno.
 *
 * Lo que comprueba:
 *
 *   1. **Idiomas** — en cada idioma encendido, cada eje, línea, servicio y
 *      destino del menú declara su registro y su ruta.
 *   2. **Contenido** — cada servicio tiene su registro de `service` en cada
 *      idioma, con el mismo `name` que la ficha y el `branch` de SU línea (o el
 *      suyo propio, si es suelto); cada eje y cada línea, su registro de `page`.
 *      Y al revés: ningún registro de servicio queda sin declarar.
 *   3. **Fotos** — cada `foto` de la oferta y de `sitio.fotos` existe en
 *      `public/fotos/`.
 *   4. **Rutas** — bien formadas (español en la raíz, inglés bajo `/en/`), sin
 *      duplicados y **sin caer bajo una ruta fija de `app/`**: Next sirve la
 *      carpeta antes que el comodín, así que esa página no se vería nunca.
 *   5. **Menú** — cada destino existe: es una ruta de `app/` o una de la ficha.
 *   6. **Slugs y claves** — sin duplicados.
 *   7. **Coherencias sueltas** — los bloques de Servicios son conocidos y sus
 *      sueltos existen; cada enlace externo está en `dominio.enlaces`; la API
 *      no se enciende sin la intranet.
 *
 * `SITIO_FICHA` apunta el freno a otra ficha: es lo que usa su prueba negativa.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { loadCollection } from "../../lib/content/loader.ts";
import type { FichaDelSitio, Idioma, PorIdioma } from "../../lib/sitio/tipos.ts";
import { PAGINAS_DEL_MOTOR } from "../../lib/sitio/motor.ts";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");

const origen = process.env.SITIO_FICHA ? path.resolve(process.env.SITIO_FICHA) : path.join(REPO_ROOT, "site.config.ts");
const { sitio } = (await import(pathToFileURL(origen).href)) as { sitio: FichaDelSitio };

const fallos: string[] = [];
let comprobaciones = 0;

function check(ok: boolean, detalle: string) {
  comprobaciones++;
  if (!ok) fallos.push(detalle);
}

const idiomas: Idioma[] = [sitio.idiomas.principal, ...sitio.idiomas.adicionales.filter((i) => i !== "es")];

/* ── Las rutas fijas de `app/` ──────────────────────────────────────────── */

/**
 * Los patrones de ruta de `app/`, sin grupos: `["descargas", "[slug]"]`. Los
 * comodines de la ficha —`[...ruta]`— no cuentan: son los que sirven la ficha.
 */
function patronesDeApp(): string[][] {
  const out: string[][] = [];
  const recorrer = (dir: string, segmentos: string[]) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) {
        if (e.name.startsWith("_")) continue; // carpetas privadas de Next
        const esGrupo = /^\(.*\)$/.test(e.name);
        recorrer(path.join(dir, e.name), esGrupo ? segmentos : [...segmentos, e.name]);
      } else if (/^(page|route)\.(tsx?|jsx?)$/.test(e.name)) {
        if (segmentos.at(-1) === "[...ruta]") continue;
        out.push(segmentos);
      }
    }
  };
  recorrer(path.join(REPO_ROOT, "app"), []);
  return out;
}

/** ¿Empareja un patrón de `app/` esta ruta? */
function empareja(patron: string[], ruta: string): boolean {
  const partes = ruta === "/" ? [] : ruta.slice(1).split("/");
  for (let i = 0; i < patron.length; i++) {
    const p = patron[i];
    if (/^\[\[\.\.\..+\]\]$/.test(p)) return true;
    if (/^\[\.\.\..+\]$/.test(p)) return partes.length > i;
    if (i >= partes.length) return false;
    if (/^\[.+\]$/.test(p)) continue;
    if (p !== partes[i]) return false;
  }
  return partes.length === patron.length;
}

const PATRONES = patronesDeApp();
const rutaDeApp = (ruta: string) => PATRONES.find((p) => empareja(p, ruta));

/* ── 1 · Idiomas ────────────────────────────────────────────────────────── */

type Nodo = { que: string; pagina?: PorIdioma; ruta: PorIdioma };

const ejes = sitio.oferta.ejes;
const lineas = ejes.flatMap((e) => e.lineas);
const servicios = [
  ...lineas.flatMap((l) => l.servicios.map((s) => ({ ...s, rama: l.nombre }))),
  ...sitio.oferta.sueltos.map((s) => ({ ...s, rama: s.nombre })),
];

const nodos: Nodo[] = [
  ...ejes.map((e) => ({ que: `eje «${e.clave}»`, pagina: e.pagina, ruta: e.ruta })),
  ...lineas.map((l) => ({ que: `línea «${l.clave}»`, pagina: l.pagina, ruta: l.ruta })),
  ...servicios.map((s) => ({ que: `servicio «${s.slug}»`, pagina: s.pagina, ruta: s.ruta })),
];

for (const idioma of idiomas) {
  for (const n of nodos) {
    check(Boolean(n.pagina?.[idioma]), `${n.que}: sin registro en «${idioma}», que es un idioma encendido`);
    check(Boolean(n.ruta[idioma]), `${n.que}: sin ruta en «${idioma}», que es un idioma encendido`);
  }
  for (const d of sitio.menu) {
    check(Boolean(d.ruta[idioma]), `menú «${d.clave}»: sin ruta en «${idioma}», que es un idioma encendido`);
  }
}

/* ── 2 · Contenido ──────────────────────────────────────────────────────── */

const cargar = <T,>(coleccion: "service" | "page", idioma: Idioma) => {
  try {
    return loadCollection<T>(coleccion, idioma);
  } catch (e) {
    fallos.push(`content/${coleccion}: no se pudo leer (${(e as Error).message.split("\n")[0]})`);
    return [];
  }
};

const ramasValidas = new Set([...lineas.map((l) => l.nombre), ...sitio.oferta.sueltos.map((s) => s.nombre)]);

for (const idioma of idiomas) {
  const registros = cargar<{ name?: string; branch?: string }>("service", idioma);
  const paginas = new Set(cargar("page", idioma).map((p) => p.slug));

  for (const s of servicios) {
    const slug = s.pagina[idioma];
    if (!slug) continue; // ya lo dijo el bloque 1
    const r = registros.find((x) => x.slug === slug);
    check(Boolean(r), `servicio «${s.slug}»: falta content/services/${idioma}/${slug}.md`);
    if (!r) continue;
    check(
      r.data.name === s.nombre,
      `servicio «${s.slug}» (${idioma}): el registro se llama «${r.data.name}» y la ficha dice «${s.nombre}»`,
    );
    check(
      ramasValidas.has(r.data.branch ?? ""),
      `servicio «${s.slug}» (${idioma}): branch «${r.data.branch}» no es una rama de la ficha (${[...ramasValidas].join(", ")})`,
    );
    check(
      r.data.branch === s.rama,
      `servicio «${s.slug}» (${idioma}): branch «${r.data.branch}», pero la ficha lo cuelga de «${s.rama}»`,
    );
  }

  // Al revés: un registro de servicio que la ficha no declara no tiene ruta.
  const declarados = new Set(servicios.map((s) => s.pagina[idioma]));
  for (const r of registros) {
    check(declarados.has(r.slug), `content/services/${idioma}/${r.slug}.md no está en la ficha: no tiene ruta`);
  }

  for (const n of [...ejes, ...lineas]) {
    const slug = n.pagina[idioma];
    if (slug) check(paginas.has(slug), `«${n.clave}»: falta content/pages/${idioma}/${slug}.md`);
  }
}

/* ── 3 · Fotos ──────────────────────────────────────────────────────────── */

const fotos = new Map<string, string>();
for (const e of ejes) if (e.foto) fotos.set(e.foto, `eje «${e.clave}»`);
for (const l of lineas) if (l.foto) fotos.set(l.foto, `línea «${l.clave}»`);
for (const s of servicios) if (s.foto) fotos.set(s.foto, `servicio «${s.slug}»`);
for (const [clave, foto] of Object.entries(sitio.fotos)) {
  fotos.set(foto, `sitio.fotos.${clave}`);
  check(clave in PAGINAS_DEL_MOTOR, `sitio.fotos.${clave}: no es una página del motor (${Object.keys(PAGINAS_DEL_MOTOR).join(", ")})`);
}
for (const [foto, quien] of fotos) {
  check(
    fs.existsSync(path.join(REPO_ROOT, "public", "fotos", `${foto}.webp`)),
    `${quien}: la foto public/fotos/${foto}.webp no existe`,
  );
}

/* ── 4 · Rutas ──────────────────────────────────────────────────────────── */

const rutasDeLaFicha = new Map<string, string>();
for (const n of nodos) {
  for (const idioma of idiomas) {
    const ruta = n.ruta[idioma];
    if (!ruta) continue;
    const bienFormada =
      idioma === "en"
        ? ruta.startsWith("/en/")
        : ruta.startsWith("/") && ruta !== "/" && ruta !== "/en" && !ruta.startsWith("/en/");
    check(
      bienFormada && !ruta.endsWith("/") && !/\s/.test(ruta),
      `${n.que}: ruta «${ruta}» mal formada para «${idioma}» (español en la raíz, inglés bajo /en/, sin barra final)`,
    );
    const previa = rutasDeLaFicha.get(ruta);
    check(!previa, `${n.que}: la ruta «${ruta}» ya la usa ${previa}`);
    rutasDeLaFicha.set(ruta, n.que);
    const tapada = rutaDeApp(ruta);
    check(
      !tapada,
      `${n.que}: la ruta «${ruta}» cae bajo app/${tapada?.join("/")}, que Next sirve antes: esta página nunca se vería`,
    );
  }
}

/* ── 5 · Menú ───────────────────────────────────────────────────────────── */

for (const d of sitio.menu) {
  for (const idioma of idiomas) {
    const ruta = d.ruta[idioma];
    if (!ruta) continue;
    check(
      Boolean(rutaDeApp(ruta)) || rutasDeLaFicha.has(ruta),
      `menú «${d.clave}» (${idioma}): la ruta «${ruta}» no existe ni en app/ ni en la ficha`,
    );
  }
}

/* ── 6 · Slugs y claves ─────────────────────────────────────────────────── */

function sinDuplicados(que: string, valores: readonly string[]) {
  const vistos = new Set<string>();
  for (const v of valores) {
    check(!vistos.has(v), `${que}: «${v}» está repetido`);
    vistos.add(v);
  }
}

sinDuplicados("clave de eje o de línea", [...ejes.map((e) => e.clave), ...lineas.map((l) => l.clave)]);
sinDuplicados("slug de servicio", servicios.map((s) => s.slug));
sinDuplicados("nombre de servicio", servicios.map((s) => s.nombre));
sinDuplicados("nombre de rama", [...lineas.map((l) => l.nombre), ...sitio.oferta.sueltos.map((s) => s.nombre)]);
for (const idioma of idiomas) {
  sinDuplicados(`registro de servicio (${idioma})`, servicios.map((s) => s.pagina[idioma] ?? ""));
  sinDuplicados(`registro de página de eje o línea (${idioma})`, [...ejes, ...lineas].map((n) => n.pagina[idioma] ?? ""));
}
sinDuplicados("destino del menú", sitio.menu.map((d) => d.ruta.es));

/* ── 7 · Coherencias sueltas ────────────────────────────────────────────── */

const BLOQUES = new Set(["puertas", "lineas", "doctrina", "articulos", "descarga"]);
const sueltos = new Set(sitio.oferta.sueltos.map((s) => s.slug));
for (const b of sitio.bloquesDeServicios) {
  if (typeof b === "string") {
    check(BLOQUES.has(b), `bloque de Servicios «${b}» desconocido (${[...BLOQUES].join(", ")}, o un suelto)`);
  } else {
    check(sueltos.has(b.suelto), `bloque de Servicios «${b.id}»: el suelto «${b.suelto}» no está en la oferta`);
  }
}
sinDuplicados("bloque de Servicios", sitio.bloquesDeServicios.map((b) => (typeof b === "string" ? b : b.id)));

for (const l of lineas) {
  if (!l.enlaceExterno) continue;
  check(
    l.enlaceExterno.enlace in sitio.dominio.enlaces,
    `línea «${l.clave}»: el enlace externo «${l.enlaceExterno.enlace}» no está en dominio.enlaces`,
  );
}

check(!sitio.modulos.api || sitio.modulos.intranet, "modulos.api encendido sin modulos.intranet: la API opera sobre la intranet");

/* ── Resultado ──────────────────────────────────────────────────────────── */

if (fallos.length > 0) {
  console.error(`✗ sitio: ${fallos.length} de ${comprobaciones} comprobaciones fallaron.\n`);
  for (const f of fallos) console.error(`  · ${f}`);
  console.error(
    `\n  La ficha es ${path.relative(REPO_ROOT, origen)}; su forma, lib/sitio/tipos.ts.\n` +
      `  Una página de la oferta sin su registro compila y se sirve vacía: corrígelo aquí.\n`,
  );
  process.exit(1);
}

console.log(
  `✓ sitio: ${comprobaciones} comprobaciones — ${ejes.length} ejes, ${lineas.length} líneas, ` +
    `${servicios.length} servicios en ${idiomas.length} idioma(s), coherentes con el contenido y con app/.`,
);
