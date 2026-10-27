import { buscarRuta } from "@/lib/api/catalogo";
import { cambiarEstadoDeHitoPorApi } from "@/lib/api/escrituras";
import { manejar } from "@/lib/api/manejador";
import { identificadorDeRuta } from "@/lib/api/validador";

/**
 * `POST /api/v1/milestones/{id}/done` (DU-30 · RF-151 · RF-153 · alcance
 * `milestones:write`).
 *
 * **Hacer un hito es un acto con nombre**, no un campo que se parchea: como
 * `/deliverables/{id}/publish`. Pone `done_at` (hecho ⇔ con fecha, lo impone
 * la base) y repetirlo no la mueve: un agente que reintenta una llamada
 * cortada no reescribe cuándo se entregó.
 */
export const dynamic = "force-dynamic";

const RUTA = buscarRuta("POST", "/api/v1/milestones/{id}/done");

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return manejar(request, { ruta: RUTA, apunte: "milestone.update", entidad: "milestone" }, async (ctx) => {
    const { id } = await params;
    const r = await cambiarEstadoDeHitoPorApi(ctx, identificadorDeRuta(id), "done");
    return { cuerpo: r.cuerpo, organizationId: r.organizationId, entidadId: id };
  });
}
