/**
 * nomenclature.ts — Nomenclatura obligatoria e intraducible.
 *
 * Fuente: START_PROJECT.md §1 Constraints · knowledge/naming-rules.md
 * Cubre RF-14. Lo consume el script de CI `check-nomenclature.ts` (FU-03,
 * criterio 4) y cualquier componente que necesite validar una etiqueta.
 *
 * Regla: los nombres de la oferta NO se traducen, NO se pluralizan y NO cambian
 * de capitalización ni de separador. Un texto que los altere rompe el build.
 *
 * **LAS LISTAS SON DE CADA SITIO, NO DEL MOTOR** (D-165). Los nombres, sus
 * variantes prohibidas y las reglas de contenido viven en la ficha
 * (`sitio.nomenclatura`): son trabajo editorial por cliente —un cliente sin
 * nombres compuestos tendrá tres patrones, no treinta— y el motor solo sabe
 * aplicarlos. Las tres pueden estar **vacías**: entonces no hay nada que
 * vigilar y `check:nomenclature` pasa sin hallazgos, que es lo correcto.
 */
import { sitio } from "../sitio/index.ts";

/** Los nombres que deben aparecer literalmente, en cualquier idioma. */
export const LITERAL_TERMS: readonly string[] = sitio.nomenclatura.literales;

export type LiteralTerm = (typeof LITERAL_TERMS)[number];

/**
 * Variantes prohibidas: cómo se rompe cada término en la práctica.
 * Cada entrada es un patrón que NO debe aparecer, con el término correcto.
 *
 * El patrón se escribe para no dar falsos positivos sobre el término bueno: el
 * nombre con espacio puede ser error mientras el nombre con guion bajo no
 * dispara.
 */
export const FORBIDDEN_VARIANTS: ReadonlyArray<{
  pattern: RegExp;
  correct: string;
  why: string;
}> = sitio.nomenclatura.variantesProhibidas;

/**
 * Reglas de contenido que no son un nombre: expansiones obligatorias de una
 * sigla, términos que el sitio no usa. En SLG, la «D» de DAL OS se expande
 * SIEMPRE como «Destrucción Creativa». El nombre de la constante es el de
 * cuando esa era la única regla.
 */
export const DAL_OS_FORBIDDEN: ReadonlyArray<{ pattern: RegExp; why: string; correct?: string }> =
  sitio.nomenclatura.reglasDeContenido;

/** Marca pública: SLG Agency. «Softlanding Global» solo en contexto SLG_Holdings (§10-4). */
export const PUBLIC_BRAND = "SLG Agency";

export type NomenclatureIssue = {
  line: number;
  found: string;
  correct: string;
  why: string;
};

/** Busca variantes prohibidas en un texto. Devuelve una entrada por hallazgo. */
export function findNomenclatureIssues(text: string): NomenclatureIssue[] {
  const issues: NomenclatureIssue[] = [];
  const lines = text.split("\n");

  lines.forEach((lineText, i) => {
    for (const { pattern, correct, why } of FORBIDDEN_VARIANTS) {
      const re = new RegExp(pattern.source, pattern.flags);
      let m: RegExpExecArray | null;
      while ((m = re.exec(lineText)) !== null) {
        issues.push({ line: i + 1, found: m[0], correct, why });
      }
    }
    for (const { pattern, why, correct } of DAL_OS_FORBIDDEN) {
      const re = new RegExp(pattern.source, pattern.flags);
      let m: RegExpExecArray | null;
      while ((m = re.exec(lineText)) !== null) {
        // Sin forma buena declarada, el motivo ya dice qué escribir.
        issues.push({ line: i + 1, found: m[0], correct: correct ?? "(ver motivo)", why });
      }
    }
  });

  return issues;
}
