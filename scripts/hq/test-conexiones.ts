/**
 * test-conexiones.ts — El cargador de `content/conexiones.json` (DU-29(a) ·
 * RF-154).
 *
 * NO TOCA LA BASE DE DATOS: `lib/hq/conexiones.ts` solo lee un archivo del
 * repositorio, así que esta prueba corre en cualquier parte, sin
 * `DATABASE_URL` ni doble de nada.
 *
 * Comprueba dos cosas, por separado: que el archivo real del repositorio pasa
 * (forma correcta, sin sorpresas), y que un archivo mal formado **lanza**, con
 * un mensaje que nombra el motivo — el mismo contrato que `lib/content/loader.ts`
 * (FU-03, criterio 1). Un cargador que se degradara en silencio ante una `url`
 * `http://` o una clave repetida sería el fallo que este archivo existe para
 * atrapar antes de que HQ lo enseñe en producción.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { conexiones, conexionesPorGrupo, GRUPOS } from "../../lib/hq/conexiones.ts";

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

/** Un archivo de conexiones temporal, para probar formas que el repositorio real nunca tiene. */
function fixture(nombre: string, contenido: unknown): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "test-conexiones-"));
  const ruta = path.join(dir, nombre);
  fs.writeFileSync(ruta, JSON.stringify(contenido, null, 2));
  return ruta;
}

/** El mensaje de la excepción, o `null` si la llamada no lanzó. */
function lanza(fn: () => unknown): string | null {
  try {
    fn();
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}

console.log("\nEl archivo real, content/conexiones.json:\n");

const reales = conexiones();
check("carga sin lanzar y tiene al menos una conexión", reales.length > 0);
check("todas las claves son únicas", new Set(reales.map((c) => c.clave)).size === reales.length);
check(
  "toda url es null o empieza por https://",
  reales.every((c) => c.url === null || c.url.startsWith("https://")),
);
check(
  "todo grupo es uno de los tres declarados",
  reales.every((c) => (GRUPOS as readonly string[]).includes(c.grupo)),
);
check(
  "todo nombre y descripción tienen los dos idiomas, sin vacíos",
  reales.every(
    (c) => c.nombre.es.trim() && c.nombre.en.trim() && c.descripcion.es.trim() && c.descripcion.en.trim(),
  ),
);

const porGrupo = conexionesPorGrupo();
check(
  "conexionesPorGrupo() reparte el mismo total, sin perder ni duplicar ninguna",
  [...porGrupo.values()].reduce((n, l) => n + l.length, 0) === reales.length,
);
check(
  "las tres claves del mapa son exactamente GRUPOS, en su mismo orden",
  [...porGrupo.keys()].join(",") === GRUPOS.join(","),
);

console.log("\nUn archivo bien formado, aparte, también pasa:\n");

const bueno = fixture("bien.json", [
  {
    clave: "prueba",
    nombre: { es: "Prueba", en: "Test" },
    descripcion: { es: "Una conexión de prueba.", en: "A test connection." },
    url: "https://ejemplo.demo.example.com",
    grupo: "operacion",
  },
]);
check("un archivo válido no lanza", lanza(() => conexiones(bueno)) === null);

console.log("\nLas formas inválidas lanzan, con un mensaje que nombra el motivo:\n");

const conHttp = fixture("http.json", [
  {
    clave: "prueba",
    nombre: { es: "Prueba", en: "Test" },
    descripcion: { es: "x", en: "x" },
    url: "http://inseguro.demo.example.com",
    grupo: "operacion",
  },
]);
const errorHttp = lanza(() => conexiones(conHttp));
check("una url http:// (no https://) lanza", errorHttp !== null, errorHttp ?? "");
check("...y el mensaje nombra «url»", (errorHttp ?? "").includes("url"), errorHttp ?? "");

const conClaveRepetida = fixture("repetida.json", [
  {
    clave: "dup",
    nombre: { es: "Uno", en: "One" },
    descripcion: { es: "x", en: "x" },
    url: null,
    grupo: "agentes",
  },
  {
    clave: "dup",
    nombre: { es: "Dos", en: "Two" },
    descripcion: { es: "y", en: "y" },
    url: null,
    grupo: "agentes",
  },
]);
const errorRepetida = lanza(() => conexiones(conClaveRepetida));
check("una clave repetida lanza", errorRepetida !== null, errorRepetida ?? "");
check("...y el mensaje nombra la clave «dup»", (errorRepetida ?? "").includes("dup"), errorRepetida ?? "");

const sinIngles = fixture("sin-en.json", [
  {
    clave: "solo-es",
    nombre: { es: "Solo español" },
    descripcion: { es: "x", en: "x" },
    url: null,
    grupo: "creacion",
  },
]);
check("falta el idioma «en» en nombre → lanza", lanza(() => conexiones(sinIngles)) !== null);

const grupoInventado = fixture("grupo-malo.json", [
  {
    clave: "raro",
    nombre: { es: "x", en: "x" },
    descripcion: { es: "x", en: "x" },
    url: null,
    grupo: "marketing",
  },
]);
check(
  "un grupo fuera de los tres declarados → lanza",
  lanza(() => conexiones(grupoInventado)) !== null,
);

const archivoInexistente = path.join(os.tmpdir(), "no-existe-conexiones.json");
check("un archivo que no existe → lanza (nunca una lista vacía silenciosa)", lanza(() => conexiones(archivoInexistente)) !== null);

if (fallos > 0) {
  console.error(`\n✗ conexiones: ${fallos} de ${comprobaciones} comprobaciones fallaron.\n`);
  process.exit(1);
}
console.log(`\n✓ conexiones: ${comprobaciones} comprobaciones sobre el cargador, sin fallos.`);
