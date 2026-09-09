/**
 * check-frontmatter.ts — Gate 1 de 4.
 *
 * Cada registro de las cinco colecciones markdown cumple el frontmatter mínimo
 * de B.4, y cada `service` lleva los seis bloques del contrato A.3 en orden.
 * Usa el MISMO validador que el build (`lib/content/schema.ts`).
 *
 * Cubre: RF-135 a RF-139 · FU-03 criterios 1 y 2 · gate D5.
 */
import { validateFrontmatter, validateServiceSections } from "../../lib/content/schema.ts";
import { walkContent, report, type Failure } from "./lib.ts";

const docs = walkContent();
const failures: Failure[] = [];

for (const doc of docs) {
  for (const e of validateFrontmatter(doc.collection, doc.data, doc.rel)) {
    failures.push({ file: e.file, detail: `${e.field}: ${e.reason}` });
  }
  if (doc.collection === "service") {
    for (const e of validateServiceSections(doc.body, doc.lang, doc.rel)) {
      failures.push({ file: e.file, detail: `${e.field}: ${e.reason}` });
    }
  }
}

report("frontmatter", failures, docs.length);
