/**
 * check-nomenclature.ts — Gate 3 de 4.
 *
 * La nomenclatura de la oferta es literal e intraducible, y la «D» de DAL OS
 * se expande SIEMPRE como «Destrucción Creativa». Un texto que las altere no
 * llega a producción.
 *
 * Revisa frontmatter y cuerpo de todo el contenido, y también `content/ui/*.json`:
 * las cadenas de interfaz son el sitio donde más fácil se cuela una traducción.
 *
 * Cubre: RF-14 · FU-03 criterio 4 · gate D5.
 */
import fs from "node:fs";
import path from "node:path";

import { findNomenclatureIssues } from "../../lib/content/nomenclature.ts";
import { walkContent, report, CONTENT_ROOT, type Failure } from "./lib.ts";

const failures: Failure[] = [];
let checked = 0;

for (const doc of walkContent()) {
  checked++;
  for (const issue of findNomenclatureIssues(doc.raw)) {
    failures.push({
      file: doc.rel,
      detail: `línea ${issue.line}: «${issue.found}» → «${issue.correct}» (${issue.why})`,
    });
  }
}

const uiDir = path.join(CONTENT_ROOT, "ui");
if (fs.existsSync(uiDir)) {
  for (const f of fs.readdirSync(uiDir).filter((x) => x.endsWith(".json"))) {
    checked++;
    const abs = path.join(uiDir, f);
    for (const issue of findNomenclatureIssues(fs.readFileSync(abs, "utf8"))) {
      failures.push({
        file: `content/ui/${f}`,
        detail: `línea ${issue.line}: «${issue.found}» → «${issue.correct}» (${issue.why})`,
      });
    }
  }
}

report("nomenclatura literal", failures, checked);
