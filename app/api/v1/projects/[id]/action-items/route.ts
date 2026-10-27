import { buscarRuta } from "@/lib/api/catalogo";
import { crearPendientePorApi } from "@/lib/api/escrituras";
import { manejar } from "@/lib/api/manejador";
import { identificadorDeRuta } from "@/lib/api/validador";

/**
 * `POST /api/v1/projects/{id}/action-items` — pendiente de un proyecto (DU-30 ·
 * RF-151 · RF-153 · alcance `milestones:write`).
 *
 * **`closes_by` es obligatorio y sin defecto.** Decide en el servidor quién
 * puede cerrarlo —el cliente solo los suyos (RF-151)—, y una decisión con esa
 * consecuencia no se toma por omisión. La empresa sale del proyecto.
 */
export const dynamic = "force-dynamic";

const RUTA = buscarRuta("POST", "/api/v1/projects/{id}/action-items");

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return manejar(request, { ruta: RUTA, apunte: "action_item.create", entidad: "action_item" }, async (ctx, c) => {
    const { id } = await params;
    const r = await crearPendientePorApi(ctx, {
      projectId: identificadorDeRuta(id),
      titulo: c.title as string,
      venceEn: (c.due_at as Date | undefined) ?? null,
      cierra: c.closes_by as "client" | "slg",
    });
    return {
      cuerpo: r.cuerpo,
      estado: 201,
      organizationId: r.organizationId,
      entidadId: (r.cuerpo.data as { id: string }).id,
    };
  });
}
