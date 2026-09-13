/**
 * generaciones.ts — **Tres generaciones, y un nombre que se puede calcular sin
 * preguntar** (FU-14, criterios 4 y 5 · R-37).
 *
 * POR QUÉ TRES GENERACIONES Y NO UN DESTINO QUE SE SOBRESCRIBE. R2 no ofrece
 * Object Lock por API estándar (R-37), así que la inmutabilidad hay que
 * sustituirla. Un único destino sobrescrito no protege de nada: un cifrado
 * malicioso —o un `pg_dump` que sale vacío por un fallo de credenciales— se
 * copia encima de la única copia buena y el backup **destruye** en vez de
 * proteger. Con diaria, semanal y mensual, para perder los datos hay que
 * corromper tres cadenas con retenciones distintas.
 *
 * POR QUÉ EL NOMBRE SE CALCULA Y NO SE BUSCA. **Ninguna de las tres operaciones
 * —subir, restaurar, purgar— lista el bucket.** No es una limitación heredada de
 * RF-123: es que listar exige una credencial que puede enumerar, y la del
 * proceso de copia es deliberadamente ciega. Con nombres deterministas, purgar
 * es calcular qué fechas caducaron y borrarlas; restaurar es calcular la clave de
 * la fecha que se quiere. Borrar una clave que no existe no es un error.
 */

export type Generacion = "diaria" | "semanal" | "mensual";
export type Pieza = "base-de-datos" | "volumenes";

/** Retenciones por defecto. Se pueden subir por entorno, nunca bajar de una. */
export const RETENCION: Readonly<Record<Generacion, number>> = {
  diaria: 14,
  semanal: 8,
  mensual: 12,
};

/** `YYYY-MM-DD` en UTC. El huso del servidor no puede decidir de qué día es. */
export function fechaDe(momento: Date): string {
  return momento.toISOString().slice(0, 10);
}

/**
 * La clave del objeto. **Lleva generación, fecha y pieza**, en ese orden: así un
 * prefijo describe una generación entera y la ordenación alfabética coincide con
 * la cronológica, que es lo que hace legible un bucket que nadie lista.
 */
export function claveDe(generacion: Generacion, fecha: string, pieza: Pieza): string {
  return `${generacion}/${fecha}/${pieza}.slgbk`;
}

/**
 * A qué generaciones pertenece un día. **Un mismo día puede ser las tres**: el
 * primer lunes de mes es diaria, semanal y mensual, y se sube tres veces a
 * propósito — tres copias con tres retenciones, que es de lo que trata R-37.
 */
export function generacionesDe(momento: Date): Generacion[] {
  const salida: Generacion[] = ["diaria"];
  // Lunes. `getUTCDay()` y no `getDay()`: el huso del servidor no decide.
  if (momento.getUTCDay() === 1) salida.push("semanal");
  if (momento.getUTCDate() === 1) salida.push("mensual");
  return salida;
}

/** Cuántos días atrás está el borde de retención de cada generación. */
function diasDeRetencion(generacion: Generacion, retencion: Record<Generacion, number>): number {
  if (generacion === "diaria") return retencion.diaria;
  if (generacion === "semanal") return retencion.semanal * 7;
  return retencion.mensual * 31;
}

/**
 * Las claves que **deberían seguir ahí**: las de la generación diaria que caen
 * entre la primera copia y ayer, ambas dentro de la retención.
 *
 * **PARA QUÉ.** R2 no da un token que escriba y no borre —el más acotado,
 * *Object Read & Write*, incluye `DeleteObject`—, así que la separación de
 * credenciales acota quién borra a propósito pero **no impide** que quien se
 * haga con la credencial del servidor vacíe el histórico. La prevención no
 * existe; lo que puede existir es **darse cuenta**. Esto calcula el conjunto que
 * el centinela comprueba, sin listar el bucket: las claves se calculan, igual
 * que las de la purga.
 *
 * `primeraCopia` evita la alarma falsa obvia: antes de esa fecha no hay nada que
 * echar en falta porque nunca hubo nada. **Ayer y no hoy**: la copia de hoy
 * puede estar subiéndose mientras esto corre.
 */
export function clavesVigentes(
  hoy: Date,
  primeraCopia: Date,
  retencion: Record<Generacion, number> = RETENCION,
): string[] {
  const claves: string[] = [];
  for (let dias = 1; dias <= retencion.diaria; dias++) {
    const dia = new Date(hoy.getTime() - dias * 86_400_000);
    if (dia < primeraCopia) continue;
    // Solo la pieza de base de datos: los volúmenes solo existen si
    // `BACKUP_VOLUME_PATHS` estaba declarado ese día, y echarlos en falta cuando
    // nunca se subieron sería la alarma falsa que hace que se ignoren todas.
    claves.push(claveDe("diaria", fechaDe(dia), "base-de-datos"));
  }
  return claves;
}

/**
 * Las claves que **caducaron** en una generación, calculadas sin listar nada.
 *
 * Se mira una ventana generosa hacia atrás —el doble de la retención— y se
 * devuelven las fechas que quedan fuera del borde. Borrar una clave inexistente
 * es un no-op, así que pedir de más no cuesta corrección: cuesta unas
 * operaciones de borrado, que es la partida que R2 mide (D-21) y por eso la
 * ventana se acota en vez de barrer desde el principio de los tiempos.
 */
export function clavesCaducadas(
  generacion: Generacion,
  hoy: Date,
  retencion: Record<Generacion, number> = RETENCION,
): string[] {
  const borde = diasDeRetencion(generacion, retencion);
  const claves: string[] = [];
  for (let dias = borde + 1; dias <= borde * 2; dias++) {
    const dia = new Date(hoy.getTime() - dias * 86_400_000);
    if (generacion === "semanal" && dia.getUTCDay() !== 1) continue;
    if (generacion === "mensual" && dia.getUTCDate() !== 1) continue;
    const fecha = fechaDe(dia);
    claves.push(claveDe(generacion, fecha, "base-de-datos"), claveDe(generacion, fecha, "volumenes"));
  }
  return claves;
}
