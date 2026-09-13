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

/**
 * **LA GUÍA DE DESPLIEGUE TAMBIÉN, y antes no.** Este barrido miraba solo el
 * `README.md`, y la documentación donde de verdad se escriben valores es
 * `docs/deployment.md`: es la que va paso a paso por Easypanel pegando líneas
 * de entorno. Diecisiete de sus líneas tienen la forma `VARIABLE=valor`. Lo
 * encontró la revisión final.
 *
 * AQUÍ NO VALE LA MISMA REGLA, y tratarlas igual sería peor que no mirar. Un
 * manual de despliegue **tiene que** escribir `S3_BUCKET_DOWNLOADS=downloads`:
 * ese valor es el producto de la decisión, no un secreto, y esconderlo deja la
 * instrucción a medias. Lo que no puede llevar valor es lo que es **secreto por
 * su nombre** —`SECRET`, `PASSWORD`, `TOKEN`, `KEY`—, y no solo porque pueda ser
 * real: un marcador de posición en un manual **se pega tal cual**, así que un
 * `APP_DB_PASSWORD=LoQueSea` escrito para ilustrar acaba siendo la contraseña
 * de alguien. La instrucción correcta dice **qué poner**, nunca un ejemplo
 * copiable.
 */
const NOMBRES_DE_SECRETO = /(SECRET|PASSWORD|TOKEN|_KEY|KEY_)/;
/**
 * `<entre ángulos>` —y los puntos suspensivos— SÍ pasan, y la diferencia no es
 * cosmética: un marcador así,
 * pegado tal cual, **falla en voz alta** —el servicio no arranca y quien lo hizo
 * se entera en el acto—. Una cadena que parece una contraseña, pegada tal cual,
 * **funciona**, y entonces la credencial de producción es la que salió escrita
 * en un repositorio público. El freno separa las dos por eso.
 */
const ES_MARCADOR = /^(?:<.*>|…|\.\.\.)$/;
const guia = leer("docs/deployment.md");
/**
 * **También dentro de una tabla**, y no es un caso rebuscado: la guía tenía
 * `STAGING_BASIC_AUTH_PASSWORD=lo-que-quieras` en una celda, que el barrido
 * anclado a principio de línea no veía. Un valor de muestra se pega igual esté
 * donde esté — y en una tabla se pega **más**, porque la tabla se lee como una
 * lista de cosas que copiar.
 */
const secretosConValor = [...guia.matchAll(/\b([A-Z][A-Z0-9_]{3,})=(<[^>`|]*>|[^\s`|]+)/g)]
  .filter((m) => NOMBRES_DE_SECRETO.test(m[1]!) && !ES_MARCADOR.test(m[2]!.trim()))
  .map((m) => `${m[1]!} (línea con valor)`);
check(
  "y en `docs/deployment.md` ninguna variable de SECRETO lleva un valor pegable",
  secretosConValor.length === 0,
  secretosConValor.join(", "),
);

/**
 * **CADA `§…` DE LA GUÍA APUNTA A UN APARTADO QUE EXISTE.**
 *
 * La guía de despliegue se navega por referencias cruzadas —«ver §4ter»— y una
 * que apunta a un sitio equivocado manda a Ricardo a leer otra cosa. Escribiendo
 * la tabla de «lo que solo puedes hacer tú» me equivoqué **dos veces seguidas**:
 * mandé a `§4ter` para los inicios de sesión sociales, que están en `§4quater`,
 * y a `§4ter` para los buckets citando solo `§2.1`. Las dos las pillé leyendo,
 * que es exactamente la forma en que no hay que pillarlas.
 *
 * Es el mismo defecto que `check:anexo-d` vigila con los `npm run …` que no
 * existen: una referencia rota **parece cobertura**.
 */
const apartados = new Set(
  [...guia.matchAll(/^#{2,4}\s+([0-9]+[a-zA-Z]*(?:\.[0-9]+)*)\./gm)].map((m) => m[1]!),
);
/**
 * **Solo las referencias a ESTE documento.** La guía también cita apartados de
 * `architecture.md` —«`architecture` §13.1 exige…»— y esos viven en otro
 * archivo con su propia numeración. Se reconocen porque la línea nombra el
 * documento; una referencia interna nunca lo hace.
 */
const OTRO_DOCUMENTO = /architecture|data_model|api_contracts|user_units|scope\.md|\.md\b/;
const internas = guia
  .split("\n")
  .filter((linea) => !OTRO_DOCUMENTO.test(linea))
  .flatMap((linea) => [...linea.matchAll(/§([0-9]+[a-zA-Z]*(?:\.[0-9]+)*)/g)].map((m) => m[1]!));
const rotas = [...new Set(internas)]
  .filter((ref) => !apartados.has(ref))
  // Un `§4bis.0` referenciado como `§4bis` vale: el apartado padre existe.
  .filter((ref) => !apartados.has(ref.split(".")[0]!));
check(
  "y cada `§…` de la guía apunta a un apartado que existe",
  rotas.length === 0,
  rotas.map((r) => `§${r}`).join(", "),
);

if (fallos > 0) {
  console.error(`\n✗ literacy: ${fallos} de ${comprobaciones} comprobaciones fallaron.\n`);
  process.exit(1);
}
console.log(`\n✓ literacy: ${comprobaciones} comprobaciones sobre el manual y el índice, sin fallos.`);
