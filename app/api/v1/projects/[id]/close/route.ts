import { buscarRuta } from "@/lib/api/catalogo";
import { cambiarEstadoDeProyectoPorApi } from "@/lib/api/escrituras";
import { manejar } from "@/lib/api/manejador";
import { identificadorDeRuta } from "@/lib/api/validador";

/**
 * `POST /api/v1/projects/{id}/close` (D-162 · alcance `projects:write`).
 *
 * **Cerrar un proyecto es un acto con nombre**, no un campo que se parchea:
 * como `/milestones/{id}/done`. El CRM sabe cuándo un proyecto termina y lo
 * dice aquí; repetirlo sobre uno ya cerrado responde 200 sin tocar la fila,
 * para que un reintento no tenga que preguntar antes.
 */
export const dynamic = "force-dynamic";

const RUTA = buscarRuta("POST", "/api/v1/projects/{id}/close");

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return manejar(request, { ruta: RUTA, apunte: "project.update", entidad: "project" }, async (ctx) => {
    const { id } = await params;
    const r = await cambiarEstadoDeProyectoPorApi(ctx, identificadorDeRuta(id), "closed");
    return { cuerpo: r.cuerpo, organizationId: r.organizationId, entidadId: id };
  });
}
