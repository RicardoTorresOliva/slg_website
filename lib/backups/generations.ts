/**
 * generations.ts — Retención por generaciones (mitigación 3 de R-37,
 * criterio 5 de FU-14).
 *
 * "Al menos tres generaciones, no un único destino sobrescrito". La forma de
 * garantizar que ninguna copia pisa a otra no es confiar en el permiso del
 * token —R2 no ofrece un nivel "escribe pero no borra" (D-65)— sino que **dos
 * copias nunca compartan clave**. La marca de tiempo va en la clave, no en
 * unos metadatos que haya que leer para saber qué hay: el puerto de §8.3 no
 * lee nada.
 *
 *     db/daily/20260911T021500Z-7f3a2b.sql.gz.enc
 *     db/weekly/20260913T021500Z-04c19e.sql.gz.enc
 *     db/monthly/20261001T021500Z-be7701.sql.gz.enc
 *     db/pre-migration/20260911T144233Z-2ad5f0.sql.gz.enc
 *     files/daily/20260911T021500Z-7f3a2b.tar.gz.enc
 *
 * Los seis caracteres tras la marca de tiempo son el identificador de la
 * EJECUCIÓN, y no son decorativos: la marca tiene resolución de segundo, así
 * que dos ejecuciones dentro del mismo segundo compartirían clave y la segunda
 * pisaría a la primera — justo lo que el criterio 5 prohíbe. Con el cron
 * diario eso no puede pasar; con `--pre-migration` en un despliegue que aplica
 * dos migraciones seguidas, sí. Lo descubrió la propia suite de pruebas al
 * encadenar dos copias, no un razonamiento: dos ejecuciones seguidas dejaron
 * tres objetos en el destino en vez de seis.
 *
 * Una ejecución diaria produce SIEMPRE la generación `daily`; el domingo
 * produce además `weekly`, y el día 1 del mes además `monthly`. El volcado se
 * hace UNA vez y el mismo archivo cifrado se deposita bajo cada clave: tres
 * operaciones PUT en el peor día, no tres volcados (D-21: las operaciones son
 * la partida medida, y la CPU del VPS también cuenta).
 *
 * `pre-migration` es la cuarta generación, la del criterio 7 (R-20): una copia
 * automática antes de cada migración de esquema. No entra en el ciclo diario
 * y tiene su propia retención.
 */

import { randomBytes } from "node:crypto";

export const GENERACIONES = ["daily", "weekly", "monthly", "pre-migration"] as const;
export type Generacion = (typeof GENERACIONES)[number];

export const TIPOS = ["db", "files"] as const;
export type TipoDeCopia = (typeof TIPOS)[number];

export type ClaveDeCopia = {
  tipo: TipoDeCopia;
  generacion: Generacion;
  /** Instante del volcado, en UTC. */
  fecha: Date;
  /**
   * Identificador de la ejecución: seis caracteres hexadecimales, iguales en
   * todos los objetos de una misma copia (volcado, volúmenes y manifiesto) y
   * distintos entre ejecuciones. Lo genera `nuevaEjecucion()` UNA vez por
   * ejecución, nunca por objeto.
   */
  ejecucion: string;
  /** Sufijo completo, p. ej. `sql.gz.enc`. */
  extension: string;
};

/** Un identificador de ejecución nuevo. Una llamada por copia, no por objeto. */
export function nuevaEjecucion(): string {
  return randomBytes(3).toString("hex");
}

/** Día de la semana que ancla la generación semanal: domingo. */
const DIA_ANCLA_SEMANAL = 0;

/**
 * Marca de tiempo apta para una clave de objeto: ISO-8601 en UTC, sin los
 * `:` que obligan a escapar en URLs y sin milisegundos, que no aportan nada
 * en una copia diaria. Ordena alfabéticamente igual que cronológicamente, que
 * es lo que hace que la purga pueda decidir sin parsear nada.
 */
export function selloDeTiempo(fecha: Date): string {
  return fecha.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function claveDeCopia(c: ClaveDeCopia): string {
  return `${c.tipo}/${c.generacion}/${selloDeTiempo(c.fecha)}-${c.ejecucion}.${c.extension}`;
}

const PATRON_CLAVE = new RegExp(
  `^(${TIPOS.join("|")})/(${GENERACIONES.join("|")})/` +
    `(\\d{8}T\\d{6}Z)-([0-9a-f]{6})\\.(.+)$`,
);

/** Inverso de `claveDeCopia`. Devuelve `null` si la clave no es de este proceso. */
export function analizarClave(clave: string): ClaveDeCopia | null {
  const m = PATRON_CLAVE.exec(clave);
  if (!m) return null;
  const [, tipo, generacion, sello, ejecucion, extension] = m;
  const iso =
    `${sello.slice(0, 4)}-${sello.slice(4, 6)}-${sello.slice(6, 8)}T` +
    `${sello.slice(9, 11)}:${sello.slice(11, 13)}:${sello.slice(13, 15)}Z`;
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return null;
  return {
    tipo: tipo as TipoDeCopia,
    generacion: generacion as Generacion,
    fecha,
    ejecucion,
    extension,
  };
}

/**
 * Qué generaciones produce la ejecución de este día. Se calcula en UTC, no en
 * la hora local del servidor: el cron de Easypanel sigue la hora del servidor
 * (D-66 lo deja anotado como lo último a confirmar en el panel), y no queremos
 * que un cambio de zona horaria mueva el día en que nace la copia mensual.
 */
export function generacionesDeFecha(fecha: Date): Generacion[] {
  const generaciones: Generacion[] = ["daily"];
  if (fecha.getUTCDay() === DIA_ANCLA_SEMANAL) generaciones.push("weekly");
  if (fecha.getUTCDate() === 1) generaciones.push("monthly");
  return generaciones;
}

export type RetencionPorGeneracion = Record<Generacion, number>;

/**
 * Qué claves borra la purga: de cada generación se conservan las N EJECUCIONES
 * más recientes y se devuelven las claves de las demás.
 *
 * La unidad de retención es la ejecución (una marca de tiempo), no el objeto.
 * Una ejecución deposita tres objetos —volcado de base de datos, paquete de
 * volúmenes y manifiesto— y los tres se conservan o se van juntos: un volcado
 * de base de datos sin sus archivos, o sin el manifiesto con el que comparar
 * los recuentos (§9.3 paso 6), es media copia. Contar objetos en vez de
 * ejecuciones dejaría "14 diarias" en cuatro días y medio de historia.
 *
 * Dos cosas que este cálculo NO hace, a propósito:
 *
 *  · No borra nunca una clave que no reconoce. Un objeto ajeno al esquema
 *    —subido a mano, o de un proceso futuro— se queda donde está. La purga
 *    tiene credencial de borrado: su lista de candidatos debe ser cerrada,
 *    no "todo lo que no haga falta".
 *  · No borra por antigüedad absoluta, sino por conteo. Si el proceso de copia
 *    lleva un mes caído, la purga no vacía el destino por "caducidad": las N
 *    últimas siguen siendo las N últimas. Un borrado que depende del reloj es
 *    exactamente el mecanismo que R-37 teme.
 */
export function seleccionarParaPurga(
  claves: string[],
  retencion: RetencionPorGeneracion,
): { aBorrar: string[]; aConservar: string[]; ignoradas: string[] } {
  type Ejecucion = { instante: number; id: string; claves: string[] };
  const porGeneracion = new Map<Generacion, Map<string, Ejecucion>>();
  const ignoradas: string[] = [];

  for (const clave of claves) {
    const analizada = analizarClave(clave);
    if (!analizada) {
      ignoradas.push(clave);
      continue;
    }
    if (!porGeneracion.has(analizada.generacion)) porGeneracion.set(analizada.generacion, new Map());
    const ejecuciones = porGeneracion.get(analizada.generacion)!;
    // Agrupar por instante + identificador de ejecución, no solo por instante:
    // dos copias del mismo segundo son dos ejecuciones distintas, y tratarlas
    // como una sola dejaría media copia sin borrar cuando le toque irse.
    const id = `${analizada.fecha.getTime()}-${analizada.ejecucion}`;
    if (!ejecuciones.has(id)) {
      ejecuciones.set(id, { instante: analizada.fecha.getTime(), id, claves: [] });
    }
    ejecuciones.get(id)!.claves.push(clave);
  }

  const aBorrar: string[] = [];
  const aConservar: string[] = [];

  for (const [generacion, ejecuciones] of porGeneracion) {
    const cuantas = retencion[generacion];
    const ordenadas = [...ejecuciones.values()].sort(
      (a, b) => b.instante - a.instante || b.id.localeCompare(a.id),
    );
    ordenadas.forEach((e, i) => (i < cuantas ? aConservar : aBorrar).push(...e.claves));
  }

  return { aBorrar, aConservar, ignoradas };
}
