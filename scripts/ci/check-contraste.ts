/**
 * check-contraste.ts — El gate D2, MEDIDO. No afirmado.
 *
 * Los criterios 3 y 4 de FU-10 dicen «se mide, no se afirma». Esto lo mide: lee
 * los hexadecimales de `app/tokens.css` —el único archivo autorizado a
 * contenerlos— y calcula el contraste WCAG 2.1 de cada combinación que el kit
 * declara, incluidas las **prohibidas**.
 *
 * LAS TRES REGLAS DURAS DEL KIT, comprobadas en cada push:
 *   · `--cyan` (#50B4DC) y `--blue-tint` (#78B4DC) **nunca** como color de
 *     texto sobre fondo claro.
 *   · `--blue-primary` (#2878B4) sobre `--paper-2` **solo a ≥ 24 px**.
 *   · El **anillo de foco de dos capas** (D-44) cumple el contraste que exige
 *     RNF-05 gracias a su capa interior. Un anillo de una sola capa en `--cyan`
 *     —2,4:1 sobre papel— **rechaza la unidad**, aunque el Anexo C.1 liste ese
 *     color entre los usos de anillo.
 *
 * Y la contraprueba, que vale tanto como la comprobación: se verifica que los
 * pares PROHIBIDOS efectivamente **no** llegan a AA. Si algún día uno pasara,
 * es que alguien cambió un token y la prohibición se quedó sin motivo escrito.
 */
import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const TOKENS = process.env.TOKENS_PATH
  ? path.resolve(process.env.TOKENS_PATH)
  : path.join(REPO_ROOT, "app", "tokens.css");

/* ── WCAG 2.1 ─────────────────────────────────────────────────────────────── */

function canalLineal(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luminancia(hex: string): number {
  const n = hex.replace("#", "");
  const v = n.length === 3 ? n.split("").map((c) => c + c).join("") : n;
  const r = parseInt(v.slice(0, 2), 16);
  const g = parseInt(v.slice(2, 4), 16);
  const b = parseInt(v.slice(4, 6), 16);
  return 0.2126 * canalLineal(r) + 0.7152 * canalLineal(g) + 0.0722 * canalLineal(b);
}

function contraste(a: string, b: string): number {
  const la = luminancia(a);
  const lb = luminancia(b);
  const [alto, bajo] = la > lb ? [la, lb] : [lb, la];
  return (alto + 0.05) / (bajo + 0.05);
}

const redondear = (n: number) => Math.round(n * 10) / 10;

/* ── Tokens ───────────────────────────────────────────────────────────────── */

const css = fs.readFileSync(TOKENS, "utf8");
const tokens = new Map<string, string>();

// Valores literales.
for (const m of css.matchAll(/(--slg-[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
  tokens.set(m[1], m[2].toLowerCase());
}

/**
 * Alias. `--slg-link` y las dos capas del anillo se definen como `var(--otro)`,
 * y eso es deliberado: el día que el enlace deje de ser el azul primario se
 * cambia en un sitio. El gate tiene que seguir el alias, no exigir literal:
 * exigirlo empujaría a duplicar hexadecimales, que es justo lo que FU-02
 * prohíbe.
 */
const alias = new Map<string, string>();
for (const m of css.matchAll(/(--slg-[a-z0-9-]+)\s*:\s*var\(\s*(--slg-[a-z0-9-]+)\s*\)\s*;/g)) {
  alias.set(m[1], m[2]);
}
for (const [nombre, apunta] of alias) {
  let destino = apunta;
  // Cadenas de alias, con tope: un ciclo de tokens no puede colgar el gate.
  for (let i = 0; i < 8 && !tokens.has(destino); i++) {
    const siguiente = alias.get(destino);
    if (!siguiente) break;
    destino = siguiente;
  }
  const valor = tokens.get(destino);
  if (valor) tokens.set(nombre, valor);
}

function token(nombre: string): string {
  const v = tokens.get(nombre);
  if (!v) {
    console.error(`✗ contraste: falta el token ${nombre} en ${path.relative(REPO_ROOT, TOKENS)}.`);
    process.exit(1);
  }
  return v;
}

/* ── Lo que se exige ──────────────────────────────────────────────────────── */

type Caso = {
  readonly que: string;
  readonly texto: string;
  readonly fondo: string;
  /** AA: 4.5 para texto normal, 3.0 para texto grande (≥ 24 px) y para UI. */
  readonly minimo: number;
  readonly nota?: string;
};

const EXIGIDOS: readonly Caso[] = [
  { que: "texto de cuerpo sobre papel", texto: "--slg-ink", fondo: "--slg-paper", minimo: 4.5 },
  { que: "texto secundario sobre papel", texto: "--slg-ink-2", fondo: "--slg-paper", minimo: 4.5 },
  { que: "texto secundario sobre papel suave", texto: "--slg-ink-2", fondo: "--slg-paper-2", minimo: 4.5 },
  { que: "enlace sobre papel", texto: "--slg-link", fondo: "--slg-paper", minimo: 4.5 },
  { que: "azul primario sobre papel", texto: "--slg-blue-primary", fondo: "--slg-paper", minimo: 4.5 },
  { que: "azul oscuro sobre papel (titulares)", texto: "--slg-blue-deep", fondo: "--slg-paper", minimo: 4.5 },
  {
    // El §2.2 publica esta cifra; se mide aquí para que no vuelva a quedarse
    // vieja cuando alguien toque el token. Ver D-66.
    que: "azul oscuro sobre papel suave",
    texto: "--slg-blue-deep",
    fondo: "--slg-paper-2",
    minimo: 4.5,
  },
  { que: "índigo sobre papel", texto: "--slg-indigo", fondo: "--slg-paper", minimo: 4.5 },
  {
    que: "rojo de detención sobre papel",
    texto: "--slg-red",
    fondo: "--slg-paper",
    minimo: 4.5,
    nota: "el rojo es DETENCIÓN: mensajes de error y el CTA de descarga",
  },
  {
    que: "blanco sobre el rojo del CTA",
    texto: "--slg-paper",
    fondo: "--slg-red",
    minimo: 4.5,
    nota: "el botón que paga el proyecto",
  },
  {
    que: "azul primario sobre papel suave, SOLO a ≥ 24 px",
    texto: "--slg-blue-primary",
    fondo: "--slg-paper-2",
    minimo: 3.0,
    nota: "4,4:1 no llega a AA de texto normal; por eso la regla dice ≥ 24 px",
  },
  /* Secciones oscuras (style_guide §7.1) */
  { que: "blanco sobre azul oscuro", texto: "--slg-paper", fondo: "--slg-blue-deep", minimo: 4.5 },
  { que: "blanco sobre índigo", texto: "--slg-paper", fondo: "--slg-indigo", minimo: 4.5 },
  {
    que: "cyan como TEXTO sobre índigo",
    texto: "--slg-cyan",
    fondo: "--slg-indigo",
    minimo: 4.5,
  },
  {
    /**
     * `style_guide` §2.3 y §7.1 decían que este par mide 2,8:1, y de ahí salía
     * la regla de no poner cyan legible sobre azul oscuro. **Ese número es del
     * token anterior**: 2,8:1 es el cyan sobre `#14648C`. El `--blue-deep` que
     * el sitio usa es `#24394D` —lo dice la tabla del §2.2 y lo define
     * `app/globals.css`—, y con él el par mide **5,0:1**: alcanza AA. Las
     * cifras derivadas no se habían recalculado al cambiar el hexadecimal. Lo
     * encontró esta medición, no una relectura del documento. Ver **D-66**.
     */
    que: "cyan como texto sobre azul oscuro (recalculado, D-66)",
    texto: "--slg-cyan",
    fondo: "--slg-blue-deep",
    minimo: 4.5,
  },
  /* D-44 · el anillo de foco de dos capas */
  {
    que: "anillo de foco · CAPA INTERIOR sobre papel",
    texto: "--slg-focus-inner",
    fondo: "--slg-paper",
    minimo: 3.0,
    nota: "es la capa que aporta el contraste del anillo (RNF-05, D-44)",
  },
  {
    que: "anillo de foco · capa interior sobre papel suave",
    texto: "--slg-focus-inner",
    fondo: "--slg-paper-2",
    minimo: 3.0,
  },
];

/** Pares que el kit PROHÍBE. Se comprueba que efectivamente no llegan a AA. */
const PROHIBIDOS: readonly Caso[] = [
  {
    que: "cyan como texto sobre papel",
    texto: "--slg-cyan",
    fondo: "--slg-paper",
    minimo: 4.5,
    nota: "2,4:1 — nunca como color de texto sobre fondo claro",
  },
  {
    que: "cyan como texto sobre papel suave",
    texto: "--slg-cyan",
    fondo: "--slg-paper-2",
    minimo: 4.5,
    nota: "nunca como color de texto sobre fondo claro",
  },
  {
    que: "tinte azul como texto sobre papel",
    texto: "--slg-blue-tint",
    fondo: "--slg-paper",
    minimo: 4.5,
    nota: "solo fondo al 20–40 % de opacidad; nunca texto",
  },
  {
    que: "anillo de UNA sola capa en cyan sobre papel",
    texto: "--slg-cyan",
    fondo: "--slg-paper",
    minimo: 3.0,
    nota: "es exactamente lo que D-44 corrige: rechaza la unidad",
  },
];

/* ── Medición ─────────────────────────────────────────────────────────────── */

const fallos: string[] = [];
let comprobaciones = 0;

console.log("Contraste medido sobre los tokens del kit (gate D2):\n");

for (const c of EXIGIDOS) {
  comprobaciones++;
  const r = contraste(token(c.texto), token(c.fondo));
  const ok = r >= c.minimo;
  console.log(
    `  ${ok ? "·" : "✗"} ${c.que.padEnd(56)} ${String(redondear(r)).padStart(5)}:1  (mínimo ${c.minimo})`,
  );
  if (!ok) {
    fallos.push(
      `${c.que}: ${redondear(r)}:1, por debajo del mínimo ${c.minimo}` +
        (c.nota ? ` — ${c.nota}` : ""),
    );
  }
}

console.log("\nPares PROHIBIDOS — se comprueba que NO llegan a AA:\n");

for (const c of PROHIBIDOS) {
  comprobaciones++;
  const r = contraste(token(c.texto), token(c.fondo));
  const sigueProhibido = r < c.minimo;
  console.log(
    `  ${sigueProhibido ? "·" : "✗"} ${c.que.padEnd(56)} ${String(redondear(r)).padStart(5)}:1  (prohibido por debajo de ${c.minimo})`,
  );
  if (!sigueProhibido) {
    fallos.push(
      `${c.que} ahora mide ${redondear(r)}:1 y SÍ llega a AA. Alguien cambió un token: ` +
        `la prohibición se quedó sin motivo y hay que revisarla en el kit, no ignorarla.`,
    );
  }
}

console.log("");
if (fallos.length > 0) {
  console.error(`✗ contraste: ${fallos.length} fallo(s) sobre ${comprobaciones} mediciones.\n`);
  for (const f of fallos) console.error(`  · ${f}`);
  console.error("");
  process.exit(1);
}
console.log(`✓ contraste: ${comprobaciones} mediciones sobre los tokens reales, sin fallos.\n`);
