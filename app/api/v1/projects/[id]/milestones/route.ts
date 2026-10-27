import { buscarRuta } from "@/lib/api/catalogo";
import { crearHitoPorApi } from "@/lib/api/escrituras";
import { manejar } from "@/lib/api/manejador";
import { identificadorDeRuta } from "@/lib/api/validador";

/**
 * `POST /api/v1/projects/{id}/milestones` — hito de entrega de un proyecto
 * (DU-30 · RF-151 · RF-153 · alcance `milestones:write`).
 *
 * **La empresa del hito no viaja en el cuerpo**: sale del proyecto, que se
 * resuelve con el contexto de la clave. Un proyecto ajeno o inexistente es 404,
 * y un hito nace siempre `pending`: hacerlo es otro acto (`/done`).
 */
export const dynamic = "force-dynamic";

const RUTA = buscarRuta("POST", "/api/v1/projects/{id}/milestones");

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return manejar(request, { ruta: RUTA, apunte: "milestone.create", entidad: "milestone" }, async (ctx, c) => {
    const { id } = await params;
    const r = await crearHitoPorApi(ctx, {
      projectId: identificadorDeRuta(id),
      titulo: c.title as string,
      venceEn: c.due_at as Date,
      posicion: (c.position as number | undefined) ?? null,
    });
    return {
      cuerpo: r.cuerpo,
      estado: 201,
      organizationId: r.organizationId,
      entidadId: (r.cuerpo.data as { id: string }).id,
    };
  });
}
