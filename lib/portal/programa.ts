/**
 * programa.ts — La pantalla «Programa» del portal, en datos (DU-27 · RF-151).
 *
 * **CERO INCERTIDUMBRE, DICHO EN FORMA DE TIPO.** `ProgramaDeProyecto` lleva
 * siempre `siguiente`: el próximo hito pendiente o `null`. Nunca «no hay campo»:
 * la pantalla tiene que poder decir «qué sigue» de cada proyecto activo, y si
 * no hay nada que seguir, decirlo con esas palabras (criterio 2 de DU-27) — el
 * cliente que abre esta pantalla y no encuentra nada no ha aprendido nada, y esa
 * es exactamente la incertidumbre que la Academy existe para quitar.
 *
 * **NADA DE `organizationId` EN ESTE ARCHIVO.** Los hitos y pendientes salen de
 * `lib/academy` con el contexto de la sesión y la política de fila acota; un
 * proyecto que no es de la empresa no llega aquí. La prueba lo comprueba
 * leyendo el archivo, como en `hoy.ts`.
 *
 * Lo que se decide aquí es PURO y está separado a propósito: partir los hitos
 * en hechos / siguiente / futuros y los pendientes en abiertos (los del cliente
 * primero) / cerrados es lo que la prueba puede afirmar sin servidor.
 */
import type { Hito, Pendiente } from "../academy/index.ts";
import { hitosDeProyecto, pendientesDeProyecto } from "../academy/index.ts";
import type { AuthContext } from "../db/context.ts";

import { proyectosDelCliente, type ProyectoDelCliente } from "./proyectos.ts";

export type HitosDeProyecto = {
  readonly hechos: readonly Hito[];
  /** El próximo pendiente por fecha. `null` = «sin hitos programados». */
  readonly siguiente: Hito | null;
  readonly futuros: readonly Hito[];
};

export type PendientesDeProyecto = {
  /** Abiertos: los que cierra el cliente primero, luego los de SLG; por fecha dentro de cada grupo. */
  readonly abiertos: readonly Pendiente[];
  readonly cerrados: readonly Pendiente[];
};

export type ProgramaDeProyecto = {
  readonly proyecto: ProyectoDelCliente;
  readonly hitos: HitosDeProyecto;
  readonly pendientes: PendientesDeProyecto;
};

/** Por posición manual y, a igual posición, por fecha: es el orden que SLG escribió. */
function porPosicionYFecha(a: Hito, b: Hito): number {
  return a.posicion - b.posicion || a.venceEn.localeCompare(b.venceEn);
}

export function repartirHitos(hitos: readonly Hito[]): HitosDeProyecto {
  const ordenados = [...hitos].sort(porPosicionYFecha);
  const hechos = ordenados.filter((h) => h.estado === "done");
  // «Siguiente» es el pendiente que vence antes, no el de menor posición: si SLG
  // reordenó a mano, la fecha sigue siendo lo que el cliente tiene en el calendario.
  const pendientes = ordenados.filter((h) => h.estado !== "done").sort((a, b) => a.venceEn.localeCompare(b.venceEn));
  const [siguiente = null, ...futuros] = pendientes;
  return { hechos, siguiente, futuros };
}

/** Sin fecha al final: un pendiente sin plazo no puede adelantarse a uno con plazo. */
function porFechaLimite(a: Pendiente, b: Pendiente): number {
  if (a.venceEn && b.venceEn) return a.venceEn.localeCompare(b.venceEn);
  if (a.venceEn) return -1;
  if (b.venceEn) return 1;
  return a.creadoEn.localeCompare(b.creadoEn);
}

export function repartirPendientes(pendientes: readonly Pendiente[]): PendientesDeProyecto {
  const abiertos = pendientes.filter((p) => p.estado === "open");
  const delCliente = abiertos.filter((p) => p.cierra === "client").sort(porFechaLimite);
  const deSlg = abiertos.filter((p) => p.cierra !== "client").sort(porFechaLimite);
  const cerrados = pendientes
    .filter((p) => p.estado === "done")
    .sort((a, b) => (b.hechoEn ?? "").localeCompare(a.hechoEn ?? ""));
  return { abiertos: [...delCliente, ...deSlg], cerrados };
}

/**
 * Un bloque por proyecto **activo**, en el orden en que el portal lista los
 * proyectos. Un proyecto pausado o cerrado no tiene «qué sigue»: no se pinta.
 */
export async function programaDelCliente(ctx: AuthContext): Promise<ProgramaDeProyecto[]> {
  const proyectos = (await proyectosDelCliente(ctx)).filter((p) => p.estado === "active");
  return Promise.all(
    proyectos.map(async (proyecto) => {
      const [hitos, pendientes] = await Promise.all([
        hitosDeProyecto(ctx, proyecto.id),
        pendientesDeProyecto(ctx, proyecto.id),
      ]);
      return { proyecto, hitos: repartirHitos(hitos), pendientes: repartirPendientes(pendientes) };
    }),
  );
}
