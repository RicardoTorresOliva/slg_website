/**
 * schema.ts — Las seis colecciones de contenido (B.4 del brief).
 *
 * Regla de oro del proyecto: si Ricardo quiere cambiar una frase, edita un
 * `.md`. Ninguna cadena de negocio vive en un componente (RF-16).
 *
 * Un frontmatter inválido **rompe el build**. Nunca se degrada en silencio:
 * una página a medias en producción es peor que un despliegue fallido.
 * FU-03, criterio 1.
 */

export const LANGS = ["es", "en"] as const;
export type Lang = (typeof LANGS)[number];

export type CollectionName =
  | "page"
  | "service"
  | "download"
  | "post"
  | "doctrine"
  | "ui";

/** Ramas de la oferta a las que puede pertenecer un servicio (A.1, A.2). */
export const BRANCHES = [
  "SLG_Academy",
  "SLG_Enterprise",
  "SLG_Factory",
  "SLG_Holdings",
] as const;

export const DOWNLOAD_STATUS = ["draft", "coming-soon", "published"] as const;
export const POST_STATUS = ["draft", "published"] as const;

/**
 * Los SEIS bloques del contrato de página de servicio (A.3), en orden fijo.
 * El encabezado es literal: alterarlo rechaza el registro antes de renderizar
 * (FU-03, criterio 2 · RF-135).
 *
 * El orden importa tanto como el texto: el comprador se reconoce, entiende qué
 * es, ve qué incluye, entiende cómo trabajamos, descarga —único CTA— y sabe
 * cuál es el siguiente paso.
 */
export const SERVICE_SECTIONS: Record<Lang, readonly string[]> = {
  es: [
    "Para quién y qué problema",
    "Qué es",
    "Qué incluye",
    "Cómo trabajamos",
    "Descarga",
    "Siguiente paso",
  ],
  en: [
    "Who it is for and what problem",
    "What it is",
    "What it includes",
    "How we work",
    "Download",
    "Next step",
  ],
} as const;

/** Un problema de validación, siempre atribuible a un archivo y un campo. */
export type ValidationError = {
  file: string;
  field: string;
  reason: string;
};

type FieldSpec = {
  name: string;
  required: boolean;
  check?: (value: unknown) => string | null;
};

const isNonEmptyString = (v: unknown): string | null =>
  typeof v === "string" && v.trim().length > 0
    ? null
    : "debe ser una cadena no vacía";

const isLang = (v: unknown): string | null =>
  LANGS.includes(v as Lang) ? null : `debe ser uno de: ${LANGS.join(", ")}`;

/** `pair` admite `null` a propósito: un artículo puede existir solo en ES (A.5). */
const isPair = (v: unknown): string | null =>
  v === null || (typeof v === "string" && v.trim().length > 0)
    ? null
    : "debe ser el slug del par en el otro idioma, o null";

const isStringArray = (v: unknown): string | null =>
  Array.isArray(v) && v.every((x) => typeof x === "string" && x.trim())
    ? null
    : "debe ser una lista de cadenas no vacías";

const oneOf =
  (values: readonly string[]) =>
  (v: unknown): string | null =>
    values.includes(v as string) ? null : `debe ser uno de: ${values.join(", ")}`;

/**
 * YAML convierte `2026-09-08` sin comillas en un objeto Date, no en una cadena.
 * Se aceptan ambas formas: obligar a comillas sería una trampa para quien edita
 * el `.md` a mano, que es justamente para quien está pensado el sistema.
 */
const isIsoDate = (v: unknown): string | null => {
  if (v instanceof Date) {
    return Number.isNaN(v.getTime()) ? "no es una fecha válida" : null;
  }
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    return "debe ser una fecha ISO (AAAA-MM-DD), con o sin comillas";
  }
  return Number.isNaN(Date.parse(v)) ? "no es una fecha válida" : null;
};

const isSocial = (v: unknown): string | null => {
  if (typeof v !== "object" || v === null) {
    return "debe ser un objeto con hook, linkedin y x";
  }
  const s = v as Record<string, unknown>;
  const missing = ["hook", "linkedin", "x"].filter(
    (k) => typeof s[k] !== "string" || !(s[k] as string).trim(),
  );
  return missing.length
    ? `le faltan extractos para redes: ${missing.join(", ")}`
    : null;
};

/** Frontmatter mínimo por colección. Fuente: B.4 del brief y A.5 para `post`. */
export const SCHEMAS: Record<Exclude<CollectionName, "ui">, FieldSpec[]> = {
  page: [
    { name: "type", required: true, check: oneOf(["page"]) },
    { name: "title", required: true, check: isNonEmptyString },
    { name: "description", required: true, check: isNonEmptyString },
    { name: "lang", required: true, check: isLang },
    { name: "pair", required: true, check: isPair },
    {
      name: "nav_order",
      required: true,
      check: (v) => (typeof v === "number" ? null : "debe ser un número"),
    },
    { name: "updated", required: true, check: isIsoDate },
  ],

  service: [
    { name: "type", required: true, check: oneOf(["service"]) },
    // `name` lleva la nomenclatura literal: lo verifica además check-nomenclature
    { name: "name", required: true, check: isNonEmptyString },
    { name: "branch", required: true, check: oneOf(BRANCHES) },
    { name: "parent", required: true, check: isPair },
    // slug del documento de descarga: el CTA único de la página (A.3 §5)
    { name: "download", required: true, check: isNonEmptyString },
    { name: "lang", required: true, check: isLang },
    { name: "pair", required: true, check: isPair },
  ],

  download: [
    { name: "type", required: true, check: oneOf(["download"]) },
    { name: "service", required: true, check: isNonEmptyString },
    { name: "title", required: true, check: isNonEmptyString },
    { name: "audience", required: true, check: isNonEmptyString },
    { name: "learns", required: true, check: isStringArray },
    // `file_key` puede faltar mientras el PDF no exista: por eso `coming-soon`
    { name: "file_key", required: false, check: isNonEmptyString },
    { name: "status", required: true, check: oneOf(DOWNLOAD_STATUS) },
    { name: "lang", required: true, check: isLang },
    { name: "pair", required: true, check: isPair },
  ],

  post: [
    { name: "type", required: true, check: oneOf(["post"]) },
    { name: "title", required: true, check: isNonEmptyString },
    { name: "description", required: true, check: isNonEmptyString },
    { name: "lang", required: true, check: isLang },
    { name: "pair", required: true, check: isPair },
    { name: "date", required: true, check: isIsoDate },
    { name: "tags", required: true, check: isStringArray },
    { name: "status", required: true, check: oneOf(POST_STATUS) },
    { name: "cover", required: false, check: isNonEmptyString },
    // Los extractos para redes son obligatorios desde el primer artículo:
    // el blog existe para alimentar las redes de SLG (§10-8, A.5, RF-141).
    { name: "social", required: true, check: isSocial },
    { name: "author", required: true, check: isNonEmptyString },
  ],

  doctrine: [
    { name: "type", required: true, check: oneOf(["doctrine_section"]) },
    { name: "title", required: true, check: isNonEmptyString },
    { name: "lang", required: true, check: isLang },
    {
      name: "order",
      required: true,
      check: (v) => (typeof v === "number" ? null : "debe ser un número"),
    },
  ],
};

/** Valida el frontmatter de un registro contra el esquema de su colección. */
export function validateFrontmatter(
  collection: Exclude<CollectionName, "ui">,
  data: Record<string, unknown>,
  file: string,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const spec = SCHEMAS[collection];

  for (const { name, required, check } of spec) {
    const present = name in data && data[name] !== undefined;

    if (!present) {
      if (required) {
        errors.push({ file, field: name, reason: "campo obligatorio ausente" });
      }
      continue;
    }
    // `pair: null` es un valor legítimo, no una ausencia.
    if (data[name] === null && name !== "pair") {
      if (required) {
        errors.push({ file, field: name, reason: "campo obligatorio vacío (null)" });
      }
      continue;
    }
    const problem = check?.(data[name]);
    if (problem) errors.push({ file, field: name, reason: problem });
  }

  // Coherencia entre el idioma declarado y la carpeta donde vive el archivo.
  const folderLang = file.split("/").find((seg) => LANGS.includes(seg as Lang));
  if (folderLang && data.lang && data.lang !== folderLang) {
    errors.push({
      file,
      field: "lang",
      reason: `declara "${String(data.lang)}" pero vive en la carpeta "${folderLang}"`,
    });
  }

  return errors;
}

/**
 * Verifica que un registro `service` contenga los seis bloques del contrato
 * A.3, con su encabezado literal y en orden. RF-135, FU-03 criterio 2.
 */
export function validateServiceSections(
  body: string,
  lang: Lang,
  file: string,
): ValidationError[] {
  const expected = SERVICE_SECTIONS[lang];
  const headings = [...body.matchAll(/^##\s+(.+?)\s*$/gm)].map((m) => m[1].trim());
  const errors: ValidationError[] = [];

  expected.forEach((title, i) => {
    const at = headings.indexOf(title);
    if (at === -1) {
      errors.push({
        file,
        field: `bloque ${i + 1}`,
        reason: `falta el encabezado fijo «## ${title}» del contrato A.3`,
      });
    } else if (at !== i) {
      errors.push({
        file,
        field: `bloque ${i + 1}`,
        reason: `«${title}» aparece en la posición ${at + 1}; el contrato A.3 lo fija en la ${i + 1}`,
      });
    }
  });

  const extra = headings.filter((h) => !expected.includes(h));
  if (extra.length) {
    errors.push({
      file,
      field: "bloques",
      reason: `encabezados de nivel 2 no previstos por el contrato A.3: ${extra
        .map((e) => `«${e}»`)
        .join(", ")}`,
    });
  }

  return errors;
}

/** Formatea errores para que el fallo de build diga exactamente qué arreglar. */
export function formatErrors(errors: ValidationError[]): string {
  const byFile = new Map<string, ValidationError[]>();
  for (const e of errors) {
    const list = byFile.get(e.file) ?? [];
    list.push(e);
    byFile.set(e.file, list);
  }

  const lines: string[] = [];
  for (const [file, list] of byFile) {
    lines.push(`\n  ${file}`);
    for (const e of list) lines.push(`    · ${e.field}: ${e.reason}`);
  }
  return lines.join("\n");
}
