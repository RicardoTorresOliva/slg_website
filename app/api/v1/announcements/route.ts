import { buscarRuta } from "@/lib/api/catalogo";
import { crearAvisoPorApi } from "@/lib/api/escrituras";
import { manejar } from "@/lib/api/manejador";

/**
 * `POST /api/v1/announcements` — aviso a una empresa (DU-23 · RF-104 · RF-111 ·
 * alcance `announcements:write`).
 *
 * **`publish` es obligatorio y no tiene defecto.** Es la misma disciplina que
 * `api_key.expires_at`: un defecto convierte una decisión con consecuencias
 * —que un cliente vea o no vea un mensaje— en algo que se puede olvidar. El
 * agente declara qué quiere, siempre.
 */
export const dynamic = "force-dynamic";

const RUTA = buscarRuta("POST", "/api/v1/announcements");

export async function POST(request: Request) {
  return manejar(request, { ruta: RUTA, apunte: "announcement.create", entidad: "announcement" }, async (ctx, c) => {
    const r = await crearAvisoPorApi(ctx, {
      organizationId: c.organization_id as string,
      titulo: c.title as string,
      cuerpoMd: c.body_md as string,
      publicar: c.publish as boolean,
      idioma: c.locale as string,
    });
    return {
      cuerpo: r.cuerpo,
      estado: 201,
      organizationId: r.organizationId,
      entidadId: (r.cuerpo.data as { id: string }).id,
    };
  });
}
