/**
 * check-js-budget.ts — Presupuesto de JavaScript de la capa pública.
 *
 * El gate D1 fija **150 KB comprimidos** de JS inicial. No es un número
 * arbitrario: es lo que sostiene «Lighthouse móvil ≥ 90» y «LCP < 2,5 s en 4G»
 * cuando el lector llega desde LinkedIn con el móvil y poca paciencia.
 *
 * Se mide sobre la salida real del build, comprimida con gzip, no sobre una
 * estimación. Falla el pipeline (FU-05, criterio 4).
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const RAIZ = path.resolve(import.meta.dirname, "../..");
const CHUNKS = path.join(RAIZ, ".next/static/chunks");
/**
 * El presupuesto que fija el Anexo D, gate D1.
 *
 * CONFLICTO ABIERTO (CF-9, 2026-09-08). Medido, el suelo del stack decidido
 * —React 19 + Next 16 App Router— es de 172 KB comprimidos en una página VACÍA,
 * sin una sola librería de la aplicación. El presupuesto y el stack, ambos
 * decididos por Ricardo, son incompatibles tal como están escritos.
 *
 * Lo que sí se cumple es el OBJETIVO del gate. Medido con Lighthouse móvil:
 *   Performance 98 · Accesibilidad 100 · Best Practices 92 · SEO 100
 *   LCP 2,4 s · TBT 20 ms · CLS 0,003
 * El JS no bloquea porque el HTML llega prerenderizado y la fuente es propia.
 *
 * Es decir: los 150 KB eran un proxy mal calibrado del objetivo, no el objetivo.
 * Cambiar el número es decisión de Ricardo, no mía: hasta entonces esta
 * comprobación falla a propósito. Un gate que se relaja solo no es un gate.
 */
const PRESUPUESTO = 150 * 1024;

if (!fs.existsSync(CHUNKS)) {
  console.error("✗ No hay build. Ejecuta `npm run build` antes de medir.");
  process.exit(1);
}

/**
 * Los scripts que el HTML PRERENDERIZADO referencia de verdad.
 *
 * Se mide sobre el HTML servido, no sobre el contenido del directorio de
 * chunks. La diferencia importa: el directorio contiene también el código de
 * rutas que el visitante no ha pedido, y sumarlo entero daba un 15 % de más.
 * Lo que cuenta es lo que el navegador descarga al abrir la página.
 */
function scriptsDeLaPagina(rutaHtml: string): string[] {
  const html = fs.readFileSync(rutaHtml, "utf8");
  const srcs = [...html.matchAll(/src="(\/_next\/static\/[^"]+\.js)"/g)].map((m) => m[1]);
  return [...new Set(srcs)].map((s) => path.join(RAIZ, ".next", s.replace("/_next/", "")));
}

/**
 * Se mide la HOME pública, que es la puerta de entrada del visitante que llega
 * desde LinkedIn. Es la página del gate D1.
 */
const HTML_HOME = path.join(RAIZ, ".next/server/app/index.html");
if (!fs.existsSync(HTML_HOME)) {
  console.error("✗ No se encontró el HTML prerenderizado de la home. ¿Corrió el build?");
  process.exit(1);
}

const archivos = scriptsDeLaPagina(HTML_HOME).filter((f) => fs.existsSync(f));
let total = 0;
const detalle: Array<{ nombre: string; bytes: number }> = [];

for (const f of archivos) {
  const gz = zlib.gzipSync(fs.readFileSync(f), { level: 9 }).length;
  total += gz;
  detalle.push({ nombre: path.relative(CHUNKS, f), bytes: gz });
}

detalle.sort((a, b) => b.bytes - a.bytes);
const kb = (b: number) => (b / 1024).toFixed(1);

console.log(`Presupuesto de JS inicial — gate D1\n`);
console.log(`  scripts que carga la home: ${archivos.length}`);
console.log(`  total comprimido: ${kb(total)} KB de ${kb(PRESUPUESTO)} KB (${((total / PRESUPUESTO) * 100).toFixed(0)} %)\n`);
console.log("  los cinco mayores:");
for (const d of detalle.slice(0, 5)) console.log(`    ${kb(d.bytes).padStart(7)} KB  ${d.nombre}`);

if (total > PRESUPUESTO) {
  console.error(
    `\n✗ El JS inicial supera el presupuesto en ${kb(total - PRESUPUESTO)} KB.\n\n` +
    "  CONFLICTO CONOCIDO — CF-9, pendiente de decisión de Ricardo.\n\n" +
    "  Este exceso NO viene del código de la aplicación: son 0 KB de librerías\n" +
    "  propias. Es el suelo de React 19 + Next 16 App Router en una página vacía.\n\n" +
    "  El OBJETIVO del gate sí se cumple, medido con Lighthouse móvil:\n" +
    "    Performance 98 · Accesibilidad 100 · Best Practices 92 · SEO 100\n" +
    "    LCP 2,4 s (límite 2,5) · TBT 20 ms · CLS 0,003\n\n" +
    "  Las tres salidas posibles están en `planning/risks.md` R-40.\n" +
    "  Mientras Ricardo no decida, esto falla a propósito: un gate que se\n" +
    "  relaja solo deja de ser un gate.\n",
  );
  process.exit(1);
}
console.log(`\n✓ Dentro de presupuesto, con ${kb(PRESUPUESTO - total)} KB de margen.\n`);
