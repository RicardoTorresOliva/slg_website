/**
 * proyectos.ts — Los proyectos **de la empresa del usuario** (DU-19 · RF-89).
 *
 * Existe como módulo propio y no como un `if` dentro de `lib/hq/proyectos.ts`
 * por la misma razón que `entregablesDelCliente` es otra función y no un
 * parámetro (**D-118**): **un filtro opcional es un filtro que alguien olvida
 * pasar**, y aquí el olvido enseña el trabajo de un cliente a otro.
 *
 * La consulta no lleva ningún `organization_id`: lo acota la política de fila
 * con el contexto de la sesión. No hay parámetro que cruzar.
 */
import { desc, eq } from "drizzle-orm";

import { exigir } from "../auth/matriz.ts";
import type { AuthContext } from "../db/context.ts";
import { project } from "../db/schema.ts";
import { withScope } from "../db/scope.ts";

export type ProyectoDelCliente = {
  readonly id: string;
  readonly nombre: string;
  readonly servicio: string;
  readonly estado: string;
};

export async function proyectosDelCliente(ctx: AuthContext): Promise<ProyectoDelCliente[]> {
  exigir(ctx, "deliverable.read");
  return withScope(ctx, (db) =>
    db
      .select({
        id: project.id,
        nombre: project.name,
        servicio: project.service,
        estado: project.status,
      })
      .from(project)
      .orderBy(desc(project.createdAt)),
  );
}

/** Un proyecto concreto, o `null` si no es de esta empresa. */
export async function proyectoDelCliente(
  ctx: AuthContext,
  id: string,
): Promise<ProyectoDelCliente | null> {
  exigir(ctx, "deliverable.read");
  const filas = await withScope(ctx, (db) =>
    db
      .select({
        id: project.id,
        nombre: project.name,
        servicio: project.service,
        estado: project.status,
      })
      .from(project)
      .where(eq(project.id, id))
      .limit(1),
  );
  return filas[0] ?? null;
}
