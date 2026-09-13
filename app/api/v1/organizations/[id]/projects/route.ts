import { identificadorDeRuta, Lector } from "@/lib/api/entrada";
import { ErrorDeApi } from "@/lib/api/errores";
import { empresaVisible, proyectosDeEmpresa } from "@/lib/api/lecturas";
import { manejar } from "@/lib/api/manejador";
import { PROJECT_STATUS } from "@/lib/db/schema";

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

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return manejar(
    request,
    { accion: "org.read", apunte: "project.list", entidad: "project" },
    async (ctx) => {
      const { id } = await params;
      const organizationId = identificadorDeRuta(id);

      const lector = new Lector(new URL(request.url));
      const estado = lector.enumerado("status", PROJECT_STATUS);
      const servicio = lector.texto("service", 60);
      const limit = lector.limite();
      const cursor = lector.cursor();
      lector.exigirValido();

      if (!(await empresaVisible(ctx, organizationId))) {
        throw new ErrorDeApi(404, `empresa ${organizationId} fuera del universo de la clave`);
      }

      const cuerpo = await proyectosDeEmpresa(ctx, organizationId, {
        estado,
        servicio,
        limit,
        cursor,
      });
      return { cuerpo, organizationId };
    },
  );
}
