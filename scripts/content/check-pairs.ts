/**
 * check-pairs.ts — Gate 2 de 4.
 *
 * Paridad ES/EN. El brief la exige en `page` y `service`, y **no** en `post`:
 * un artículo puede existir solo en español (A.5, RF-26). Aplicar la regla a
 * los artículos bloquearía el blog sin motivo.
 *
 * Comprueba, para page y service:
 *   · `pair` no es null
 *   · el archivo al que apunta existe en el otro idioma
 *   · el par apunta de vuelta (simetría)
 *
 * Cubre: RF-26 · FU-03 criterio 3 · gate D4.
 */
import fs from "node:fs";
import path from "node:path";

import { walkContent, report, CONTENT_ROOT, COLLECTION_DIRS, type Failure } from "./lib.ts";

const PAIRED = new Set(["page", "service"]);
const OTHER = { es: "en", en: "es" } as const;

const docs = walkContent();
const failures: Failure[] = [];
let checked = 0;

for (const doc of docs) {
  if (!PAIRED.has(doc.collection)) {
    // Se comprueba a propósito lo contrario: que nadie imponga paridad al blog.
    if (doc.collection === "post" && doc.data.pair === undefined) {
      failures.push({ file: doc.rel, detail: "el campo `pair` debe existir (puede ser null)" });
    }
    continue;
  }

  checked++;
  const pair = doc.data.pair;

  if (pair === null || pair === undefined || typeof pair !== "string" || !pair.trim()) {
    failures.push({
      file: doc.rel,
      detail: `la colección «${doc.collection}» exige paridad ES/EN: \`pair\` no puede estar vacío`,
    });
    continue;
  }

  const otherLang = OTHER[doc.lang];
  const dir = path.join(CONTENT_ROOT, COLLECTION_DIRS[doc.collection], otherLang);
  const candidates = [`${pair}.md`, `${pair}.mdx`].map((f) => path.join(dir, f));
  const found = candidates.find((c) => fs.existsSync(c));

  if (!found) {
    failures.push({
      file: doc.rel,
      detail: `\`pair: ${pair}\` apunta a un archivo inexistente en ${otherLang}/`,
    });
    continue;
  }

  const back = docs.find(
    (d) => d.collection === doc.collection && d.lang === otherLang && d.slug === pair,
  );
  if (back && back.data.pair !== doc.slug) {
    failures.push({
      file: doc.rel,
      detail: `el par no es simétrico: ${back.rel} apunta a «${String(back.data.pair)}», no a «${doc.slug}»`,
    });
  }
}

report("paridad ES/EN", failures, checked);
