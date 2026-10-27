/**
 * cuestionarios.ts — Los tres cuestionarios del Assessment (spec-delta-assessment, D-A3).
 *
 * Son DATOS, no JSX: una pregunta se corrige aquí, en los dos idiomas a la vez,
 * y el formulario y el manejador de `/api/assessment` leen la misma lista. El
 * Assessment es opcional y no filtra a nadie (DU-10): ninguna respuesta es
 * obligatoria, no hay puntaje de corte y no hay respuestas correctas.
 *
 * Sin `next/*` ni `node:fs`: lo importan un componente de cliente y un
 * manejador de ruta.
 */
export const PROGRAMAS = ["peex", "teax", "retx"] as const;
export type Programa = (typeof PROGRAMAS)[number];
export const PROGRAMA_POR_DEFECTO: Programa = "peex";

export function programaDe(valor: string | null | undefined): Programa {
  const v = (valor ?? "").toLowerCase();
  return (PROGRAMAS as readonly string[]).includes(v) ? (v as Programa) : PROGRAMA_POR_DEFECTO;
}

export type TipoDePregunta = "escala" | "numero" | "texto" | "opcion";
type Texto = { es: string; en: string };

export type Pregunta = {
  readonly id: string;
  readonly tipo: TipoDePregunta;
  readonly texto: Texto;
  /** Solo `escala`: lo que significan los extremos (1 y 5). */
  readonly extremos?: { readonly es: readonly [string, string]; readonly en: readonly [string, string] };
  /** Solo `opcion`. */
  readonly opciones?: { readonly es: readonly string[]; readonly en: readonly string[] };
};

const q = (
  id: string,
  tipo: TipoDePregunta,
  es: string,
  en: string,
  extra: Partial<Pick<Pregunta, "extremos" | "opciones">> = {},
): Pregunta => ({ id, tipo, texto: { es, en }, ...extra });

export const CUESTIONARIOS: Record<Programa, readonly Pregunta[]> = {
  peex: [
    q("1", "escala", "¿Cuánto del trabajo diario de tu equipo usa IA de forma habitual?", "How much of your team's daily work routinely uses AI?",
      { extremos: { es: ["Nada", "Casi todo"], en: ["None", "Almost all"] } }),
    q("2", "texto", "¿Cuántas iniciativas de IA siguen vivas en tu organización y cuántas se pararon?", "How many AI initiatives are still alive in your organization and how many stalled?"),
    q("3", "opcion", "¿Tu equipo usa herramientas de IA que la empresa no autorizó?", "Does your team use AI tools the company has not approved?",
      { opciones: { es: ["No", "Algunas", "Muchas", "No lo sé"], en: ["No", "Some", "Many", "I do not know"] } }),
    q("4", "escala", "¿Qué tan clara es hoy la política de datos para usar IA?", "How clear is your data policy for using AI today?",
      { extremos: { es: ["Inexistente", "Muy clara"], en: ["Non-existent", "Very clear"] } }),
    q("5", "texto", "¿Qué proceso crítico se rompería si una persona clave se fuera mañana?", "Which critical process would break if a key person left tomorrow?"),
    q("6", "opcion", "¿Cuánta autonomía darías hoy a un agente de IA sin supervisión?", "How much autonomy would you give an AI agent today without supervision?",
      { opciones: { es: ["Ninguna", "Solo borradores", "Acciones reversibles", "Acciones con dinero"], en: ["None", "Drafts only", "Reversible actions", "Actions involving money"] } }),
    q("7", "texto", "¿Quién decide hoy sobre la inversión en IA? (cargo)", "Who decides on AI investment today? (job title)"),
    q("8", "texto", "¿Cuál es tu mayor fragilidad operativa actual?", "What is your biggest operational fragility right now?"),
    q("9", "escala", "¿Con qué frecuencia revisas los resultados de la IA antes de actuar?", "How often do you review AI output before acting on it?",
      { extremos: { es: ["Nunca", "Siempre"], en: ["Never", "Always"] } }),
    q("10", "texto", "¿Qué resultado concreto esperas en 90 días?", "What concrete result do you expect in 90 days?"),
  ],
  teax: [
    q("1", "numero", "Horas que toma cada informe periódico de tu área", "Hours each recurring report from your area takes"),
    q("2", "numero", "Días de ciclo entre el cierre y la entrega del informe", "Days of cycle between close and report delivery"),
    q("3", "texto", "Costo aproximado mensual del reporting (importe y moneda)", "Approximate monthly cost of reporting (amount and currency)"),
    q("4", "numero", "Pilotos de IA o automatización activos hoy", "AI or automation pilots active today"),
    q("5", "texto", "Urgencias que se repiten cada mes", "Urgent issues that repeat every month"),
    q("6", "texto", "Herramientas contratadas que usa el área", "Subscribed tools your area uses"),
    q("7", "escala", "¿Qué parte del reporting es copiar y pegar?", "How much of your reporting is copy and paste?",
      { extremos: { es: ["Nada", "Casi todo"], en: ["None", "Almost all"] } }),
    q("8", "texto", "¿Quién revisa los informes antes de salir? (cargo)", "Who reviews reports before they go out? (job title)"),
    q("9", "texto", "¿Qué error de datos te ha costado más en el último año?", "Which data error has cost you the most in the last year?"),
    q("10", "texto", "¿Qué informe eliminarías mañana si pudieras?", "Which report would you eliminate tomorrow if you could?"),
  ],
  retx: [
    q("1", "numero", "Fuentes que consultas por tema", "Sources you consult per topic"),
    q("2", "texto", "¿Cómo sintetizas hoy lo que lees?", "How do you synthesize what you read today?"),
    q("3", "texto", "¿Cómo verificas una afirmación antes de usarla?", "How do you verify a claim before using it?"),
    q("4", "numero", "Horas semanales que dedicas a investigar", "Hours per week you spend researching"),
    q("5", "escala", "¿Con qué frecuencia has detectado errores en tus entregas?", "How often have you found errors in your deliverables?",
      { extremos: { es: ["Casi nunca", "Muy a menudo"], en: ["Almost never", "Very often"] } }),
    q("6", "texto", "¿Cómo entregas lo investigado?", "How do you deliver what you researched?"),
    q("7", "texto", "¿Qué herramientas de IA usas hoy para investigar?", "Which AI tools do you use to research today?"),
    q("8", "texto", "¿Qué parte de tu flujo es la más lenta?", "Which part of your workflow is the slowest?"),
    q("9", "texto", "¿Qué parte quieres conservar sin IA?", "Which part do you want to keep without AI?"),
    q("10", "texto", "¿Qué tema concreto quieres dominar primero?", "Which specific topic do you want to master first?"),
  ],
};

export function etiquetaDePrograma(p: Programa): string {
  return { peex: "PEEx", teax: "TEAx", retx: "RETx" }[p];
}
