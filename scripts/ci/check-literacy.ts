/**
 * check-literacy.ts — **El gate D12, como freno** (DU-24 · RF-126 · RNF-39 ·
 * RNF-41).
 *
 * TRES COSAS QUE SE PUDREN EN SILENCIO, Y LAS TRES SE PUEDEN COMPROBAR:
 *
 *   1. **Un design doc que nadie enlaza.** `knowledge/index.md` se carga en
 *      todas las sesiones y el resto no: un documento que no está en el índice
 *      es un documento **invisible**, y se descubre el día que alguien reescribe
 *      lo que ya estaba decidido. Pasó una vez —`design_summary.md` faltaba— y
 *      se arregló a mano; esto es para que no vuelva a depender de que alguien
 *      se fije.
 *   2. **Una tarea del manual que desaparece.** El criterio 1 de DU-24 fija
 *      **siete** tareas. Un README que las pierde de vista sigue pareciendo un
 *      buen README.
 *   3. **Una variable de entorno sin explicar.** R-28 pide que el manual diga de
 *      dónde sale **cada** valor. Añadir una variable y olvidarse del manual es
 *      lo natural; aquí el CI lo nota el mismo día.
 *
 * LO QUE ESTE FRENO NO PUEDE COMPROBAR, y hay que decirlo: **si los pasos
 * funcionan**. El criterio 2 dice que Ricardo ejecuta tres de las siete **sin
 * ayuda técnica**, y cada fallo del README es un defecto. Eso lo decide una
 * persona haciéndolo, no un script — este freno solo garantiza que las siete
 * están escritas y que nada se ha caído por el camino.
 *
 * `LITERACY_ROOT` apunta el barrido a otra carpeta: es lo que usa su prueba
 * negativa (R-26).
 */
import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const RAIZ = process.env.LITERACY_ROOT ? path.resolve(process.env.LITERACY_ROOT) : REPO_ROOT;

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

function leer(rel: string): string {
  const abs = path.join(RAIZ, rel);
  return fs.existsSync(abs) ? fs.readFileSync(abs, "utf8") : "";
}

function listar(rel: string): string[] {
  const abs = path.join(RAIZ, rel);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs).filter((f) => f.endsWith(".md")).sort();
}

/** Las siete tareas del criterio 1, por su encabezado. */
const SIETE_TAREAS = [
  "Cambiar un texto",
  "Publicar un artículo",
  "Añadir un documento de descarga",
  "Crear un cliente e invitar",
  "Crear una clave de API",
  "Desplegar",
  "Restaurar una copia de seguridad",
];

/** Lo que los criterios 4, 5 y 6 exigen que el manual explique. */
const TEMAS_OBLIGATORIOS: readonly { nombre: string; marcas: readonly string[] }[] = [
  { nombre: "el modo del adaptador del CRM y el paso manual (R-04, R-24)", marcas: ["contact_note", "oportunidad"] },
  { nombre: "la vuelta a la versión anterior tras un despliegue fallido (R-20)", marcas: ["Redeploy", "Revert"] },
  { nombre: "la rotación del secreto de Entra y dónde vive su caducidad (R-03)", marcas: ["Certificados y secretos", "project_memory.md"] },
];

const indice = leer("knowledge/index.md");
const registro = leer("knowledge/log.md");
const manual = leer("README.md");
const entorno = leer(".env.example");

console.log("\nRNF-41 — todo documento de diseño está enlazado desde el índice:\n");

const disenos = listar("design_docs").filter((f) => f !== "README.md");
check("hay design docs que comprobar", disenos.length > 0, `${disenos.length}`);
const noEnlazados = disenos.filter((f) => !indice.includes(`design_docs/${f}`));
check(
  "los documentos de diseño están todos en `knowledge/index.md`",
  noEnlazados.length === 0,
  noEnlazados.join(", "),
);

const conceptos = listar("knowledge").filter((f) => !["index.md", "log.md", "README.md"].includes(f));
const conceptosSueltos = conceptos.filter((f) => !indice.includes(f.replace(/\.md$/, "")));
check(
  "y los conceptos del bundle, también",
  conceptosSueltos.length === 0,
  conceptosSueltos.join(", "),
);
const sinRegistro = conceptos.filter((f) => !registro.includes(f.replace(/\.md$/, "")));
check(
  "cada concepto tiene su entrada en `knowledge/log.md`",
  sinRegistro.length === 0,
  sinRegistro.join(", "),
);

console.log("\nRF-126 — el manual cubre las siete tareas:\n");

const faltan = SIETE_TAREAS.filter((t) => !manual.includes(t));
check(`las ${SIETE_TAREAS.length} tareas están en el README`, faltan.length === 0, faltan.join(" · "));

for (const tema of TEMAS_OBLIGATORIOS) {
  check(`el manual explica ${tema.nombre}`, tema.marcas.every((m) => manual.includes(m)));
}

console.log("\nR-28 — de dónde sale cada variable, sin escribir ningún valor:\n");

const declaradas = [...entorno.matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map((m) => m[1]!);
check("hay variables declaradas que comprobar", declaradas.length > 0, `${declaradas.length}`);
const sinExplicar = declaradas.filter((v) => !manual.includes(v));
check(
  "todas las variables de `.env.example` aparecen en el manual",
  sinExplicar.length === 0,
  sinExplicar.join(", "),
);

/**
 * Y la otra mitad de R-28: que el manual **no lleve valores**. Se busca la forma
 * `VARIABLE=algo`, que es como se cuela un secreto en una documentación — con la
 * mejor intención, para que se entienda el ejemplo.
 */
const conValor = [...manual.matchAll(/^\s*([A-Z][A-Z0-9_]{3,})=(\S+)/gm)].map((m) => m[1]!);
check("y ninguna lleva su valor escrito al lado", conValor.length === 0, conValor.join(", "));

if (fallos > 0) {
  console.error(`\n✗ literacy: ${fallos} de ${comprobaciones} comprobaciones fallaron.\n`);
  process.exit(1);
}
console.log(`\n✓ literacy: ${comprobaciones} comprobaciones sobre el manual y el índice, sin fallos.`);
