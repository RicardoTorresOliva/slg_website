/**
 * check-copy.ts — Los criterios 3 y 4 de FU-01, como freno.
 *
 * DOS REGLAS QUE NO SE PUEDEN DEJAR A LA REVISIÓN, porque son justo las que se
 * cuelan cuando hay prisa por publicar:
 *
 *   · **Criterio 4 (RF-96, RF-07)**: ningún texto público ofrece «Sesión Cero»
 *     ni agenda. El único llamado a la acción de una página de servicio es su
 *     descarga. Una agenda embebida convierte una página de autoridad en una
 *     página de venta, y eso es exactamente lo que el contrato A.3 evita.
 *
 *   · **Criterio 3 (RF-11, RNF-18)**: cero cifras, premios, casos o nombres de
 *     cliente sin respaldo. O hay dato verificado y autorización explícita, o va
 *     marcado `[PENDIENTE: …]`. El texto de una firma que asesora directorios no
 *     puede llevar un número que nadie pueda defender.
 *
 * Lo que este freno NO puede comprobar es si el dato es cierto. Comprueba que
 * nadie publique uno **sin declarar de dónde sale**, que es la parte
 * mecanizable. La veracidad la firma Ricardo en la compuerta.
 */
import { walkContent, report, type Failure } from "./lib.ts";

/* ── Criterio 4 · sin Sesión Cero ni agenda en la capa pública ───────────── */

const PROHIBIDO_EN_PUBLICO: ReadonlyArray<{ re: RegExp; que: string }> = [
  { re: /sesi[oó]n\s+cero/gi, que: "«Sesión Cero» en texto público (RF-96)" },
  { re: /zero\s+session/gi, que: "«Zero Session» en texto público (RF-96)" },
  { re: /\b(?:calendly|cal\.com|savvycal|hubspot\s*meetings)\b/gi, que: "agenda embebida de terceros" },
  { re: /\bagenda\s+(?:tu|una|aquí|ahora)\b/gi, que: "llamada a agendar (RF-07: el único CTA es la descarga)" },
  { re: /\bbook\s+(?:a|your)\s+(?:call|meeting|slot)\b/gi, que: "llamada a agendar en inglés" },
  { re: /\bschedule\s+(?:a|your)\s+(?:call|meeting)\b/gi, que: "llamada a agendar en inglés" },
];

/**
 * Las colecciones que se publican. `doctrine` entra: es texto público. `post`
 * también — un artículo con una cifra inventada hace el mismo daño que una
 * página.
 */
const PUBLICAS = new Set(["page", "service", "download", "post", "doctrine"]);

/* ── Criterio 3 · cifras y afirmaciones sin respaldo ─────────────────────── */

/**
 * Patrones de afirmación que exigen respaldo. Deliberadamente estrechos: un
 * freno que marca cualquier número marcaría también «las 11 dimensiones», que
 * es estructura de la oferta y no una cifra de resultado.
 */
const EXIGEN_RESPALDO: ReadonlyArray<{ re: RegExp; que: string }> = [
  { re: /\b\d{1,3}\s*%/g, que: "porcentaje" },
  { re: /\b(?:\+|más de|over|more than)\s*\d/gi, que: "cifra comparativa" },
  { re: /\b\d+\s*(?:x|veces|times)\b/gi, que: "multiplicador" },
  { re: /\b(?:USD|EUR|\$|€)\s?\d/g, que: "importe" },
  /**
   * Sin `\b` de cierre a propósito: el español flexiona («líder» → «líderes»,
   * «premio» → «premiados») y con la frontera final «somos líderes del sector»
   * se colaba entera. Lo comprobó el fixture negativo, no una lectura.
   */
  { re: /\b(?:premio|premiad|award|galard[oó]n)/gi, que: "premio" },
  { re: /\b(?:l[ií]der|leading|n[uú]mero uno|number one|the best|el mejor)/gi, que: "superlativo" },
  { re: /\b(?:caso de [eé]xito|success story|case study)\b/gi, que: "caso de cliente" },
];

/**
 * Un dato respaldado se declara en la misma línea con `[fuente: …]`, o queda
 * marcado como pendiente. Las dos formas son explícitas: lo que el freno
 * persigue es la afirmación **silenciosa**.
 */
const RESPALDADO = /\[(?:fuente|source)\s*:[^\]]+\]|\[PENDIENTE[^\]]*\]/i;

/**
 * Registros con copy TEMPORAL — redactado contra el brief y `knowledge/`, y
 * **pendiente de que Ricardo lo sustituya o lo firme**.
 *
 * No es un fallo y no frena `main`: un hueco frena, un borrador no. Pero se
 * lista **en cada ejecución**, porque la forma en que un texto provisional se
 * convierte en definitivo no es una decisión: es un olvido.
 */
const temporales: string[] = [];

const failures: Failure[] = [];
let checked = 0;

for (const doc of walkContent()) {
  if (!PUBLICAS.has(doc.collection)) continue;
  if (doc.data.copy === "temporal") temporales.push(doc.rel);

  const lineas = `${JSON.stringify(doc.data)}\n${doc.body}`.split("\n");

  lineas.forEach((linea, i) => {
    checked++;
    const donde = `${doc.rel}${i > 0 ? `:${i}` : " (frontmatter)"}`;

    for (const { re, que } of PROHIBIDO_EN_PUBLICO) {
      const rx = new RegExp(re.source, re.flags);
      if (rx.test(linea)) {
        failures.push({
          file: donde,
          detail:
            `${que}. El contrato A.3 §6 dice «sin venta»: el siguiente paso es ` +
            `escribir a /contacto, nunca agendar.`,
        });
      }
    }

    if (RESPALDADO.test(linea)) return;

    for (const { re, que } of EXIGEN_RESPALDO) {
      const rx = new RegExp(re.source, re.flags);
      const m = rx.exec(linea);
      if (m) {
        failures.push({
          file: donde,
          detail:
            `${que} sin respaldo («${m[0].trim()}»). Declara la fuente en la misma ` +
            `línea con [fuente: …], o márcalo [PENDIENTE: …] hasta tenerla (RF-11, RNF-18).`,
        });
      }
    }
  });
}

if (temporales.length > 0) {
  console.log(
    `\nCopy TEMPORAL — ${temporales.length} registros redactados contra el brief y pendientes de\n` +
      `la firma de Ricardo. Publicables, y ninguno es definitivo:\n`,
  );
  const porColeccion = new Map<string, number>();
  for (const rel of temporales) {
    const coleccion = rel.split("/")[1] ?? rel;
    porColeccion.set(coleccion, (porColeccion.get(coleccion) ?? 0) + 1);
  }
  for (const [coleccion, n] of [...porColeccion].sort()) {
    console.log(`  · ${coleccion.padEnd(12)} ${String(n).padStart(3)} registros`);
  }
  console.log(
    `\n  Para dar uno por bueno: cambia «copy: temporal» por «copy: aprobado» en su\n` +
      `  frontmatter, y queda registrado con fecha en docs/work_log.md.\n`,
  );
}

report("copy público (FU-01, criterios 3 y 4)", failures, checked);
