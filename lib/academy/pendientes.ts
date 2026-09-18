/**
 * pendientes.ts — Obligaciones pendientes de un proyecto (DU-30 · RF-151 ·
 * RF-152 · RF-156).
 *
 * **UN PENDIENTE ES UNA OBLIGACIÓN DEL CONTRATO** —«envíanos el organigrama
 * antes del 30»—, no una tarea evaluable. No tiene nota, ni porcentaje, ni
 * persona a la que medir: frontera (b) de `scope.md`.
 *
 * **`closes_by` DICE QUIÉN PUEDE CERRARLO, Y SE DECIDE AQUÍ, NO EN LA PANTALLA**
 * (RF-151). Ocultar el botón no autoriza nada (criterio 2 de FU-06): el portal
 * puede enseñar «marcar como hecho» solo en los del cliente, pero es
 * `cerrarPendiente()` quien rechaza —y audita— el intento de cerrar uno de SLG.
 *
 * **QUIÉN LO CERRÓ ES PARTE DEL HECHO.** `done_at` y `done_by_*` se rellenan del
 * contexto (RF-111), nunca de un parámetro, y `action_item_done_is_complete` en
 * la base impide un cierre sin actor.
 *
 * La empresa sale del proyecto y «asignados» se resuelve con `estaAsignado()`,
 * exactamente como en los hitos.
 */
import { and, asc, eq, sql } from "drizzle-orm";

import { exigir, puede } from "../auth/matriz.ts";
import type { AuthContext } from "../db/context.ts";
import { ACTION_ITEM_CLOSER, ACTION_ITEM_STATUS, actionItem, project } from "../db/schema.ts";
import { withScope } from "../db/scope.ts";
import { DatoInvalido } from "../hq/empresas.ts";
import { estaAsignado } from "../hq/proyectos.ts";

import { conApunte, fecha, MAXIMO_TITULO } from "./comun.ts";

export const QUIEN_CIERRA = ACTION_ITEM_CLOSER;
export const ESTADOS_DE_PENDIENTE = ACTION_ITEM_STATUS;
export type QuienCierra = (typeof ACTION_ITEM_CLOSER)[number];
export type EstadoDePendiente = (typeof ACTION_ITEM_STATUS)[number];

export type Pendiente = {
  readonly id: string;
  readonly projectId: string;
  readonly organizationId: string;
  readonly titulo: string;
  readonly venceEn: string | null;
  readonly estado: EstadoDePendiente;
  readonly cierra: QuienCierra;
  readonly hechoEn: string | null;
  readonly hechoPorTipo: string | null;
  readonly hechoPorId: string | null;
  readonly hechoPor: string | null;
  readonly creadoEn: string;
  readonly actualizadoEn: string;
};

export type DatosDePendiente = {
  readonly projectId: string;
  readonly titulo: string;
  readonly venceEn?: string | Date | null;
  readonly cierra: QuienCierra;
};

function validar(datos: DatosDePendiente): string | null {
  if (!datos.projectId) return "proyecto";
  const titulo = datos.titulo?.trim() ?? "";
  if (!titulo || titulo.length > MAXIMO_TITULO) return "titulo";
  if (datos.venceEn !== undefined && datos.venceEn !== null && datos.venceEn !== "" && !fecha(datos.venceEn)) return "fecha";
  if (!(QUIEN_CIERRA as readonly string[]).includes(datos.cierra)) return "cierra";
  return null;
}

function aPendiente(f: typeof actionItem.$inferSelect): Pendiente {
  return {
    id: f.id,
    projectId: f.projectId,
    organizationId: f.organizationId,
    titulo: f.title,
    venceEn: f.dueAt?.toISOString() ?? null,
    estado: f.status as EstadoDePendiente,
    cierra: f.closesBy as QuienCierra,
    hechoEn: f.doneAt?.toISOString() ?? null,
    hechoPorTipo: f.doneByType,
    hechoPorId: f.doneById,
    hechoPor: f.doneByLabel,
    creadoEn: f.createdAt.toISOString(),
    actualizadoEn: f.updatedAt.toISOString(),
  };
}

async function proyectoDe(ctx: AuthContext, projectId: string) {
  const filas = await withScope(ctx, (db) =>
    db.select({ id: project.id, organizationId: project.organizationId }).from(project).where(eq(project.id, projectId)).limit(1),
  );
  return filas[0] ?? null;
}

async function pendienteEnAlcance(ctx: AuthContext, id: string) {
  const filas = await withScope(ctx, (db) => db.select().from(actionItem).where(eq(actionItem.id, id)).limit(1));
  return filas[0] ?? null;
}

/**
 * Quién cierra, según `closes_by`:
 *   · `slg`    → solo quien escribe pendientes (`action_item.write`): SLG sobre
 *                sus proyectos, o una clave con `milestones:write`. Un cliente
 *                recibe 403 y el intento queda auditado (criterio 1 de DU-27).
 *   · `client` → quien tenga `action_item.close` —todos los de la empresa— **o**
 *                quien pueda escribir pendientes. Lo segundo existe porque B.3
 *                no da alcance de agente a `action_item.close`: una clave con
 *                `milestones:write` cierra cualquiera, que es lo que pide RF-153.
 */
function exigirCierre(ctx: AuthContext, cierra: string, asignado: boolean): void {
  if (cierra === "client" && puede(ctx, "action_item.close").permitido) return;
  exigir(ctx, "action_item.write", { asignado });
}

export async function pendientesDeProyecto(ctx: AuthContext, projectId: string): Promise<Pendiente[]> {
  exigir(ctx, "milestone.read");
  const filas = await withScope(ctx, (db) =>
    db
      .select()
      .from(actionItem)
      .where(eq(actionItem.projectId, projectId))
      .orderBy(sql`${actionItem.dueAt} asc nulls last`, asc(actionItem.createdAt), asc(actionItem.id)),
  );
  return filas.map(aPendiente);
}

/** Los abiertos por fecha límite, los sin fecha al final: el bloque de «Hoy». */
export async function pendientesAbiertos(ctx: AuthContext, organizationId?: string): Promise<Pendiente[]> {
  exigir(ctx, "milestone.read");
  const filas = await withScope(ctx, (db) =>
    db
      .select()
      .from(actionItem)
      .where(
        and(
          eq(actionItem.status, "open"),
          organizationId ? eq(actionItem.organizationId, organizationId) : undefined,
        ),
      )
      .orderBy(sql`${actionItem.dueAt} asc nulls last`, asc(actionItem.createdAt), asc(actionItem.id)),
  );
  return filas.map(aPendiente);
}

export async function crearPendiente(ctx: AuthContext, datos: DatosDePendiente): Promise<Pendiente> {
  const id = crypto.randomUUID();
  const proyecto = await proyectoDe(ctx, datos.projectId);
  if (!proyecto) throw new DatoInvalido("proyecto");
  const asignado = await estaAsignado(ctx, datos.projectId);
  return conApunte(
    ctx,
    { accion: "action_item.create", entidad: "action_item", entidadId: id, organizationId: proyecto.organizationId },
    async () => {
      exigir(ctx, "action_item.write", { asignado });

      const malo = validar(datos);
      if (malo) throw new DatoInvalido(malo);

      const [fila] = await withScope(ctx, (db) =>
        db
          .insert(actionItem)
          .values({
            id,
            projectId: datos.projectId,
            organizationId: proyecto.organizationId,
            title: datos.titulo.trim(),
            dueAt: fecha(datos.venceEn),
            status: "open",
            closesBy: datos.cierra,
          })
          .returning(),
      );
      if (!fila) throw new DatoInvalido("proyecto");
      return aPendiente(fila);
    },
  );
}

/**
 * Cierra un pendiente. `null` cuando no existe para este actor. Repetirlo no
 * cambia nada: el primer cierre es el hecho, y un reintento no lo reescribe.
 */
export async function cerrarPendiente(ctx: AuthContext, id: string): Promise<Pendiente | null> {
  const actual = await pendienteEnAlcance(ctx, id);
  if (!actual) return null;
  const asignado = await estaAsignado(ctx, actual.projectId);
  return conApunte(
    ctx,
    { accion: "action_item.close", entidad: "action_item", entidadId: id, organizationId: actual.organizationId },
    async () => {
      exigirCierre(ctx, actual.closesBy, asignado);
      if (actual.status === "done") return aPendiente(actual);

      const ahora = new Date();
      const [fila] = await withScope(ctx, (db) =>
        db
          .update(actionItem)
          .set({
            status: "done",
            doneAt: ahora,
            // Del contexto, nunca de un parámetro (RF-111).
            doneByType: ctx.actorType,
            doneById: ctx.actorId,
            doneByLabel: ctx.actorLabel,
            updatedAt: ahora,
          })
          .where(eq(actionItem.id, id))
          .returning(),
      );
      if (!fila) throw new DatoInvalido("pendiente");
      return aPendiente(fila);
    },
  );
}

/** Reabrir es escribir: solo SLG o una clave con `milestones:write`. */
export async function reabrirPendiente(ctx: AuthContext, id: string): Promise<Pendiente | null> {
  const actual = await pendienteEnAlcance(ctx, id);
  if (!actual) return null;
  const asignado = await estaAsignado(ctx, actual.projectId);
  return conApunte(
    ctx,
    { accion: "action_item.reopen", entidad: "action_item", entidadId: id, organizationId: actual.organizationId },
    async () => {
      exigir(ctx, "action_item.write", { asignado });
      if (actual.status === "open") return aPendiente(actual);

      const [fila] = await withScope(ctx, (db) =>
        db
          .update(actionItem)
          .set({
            status: "open",
            doneAt: null,
            doneByType: null,
            doneById: null,
            doneByLabel: null,
            updatedAt: new Date(),
          })
          .where(eq(actionItem.id, id))
          .returning(),
      );
      if (!fila) throw new DatoInvalido("pendiente");
      return aPendiente(fila);
    },
  );
}
