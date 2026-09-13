/**
 * check-anexo-d.ts — **Los trece gates del Anexo D, escritos como
 * comprobaciones y no como prosa** (DU-25, criterio 4 · RF-148).
 *
 * QUÉ PROBLEMA RESUELVE. El Anexo D del brief describe los gates en párrafos. Un
 * párrafo no se ejecuta, y un gate que solo se puede leer se cumple «en
 * general» — que es la forma educada de decir que nadie lo comprueba. RF-148
 * pide que cada uno esté escrito de modo que **extraerlos a un perfil propio sea
 * mover texto**: eso solo es cierto si cada gate lleva pegada su verificación.
 *
 * Así que esto vigila `docs/gates.md`, y vigila tres cosas:
 *
 *   1. **Están los trece.** D1…D12 más D2b. Que falte uno es exactamente el
 *      fallo que este freno existe para atrapar: se escriben doce y nadie
 *      cuenta.
 *   2. **Cada uno declara cómo se comprueba**, y lo declarado **existe**: cada
 *      `npm run …` que se nombre tiene que estar en `package.json`. Un gate que
 *      apunta a un script inexistente es peor que un gate sin script, porque
 *      parece que está cubierto.
 *   3. **Ninguno se queda en prosa.** Un gate sin comando **tiene** que traer
 *      una checklist con pasos numerados; si no trae ni una cosa ni la otra, es
 *      un párrafo con un número delante.
 *
 * `ANEXO_D_PATH` apunta a otro archivo: es lo que usa su prueba negativa (R-26).
 */
import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const RUTA = process.env.ANEXO_D_PATH
  ? path.resolve(process.env.ANEXO_D_PATH)
  : path.join(REPO_ROOT, "docs/gates.md");

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

/** Los trece del Anexo D. `D2b` va entre `D2` y `D3`, como en el brief. */
const GATES = ["D1", "D2", "D2b", "D3", "D4", "D5", "D6", "D7", "D8", "D9", "D10", "D11", "D12"];

const texto = fs.existsSync(RUTA) ? fs.readFileSync(RUTA, "utf8") : "";
const guiones: Record<string, string> = JSON.parse(
  fs.readFileSync(path.join(REPO_ROOT, "package.json"), "utf8"),
).scripts;

/** Parte el documento por sus encabezados de gate: `## D5 · …`. */
function secciones(): Map<string, string> {
  const mapa = new Map<string, string>();
  const partes = texto.split(/\n## (?=D\d)/);
  for (const parte of partes.slice(1)) {
    const id = /^(D\d+b?)/.exec(parte)?.[1];
    if (id) mapa.set(id, parte);
  }
  return mapa;
}

console.log("\nRF-148 — los trece gates del Anexo D, con su comprobación al lado:\n");

check("el documento de gates existe", texto.length > 0, RUTA);

const partes = secciones();
const faltan = GATES.filter((g) => !partes.has(g));
check(`están los ${GATES.length} gates`, faltan.length === 0, `faltan: ${faltan.join(", ")}`);

const sinComprobacion: string[] = [];
const inventados: string[] = [];
const soloProsa: string[] = [];

for (const gate of GATES) {
  const parte = partes.get(gate);
  if (!parte) continue;

  const comandos = [...parte.matchAll(/npm run ([a-z0-9:-]+)/g)].map((m) => m[1]!);
  // Una checklist de verdad: pasos numerados, no una frase que diga «revisar».
  const pasos = [...parte.matchAll(/^\d+\.\s+\S/gm)].length;

  if (comandos.length === 0 && pasos === 0) soloProsa.push(gate);
  if (comandos.length === 0 && pasos > 0 && !/checklist/i.test(parte)) sinComprobacion.push(gate);

  for (const comando of comandos) {
    if (!(comando in guiones)) inventados.push(`${gate} → ${comando}`);
  }
}

check("ninguno se queda en prosa: todos traen comando o checklist", soloProsa.length === 0, soloProsa.join(", "));
check(
  "los que dependen de una persona traen pasos numerados, no «revisar que se ve bien»",
  sinComprobacion.length === 0,
  sinComprobacion.join(", "),
);

/* ══════════════════════════════════════════════════════════════════════════
 * La cláusula que estaba escrita y no comprobaba nada
 * ══════════════════════════════════════════════════════════════════════════
 *
 * La comprobación de arriba se llama «no “revisar que se ve bien”» y **nunca
 * miraba una sola palabra de los pasos**: solo entraba cuando un gate no traía
 * ningún `npm run …`, así que un gate con comando podía llevar al lado la
 * cláusula humana más vaga del mundo y pasaba en verde. Peor: un gate con parte
 * manual que **no traía checklist ninguna** también pasaba, porque su comando
 * lo salvaba. D10 era justo ese caso —«visor desplegado» en la tabla, «sigue
 * abierto» en prosa, ✅ en el estado— y llevaba así desde DU-25.
 *
 * Lo que sigue lo convierte en tres comprobaciones que sí miran:
 *
 *   1. Todo gate con parte manual **en la tabla resumen** trae su checklist.
 *   2. Esa checklist tiene pasos con **resultado anotable**, no pasos sueltos.
 *   3. Ningún gate contiene ninguna de las fórmulas vagas que el proyecto
 *      decidió prohibir. La lista es explícita: un freno que dice «vago» sin
 *      decir qué considera vago no se puede ni discutir ni arreglar.
 */

/** La tabla resumen: `| D10 Archivos | … | visor desplegado | ⏳ |`. */
function partesManuales(): Map<string, string> {
  const manual = new Map<string, string>();
  for (const fila of texto.matchAll(/^\|\s*(D\d+b?)\s[^|]*\|[^|]*\|([^|]*)\|/gm)) {
    const pendiente = fila[2]!.trim();
    if (pendiente && pendiente !== "—" && pendiente !== "-") manual.set(fila[1]!, pendiente);
  }
  return manual;
}

const conParteManual = partesManuales();
check(
  "la tabla resumen declara qué gates tienen parte manual",
  conParteManual.size > 0,
  `${conParteManual.size}`,
);

const sinChecklist: string[] = [];
const sinResultadoAnotable: string[] = [];
for (const [gate, pendiente] of conParteManual) {
  const parte = partes.get(gate);
  if (!parte) continue;
  if (!/checklist manual/i.test(parte)) {
    sinChecklist.push(`${gate} (pendiente: ${pendiente})`);
    continue;
  }
  /**
   * **Resultado anotable**, que es lo que D-149 prometió y nadie comprobaba: un
   * paso que termina en `→ sí / no`, una casilla `- [ ]`, o una instrucción de
   * anotar. Sin eso, una checklist es una lista de buenas intenciones: se
   * ejecuta, se olvida, y nadie puede decir después si se pasó.
   */
  const anotable =
    /→\s*(?:sí|si|no)/i.test(parte) || /^- \[ \]/m.test(parte) || /\b(?:anot|apunt|registr)[ae]/i.test(parte);
  if (!anotable) sinResultadoAnotable.push(gate);
}
check(
  "todo gate con parte manual trae su **checklist manual**, no solo el comando",
  sinChecklist.length === 0,
  sinChecklist.join(", "),
);
check(
  "y sus pasos dejan un resultado anotable (`→ sí / no`, casilla o «anota»)",
  sinResultadoAnotable.length === 0,
  sinResultadoAnotable.join(", "),
);

/**
 * Las fórmulas prohibidas, **escritas una a una**. No es una heurística de
 * vaguedad: es la lista concreta que este proyecto decidió que no cuenta como
 * comprobación, y por eso se puede discutir, ampliar y arreglar. Todas
 * comparten lo mismo: nombran un juicio sin decir contra qué se compara.
 */
const FORMULAS_VAGAS: readonly RegExp[] = [
  /revisar que se ve bien/i,
  /comprobar que (?:está|esta|todo está|todo esta) bien/i,
  /que funcione bien/i,
  /verificar visualmente/i,
  /echar un vistazo/i,
  /asegurarse de que (?:va|funciona|está) bien/i,
  /dar el visto bueno/i,
];
const conFormulaVaga: string[] = [];
for (const gate of GATES) {
  const parte = partes.get(gate);
  if (!parte) continue;
  for (const formula of FORMULAS_VAGAS) {
    const hallada = formula.exec(parte);
    if (hallada) conFormulaVaga.push(`${gate} → «${hallada[0]}»`);
  }
}
check(
  "y ninguno se apoya en una fórmula vaga: un juicio sin nada contra lo que comparar",
  conFormulaVaga.length === 0,
  conFormulaVaga.join(", "),
);
check(
  "todo `npm run …` que se nombra EXISTE en package.json",
  inventados.length === 0,
  inventados.join(", "),
);

/**
 * Y la parte que hace honesto al documento: **cada gate declara su estado**. Un
 * gate sin estado es un gate del que nadie sabe si está verde, y el criterio 5
 * de DU-25 pide justamente eso, con evidencia.
 */
const sinEstado = GATES.filter((g) => {
  const parte = partes.get(g);
  return parte !== undefined && !/\*\*Estado\.\*\*/.test(parte);
});
check("cada gate declara su estado", sinEstado.length === 0, sinEstado.join(", "));

if (fallos > 0) {
  console.error(`\n✗ anexo-d: ${fallos} de ${comprobaciones} comprobaciones fallaron.\n`);
  process.exit(1);
}
console.log(`\n✓ anexo-d: los ${GATES.length} gates con su comprobación, su estado y sus scripts reales.`);
