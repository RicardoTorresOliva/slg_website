import { buscarRuta } from "@/lib/api/catalogo";
import { cambiarEstadoDeProyectoPorApi } from "@/lib/api/escrituras";
import { manejar } from "@/lib/api/manejador";
import { identificadorDeRuta } from "@/lib/api/validador";

/**
 * `POST /api/v1/projects/{id}/reopen` (D-162 · alcance `projects:write`).
 *
 * El acto inverso de `/close`: vuelve a `active`. Existe porque un proyecto
 * cerrado por error tiene que poder deshacerse **sin borrar la fila** —el
 * registro de auditoría conserva las dos escrituras—. Idempotente sobre uno ya
 * activo.
 */
export const dynamic = "force-dynamic";

const RUTA = buscarRuta("POST", "/api/v1/projects/{id}/reopen");

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return manejar(request, { ruta: RUTA, apunte: "project.update", entidad: "project" }, async (ctx) => {
    const { id } = await params;
    const r = await cambiarEstadoDeProyectoPorApi(ctx, identificadorDeRuta(id), "active");
    return { cuerpo: r.cuerpo, organizationId: r.organizationId, entidadId: id };
  });
}
