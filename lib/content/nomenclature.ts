/**
 * nomenclature.ts — Nomenclatura obligatoria e intraducible.
 *
 * Fuente: START_PROJECT.md §1 Constraints · knowledge/naming-rules.md
 * Cubre RF-14. Lo consume el script de CI `check-nomenclature.mjs` (FU-03,
 * criterio 4) y cualquier componente que necesite validar una etiqueta.
 *
 * Regla: estos nombres NO se traducen, NO se pluralizan y NO cambian de
 * capitalización ni de separador. `SLG_VoltAi` no es «SLG VoltAi», ni
 * «SLG_VOLTAI», ni «IA SLG». Un texto que los altere rompe el build.
 *
 * `SLG_VoltAi` sustituye a `SLG_AI` desde el 2026-09-17 por decisión de Ricardo
 * (en honor a Alessandro Volta: la pila, la corriente sostenida). El nombre
 * anterior pasa a ser una variante PROHIBIDA para que ningún resto sobreviva.
 */
import { sitio } from "../sitio/index.ts";

/** Los nombres que deben aparecer literalmente, en cualquier idioma. */
export const LITERAL_TERMS = [
  "VoltAi by SLG",
  "Holdings by SLG",
  "VoltAi Academy",
  "VoltAi Enterprise",
  "VoltAi Factory",
  "SLG_Readiness",
  "SLG_Implement",
  "APP_Building",
  "AGE_Building",
  "CoO as a Service",
  "Phoenix PEEx",
  "Phoenix TEAx",
  "Phoenix RETx",
] as const;

export type LiteralTerm = (typeof LITERAL_TERMS)[number];

/**
 * Variantes prohibidas: cómo se rompe cada término en la práctica.
 * Cada entrada es un patrón que NO debe aparecer, con el término correcto.
 *
 * El patrón se construye para no dar falsos positivos sobre el término bueno:
 * por eso `SLG VoltAi` (con espacio) es error pero `SLG_VoltAi` no dispara.
 */
export const FORBIDDEN_VARIANTS: ReadonlyArray<{
  pattern: RegExp;
  correct: string;
  why: string;
}> = [
  // Separador cambiado o eliminado
  { pattern: /\bSLG\s+VoltAi\b/g, correct: "VoltAi by SLG", why: "nombre anterior sin guion bajo" },
  { pattern: /\bSLG-VoltAi\b/g, correct: "VoltAi by SLG", why: "nombre anterior con guion" },
  // El nombre anterior del eje. Cualquier resto es un error, no una variante.
  { pattern: /\bSLG_AI\b/g, correct: "VoltAi by SLG", why: "nombre anterior del eje (hasta 2026-09-17)" },
  { pattern: /\bSLG\s+AI\b/g, correct: "VoltAi by SLG", why: "nombre anterior del eje, además sin guion bajo" },
  { pattern: /\bSLG-AI\b/g, correct: "VoltAi by SLG", why: "nombre anterior del eje, además con guion" },
  // Capitalización de VoltAi: la «i» final va en minúscula, y la «V» y la «A» en mayúscula
  { pattern: /\bSLG_VOLTAI\b/g, correct: "VoltAi by SLG", why: "capitalización alterada" },
  { pattern: /\bSLG_VoltAI\b/g, correct: "VoltAi by SLG", why: "capitalización alterada (la i final es minúscula)" },
  { pattern: /\bSLG_Voltai\b/g, correct: "VoltAi by SLG", why: "capitalización alterada" },
  { pattern: /\bSLG_voltai\b/g, correct: "VoltAi by SLG", why: "capitalización alterada" },
  { pattern: /\bVolt\s+Ai\b/gi, correct: "VoltAi by SLG", why: "espacio dentro del nombre" },
  { pattern: /\bSLG\s+Holdings\b/g, correct: "Holdings by SLG", why: "espacio en vez de guion bajo" },
  { pattern: /\bSLG\s+Academy\b/g, correct: "VoltAi Academy", why: "espacio en vez de guion bajo" },
  { pattern: /\bSLG\s+Enterprise\b/g, correct: "VoltAi Enterprise", why: "espacio en vez de guion bajo" },
  { pattern: /\bSLG\s+Factory\b/g, correct: "VoltAi Factory", why: "espacio en vez de guion bajo" },
  { pattern: /\bSLG\s+Readiness\b/g, correct: "SLG_Readiness", why: "espacio en vez de guion bajo" },
  { pattern: /\bSLG\s+Implement\b/g, correct: "SLG_Implement", why: "espacio en vez de guion bajo" },
  { pattern: /\bAPP\s+Building\b/g, correct: "APP_Building", why: "espacio en vez de guion bajo" },
  { pattern: /\bAGE\s+Building\b/g, correct: "AGE_Building", why: "espacio en vez de guion bajo" },

  // Traducción: el error más probable en la versión ES
  { pattern: /\bIA\s+SLG\b/g, correct: "VoltAi by SLG", why: "traducido al español" },
  { pattern: /\bSLG_IA\b/g, correct: "VoltAi by SLG", why: "traducido al español" },
  { pattern: /\bSLG_VoltIA\b/g, correct: "VoltAi by SLG", why: "traducido al español" },
  { pattern: /\bAcademia\s+SLG\b/gi, correct: "VoltAi Academy", why: "traducido al español" },
  { pattern: /\bFábrica\s+SLG\b/gi, correct: "VoltAi Factory", why: "traducido al español" },
  { pattern: /\bSLG_Fábrica\b/gi, correct: "VoltAi Factory", why: "traducido al español" },
  { pattern: /\bCoO\s+como\s+Servicio\b/gi, correct: "CoO as a Service", why: "traducido al español" },
  { pattern: /\bDirector\s+de\s+Operaciones\s+como\s+Servicio\b/gi, correct: "CoO as a Service", why: "traducido al español" },

  // Capitalización de los programas Phoenix: PEEx/TEAx/RETx llevan esa forma exacta
  { pattern: /\bPhoenix\s+PEEX\b/g, correct: "Phoenix PEEx", why: "capitalización alterada" },
  { pattern: /\bPhoenix\s+Peex\b/g, correct: "Phoenix PEEx", why: "capitalización alterada" },
  { pattern: /\bPhoenix\s+TEAX\b/g, correct: "Phoenix TEAx", why: "capitalización alterada" },
  { pattern: /\bPhoenix\s+Teax\b/g, correct: "Phoenix TEAx", why: "capitalización alterada" },
  { pattern: /\bPhoenix\s+RETX\b/g, correct: "Phoenix RETx", why: "capitalización alterada" },
  { pattern: /\bPhoenix\s+Retx\b/g, correct: "Phoenix RETx", why: "capitalización alterada" },
];

/**
 * La «D» de DAL OS se expande SIEMPRE como «Destrucción Creativa».
 * Es una regla dura del brief (§1 Constraints) y de knowledge/naming-rules.md.
 * Las expansiones que la gente escribe por inercia son «Disrupción» y
 * «Destrucción» a secas.
 */
export const DAL_OS_FORBIDDEN: ReadonlyArray<{ pattern: RegExp; why: string }> = [
  { pattern: /\bDisrupci[óo]n\s+Creativa\b/gi, why: 'la «D» de DAL OS es «Destrucción Creativa», no «Disrupción Creativa»' },
  { pattern: /\bDAL\s+OS[^.\n]{0,40}\bDisrupci[óo]n\b/gi, why: 'la «D» de DAL OS es «Destrucción Creativa»' },
  { pattern: /\bCreative\s+Disruption\b/gi, why: 'la «D» de DAL OS es «Destrucción Creativa» / «Creative Destruction»' },
];

/**
 * Marca pública del sitio, desde la ficha (`sitio.marca.nombre`, D-165). Para
 * SLG, «SLG Agency»; «Softlanding Global» solo en contexto SLG_Holdings (§10-4).
 * Se conserva el nombre porque es el que citan los frenos y la documentación.
 */
export const PUBLIC_BRAND = sitio.marca.nombre;

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
    for (const { pattern, why } of DAL_OS_FORBIDDEN) {
      const re = new RegExp(pattern.source, pattern.flags);
      let m: RegExpExecArray | null;
      while ((m = re.exec(lineText)) !== null) {
        issues.push({ line: i + 1, found: m[0], correct: "Destrucción Creativa", why });
      }
    }
  });

  return issues;
}
