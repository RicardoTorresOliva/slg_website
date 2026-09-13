import { buscarRuta } from "@/lib/api/catalogo";
import { publicarEntregablePorApi } from "@/lib/api/escrituras";
import { manejar } from "@/lib/api/manejador";
import { identificadorDeRuta } from "@/lib/api/validador";

/**
 * `POST /api/v1/deliverables/{id}/publish` (DU-23 · RF-102 · RF-111 · alcance
 * `deliverables:write`).
 *
 * **Publicar es un acto explícito y separado de crear.** Es lo que permite que
 * la subida falle sin que un cliente vea un archivo roto en su portal, y lo que
 * hace que «subida abortada a medias» tenga una respuesta —409— en vez de un
 * estado indefinido.
 */
export const dynamic = "force-dynamic";

const RUTA = buscarRuta("POST", "/api/v1/deliverables/{id}/publish");

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return manejar(request, { ruta: RUTA, apunte: "deliverable.publish", entidad: "deliverable" }, async (ctx) => {
    const { id } = await params;
    const r = await publicarEntregablePorApi(ctx, identificadorDeRuta(id));
    return { cuerpo: r.cuerpo, organizationId: r.organizationId, entidadId: id };
  });
}
