/**
 * loader.ts — Lectura y validación de las colecciones de contenido.
 *
 * Se ejecuta en el servidor, en tiempo de build. Si algo no valida, **lanza**:
 * el build cae con un mensaje que nombra archivo, campo y motivo. Nunca se
 * degrada en silencio (FU-03, criterio 1).
 *
 * Por qué así: una página de servicio sin su bloque «Descarga» seguiría
 * pareciendo correcta al ojo, pero habría perdido el único CTA de la página.
 * Ese es exactamente el fallo que un build en verde no debe dejar pasar.
 */

import fs from "node:fs";
import path from "node:path";

import matter from "gray-matter";

import {
  type CollectionName,
  type Lang,
  type ValidationError,
  LANGS,
  formatErrors,
  validateFrontmatter,
  validateServiceSections,
} from "./schema.ts";

const CONTENT_ROOT = path.join(process.cwd(), "content");

/** Dónde vive cada colección dentro de `content/` (B.4). */
export const COLLECTION_DIRS: Record<Exclude<CollectionName, "ui">, string> = {
  page: "pages",
  service: "services",
  download: "downloads",
  post: "blog",
  doctrine: "doctrine",
};

export type ContentRecord<T = Record<string, unknown>> = {
  slug: string;
  lang: Lang;
  /** Ruta relativa al repo, para mensajes de error accionables. */
  file: string;
  data: T;
  body: string;
};

function readDir(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md") || f.endsWith(".mdx"))
    .sort();
}

/**
 * Carga una colección en un idioma, validando cada registro.
 * @throws si algún registro no cumple su esquema.
 */
export function loadCollection<T = Record<string, unknown>>(
  collection: Exclude<CollectionName, "ui">,
  lang: Lang,
): ContentRecord<T>[] {
  const dir = path.join(CONTENT_ROOT, COLLECTION_DIRS[collection], lang);
  const files = readDir(dir);
  const records: ContentRecord<T>[] = [];
  const errors: ValidationError[] = [];

  for (const filename of files) {
    const abs = path.join(dir, filename);
    const rel = path.relative(process.cwd(), abs);
    const raw = fs.readFileSync(abs, "utf8");

    let parsed: matter.GrayMatterFile<string>;
    try {
      parsed = matter(raw);
    } catch (e) {
      errors.push({
        file: rel,
        field: "frontmatter",
        reason: `YAML ilegible: ${(e as Error).message}`,
      });
      continue;
    }

    const data = parsed.data as Record<string, unknown>;
    errors.push(...validateFrontmatter(collection, data, rel));

    // El contrato de seis bloques solo aplica a las páginas de servicio (A.3).
    if (collection === "service") {
      errors.push(...validateServiceSections(parsed.content, lang, rel));
    }

    records.push({
      slug: filename.replace(/\.mdx?$/, ""),
      lang,
      file: rel,
      data: data as T,
      body: parsed.content,
    });
  }

  if (errors.length) {
    throw new Error(
      `Contenido inválido en la colección «${collection}» (${lang}). ` +
        `El build se detiene a propósito: un registro incompleto nunca llega a producción.\n` +
        formatErrors(errors),
    );
  }

  return records;
}

/** Carga una colección en los dos idiomas. */
export function loadCollectionAllLangs<T = Record<string, unknown>>(
  collection: Exclude<CollectionName, "ui">,
): Record<Lang, ContentRecord<T>[]> {
  return Object.fromEntries(
    LANGS.map((lang) => [lang, loadCollection<T>(collection, lang)]),
  ) as Record<Lang, ContentRecord<T>[]>;
}

/**
 * Carga las cadenas de interfaz.
 * Una clave presente en un idioma y ausente en el otro **rompe el build**:
 * nunca se degrada a cadena vacía en pantalla (FU-03, criterio 5 · RF-140).
 */
export function loadUiStrings(): Record<Lang, Record<string, string>> {
  const out = {} as Record<Lang, Record<string, string>>;

  for (const lang of LANGS) {
    const abs = path.join(CONTENT_ROOT, "ui", `${lang}.json`);
    const rel = path.relative(process.cwd(), abs);
    if (!fs.existsSync(abs)) {
      throw new Error(`Faltan las cadenas de interfaz: ${rel}`);
    }
    try {
      out[lang] = JSON.parse(fs.readFileSync(abs, "utf8"));
    } catch (e) {
      throw new Error(`${rel} no es JSON válido: ${(e as Error).message}`);
    }
  }

  const [a, b] = LANGS;
  const keysA = new Set(Object.keys(out[a]));
  const keysB = new Set(Object.keys(out[b]));
  const onlyA = [...keysA].filter((k) => !keysB.has(k));
  const onlyB = [...keysB].filter((k) => !keysA.has(k));

  if (onlyA.length || onlyB.length) {
    const parts: string[] = [];
    if (onlyA.length) parts.push(`  solo en ${a}.json: ${onlyA.join(", ")}`);
    if (onlyB.length) parts.push(`  solo en ${b}.json: ${onlyB.join(", ")}`);
    throw new Error(
      "Las cadenas de interfaz no tienen paridad entre idiomas. Una clave que " +
        "falta se vería como un hueco en pantalla, así que el build se detiene.\n" +
        parts.join("\n"),
    );
  }

  return out;
}
