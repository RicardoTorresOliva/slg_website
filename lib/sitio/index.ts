/**
 * lib/sitio — Lo que se deriva de la ficha del sitio (`site.config.ts`, D-165).
 *
 * **LA ÚNICA PUERTA A LA FICHA.** El resto del motor importa de aquí y no de
 * `site.config.ts` directamente, por dos razones: las listas derivadas (todas
 * las líneas, todos los servicios, los nombres de rama) se calculan en un solo
 * sitio y no en cada consumidor; y el día que la ficha se valide al cargar
 * (`check:sitio`), la validación vive aquí.
 *
 * Sin `next/*` ni nada que no pueda ejecutar Node: lo importan también los
 * guiones de `scripts/`.
 */
import { sitio } from "../../site.config.ts";

import type {
  EjeDeLaOferta,
  Idioma,
  LineaDeLaOferta,
  Marca,
  Modulos,
  ServicioDeLaOferta,
} from "./tipos.ts";

export { sitio };
export type * from "./tipos.ts";

/** Un servicio con el eje y la línea de los que cuelga. Suelto: los dos son `null`. */
export type ServicioUbicado = ServicioDeLaOferta & {
  readonly eje: EjeDeLaOferta | null;
  readonly linea: LineaDeLaOferta | null;
};

/** Todas las líneas de todos los ejes, en el orden de la ficha. */
export function lineasDeLaOferta(): readonly LineaDeLaOferta[] {
  return sitio.oferta.ejes.flatMap((e) => e.lineas);
}

/** Todos los servicios —los de las líneas y los sueltos—, en el orden de la ficha. */
export function serviciosDeLaOferta(): readonly ServicioUbicado[] {
  const enLineas = sitio.oferta.ejes.flatMap((eje) =>
    eje.lineas.flatMap((linea) => linea.servicios.map((s) => ({ ...s, eje, linea }))),
  );
  const sueltos = sitio.oferta.sueltos.map((s) => ({ ...s, eje: null, linea: null }));
  return [...enLineas, ...sueltos];
}

/**
 * Los nombres literales de los servicios. Es lo que antes era `PROJECT_SERVICES`
 * escrito a mano en `lib/db/schema.ts`: la lista cerrada de servicios con la
 * que se crea un proyecto.
 */
export function nombresDeServicio(): readonly string[] {
  return serviciosDeLaOferta().map((s) => s.nombre);
}

/**
 * Los valores válidos del campo `branch` de un registro de servicio: el nombre
 * de cada línea y el de cada servicio suelto. Es lo que antes era `BRANCHES` en
 * `lib/content/schema.ts`.
 */
export function nombresDeRama(): readonly string[] {
  return [...lineasDeLaOferta().map((l) => l.nombre), ...sitio.oferta.sueltos.map((s) => s.nombre)];
}

/** ¿Está este idioma servido por el sitio? */
export function idiomaActivo(idioma: Idioma): boolean {
  return idioma === sitio.idiomas.principal || sitio.idiomas.adicionales.includes(idioma);
}

/** ¿Está encendida esta función? */
export function moduloActivo(modulo: keyof Modulos): boolean {
  return sitio.modulos[modulo];
}

/**
 * Qué variable CSS recibe cada color de la ficha. Los nombres `--slg-*` son
 * espacio de nombres técnico del motor, no marca (`plantilla-de-sitios.md` §1):
 * un cliente cambia el valor, nunca el nombre, y así ningún componente se toca.
 *
 * Vive aquí y no en `app/layout.tsx` porque la leen dos: el armazón raíz, que
 * pinta los colores, y `check:contraste`, que los mide. Una segunda tabla en el
 * freno podría desincronizarse de la primera y medir un color que no se sirve.
 */
export const VARIABLES_DE_COLOR: Readonly<Record<keyof Marca["colores"], string>> = {
  primario: "--slg-blue-primary",
  profundo: "--slg-blue-deep",
  acento: "--slg-cyan",
  tinte: "--slg-blue-tint",
  secundario: "--slg-indigo",
  alerta: "--slg-red",
  tinta: "--slg-ink",
  linea: "--slg-line",
  papel: "--slg-paper",
};

/** Los colores de la ficha como pares `[variable, valor]`, en el orden de la tabla. */
export function coloresDeLaMarca(): ReadonlyArray<readonly [string, string]> {
  return (Object.keys(VARIABLES_DE_COLOR) as Array<keyof Marca["colores"]>).map(
    (clave) => [VARIABLES_DE_COLOR[clave], sitio.marca.colores[clave].toLowerCase()] as const,
  );
}

/**
 * La regla `:root{…}` con los colores de marca, lista para un `<style>`.
 *
 * **Solo acepta hexadecimales.** El texto va a parar dentro de una etiqueta
 * `<style>` sin escapar; un valor con `;`, `}` o `<` en la ficha podría cerrar
 * la regla o la etiqueta. El tipo `Hex` no lo impide —solo exige la almohadilla—,
 * así que se comprueba aquí y, si falla, falla la compilación, no la página.
 */
export function cssDeLaMarca(): string {
  const declaraciones = coloresDeLaMarca().map(([variable, valor]) => {
    if (!/^#[0-9a-f]{3,8}$/.test(valor)) {
      throw new Error(`site.config.ts: el color ${variable} («${valor}») no es un hexadecimal válido.`);
    }
    return `${variable}:${valor}`;
  });
  return `:root{${declaraciones.join(";")}}`;
}
