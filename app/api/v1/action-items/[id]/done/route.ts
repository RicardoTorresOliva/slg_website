import { buscarRuta } from "@/lib/api/catalogo";
import { cerrarPendientePorApi } from "@/lib/api/escrituras";
import { manejar } from "@/lib/api/manejador";
import { identificadorDeRuta } from "@/lib/api/validador";

/**
 * `POST /api/v1/action-items/{id}/done` (DU-30 · RF-151 · RF-153 · alcance
 * `milestones:write`).
 *
 * **Una clave con `milestones:write` cierra cualquier pendiente**, sea
 * `closes_by = client` o `slg`: B.3 no da alcance de agente a
 * `action_item.close`, y la puerta lo resuelve por `action_item.write`. Quién
 * lo cerró sale del contexto (RF-111) y queda en `done_by_*`. Repetirlo no
 * cambia nada: el primer cierre es el hecho.
 */
export const dynamic = "force-dynamic";

const RUTA = buscarRuta("POST", "/api/v1/action-items/{id}/done");

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return manejar(request, { ruta: RUTA, apunte: "action_item.close", entidad: "action_item" }, async (ctx) => {
    const { id } = await params;
    const r = await cerrarPendientePorApi(ctx, identificadorDeRuta(id));
    return { cuerpo: r.cuerpo, organizationId: r.organizationId, entidadId: id };
  });
}
