import { textoPlano, trocearEnSecciones } from "./inline.ts";
import { loadCollection } from "./loader.ts";
import { SERVICE_SECTIONS, type Lang } from "./schema.ts";

/**
 * Lectura de una página de servicio — el contrato A.3 (DU-05).
 *
 * Las seis secciones y su orden **ya los valida el cargador** con
 * `validateServiceSections` (FU-03, RF-135): un registro al que le falte un
 * bloque o los tenga desordenados no llega vivo hasta aquí. Esta capa no
 * repite esa comprobación; convierte el registro en datos y resuelve lo que el
 * contrato deja abierto: qué pasa cuando el documento no existe todavía y qué
 * pasa cuando «Qué incluye» viene vacío (criterio 7).
 */

export type DocumentoDeServicio = {
  titulo: string;
  publico: string;
  aprende: string[];
  /** `published` es el único estado con archivo real detrás. */
  estado: string;
  href: string;
};

export type ContenidoDeServicio = {
  nombre: string;
  rama: string;
  /** Ruta canónica española del overview de su línea; `null` para `SLG_Holdings`. */
  overviewHref: string | null;
  paraQuien: string;
  queEs: string;
  /** Vacío cuando la fuente todavía no detalla el alcance: lo resuelve el estado vacío. */
  queIncluye: string[];
  comoTrabajamos: string;
  siguientePaso: string;
  /** `null` cuando el servicio no tiene registro de descarga asociado (criterio 7). */
  documento: DocumentoDeServicio | null;
};

/** Un bloque que sigue siendo `[PENDIENTE]` es un hueco, no contenido. Ver `home.ts`. */
function contenidoOHueco(texto: string): string {
  return texto.includes("[PENDIENTE") ? "" : texto;
}

function viñetas(texto: string): string[] {
  return contenidoOHueco(texto)
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("- "))
    .map((l) => textoPlano(l.slice(2).trim()));
}

/** El registro en el idioma pedido: por slug en español, por `pair` en inglés. */
function registroDeServicio(slugEs: string, lang: Lang) {
  const registros = loadCollection<{
    name: string;
    branch: string;
    parent: string | null;
    download: string;
    pair: string | null;
  }>("service", lang);
  const encontrado =
    lang === "es"
      ? registros.find((s) => s.slug === slugEs)
      : registros.find((s) => s.data.pair === slugEs);
  if (!encontrado) {
    throw new Error(`No existe el servicio «${slugEs}» en ${lang} (se busca por pair en inglés).`);
  }
  return encontrado;
}

/**
 * El documento de la sección 5, o `null`.
 *
 * `null` no es un error: `holdings` y cualquier servicio nuevo pueden existir
 * antes que su documento. La página se renderiza igual y la sección 5 muestra
 * su estado — lo que **no** puede es desaparecer, porque es el único CTA de la
 * página (RF-07) y sin ella la página deja de tener salida.
 */
function documentoDe(
  slugDescarga: string,
  lang: Lang,
  rutaDescargas: string,
): DocumentoDeServicio | null {
  const registro = loadCollection<{
    title: string;
    audience: string;
    learns: string[];
    status: string;
  }>("download", lang).find((d) => d.slug === slugDescarga);
  if (!registro) return null;

  return {
    titulo: contenidoOHueco(registro.data.title),
    publico: contenidoOHueco(registro.data.audience),
    aprende: (registro.data.learns ?? []).map(textoPlano).filter((l) => !l.includes("[PENDIENTE")),
    estado: registro.data.status,
    href: `${rutaDescargas}/${registro.slug}`,
  };
}

export function cargarServicio(
  slugEs: string,
  lang: Lang,
  rutaDescargas: string,
): ContenidoDeServicio {
  const registro = registroDeServicio(slugEs, lang);
  const secciones = trocearEnSecciones(registro.body);
  const [paraQuien, queEs, queIncluye, comoTrabajamos, , siguientePaso] = SERVICE_SECTIONS[
    lang
  ].map((titulo) => secciones.get(titulo) ?? "");

  const parent = registro.data.parent;

  return {
    nombre: registro.data.name,
    rama: registro.data.branch,
    // El `parent` inglés lleva sufijo (`slg-factory-en`); la ruta se construye
    // siempre desde la forma española, que es la canónica del mapa.
    overviewHref: parent ? `/ai/${parent.replace(/^slg-/, "").replace(/-en$/, "")}` : null,
    paraQuien: textoPlano(contenidoOHueco(paraQuien).replace(/\s+/g, " ").trim()),
    queEs: textoPlano(contenidoOHueco(queEs).replace(/\s+/g, " ").trim()),
    queIncluye: viñetas(queIncluye),
    comoTrabajamos: textoPlano(contenidoOHueco(comoTrabajamos).replace(/\s+/g, " ").trim()),
    siguientePaso: textoPlano(contenidoOHueco(siguientePaso).replace(/\s+/g, " ").trim()),
    documento: documentoDe(registro.data.download, lang, rutaDescargas),
  };
}
