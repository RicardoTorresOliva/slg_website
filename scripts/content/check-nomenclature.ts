/**
 * check-nomenclature.ts — Gate 3 de 4.
 *
 * La nomenclatura de la oferta es literal e intraducible, y las reglas de
 * contenido del sitio —una sigla que se expande siempre igual, un término que no
 * se usa— se cumplen en todo el texto. Un texto que las altere no llega a
 * producción.
 *
 * **Las reglas son de la ficha del sitio** (`sitio.nomenclatura`, D-165), no de
 * este freno: aquí no se nombra ninguna oferta. Con las listas vacías —un
 * cliente sin nombres compuestos— el freno recorre el contenido igual y pasa
 * sin hallazgos.
 *
 * Revisa frontmatter y cuerpo de todo el contenido, y también `content/ui/*.json`:
 * las cadenas de interfaz son el sitio donde más fácil se cuela una traducción.
 *
 * `SITIO_FICHA` apunta el freno a las reglas de otra ficha —la misma variable que
 * `check:sitio`—: es lo que usa su prueba negativa, que así no depende de la
 * oferta del sitio que la ejecuta.
 *
 * Cubre: RF-14 · FU-03 criterio 4 · gate D5.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { findNomenclatureIssues, type ReglasDeNomenclatura } from "../../lib/content/nomenclature.ts";
import type { FichaDelSitio } from "../../lib/sitio/tipos.ts";
import { walkContent, report, CONTENT_ROOT, type Failure } from "./lib.ts";

/** Las reglas de otra ficha, si `SITIO_FICHA` la nombra; si no, las de este sitio. */
async function reglasDeOtraFicha(): Promise<ReglasDeNomenclatura | undefined> {
  if (!process.env.SITIO_FICHA) return undefined;
  const modulo = (await import(pathToFileURL(path.resolve(process.env.SITIO_FICHA)).href)) as {
    sitio: Pick<FichaDelSitio, "nomenclatura">;
  };
  return {
    variantes: modulo.sitio.nomenclatura.variantesProhibidas,
    contenido: modulo.sitio.nomenclatura.reglasDeContenido,
  };
}

const reglas = await reglasDeOtraFicha();
const failures: Failure[] = [];
let checked = 0;

for (const doc of walkContent()) {
  checked++;
  for (const issue of findNomenclatureIssues(doc.raw, reglas)) {
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
    for (const issue of findNomenclatureIssues(fs.readFileSync(abs, "utf8"), reglas)) {
      failures.push({
        file: `content/ui/${f}`,
        detail: `línea ${issue.line}: «${issue.found}» → «${issue.correct}» (${issue.why})`,
      });
    }
  }
}

report("nomenclatura literal", failures, checked);
