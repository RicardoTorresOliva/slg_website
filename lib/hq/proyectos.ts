/**
 * proyectos.ts — Crear y editar proyectos desde HQ (DU-14 · RF-79 · RF-86).
 *
 * AQUÍ VIVE «ASIGNADOS», la fila más delicada de B.3. `slg_operator` opera
 * **solo sobre los proyectos que tiene asignados**, y la matriz no puede
 * comprobarlo sola: `puede()` recibe la prueba, no la busca. Así que la prueba
 * se resuelve **contra la base de datos** —`project.owner_user_id`— antes de
 * preguntar, y sin prueba el silencio vale «no».
 *
 * Es el punto exacto donde un `asignado: true` escrito por comodidad convierte
 * a cualquier operador en administrador sin que nada falle. Por eso la
 * resolución está en una función sola, `estaAsignado()`, y por eso `test:hq`
 * comprueba los dos lados: que el asignado puede y que el no asignado no.
 */
import { and, desc, eq } from "drizzle-orm";

import { exigir } from "../auth/matriz.ts";
import { conAuditoria } from "../auditoria/index.ts";
import type { AuthContext } from "../db/context.ts";
import { organization, project, PROJECT_STATUS } from "../db/schema.ts";
import { withScope } from "../db/scope.ts";

import { DatoInvalido } from "./empresas.ts";
import { esServicioLiteral } from "./servicios.ts";

/** Del esquema, por lo mismo que en `empresas.ts`: una sola lista. */
export const ESTADOS_DE_PROYECTO = PROJECT_STATUS;

export type Proyecto = {
  readonly id: string;
  readonly organizationId: string;
  readonly empresa: string;
  readonly nombre: string;
  readonly servicio: string;
  readonly estado: string;
  readonly responsableId: string | null;
  readonly empiezaEn: string | null;
  readonly terminaEn: string | null;
};

export type DatosDeProyecto = {
  readonly organizationId: string;
  readonly nombre: string;
  /** **Nomenclatura literal, exacta** (RF-79). Nada de texto libre. */
  readonly servicio: string;
  readonly estado: string;
  readonly responsableId?: string | null;
  readonly empiezaEn?: string | null;
  readonly terminaEn?: string | null;
};

/**
 * ¿Este actor tiene ESTE proyecto asignado?
 *
 * Se consulta con el contexto del propio actor: si la política de fila no le
 * deja ver el proyecto, la consulta no devuelve nada y la respuesta es «no»,
 * que es la respuesta correcta por partida doble.
 */
export async function estaAsignado(ctx: AuthContext, projectId: string): Promise<boolean> {
  if (ctx.actorType !== "user") return false;
  const filas = await withScope(ctx, (db) =>
    db
      .select({ id: project.id })
      .from(project)
      .where(and(eq(project.id, projectId), eq(project.ownerUserId, ctx.actorId ?? "")))
      .limit(1),
  );
  return filas.length > 0;
}

function fecha(valor: string | null | undefined): Date | null {
  if (!valor) return null;
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? null : d;
}

function validar(datos: DatosDeProyecto): string | null {
  if (!datos.organizationId) return "empresa";
  if (!datos.nombre.trim()) return "nombre";
  // El corazón del criterio 2: exacto o nada.
  if (!esServicioLiteral(datos.servicio)) return "servicio";
  if (!(ESTADOS_DE_PROYECTO as readonly string[]).includes(datos.estado)) return "estado";
  const inicio = fecha(datos.empiezaEn);
  const fin = fecha(datos.terminaEn);
  if (inicio && fin && fin < inicio) return "fechas";
  return null;
}

export async function proyectos(ctx: AuthContext): Promise<Proyecto[]> {
  exigir(ctx, "org.read");
  const filas = await withScope(ctx, (db) =>
    db
      .select({
        id: project.id,
        organizationId: project.organizationId,
        empresa: organization.name,
        nombre: project.name,
        servicio: project.service,
        estado: project.status,
        responsableId: project.ownerUserId,
        empiezaEn: project.startsAt,
        terminaEn: project.endsAt,
      })
      .from(project)
      .innerJoin(organization, eq(project.organizationId, organization.id))
      .orderBy(desc(project.createdAt)),
  );
  return filas.map((f) => ({
    ...f,
    empiezaEn: f.empiezaEn?.toISOString().slice(0, 10) ?? null,
    terminaEn: f.terminaEn?.toISOString().slice(0, 10) ?? null,
  }));
}

export async function crearProyecto(ctx: AuthContext, datos: DatosDeProyecto): Promise<string> {
  const id = crypto.randomUUID();
  return conAuditoria(
    ctx,
    { accion: "project.create", entidad: "project", entidadId: id, organizationId: datos.organizationId },
    async () => {
      // Un proyecto que no existe no está asignado a nadie: crear es de admin.
      exigir(ctx, "project.write", { asignado: false });

      const malo = validar(datos);
      if (malo) throw new DatoInvalido(malo);

      await withScope(ctx, (db) =>
        db.insert(project).values({
          id,
          organizationId: datos.organizationId,
          name: datos.nombre.trim(),
          service: datos.servicio,
          status: datos.estado,
          ownerUserId: datos.responsableId ?? null,
          startsAt: fecha(datos.empiezaEn),
          endsAt: fecha(datos.terminaEn),
        }),
      );
      return id;
    },
  );
}

export async function editarProyecto(
  ctx: AuthContext,
  id: string,
  datos: DatosDeProyecto,
): Promise<void> {
  // La prueba de asignación se resuelve **antes** de preguntar, y contra la
  // base. Pasarla como parámetro desde la pantalla sería dejar que el cliente
  // decidiera si está asignado.
  const asignado = await estaAsignado(ctx, id);
  await conAuditoria(
    ctx,
    { accion: "project.update", entidad: "project", entidadId: id, organizationId: datos.organizationId },
    async () => {
      exigir(ctx, "project.write", { asignado });

      const malo = validar(datos);
      if (malo) throw new DatoInvalido(malo);

      await withScope(ctx, (db) =>
        db
          .update(project)
          .set({
            name: datos.nombre.trim(),
            service: datos.servicio,
            status: datos.estado,
            ownerUserId: datos.responsableId ?? null,
            startsAt: fecha(datos.empiezaEn),
            endsAt: fecha(datos.terminaEn),
          })
          .where(eq(project.id, id)),
      );
    },
  );
}
