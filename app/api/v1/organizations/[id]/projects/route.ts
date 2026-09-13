import { buscarRuta } from "@/lib/api/catalogo";
import { ErrorDeApi } from "@/lib/api/errores";
import { empresaVisible, proyectosDeEmpresa } from "@/lib/api/lecturas";
import { manejar } from "@/lib/api/manejador";
import { identificadorDeRuta, validarQuery } from "@/lib/api/validador";

/**
 * `GET /api/v1/organizations/{id}/projects` (DU-22 · RF-101 · alcance
 * `orgs:read`).
 *
 * **`{id}` se verifica contra el contexto y no se convierte en permiso** (§2.6):
 * primero se pregunta si esa empresa existe **para esta clave**; si no, **404**
 * con el mismo cuerpo que si no existiera. Un 403 confirmaría que esa empresa
 * existe, y confirmar la existencia de un cliente ajeno ya es una fuga (RF-71).
 */
export const dynamic = "force-dynamic";

const RUTA = buscarRuta("GET", "/api/v1/organizations/{id}/projects");

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return manejar(request, { ruta: RUTA, apunte: "project.list", entidad: "project" }, async (ctx) => {
    const { id } = await params;
    const organizationId = identificadorDeRuta(id);
    const q = validarQuery(new URL(request.url), RUTA);

    if (!(await empresaVisible(ctx, organizationId))) {
      throw new ErrorDeApi(404, `empresa ${organizationId} fuera del universo de la clave`);
    }

    const cuerpo = await proyectosDeEmpresa(ctx, organizationId, {
      estado: (q.status as string | undefined) ?? null,
      servicio: (q.service as string | undefined) ?? null,
      limit: q.limit as number,
      cursor: (q.cursor as string | undefined) ?? null,
    });
    return { cuerpo, organizationId };
  });
}
