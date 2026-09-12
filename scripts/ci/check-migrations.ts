/**
 * check-migrations.ts — Toda migración del repositorio está registrada.
 *
 * EL FALLO QUE ESTE FRENO EXISTE PARA IMPEDIR, y que ya ocurrió una vez:
 * `0001_restricciones_aislamiento.sql`, `0002_rol_de_aplicacion.sql` y
 * `0003_politica_auditoria.sql` estaban escritas, revisadas y en el repositorio,
 * pero **no en `drizzle/meta/_journal.json`**. `drizzle-kit migrate` solo aplica
 * lo que el journal lista, así que aplicaba únicamente la `0000`.
 *
 * Consecuencia si hubiera llegado a producción: las 19 tablas creadas **sin row
 * level security, sin el rol de aplicación y sin la política de auditoría**. El
 * aislamiento entre empresas —DoD #5, gate D9— habría estado ausente, no roto:
 * ausente. Y nada en el despliegue lo habría dicho.
 *
 * Drizzle no avisa porque, desde su punto de vista, un `.sql` que nadie declaró
 * no es una migración: es un archivo. Por eso el freno es nuestro.
 */
import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const DIR = process.env.MIGRATIONS_DIR
  ? path.resolve(process.env.MIGRATIONS_DIR)
  : path.join(REPO_ROOT, "drizzle");
const JOURNAL = path.join(DIR, "meta", "_journal.json");

type Failure = { detalle: string };
const fallos: Failure[] = [];

if (!fs.existsSync(JOURNAL)) {
  console.error(`✗ migraciones: no existe ${path.relative(REPO_ROOT, JOURNAL)}.`);
  process.exit(1);
}

const journal = JSON.parse(fs.readFileSync(JOURNAL, "utf8")) as {
  entries: { idx: number; tag: string }[];
};

const enElJournal = journal.entries.map((e) => e.tag);
const enDisco = fs
  .readdirSync(DIR)
  .filter((f) => f.endsWith(".sql"))
  .map((f) => f.replace(/\.sql$/, ""))
  .sort();

// 1 · Todo .sql del directorio está declarado.
for (const tag of enDisco) {
  if (!enElJournal.includes(tag)) {
    fallos.push({
      detalle:
        `${tag}.sql existe pero NO está en meta/_journal.json: ` +
        `drizzle-kit no la aplicará y el despliegue no dirá nada.`,
    });
  }
}

// 2 · Todo lo declarado existe en disco.
for (const tag of enElJournal) {
  if (!enDisco.includes(tag)) {
    fallos.push({
      detalle: `el journal declara ${tag} pero no hay ${tag}.sql: la migración fallará al desplegar.`,
    });
  }
}

// 3 · Los índices son consecutivos desde 0 y el orden del journal es el del
//     nombre: una migración aplicada fuera de orden hace cosas distintas.
const ordenados = [...journal.entries].sort((a, b) => a.idx - b.idx);
ordenados.forEach((e, i) => {
  if (e.idx !== i) {
    fallos.push({ detalle: `índice ${e.idx} (${e.tag}) rompe la secuencia; se esperaba ${i}.` });
  }
  const prefijo = Number(e.tag.slice(0, 4));
  if (Number.isNaN(prefijo) || prefijo !== i) {
    fallos.push({
      detalle: `«${e.tag}» ocupa la posición ${i} pero su prefijo numérico no coincide.`,
    });
  }
});

if (fallos.length > 0) {
  console.error(`✗ migraciones: ${fallos.length} fallo(s).\n`);
  for (const f of fallos) console.error(`  · ${f.detalle}`);
  console.error(
    `\n  Una migración escrita a mano NO se registra sola: drizzle-kit solo declara\n` +
      `  las que genera. Añade su entrada a drizzle/meta/_journal.json.\n`,
  );
  process.exit(1);
}

console.log(
  `✓ migraciones: ${enDisco.length} archivos, ${enElJournal.length} declaradas, en secuencia y sin huérfanas.`,
);
