/**
 * check-shell.ts — El armazón de aplicación, comprobado como CONTRATO (FU-12).
 *
 * Los tres criterios de esta unidad que se pueden mecanizar, y que sin freno se
 * incumplen despacio, pantalla a pantalla, sin que nadie lo note:
 *
 *   · **criterio 1** — los seis estados canónicos existen y **ninguna pantalla
 *     de M3 o M4 inventa el suyo**. El día que una escriba su propio «No hay
 *     nada todavía», habrá dos textos para el mismo estado y uno de los dos
 *     estará sin traducir.
 *   · **criterio 3** — HQ y el portal **no llevan conmutador de idioma**
 *     (RF-72). Es de las cosas más fáciles de añadir «porque en la web
 *     pública lo hay», y es justo lo que el requisito prohíbe.
 *   · **criterio 5** — toda sección declara la acción de B.3 que la gobierna, y
 *     esa acción **existe** en la matriz. Una sección sin acción es una
 *     pantalla que nadie sabe quién puede ver.
 *
 * Y lo que hace que el criterio 3 sea cierto de verdad: **cada clave de
 * navegación y cada estado tienen texto en LOS DOS idiomas**. Una interfaz que
 * se muestra según la preferencia de la cuenta con una clave sin traducir sale
 * rota solo para quien eligió el otro idioma — y esa persona no es quien
 * desarrolla.
 *
 * `SHELL_ROOT` apunta el barrido a otra carpeta: es lo que usa su prueba
 * negativa.
 */
import fs from "node:fs";
import path from "node:path";

import { ESTADOS_CANONICOS } from "../../lib/app/estados.ts";
import { SECCIONES } from "../../lib/app/navegacion.ts";
import { ACCIONES } from "../../lib/auth/matriz.ts";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const RAIZ = process.env.SHELL_ROOT;

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

function sinComentarios(fuente: string): string {
  return fuente
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + " ".repeat(m.length - p1.length));
}

/** Los `.tsx` de las superficies autenticadas: las pantallas de M3 y M4. */
function pantallas(): { rel: string; fuente: string }[] {
  const raices = RAIZ ? [RAIZ] : [path.join(REPO_ROOT, "app/(hq)"), path.join(REPO_ROOT, "app/(portal)")];
  const out: { rel: string; fuente: string }[] = [];
  for (const raiz of raices) {
    if (!fs.existsSync(raiz)) continue;
    const pila = [raiz];
    while (pila.length) {
      const dir = pila.pop()!;
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const abs = path.join(dir, e.name);
        if (e.isDirectory()) pila.push(abs);
        else if (e.name.endsWith(".tsx")) {
          out.push({ rel: path.relative(REPO_ROOT, abs), fuente: sinComentarios(fs.readFileSync(abs, "utf8")) });
        }
      }
    }
  }
  return out;
}

console.log("\nLos seis estados canónicos (criterio 1):\n");

const estados = fs.readFileSync(path.join(REPO_ROOT, "components/app/EstadosCanonicos.tsx"), "utf8");
check("son seis y ninguno más", ESTADOS_CANONICOS.length === 6, ESTADOS_CANONICOS.join(" · "));
check(
  "el componente los recibe por nombre, no hay uno por estado",
  /estado:\s*EstadoCanonico/.test(estados),
  "con seis componentes sueltos, una pantalla puede importar cinco e inventarse el sexto",
);

const ui = {
  es: JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "content/ui/es.json"), "utf8")) as Record<string, string>,
  en: JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "content/ui/en.json"), "utf8")) as Record<string, string>,
};

for (const estado of ESTADOS_CANONICOS) {
  for (const parte of ["titulo", "texto"] as const) {
    const clave = `app.state.${estado}.${parte}`;
    check(
      `«${clave}» tiene texto en los dos idiomas`,
      Boolean(ui.es[clave]?.trim()) && Boolean(ui.en[clave]?.trim()),
      `es: ${ui.es[clave] ?? "(falta)"} · en: ${ui.en[clave] ?? "(falta)"}`,
    );
  }
}

console.log("\nNinguna pantalla de M3 o M4 inventa su propio estado (criterio 1):\n");

const vistas = pantallas();
/**
 * Las marcas de un estado escrito a mano: los papeles ARIA que solo usa un
 * estado, y `data-slg-estado` fuera del componente canónico. No se busca el
 * texto —eso ya lo atrapa `check:cadenas`—, se busca **la forma**.
 */
const HUELLAS = [
  { re: /role="(alert|status)"/, motivo: 'role="alert"/"status" escrito en una pantalla' },
  { re: /aria-busy/, motivo: "aria-busy escrito en una pantalla" },
  { re: /data-slg-estado/, motivo: "data-slg-estado fuera del componente canónico" },
];

const inventados: string[] = [];
for (const v of vistas) {
  for (const h of HUELLAS) if (h.re.test(v.fuente)) inventados.push(`${v.rel} · ${h.motivo}`);
}
check(
  `${vistas.length} archivo(s) de pantalla, ninguno con un estado propio`,
  inventados.length === 0,
  inventados.join("\n      "),
);

console.log("\nHQ y el portal no llevan conmutador de idioma (criterio 3 · RF-72):\n");

/** El conmutador de la capa pública, por sus nombres propios. */
const CONMUTADOR = [
  { re: /conmutador/i, motivo: "prop `conmutador` del armazón público" },
  { re: /hreflang/i, motivo: "hreflang: el par de idiomas es de la capa pública" },
  { re: /rutaEnElOtroIdioma/, motivo: "rutaEnElOtroIdioma(): aquí no hay otra ruta" },
  { re: /nav\.lang/, motivo: "la cadena del conmutador público" },
];
const enApp = [
  ...vistas,
  ...["ArmazonDeApp.tsx", "PantallaDeApp.tsx", "EstadosCanonicos.tsx", "ContenidoEntregado.tsx"]
    .map((f) => path.join(REPO_ROOT, "components/app", f))
    .filter((abs) => fs.existsSync(abs))
    .map((abs) => ({ rel: path.relative(REPO_ROOT, abs), fuente: sinComentarios(fs.readFileSync(abs, "utf8")) })),
];
const conmutadores: string[] = [];
for (const v of enApp) {
  for (const c of CONMUTADOR) if (c.re.test(v.fuente)) conmutadores.push(`${v.rel} · ${c.motivo}`);
}
check(
  `${enApp.length} archivo(s) de la capa autenticada, ningún conmutador`,
  conmutadores.length === 0,
  conmutadores.join("\n      "),
);

console.log("\nToda sección declara su acción de B.3, y la acción existe (criterio 5):\n");

for (const s of SECCIONES) {
  check(
    `«${s.clave}» → ${s.accion}`,
    (ACCIONES as readonly string[]).includes(s.accion),
    `no está en la matriz B.3`,
  );
}
for (const s of SECCIONES) {
  const clave = `app.nav.${s.clave}`;
  check(
    `«${clave}» tiene etiqueta en los dos idiomas`,
    Boolean(ui.es[clave]?.trim()) && Boolean(ui.en[clave]?.trim()),
    `es: ${ui.es[clave] ?? "(falta)"} · en: ${ui.en[clave] ?? "(falta)"}`,
  );
}
check(
  "ninguna sección repite href con otra de la misma superficie",
  new Set(SECCIONES.map((s) => `${s.superficie}${s.href}`)).size === SECCIONES.length,
  SECCIONES.map((s) => s.href).join(" · "),
);

if (fallos > 0) {
  console.error(`\n✗ shell: ${fallos} de ${comprobaciones} comprobaciones fallaron.\n`);
  process.exit(1);
}
console.log(`\n✓ shell: ${comprobaciones} comprobaciones sobre el armazón de aplicación, sin fallos.`);
