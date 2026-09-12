import { loadCollection } from "./loader.ts";
import type { Lang } from "./schema.ts";

/**
 * Lectura estructurada del registro `home` (DU-03).
 *
 * El copy de Home vive en `content/pages/{es,en}/home.md` y se aprobó en
 * FU-01. Esta capa lo convierte en datos para los componentes de C.5 — y de
 * paso **hace cumplir el criterio 1**: los bloques tienen encabezado fijo y
 * orden fijo (RF-09), y si falta uno o están desordenados la página no se
 * renderiza a medias, falla. Es el mismo trato que `validateServiceSections`
 * da al contrato A.3 de las páginas de servicio.
 */

/** Los cinco bloques que vienen del contenido, en el orden de RF-09. */
export const HOME_SECTIONS: Record<Lang, readonly string[]> = {
  es: ["Hero", "Dos puertas", "Tres tarjetas de SLG_AI", "Franja Doctrina", "Descarga destacada"],
  en: ["Hero", "Two doors", "Three SLG_AI cards", "Doctrine strip", "Featured download"],
} as const;

export type PuertaDeHome = {
  nombre: string;
  descripcion: string;
  /** Ruta canónica en español, tal como la escribe el contenido. */
  href: string;
};

export type ContenidoDeHome = {
  titulo: string;
  descripcion: string;
  hero: { titular: string; subtitular: string | null };
  puertas: PuertaDeHome[];
  tarjetas: PuertaDeHome[];
  /** `null` cuando el contenido todavía es un `[PENDIENTE]`: lo resuelve el estado vacío. */
  doctrina: string | null;
  descargaDestacada: string | null;
};

/**
 * Un bloque que sigue siendo `[PENDIENTE]` no es contenido: es un hueco.
 *
 * Se devuelve `null` para que la página muestre su **estado vacío redactado**
 * en vez del marcador en crudo. El marcador sigue en el archivo de contenido,
 * que es donde `check:pending` lo busca para cerrarle el paso a `main`
 * (DoD #10) — esconderlo del visitante no relaja el gate, solo evita que un
 * corchete de trabajo interno aparezca en la portada.
 */
function contenidoOHueco(texto: string): string | null {
  return texto.includes("[PENDIENTE") ? null : texto;
}

function trocearEnSecciones(body: string): Map<string, string> {
  const secciones = new Map<string, string>();
  const partes = body.split(/^##\s+/m).slice(1);
  for (const parte of partes) {
    const salto = parte.indexOf("\n");
    const titulo = (salto === -1 ? parte : parte.slice(0, salto)).trim();
    secciones.set(titulo, (salto === -1 ? "" : parte.slice(salto + 1)).trim());
  }
  return secciones;
}

/** `**Nombre** — descripción → \`/ruta\`` */
function parsearPuertas(texto: string, seccion: string, file: string): PuertaDeHome[] {
  const entradas = [...texto.matchAll(/\*\*(.+?)\*\*\s*—\s*([\s\S]+?)\s*→\s*`([^`]+)`/g)];
  if (entradas.length === 0) {
    throw new Error(
      `${file}: el bloque «${seccion}» no tiene ninguna entrada con la forma ` +
        "«**Nombre** — descripción → `/ruta`». Sin ella no se puede construir la tarjeta.",
    );
  }
  return entradas.map((m) => ({
    nombre: m[1].trim(),
    descripcion: m[2].replace(/\s+/g, " ").trim(),
    href: m[3].trim(),
  }));
}

export function cargarHome(lang: Lang): ContenidoDeHome {
  const registro = loadCollection<{ title: string; description: string }>("page", lang).find(
    (p) => p.slug === "home",
  );
  if (!registro) {
    throw new Error(`No existe content/pages/${lang}/home.md — la portada no puede construirse.`);
  }

  const secciones = trocearEnSecciones(registro.body);
  const esperados = HOME_SECTIONS[lang];
  const presentes = [...secciones.keys()];

  // Criterio 1: falta o desorden de un bloque = página rechazada (RF-09).
  esperados.forEach((titulo, i) => {
    const at = presentes.indexOf(titulo);
    if (at === -1) {
      throw new Error(`${registro.file}: falta el bloque «## ${titulo}» que RF-09 fija en la posición ${i + 1}.`);
    }
    if (at !== i) {
      throw new Error(
        `${registro.file}: «${titulo}» aparece en la posición ${at + 1}; RF-09 lo fija en la ${i + 1}.`,
      );
    }
  });

  const [heroT, puertasT, tarjetasT, doctrinaT, descargaT] = esperados.map(
    (titulo) => secciones.get(titulo)!,
  );

  const parrafosHero = heroT.split(/\n\s*\n/).map((p) => p.replace(/\s+/g, " ").trim());

  return {
    titulo: registro.data.title,
    descripcion: registro.data.description,
    hero: { titular: parrafosHero[0], subtitular: parrafosHero[1] ?? null },
    puertas: parsearPuertas(puertasT, esperados[1], registro.file),
    tarjetas: parsearPuertas(tarjetasT, esperados[2], registro.file),
    doctrina: contenidoOHueco(doctrinaT.replace(/\s+/g, " ").trim()),
    descargaDestacada: contenidoOHueco(descargaT.replace(/\s+/g, " ").trim()),
  };
}
