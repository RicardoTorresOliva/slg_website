/**
 * documento.ts — **Qué se sirve en el visor, y cómo se limpia antes.**
 *
 * EL HTML SE SANEA EN EL SERVIDOR, ADEMÁS DE AISLARSE. Tres capas, y ninguna
 * sustituye a las otras (D-45):
 *
 *   1. **Origen separado** — el navegador impide que el documento toque la
 *      sesión. Es la garantía fuerte, y no depende de nosotros.
 *   2. **CSP `default-src 'none'` + `sandbox`** — aunque el documento traiga
 *      scripts, no se ejecutan y no puede pedir nada a ninguna parte.
 *   3. **Este saneado** — se quitan del texto las etiquetas que ejecutan y los
 *      atributos `on*`. Es la capa más débil de las tres y la que más fácil es
 *      rodear con un HTML retorcido; está porque **si las otras dos fallan, esta
 *      reduce el daño**, no porque baste por sí sola.
 *
 * Por qué no se usa una librería de saneado: entra en el presupuesto de JS del
 * servidor, y sobre todo **crea la sensación de que el problema está resuelto**.
 * El problema lo resuelven las capas 1 y 2; esta es un cinturón más.
 */

/** Etiquetas que se retiran enteras, con su contenido. */
const ETIQUETAS_QUE_EJECUTAN = ["script", "iframe", "object", "embed", "applet", "meta", "link", "base", "form"];

export type DocumentoSaneado = {
  readonly html: string;
  /** Qué se quitó. Se registra: un entregable que trae scripts es una señal. */
  readonly retirado: readonly string[];
};

export function sanearHtml(crudo: string): DocumentoSaneado {
  const retirado: string[] = [];
  let html = crudo;

  for (const etiqueta of ETIQUETAS_QUE_EJECUTAN) {
    const conCuerpo = new RegExp(`<${etiqueta}\\b[^>]*>[\\s\\S]*?<\\/${etiqueta}\\s*>`, "gi");
    const sueltas = new RegExp(`<\\/?${etiqueta}\\b[^>]*>`, "gi");
    const antes = html;
    html = html.replace(conCuerpo, "").replace(sueltas, "");
    if (html !== antes) retirado.push(`<${etiqueta}>`);
  }

  // Atributos de evento: `onclick`, `onload`, `onerror`… Se quitan con y sin
  // comillas, porque las tres formas son válidas en HTML.
  const conEventos = html;
  html = html.replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  if (html !== conEventos) retirado.push("atributos on*");

  // `javascript:` y `data:text/html` en enlaces: la misma familia que el
  // Markdown de los avisos (D-119), aquí sobre HTML crudo.
  const conEnlaces = html;
  html = html.replace(/(href|src|action)\s*=\s*(["']?)\s*(?:javascript|vbscript|data)\s*:/gi, '$1=$2about:blank#');
  if (html !== conEnlaces) retirado.push("enlaces con esquema activo");

  return { html, retirado };
}

/** El tamaño máximo que el visor sirve. Un entregable HTML no es un sitio web. */
export const MAXIMO_BYTES = 5 * 1024 * 1024;
