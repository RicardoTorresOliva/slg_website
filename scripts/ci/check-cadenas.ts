/**
 * check-cadenas.ts — Cero texto escrito a mano en el armazón público (RF-16).
 *
 * Criterio 7 de DU-02: «todo el texto de la navegación y del pie se lee de
 * `content/ui`: cero literales en `.tsx`». La razón no es purismo: una etiqueta
 * escrita en un componente **existe en un solo idioma**, no la ve
 * `check:pairs`, y aparece en inglés en la versión española el día del
 * despliegue. Es el fallo bilingüe clásico, y solo se ve en producción.
 *
 * Qué mira: el texto visible de JSX —lo que va entre `>` y `<`— y los atributos
 * que un lector de pantalla lee en voz alta (`aria-label`, `title`, `alt`,
 * `placeholder`). Lo que NO mira: `href`, `className`, estilos y demás, que no
 * son texto para nadie.
 *
 * `CADENAS_ROOT` apunta el barrido a otra carpeta: es lo que usa su prueba
 * negativa.
 */
import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const RAIZ = process.env.CADENAS_ROOT;

/** Los archivos del armazón. Si DU-02 crece, la lista crece con él. */
const VIGILADOS = [
  "components/ArmazonPublico.tsx",
  "components/BarraDeNavegacion.tsx",
  "components/IndiceDeBlog.tsx",
  "components/PaginaProvisional.tsx",
  "components/PortadaProvisional.tsx",
];

const ATRIBUTOS_QUE_SE_LEEN = ["aria-label", "title", "alt", "placeholder"];

type Hallazgo = { archivo: string; linea: number; texto: string; motivo: string };

function sinComentarios(fuente: string): string {
  return fuente
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + " ".repeat(m.length - p1.length));
}

function revisar(rel: string, abs: string): Hallazgo[] {
  const hallazgos: Hallazgo[] = [];
  const lineas = sinComentarios(fs.readFileSync(abs, "utf8")).split("\n");

  lineas.forEach((linea, i) => {
    // Texto visible de JSX: `>Hola<`. Se ignora lo que sea una expresión
    // (`>{t["nav.menu"]}<`), que es justamente la forma correcta.
    for (const m of linea.matchAll(/>([^<>{}]+)</g)) {
      const texto = m[1].trim();
      if (!texto || !/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(texto)) continue;
      hallazgos.push({ archivo: rel, linea: i + 1, texto, motivo: "texto visible escrito a mano" });
    }
    // Atributos que se leen en voz alta, con valor literal.
    for (const attr of ATRIBUTOS_QUE_SE_LEEN) {
      const re = new RegExp(`${attr}="([^"]+)"`, "g");
      for (const m of linea.matchAll(re)) {
        // `aria-disabled="true"` y compañía no son texto: son estados.
        if (/^(true|false|page|none|dialog)$/.test(m[1])) continue;
        hallazgos.push({
          archivo: rel,
          linea: i + 1,
          texto: `${attr}="${m[1]}"`,
          motivo: "atributo que se lee en voz alta, escrito a mano",
        });
      }
    }
  });
  return hallazgos;
}

const base = RAIZ ?? REPO_ROOT;
const archivos = RAIZ
  ? fs.readdirSync(RAIZ).filter((f) => f.endsWith(".tsx")).map((f) => f)
  : VIGILADOS;

const hallazgos: Hallazgo[] = [];
let revisados = 0;
for (const rel of archivos) {
  const abs = path.join(base, rel);
  if (!fs.existsSync(abs)) {
    console.error(`✗ cadenas: falta ${rel}. Si el archivo se renombró, actualiza la lista.`);
    process.exit(1);
  }
  revisados++;
  hallazgos.push(...revisar(rel, abs));
}

if (revisados === 0) {
  console.error("✗ cadenas: no se revisó ni un archivo. Un barrido vacío no es un verde.");
  process.exit(1);
}

if (hallazgos.length > 0) {
  console.error(`✗ cadenas: ${hallazgos.length} literal(es) de texto en el armazón público.\n`);
  for (const h of hallazgos) {
    console.error(`  ${h.archivo}:${h.linea} — ${h.motivo}`);
    console.error(`      «${h.texto}»`);
  }
  console.error("\n  RF-16: el texto vive en content/ui y llega por props. Un literal aquí");
  console.error("  existe en UN idioma y ninguna comprobación de paridad lo ve.\n");
  process.exit(1);
}

console.log(`✓ cadenas: ${revisados} archivos del armazón, cero texto escrito a mano (RF-16).`);
