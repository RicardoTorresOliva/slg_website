/**
 * lib.ts — Utilidades comunes de los cuatro scripts de verificación de contenido.
 *
 * Los scripts comparten el MISMO esquema que usa el build (`lib/content/`),
 * no una copia. Dos fuentes de verdad acaban divergiendo, y el día que lo
 * hagan el gate se vuelve decorativo.
 */

import fs from "node:fs";
import path from "node:path";

import matter from "gray-matter";

import { LANGS, type Lang } from "../../lib/content/schema.ts";

export const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
/**
 * Raíz del contenido. Sobreescribible con CONTENT_ROOT para que la prueba
 * negativa de cada gate (FU-03, criterio 6) pueda apuntar a un árbol roto a
 * propósito sin tocar el contenido real.
 */
export const CONTENT_ROOT = process.env.CONTENT_ROOT
  ? path.resolve(process.env.CONTENT_ROOT)
  : path.join(REPO_ROOT, "content");

export const COLLECTION_DIRS = {
  page: "pages",
  service: "services",
  download: "downloads",
  post: "blog",
  doctrine: "doctrine",
} as const;

export type CollectionKey = keyof typeof COLLECTION_DIRS;

export type Doc = {
  collection: CollectionKey;
  lang: Lang;
  slug: string;
  /** Ruta relativa al repo: lo que el desarrollador necesita para arreglarlo. */
  rel: string;
  abs: string;
  data: Record<string, unknown>;
  body: string;
  raw: string;
};

/** Recorre las cinco colecciones markdown en los dos idiomas. */
export function walkContent(root = CONTENT_ROOT): Doc[] {
  const docs: Doc[] = [];

  for (const [collection, dirname] of Object.entries(COLLECTION_DIRS)) {
    for (const lang of LANGS) {
      const dir = path.join(root, dirname, lang);
      if (!fs.existsSync(dir)) continue;

      for (const filename of fs.readdirSync(dir).sort()) {
        if (!/\.mdx?$/.test(filename)) continue;
        const abs = path.join(dir, filename);
        const raw = fs.readFileSync(abs, "utf8");
        let parsed;
        try {
          parsed = matter(raw);
        } catch {
          parsed = { data: {}, content: raw };
        }
        docs.push({
          collection: collection as CollectionKey,
          lang,
          slug: filename.replace(/\.mdx?$/, ""),
          rel: path.relative(REPO_ROOT, abs),
          abs,
          data: parsed.data as Record<string, unknown>,
          body: parsed.content,
          raw,
        });
      }
    }
  }

  return docs;
}

export type Failure = { file: string; detail: string };

/** Salida uniforme de los cuatro scripts. Código 1 si hay fallos. */
export function report(scriptName: string, failures: Failure[], checked: number): never {
  if (failures.length === 0) {
    console.log(`✓ ${scriptName}: ${checked} comprobaciones, sin fallos.`);
    process.exit(0);
  }

  console.error(`✗ ${scriptName}: ${failures.length} fallo(s) sobre ${checked} comprobaciones.\n`);
  const byFile = new Map<string, string[]>();
  for (const f of failures) {
    const list = byFile.get(f.file) ?? [];
    list.push(f.detail);
    byFile.set(f.file, list);
  }
  for (const [file, details] of byFile) {
    console.error(`  ${file}`);
    for (const d of details) console.error(`    · ${d}`);
  }
  console.error("");
  process.exit(1);
}
