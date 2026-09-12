import { loadCollection, type ContentRecord } from "./loader.ts";
import { textoPlano } from "./inline.ts";
import type { Lang } from "./schema.ts";
import { RUTAS_ESTRUCTURALES, canonicalizarRuta, type NombreDeRuta } from "../routes/map.ts";

/**
 * Lectura de los cuatro overviews de rama (DU-04): `/ai` y las tres líneas.
 *
 * No son páginas de servicio: no tienen descarga y por tanto **no tienen CTA
 * rojo** (`ui_wireframes` §2.3). Son índices.
 *
 * El listado de tarjetas sale del cuerpo del registro —ahí viven las frases de
 * una línea que describen cada hijo— y se **contrasta contra la colección de
 * servicios**, que es la que sabe de verdad qué servicios cuelgan de quién.
 * Esa doble fuente es deliberada: ver `validarCobertura`.
 */

export type EntradaDeOverview = {
  nombre: string;
  descripcion: string;
  /** Ruta canónica en español, tal como la escribe el contenido. */
  href: string;
};

export type ContenidoDeOverview = {
  titulo: string;
  descripcion: string;
  /** Párrafo de entrada: la idea de la rama, antes del índice. */
  intro: string;
  entradas: EntradaDeOverview[];
};

/** Los cuatro overviews, por el slug de su registro `page` en español. */
export const OVERVIEWS = ["slg-ai", "slg-academy", "slg-enterprise", "slg-factory"] as const;
export type SlugDeOverview = (typeof OVERVIEWS)[number];

/**
 * Páginas con ruta propia, que por tanto **no** debe servir también la ruta
 * genérica `/[slug]`.
 *
 * Sin esta lista, `/slg-ai` y `/ai` devolverían la misma página: contenido
 * duplicado para un buscador, y dos URLs compitiendo por posicionar lo mismo.
 * Vive aquí, en una sola lista, porque tenerla copiada en las rutas ES y EN es
 * garantía de que un día diverjan.
 */
export const PAGINAS_CON_RUTA_PROPIA: readonly string[] = ["home", ...OVERVIEWS];

/** Las tres líneas cuyos hijos son servicios (a `/ai` cuelgan páginas, no servicios). */
const LINEAS: readonly SlugDeOverview[] = ["slg-academy", "slg-enterprise", "slg-factory"];

/**
 * El registro de una página en el idioma pedido.
 *
 * En inglés no se busca por slug: se busca **por `pair`**. Los slugs ingleses
 * no siguen una regla única —unos llevan sufijo (`slg-ai-en`) y otros son otra
 * palabra (`about`, `doctrine`)—, así que derivarlos con una transformación de
 * texto funcionaría hasta el día que dejara de funcionar, en silencio.
 */
function registroDePagina(slugEs: string, lang: Lang): ContentRecord<Record<string, unknown>> {
  const registros = loadCollection("page", lang);
  const encontrado =
    lang === "es"
      ? registros.find((p) => p.slug === slugEs)
      : registros.find((p) => p.data.pair === slugEs);
  if (!encontrado) {
    throw new Error(
      `No existe el registro de página «${slugEs}» en ${lang}. ` +
        (lang === "en"
          ? `Se busca por 'pair: ${slugEs}' en content/pages/en/.`
          : `Se busca por nombre de archivo en content/pages/es/.`),
    );
  }
  return encontrado;
}

/**
 * Criterio 2: el overview enlaza a **todos** sus servicios y a ninguno ajeno.
 *
 * Se comprueba contra `content/services/`, no contra lo que diga el cuerpo del
 * overview, porque el riesgo real es que alguien añada un servicio y se olvide
 * de listarlo: el servicio existiría, tendría su página, y **nadie llegaría a
 * él** — un fallo invisible, que es el peor tipo.
 *
 * La comprobación es asimétrica a propósito:
 * - Falta en el cuerpo un servicio que SÍ existe → error. Se está escondiendo.
 * - Está en el cuerpo algo cuyo registro todavía NO existe → se deja pasar y se
 *   renderiza igual. Es el criterio 5: un servicio sin registro todavía no
 *   rompe el índice.
 */
function validarCobertura(slugEs: SlugDeOverview, entradas: EntradaDeOverview[], file: string) {
  if (!LINEAS.includes(slugEs)) return;

  const base = RUTAS_ESTRUCTURALES[slugEs as NombreDeRuta].es;
  const servicios = loadCollection<{ parent: string | null }>("service", "es").filter(
    (s) => s.data.parent === slugEs,
  );

  // Se compara en forma canónica española: el registro inglés puede escribir
  // sus rutas ya en inglés, y eso no debe cambiar qué servicios cubre.
  const listadas = new Set(entradas.map((e) => canonicalizarRuta(e.href)));
  const ausentes = servicios
    .map((s) => `${base}/${s.slug}`)
    .filter((ruta) => !listadas.has(ruta));

  if (ausentes.length) {
    throw new Error(
      `${file}: el índice no enlaza ${ausentes.length} servicio(s) que sí existen en ` +
        `content/services/: ${ausentes.join(", ")}. Un servicio al que no se llega desde su ` +
        `línea es un servicio invisible (DU-04, criterio 2).`,
    );
  }

  const ajenas = [...listadas].filter((ruta) => !ruta.startsWith(`${base}/`));
  if (ajenas.length) {
    throw new Error(
      `${file}: el índice enlaza rutas que no cuelgan de ${base}: ${ajenas.join(", ")} ` +
        `(DU-04, criterio 2).`,
    );
  }
}

const ENTRADA = /\*\*(.+?)\*\*\s*—\s*([\s\S]+?)\s*→\s*`([^`]+)`/g;

export function cargarOverview(slugEs: SlugDeOverview, lang: Lang): ContenidoDeOverview {
  const registro = registroDePagina(slugEs, lang);
  const cuerpo = registro.body;

  const entradas: EntradaDeOverview[] = [...cuerpo.matchAll(ENTRADA)].map((m) => ({
    nombre: m[1].trim(),
    descripcion: textoPlano(m[2].replace(/\s+/g, " ").trim()),
    href: m[3].trim(),
  }));

  if (entradas.length === 0) {
    throw new Error(
      `${registro.file}: un overview sin ninguna entrada «**Nombre** — descripción → \`/ruta\`» ` +
        `no es un índice de nada.`,
    );
  }

  validarCobertura(slugEs, entradas, registro.file);

  const primeraEntrada = cuerpo.indexOf("**");
  const intro = textoPlano(cuerpo.slice(0, primeraEntrada).replace(/\s+/g, " ").trim());

  return {
    titulo: registro.data.title as string,
    descripcion: registro.data.description as string,
    intro,
    entradas,
  };
}
