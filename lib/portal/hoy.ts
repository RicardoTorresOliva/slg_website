/**
 * hoy.ts — Los cinco bloques de la portada del portal, **de la empresa del
 * usuario** (DU-26 · RF-149 · RF-150 · RF-88).
 *
 * **NO SE LE PASA NINGÚN `organization_id`**, y eso es la unidad entera. Cada
 * puerta que se llama aquí —`noticias`, `proximosHitos`, `pendientesAbiertos`,
 * `entregablesDelCliente`, `avisos`— acota por la política de fila con el
 * contexto de la sesión. Las tres de `lib/academy` admiten un `organizationId`
 * opcional porque HQ lo necesita; aquí **no se escribe nunca**, y `test:hoy`
 * barre este archivo para que siga sin escribirse: un filtro opcional es un
 * filtro que alguien acaba pasando, y pasarlo desde el portal es el camino a
 * enseñar la empresa de al lado.
 *
 * **LO QUE DECIDE ESTE MÓDULO ES EL ORDEN Y EL RECORTE, NO EL ACCESO.** Las
 * funciones puras de arriba son la redacción de «Hoy»: qué es «de hoy», qué
 * hito es «el próximo» de cada proyecto, qué pendiente va primero. Viven aparte
 * de la página para poder probarse sin sesión ni HTTP, y porque una página de
 * Next no puede exportar nada que no sea una página.
 *
 * **«HOY» ES EL DÍA DEL CALENDARIO EN UTC**, el mismo que la pantalla enseña al
 * recortar `publicadaEn` a diez caracteres. Si se usara la zona del servidor, la
 * fecha impresa y la condición «de hoy» podrían discrepar a medianoche, y una
 * noticia saldría como «de hoy» con la fecha de ayer al lado.
 */
import {
  noticias,
  pendientesAbiertos,
  proximosHitos,
  type Hito,
  type Noticia,
  type Pendiente,
} from "../academy/index.ts";
import type { AuthContext } from "../db/context.ts";
import { avisos, type Aviso } from "../hq/avisos.ts";
import { entregablesDelCliente, type Entregable } from "../hq/entregables.ts";

import { proyectosDelCliente, type ProyectoDelCliente } from "./proyectos.ts";

/** Cuántas filas enseña cada bloque de «últimos». Tres: es una portada, no una lista. */
export const ULTIMOS = 3;

export type NoticiasDeHoy = {
  /** `true` si hay al menos una publicada hoy; `false` si se enseñan las últimas. */
  readonly deHoy: boolean;
  readonly lista: readonly Noticia[];
};

export type HitoDeProyecto = {
  readonly proyecto: ProyectoDelCliente;
  readonly hito: Hito;
};

export type PendienteDeProyecto = {
  readonly proyecto: ProyectoDelCliente | null;
  readonly pendiente: Pendiente;
};

export type EntregableDeProyecto = {
  readonly proyecto: ProyectoDelCliente | null;
  readonly entregable: Entregable;
};

export type Hoy = {
  readonly noticias: NoticiasDeHoy;
  readonly hitos: readonly HitoDeProyecto[];
  readonly pendientes: readonly PendienteDeProyecto[];
  readonly entregables: readonly EntregableDeProyecto[];
  readonly avisos: readonly Aviso[];
};

const diaDe = (iso: string) => iso.slice(0, 10);

/**
 * Las noticias publicadas hoy, en el orden en que llegan —importancia primero,
 * que es el de `noticias()`—; y si hoy no hay ninguna, **las últimas tres por
 * fecha** (criterio 2 de DU-26). Un hueco en el primer bloque de la portada es
 * la razón para no abrirla mañana.
 */
export function noticiasDeHoy(todas: readonly Noticia[], ahora: Date = new Date()): NoticiasDeHoy {
  const hoy = diaDe(ahora.toISOString());
  const publicadas = todas.filter((n) => n.publicadaEn !== null);
  const deHoy = publicadas.filter((n) => diaDe(n.publicadaEn!) === hoy);
  if (deHoy.length > 0) return { deHoy: true, lista: deHoy };
  const ultimas = [...publicadas].sort((a, b) => b.publicadaEn!.localeCompare(a.publicadaEn!)).slice(0, ULTIMOS);
  return { deHoy: false, lista: ultimas };
}

/**
 * El próximo hito de **cada proyecto activo**: el primero por fecha entre los
 * pendientes (`proximosHitos()` ya viene por fecha). Un proyecto activo sin hito
 * no aparece aquí; la pantalla dice «sin hitos programados» cuando no queda
 * ninguno, y «Programa» (DU-27) lo dice proyecto a proyecto.
 */
export function proximoHitoPorProyecto(
  hitos: readonly Hito[],
  proyectos: readonly ProyectoDelCliente[],
): HitoDeProyecto[] {
  const salida: HitoDeProyecto[] = [];
  for (const proyecto of proyectos) {
    if (proyecto.estado !== "active") continue;
    const hito = hitos.find((h) => h.projectId === proyecto.id);
    if (hito) salida.push({ proyecto, hito });
  }
  return salida.sort((a, b) => a.hito.venceEn.localeCompare(b.hito.venceEn));
}

/**
 * Los pendientes abiertos, **los que cierra el cliente primero**: son los que
 * le piden algo a quien está mirando. Dentro de cada grupo se respeta el orden
 * de llegada, que ya es por fecha límite con los sin fecha al final.
 */
export function ordenarPendientes(
  pendientes: readonly Pendiente[],
  proyectos: readonly ProyectoDelCliente[],
): PendienteDeProyecto[] {
  const porId = new Map(proyectos.map((p) => [p.id, p] as const));
  const conProyecto = pendientes.map((pendiente) => ({ pendiente, proyecto: porId.get(pendiente.projectId) ?? null }));
  const delCliente = conProyecto.filter((p) => p.pendiente.cierra === "client");
  const deSlg = conProyecto.filter((p) => p.pendiente.cierra !== "client");
  return [...delCliente, ...deSlg];
}

/** Los tres más recientes; `entregablesDelCliente()` ya viene del más nuevo al más viejo. */
export function ultimosEntregables(
  entregables: readonly Entregable[],
  proyectos: readonly ProyectoDelCliente[],
): EntregableDeProyecto[] {
  const porId = new Map(proyectos.map((p) => [p.id, p] as const));
  return entregables
    .slice(0, ULTIMOS)
    .map((entregable) => ({ entregable, proyecto: porId.get(entregable.projectId) ?? null }));
}

/**
 * Los cinco bloques, por sus cinco puertas y sin ningún `organization_id`.
 * Secuencial y no en paralelo a propósito: cada puerta abre su propia
 * transacción acotada, y encadenarlas es lo que hace el resto del portal.
 */
export async function bloquesDeHoy(ctx: AuthContext): Promise<Hoy> {
  const proyectos = await proyectosDelCliente(ctx);
  const todasLasNoticias = await noticias(ctx, { soloPublicadas: true });
  const hitos = await proximosHitos(ctx);
  const pendientes = await pendientesAbiertos(ctx);
  const entregables = await entregablesDelCliente(ctx);
  const todosLosAvisos = await avisos(ctx);

  return {
    noticias: noticiasDeHoy(todasLasNoticias),
    hitos: proximoHitoPorProyecto(hitos, proyectos),
    pendientes: ordenarPendientes(pendientes, proyectos),
    entregables: ultimosEntregables(entregables, proyectos),
    avisos: todosLosAvisos.slice(0, ULTIMOS),
  };
}
