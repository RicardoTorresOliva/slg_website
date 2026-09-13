/**
 * markdown-seguro.ts — **La parte de Markdown que decide qué es seguro**, sin
 * JSX, para que se pueda probar sin navegador ni compilador (RNF-31).
 *
 * POR QUÉ ESTÁ SEPARADA DEL COMPONENTE. `components/Markdown.tsx` es JSX: un
 * script de Node no lo puede cargar, así que la decisión de seguridad —qué
 * enlace se pinta y cuál no— quedaba **solo comprobable dentro de un
 * navegador**. Y es justo la clase de regla que hay que poder probar caso a
 * caso: `javascript:`, `JavaScript:` con mayúsculas, `data:text/html`, un
 * espacio delante…
 *
 * Aquí vive el análisis y la decisión; allí vive el pintado. El componente
 * **nunca produce HTML arbitrario** —construye elementos de React, así que un
 * `<script>` dentro del texto sale como texto—, y lo que este archivo añade es
 * la otra mitad: un `href` sí viaja tal cual, y hay que acotarlo.
 */

/** Los únicos esquemas que se pintan como enlace. */
export const ESQUEMAS_PERMITIDOS = ["http:", "https:", "mailto:"] as const;

/**
 * ¿Se puede pintar este `href`?
 *
 * Relativos sí —misma web—; `http`, `https` y `mailto` sí; **todo lo demás no**:
 * `javascript:` ejecuta en la sesión de quien lee, y `data:text/html` es una
 * página entera dentro de un enlace.
 *
 * `new URL()` normaliza por nosotros: quita espacios delante, baja el esquema a
 * minúsculas y descarta lo que no sea una URL. Escribir la comprobación a mano
 * con `startsWith("javascript:")` dejaría pasar `JavaScript:`, ` javascript:` y
 * `java\tscript:`, que es exactamente cómo se salta una lista negra.
 */
export function enlaceSeguro(href: string): boolean {
  const limpio = href.trim();
  if (limpio.startsWith("/") || limpio.startsWith("#") || limpio.startsWith("./")) return true;
  try {
    return (ESQUEMAS_PERMITIDOS as readonly string[]).includes(new URL(limpio).protocol);
  } catch {
    // Sin esquema y sin barra inicial no es un enlace que sepamos resolver.
    return false;
  }
}

export type Trozo = {
  tipo: "texto" | "negrita" | "cursiva" | "codigo" | "enlace";
  texto: string;
  href?: string;
};

/**
 * Parte una línea en sus marcas. **Devuelve datos, nunca HTML**: quien pinta
 * decide cómo, y por eso nada de lo que salga de aquí puede ejecutarse.
 *
 * Un enlace con esquema no permitido se conserva **como texto, entero y con su
 * sintaxis**: quien lo escribió ve que no funcionó, y quien lo lee ve qué había
 * ahí en vez de un enlace que no lleva a ninguna parte.
 */
export function trozosDeLinea(texto: string): Trozo[] {
  const trozos: Trozo[] = [];
  const re = /\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)/g;
  let ultimo = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(texto)) !== null) {
    if (m.index > ultimo) trozos.push({ tipo: "texto", texto: texto.slice(ultimo, m.index) });
    if (m[1] !== undefined) trozos.push({ tipo: "negrita", texto: m[1] });
    else if (m[2] !== undefined) trozos.push({ tipo: "cursiva", texto: m[2] });
    else if (m[3] !== undefined) trozos.push({ tipo: "codigo", texto: m[3] });
    else if (enlaceSeguro(m[5])) trozos.push({ tipo: "enlace", texto: m[4], href: m[5] });
    else trozos.push({ tipo: "texto", texto: m[0] });
    ultimo = m.index + m[0].length;
  }
  if (ultimo < texto.length) trozos.push({ tipo: "texto", texto: texto.slice(ultimo) });
  return trozos;
}
