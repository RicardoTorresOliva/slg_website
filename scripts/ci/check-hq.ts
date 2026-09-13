/**
 * check-hq.ts — **La frontera (a) del alcance, como freno** (DU-13 criterio 6 ·
 * RF-85 · RF-57 · §10-13).
 *
 * «HQ **no** incluye gestión de leads, etapas, oportunidades ni pipeline: esa
 * superficie vive en el CRM. Un requisito futuro que la pida se trata como
 * cambio de alcance.»
 *
 * POR QUÉ ESTO ES UN FRENO Y NO UNA NOTA EN UN DOCUMENTO. Una frontera de
 * alcance no se cruza de golpe: se cruza con «ya que estamos, un campito de
 * etapa», y el campito no lo discute nadie porque parece pequeño. Seis meses
 * después hay medio CRM dentro de HQ, dos sitios donde vive el estado de un
 * lead y ninguno que sea el bueno. El freno convierte «lo acordamos» en «el CI
 * se pone rojo», que es la única forma de que una decisión de alcance sobreviva
 * a la prisa.
 *
 * QUÉ MIRA, sobre `app/(hq)/` y `lib/hq/`:
 *   1. **Vocabulario de pipeline en el código**, no en los comentarios: los
 *      comentarios EXPLICAN la prohibición y tienen que poder nombrarla. Lo que
 *      no puede haber es un identificador, un literal o un texto de pantalla
 *      que hable de etapas, oportunidades, importes o previsiones.
 *   2. **Ninguna escritura al CRM desde HQ.** El tablero lee y nada más: si
 *      aparece un `POST`, es que alguien empezó a gestionar desde aquí.
 *   3. **El tablero usa la clave de SOLO LECTURA** (RF-56). Leer con la clave
 *      de captura funcionaría igual de bien, y por eso hay que comprobarlo:
 *      el fallo no se manifiesta hasta el día que hay que revocar una de las
 *      dos y se descubre que apaga las dos cosas.
 *
 * `HQ_ROOT` apunta el barrido a otra carpeta: es lo que usa su prueba negativa.
 */
import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const RAIZ = process.env.HQ_ROOT;

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

/** Los comentarios se borran: nombrar la regla no es infringirla. */
function sinComentarios(fuente: string): string {
  return fuente
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + " ".repeat(m.length - p1.length));
}

function archivos(): { rel: string; fuente: string }[] {
  const raices = RAIZ
    ? [RAIZ]
    : [path.join(REPO_ROOT, "app/(hq)"), path.join(REPO_ROOT, "lib/hq")];
  const out: { rel: string; fuente: string }[] = [];
  for (const raiz of raices) {
    if (!fs.existsSync(raiz)) continue;
    const pila = [raiz];
    while (pila.length) {
      const dir = pila.pop()!;
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const abs = path.join(dir, e.name);
        if (e.isDirectory()) pila.push(abs);
        else if (/\.tsx?$/.test(e.name)) {
          out.push({ rel: path.relative(REPO_ROOT, abs), fuente: fs.readFileSync(abs, "utf8") });
        }
      }
    }
  }
  return out;
}

/**
 * El vocabulario del pipeline.
 *
 * Se busca sobre el código **normalizado**: `etapaDelLead` y `pipelineStage`
 * tienen que caer igual que `etapa` suelta, y con un `\b` a secas no caerían —
 * en camelCase no hay frontera de palabra, así que el freno pasaría por encima
 * justo de la forma en que se escribe el código de verdad. Se separan las
 * mayúsculas y los guiones bajos antes de mirar.
 */
const PROHIBIDO: readonly { re: RegExp; que: string }[] = [
  { re: /\b(?:etapas?|stages?)\b/i, que: "etapas de pipeline" },
  { re: /\b(?:oportunidad(?:es)?|opportunit(?:y|ies))\b/i, que: "oportunidades" },
  { re: /\bpipelines?\b/i, que: "pipeline" },
  { re: /\b(?:forecast|previsi[oó]n(?:es)?)\b/i, que: "previsiones" },
  { re: /\b(?:deal|deals)\b/i, que: "deals" },
  { re: /\bprobabilidad(?:es)?\b/i, que: "probabilidad de cierre" },
  { re: /\b(?:pr[oó]ximo paso|next step)\b/i, que: "próximo paso del lead" },
];

/**
 * Las **tres únicas** apariciones permitidas, nombradas una a una.
 *
 * Ninguna gestiona nada: las tres existen para **contar cuántas capturas
 * siguen SIN oportunidad** y decir que hay trabajo manual pendiente, que es lo
 * que el criterio 7 exige enseñar mientras el adaptador siga en `contact_note`.
 * Guardar el identificador que el CRM devolvió, y contar los que faltan, es lo
 * contrario de gestionar el pipeline: es señalar que el pipeline **está en otro
 * sitio** y que alguien tiene que ir.
 *
 * La lista es cerrada y se amplía **discutiéndola**, que es justo el efecto
 * buscado: añadir una línea aquí obliga a justificar por qué la nueva
 * aparición tampoco es gestión.
 */
const EXCEPCIONES: readonly { re: RegExp; porQue: string }[] = [
  { re: /crm opportunity id/g, porQue: "la columna que guarda el id que devolvió el CRM" },
  { re: /(?:capturas que )?piden oportunidad/g, porQue: "el contador del criterio 7" },
  { re: /needs opportunity(?: none)?/g, porQue: "las etiquetas de ese contador" },
];

/** camelCase, snake_case y puntos → palabras separadas, en minúsculas. */
function normalizar(codigo: string): string {
  return codigo
    .replace(/([a-zá-úñ])([A-ZÁ-ÚÑ])/g, "$1 $2")
    .replace(/[_.]/g, " ")
    .toLowerCase();
}

console.log("\nHQ no gestiona leads, etapas, oportunidades ni pipeline (criterio 6 · RF-85):\n");

const vistos = archivos();
const hallazgos: string[] = [];
for (const a of vistos) {
  let codigo = normalizar(sinComentarios(a.fuente));
  // Primero se quitan las excepciones nombradas; lo que quede es lo que se juzga.
  for (const e of EXCEPCIONES) codigo = codigo.replace(e.re, " (permitido) ");
  for (const p of PROHIBIDO) {
    const m = p.re.exec(codigo);
    if (m) hallazgos.push(`${a.rel} · ${p.que} («${m[0]}»)`);
  }
}
check(
  `${vistos.length} archivo(s) de HQ, ninguno con vocabulario de pipeline`,
  hallazgos.length === 0,
  hallazgos.join("\n      "),
);

console.log("\nEl tablero LEE del CRM y no escribe (RF-55, RF-57):\n");

const escrituras: string[] = [];
for (const a of vistos) {
  const codigo = sinComentarios(a.fuente);
  for (const m of codigo.matchAll(/llamar\s*\(\s*["'](\w+)["']/g)) {
    if (m[1] !== "GET") escrituras.push(`${a.rel} · llamar("${m[1]}", …)`);
  }
}
check("ninguna llamada al CRM que no sea GET", escrituras.length === 0, escrituras.join("\n      "));

console.log("\nEl tablero usa la clave de SOLO LECTURA (RF-56):\n");

const metricas = vistos.find((a) => a.rel.endsWith("lib/hq/metricas.ts"));
check("existe el lector de métricas", Boolean(metricas) || Boolean(RAIZ), "lib/hq/metricas.ts");
if (metricas) {
  const codigo = sinComentarios(metricas.fuente);
  check(
    'cada llamada pasa `"tablero"` como uso, nunca la clave de captura',
    // `[^)]` ya cruza saltos de línea: no hace falta la bandera `s`, que este
    // `target` de TypeScript no admite.
    /llamar\([^)]*"tablero"\)/.test(codigo) && !/"captura"/.test(codigo),
    codigo.match(/llamar\([^)]*\)/)?.[0]?.slice(0, 120) ?? "(sin llamada)",
  );
}

if (fallos > 0) {
  console.error(`\n✗ hq: ${fallos} de ${comprobaciones} comprobaciones fallaron.\n`);
  process.exit(1);
}
console.log(`\n✓ hq: ${comprobaciones} comprobaciones sobre la frontera de alcance de HQ, sin fallos.`);
