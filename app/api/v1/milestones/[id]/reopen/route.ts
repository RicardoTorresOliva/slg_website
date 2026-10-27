import { buscarRuta } from "@/lib/api/catalogo";
import { cambiarEstadoDeHitoPorApi } from "@/lib/api/escrituras";
import { manejar } from "@/lib/api/manejador";
import { identificadorDeRuta } from "@/lib/api/validador";

/**
 * `POST /api/v1/milestones/{id}/reopen` (DU-30 · RF-151 · RF-153 · alcance
 * `milestones:write`).
 *
 * El acto inverso de `/done`: vuelve a `pending` y quita `done_at`. Existe
 * porque un hito marcado por error tiene que poder deshacerse **sin borrar la
 * fila** —el registro de auditoría conserva las dos escrituras—.
 */
export const dynamic = "force-dynamic";

const RUTA = buscarRuta("POST", "/api/v1/milestones/{id}/reopen");

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return manejar(request, { ruta: RUTA, apunte: "milestone.update", entidad: "milestone" }, async (ctx) => {
    const { id } = await params;
    const r = await cambiarEstadoDeHitoPorApi(ctx, identificadorDeRuta(id), "pending");
    return { cuerpo: r.cuerpo, organizationId: r.organizationId, entidadId: id };
  });
}
