/**
 * materiales.ts — Los **materiales de programa** del cliente (DU-20 · RF-91 ·
 * RF-144).
 *
 * LA FORMA DE ESTE MÓDULO ES EL CRITERIO 2. El criterio dice: «no existe ruta ni
 * entidad que liste materiales fuera del proyecto que los contiene». La manera
 * de hacerlo cierto no es acordarse de pintar el nombre del proyecto en la
 * pantalla: es **no tener ninguna función que devuelva una lista plana de
 * materiales**. Aquí la única puerta devuelve GRUPOS, y cada grupo es un
 * proyecto con sus materiales dentro. No hay tipo de dato en el que quepa un
 * material suelto, así que no hay pantalla que pueda enseñarlo suelto ni por
 * descuido.
 *
 * Es la misma decisión que D-118 llevada un paso más allá: allí se separó la
 * puerta del cliente de la de HQ porque *un filtro opcional es un filtro que
 * alguien olvida pasar*; aquí se separa **la forma del resultado**, porque una
 * agrupación opcional es una agrupación que alguien olvida hacer.
 *
 * POR QUÉ «SEPARADOS» Y NO «EN OTRO SITIO» (criterio 1). Un material de programa
 * cuelga siempre de un proyecto en el modelo —`deliverable.project_id` es NOT
 * NULL— y se presenta aparte de los entregables de trabajo porque son dos cosas
 * distintas para quien las lee: el entregable es *lo que SLG le entregó*, el
 * material es *lo que usa durante el programa*. Mezclarlos hace que el informe
 * que estaba esperando aparezca entre diez anexos.
 *
 * LO QUE ESTE MÓDULO NO TIENE, Y NO ES UN OLVIDO (criterio 4, frontera (b)):
 * no hay lección, ni progreso, ni evaluación, ni certificado. No hay «visto»,
 * no hay porcentaje, no hay orden de consumo. Esto **no es un LMS**: es una
 * lista de archivos que pertenecen a un proyecto. `check:alcance` lo vigila.
 */
import type { AuthContext } from "../db/context.ts";
import type { DeliverableType } from "../db/schema.ts";
import { type Entregable, entregablesDelCliente } from "../hq/entregables.ts";

import { type ProyectoDelCliente, proyectosDelCliente } from "./proyectos.ts";

/** El único tipo que es material de programa. Un valor, no una rama (RF-142). */
export const TIPO_MATERIAL: DeliverableType = "material";

export function esMaterial(tipo: string): boolean {
  return tipo === TIPO_MATERIAL;
}

/**
 * Reparte una lista de entregables en las dos cajas del criterio 1.
 *
 * Existe como función y no como dos `filter` escritos en cada pantalla para que
 * el reparto sea **el mismo en todas**: si mañana un tipo nuevo cuenta como
 * material, se cambia aquí y no hay pantalla que se quede con el reparto viejo.
 */
export function separarMateriales<T extends { readonly tipo: string }>(
  lista: readonly T[],
): { readonly deProyecto: T[]; readonly materiales: T[] } {
  const deProyecto: T[] = [];
  const materiales: T[] = [];
  for (const e of lista) (esMaterial(e.tipo) ? materiales : deProyecto).push(e);
  return { deProyecto, materiales };
}

/** Un proyecto **con** sus materiales. Nunca los materiales por su cuenta. */
export type MaterialesDeProyecto = {
  readonly proyecto: ProyectoDelCliente;
  readonly materiales: readonly Entregable[];
};

/**
 * Los materiales de la empresa del usuario, **agrupados por su proyecto**.
 *
 * No recibe ningún `organization_id`: lo acota la política de fila con el
 * contexto de la sesión (D-127). Un material de otra empresa no sale de aquí
 * aunque se pida — y como la pantalla de detalle es la de entregables, que ya
 * responde 404 a lo que la consulta no devuelve, el criterio 5 («material de
 * otra empresa → 404») se cumple sin comprobación aparte.
 *
 * Los proyectos **sin materiales no aparecen**: la pantalla es de materiales, y
 * un proyecto vacío ahí solo sería ruido. El estado «sin materiales» lo resuelve
 * la pantalla cuando no queda ningún grupo.
 */
export async function materialesPorProyecto(ctx: AuthContext): Promise<MaterialesDeProyecto[]> {
  const proyectos = await proyectosDelCliente(ctx);
  const todos = await entregablesDelCliente(ctx);
  const materiales = todos.filter((e) => esMaterial(e.tipo));

  return proyectos
    .map((proyecto) => ({
      proyecto,
      materiales: materiales.filter((m) => m.projectId === proyecto.id),
    }))
    .filter((g) => g.materiales.length > 0);
}
