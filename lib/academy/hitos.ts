/**
 * hitos.ts — Hitos de **entrega** de un proyecto (DU-30 · RF-151 · RF-152 ·
 * RF-156).
 *
 * **UN HITO ES UNA FECHA DE ENTREGA, NO UNA LECCIÓN.** Título, fecha, hecho o
 * no, y orden. No mide a nadie: no hay porcentaje, ni participante, ni nota. Es
 * la frontera (b) de `scope.md`, y `check:alcance` la vigila también sobre esta
 * tabla (fixture 9998). Si alguien necesita «cuánto lleva el cliente», la
 * respuesta es la lista de hitos hechos y por hacer, que ya está aquí.
 *
 * **LA EMPRESA SALE DEL PROYECTO, NUNCA DE UN PARÁMETRO.** Se consulta el
 * proyecto dentro del alcance del actor y se copia su `organization_id`: así
 * un hito no puede quedar colgado de una empresa que no es la de su proyecto,
 * y un proyecto que la política de fila no devuelve es, para quien pregunta,
 * un proyecto que no existe.
 *
 * **HECHO ⇔ CON FECHA.** Lo impone `milestone_done_has_date` en la base. Pasar a
 * `done` pone `done_at`; volver a `pending` lo quita; repetir el estado no mueve
 * la fecha — un agente que reintenta una llamada cortada no reescribe la
 * historia.
 *
 * Aquí vive «asignados» para `slg_operator`: la prueba se resuelve contra
 * `project.owner_user_id` con `estaAsignado()` (`lib/hq/proyectos.ts`) **antes**
 * de preguntar a la matriz, y sin prueba vale «no».
 */
import { and, asc, eq } from "drizzle-orm";

import { exigir } from "../auth/matriz.ts";
import type { AuthContext } from "../db/context.ts";
import { MILESTONE_STATUS, milestone, project } from "../db/schema.ts";
import { withScope } from "../db/scope.ts";
import { DatoInvalido } from "../hq/empresas.ts";
import { estaAsignado } from "../hq/proyectos.ts";

import { conApunte, fecha, MAXIMO_TITULO } from "./comun.ts";

export const ESTADOS_DE_HITO = MILESTONE_STATUS;
export type EstadoDeHito = (typeof MILESTONE_STATUS)[number];

/** Un orden manual razonable; por encima es un dato equivocado, no un hito. */
const MAXIMO_POSICION = 10_000;

export type Hito = {
  readonly id: string;
  readonly projectId: string;
  readonly organizationId: string;
  readonly titulo: string;
  readonly venceEn: string;
  readonly estado: EstadoDeHito;
  readonly posicion: number;
  readonly hechoEn: string | null;
  readonly creadoEn: string;
  readonly actualizadoEn: string;
};

export type DatosDeHito = {
  readonly projectId: string;
  readonly titulo: string;
  readonly venceEn: string | Date;
  readonly posicion?: number | null;
};

export type CambiosDeHito = {
  readonly titulo?: string;
  readonly venceEn?: string | Date;
  readonly posicion?: number;
  readonly estado?: EstadoDeHito;
};

function esPosicion(valor: unknown): valor is number {
  return typeof valor === "number" && Number.isInteger(valor) && valor >= 0 && valor <= MAXIMO_POSICION;
}

function validar(datos: DatosDeHito): string | null {
  if (!datos.projectId) return "proyecto";
  const titulo = datos.titulo?.trim() ?? "";
  if (!titulo || titulo.length > MAXIMO_TITULO) return "titulo";
  if (!fecha(datos.venceEn)) return "fecha";
  if (datos.posicion !== undefined && datos.posicion !== null && !esPosicion(datos.posicion)) return "posicion";
  return null;
}

function validarCambios(cambios: CambiosDeHito): string | null {
  if (cambios.titulo !== undefined) {
    const titulo = cambios.titulo.trim();
    if (!titulo || titulo.length > MAXIMO_TITULO) return "titulo";
  }
  if (cambios.venceEn !== undefined && !fecha(cambios.venceEn)) return "fecha";
  if (cambios.posicion !== undefined && !esPosicion(cambios.posicion)) return "posicion";
  if (cambios.estado !== undefined && !(ESTADOS_DE_HITO as readonly string[]).includes(cambios.estado)) return "estado";
  return null;
}

function aHito(f: typeof milestone.$inferSelect): Hito {
  return {
    id: f.id,
    projectId: f.projectId,
    organizationId: f.organizationId,
    titulo: f.title,
    venceEn: f.dueAt.toISOString(),
    estado: f.status as EstadoDeHito,
    posicion: f.position,
    hechoEn: f.doneAt?.toISOString() ?? null,
    creadoEn: f.createdAt.toISOString(),
    actualizadoEn: f.updatedAt.toISOString(),
  };
}

/** El proyecto, por la política de fila: ajeno o inexistente da lo mismo. */
async function proyectoDe(ctx: AuthContext, projectId: string) {
  const filas = await withScope(ctx, (db) =>
    db.select({ id: project.id, organizationId: project.organizationId }).from(project).where(eq(project.id, projectId)).limit(1),
  );
  return filas[0] ?? null;
}

async function hitoEnAlcance(ctx: AuthContext, id: string) {
  const filas = await withScope(ctx, (db) => db.select().from(milestone).where(eq(milestone.id, id)).limit(1));
  return filas[0] ?? null;
}

export async function hitosDeProyecto(ctx: AuthContext, projectId: string): Promise<Hito[]> {
  exigir(ctx, "milestone.read");
  const filas = await withScope(ctx, (db) =>
    db
      .select()
      .from(milestone)
      .where(eq(milestone.projectId, projectId))
      .orderBy(asc(milestone.position), asc(milestone.dueAt), asc(milestone.id)),
  );
  return filas.map(aHito);
}

/**
 * Los hitos pendientes por fecha: de ahí sale «el próximo hito de cada proyecto
 * activo» de «Hoy» (RF-149). Sin empresa, un actor de SLG ve los de todas.
 */
export async function proximosHitos(ctx: AuthContext, organizationId?: string): Promise<Hito[]> {
  exigir(ctx, "milestone.read");
  const filas = await withScope(ctx, (db) =>
    db
      .select()
      .from(milestone)
      .where(
        and(
          eq(milestone.status, "pending"),
          organizationId ? eq(milestone.organizationId, organizationId) : undefined,
        ),
      )
      .orderBy(asc(milestone.dueAt), asc(milestone.position), asc(milestone.id)),
  );
  return filas.map(aHito);
}

export async function crearHito(ctx: AuthContext, datos: DatosDeHito): Promise<Hito> {
  const id = crypto.randomUUID();
  // El proyecto primero: la empresa del apunte y del hito sale de él.
  const proyecto = await proyectoDe(ctx, datos.projectId);
  if (!proyecto) throw new DatoInvalido("proyecto");
  const asignado = await estaAsignado(ctx, datos.projectId);
  return conApunte(
    ctx,
    { accion: "milestone.create", entidad: "milestone", entidadId: id, organizationId: proyecto.organizationId },
    async () => {
      exigir(ctx, "milestone.write", { asignado });

      const malo = validar(datos);
      if (malo) throw new DatoInvalido(malo);

      const [fila] = await withScope(ctx, (db) =>
        db
          .insert(milestone)
          .values({
            id,
            projectId: datos.projectId,
            organizationId: proyecto.organizationId,
            title: datos.titulo.trim(),
            dueAt: fecha(datos.venceEn) as Date,
            position: datos.posicion ?? 0,
            status: "pending",
            doneAt: null,
          })
          .returning(),
      );
      if (!fila) throw new DatoInvalido("proyecto");
      return aHito(fila);
    },
  );
}

/**
 * Edita un hito. `null` cuando no existe para este actor: quien llama decide
 * qué significa (la API responde 404 con el mismo cuerpo que si no existiera).
 */
export async function actualizarHito(ctx: AuthContext, id: string, cambios: CambiosDeHito): Promise<Hito | null> {
  const actual = await hitoEnAlcance(ctx, id);
  if (!actual) return null;
  const asignado = await estaAsignado(ctx, actual.projectId);
  return conApunte(
    ctx,
    { accion: "milestone.update", entidad: "milestone", entidadId: id, organizationId: actual.organizationId },
    async () => {
      exigir(ctx, "milestone.write", { asignado });

      const malo = validarCambios(cambios);
      if (malo) throw new DatoInvalido(malo);

      const estado = cambios.estado ?? (actual.status as EstadoDeHito);
      // Hecho ⇔ con fecha (`milestone_done_has_date`). Repetir `done` conserva
      // la fecha original; volver a `pending` la quita.
      const hechoEn = estado === "done" ? (actual.doneAt ?? new Date()) : null;

      const [fila] = await withScope(ctx, (db) =>
        db
          .update(milestone)
          .set({
            title: cambios.titulo !== undefined ? cambios.titulo.trim() : undefined,
            dueAt: cambios.venceEn !== undefined ? (fecha(cambios.venceEn) as Date) : undefined,
            position: cambios.posicion,
            status: estado,
            doneAt: hechoEn,
            updatedAt: new Date(),
          })
          .where(eq(milestone.id, id))
          .returning(),
      );
      if (!fila) throw new DatoInvalido("hito");
      return aHito(fila);
    },
  );
}
