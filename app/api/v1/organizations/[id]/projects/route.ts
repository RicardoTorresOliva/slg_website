import { buscarRuta } from "@/lib/api/catalogo";
import { ErrorDeApi } from "@/lib/api/errores";
import { crearProyectoPorApi } from "@/lib/api/escrituras";
import { empresaVisible, proyectosDeEmpresa } from "@/lib/api/lecturas";
import { manejar } from "@/lib/api/manejador";
import { identificadorDeRuta, validarQuery } from "@/lib/api/validador";

/**
 * `GET /api/v1/organizations/{id}/projects` (DU-22 · RF-101 · alcance
 * `orgs:read`) y `POST` (D-162 · alcance `projects:write`).
 *
 * **`{id}` se verifica contra el contexto y no se convierte en permiso** (§2.6):
 * primero se pregunta si esa empresa existe **para esta clave**; si no, **404**
 * con el mismo cuerpo que si no existiera. Un 403 confirmaría que esa empresa
 * existe, y confirmar la existencia de un cliente ajeno ya es una fuga (RF-71).
 *
 * El `POST` es por donde el CRM crea aquí la carpeta del cliente (D-162): el
 * proyecto nace allí y este sitio lo recibe con su `crm_project_id` al lado.
 * **Idempotente**: repetir el mismo `crm_project_id` responde 200 con el que ya
 * existe, no 201 ni 409, para que un reintento no duplique la carpeta.
 */
export const dynamic = "force-dynamic";

const RUTA = buscarRuta("GET", "/api/v1/organizations/{id}/projects");
const RUTA_ALTA = buscarRuta("POST", "/api/v1/organizations/{id}/projects");

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return manejar(request, { ruta: RUTA_ALTA, apunte: "project.create", entidad: "project" }, async (ctx, c) => {
    const { id } = await params;
    const r = await crearProyectoPorApi(ctx, {
      organizationId: identificadorDeRuta(id),
      nombre: c.name as string,
      servicio: c.service as string,
      crmProjectId: c.crm_project_id as string,
      estado: c.status as string,
      empiezaEn: (c.starts_at as Date | undefined) ?? null,
      terminaEn: (c.ends_at as Date | undefined) ?? null,
    });
    return {
      cuerpo: r.cuerpo,
      estado: r.creado ? 201 : 200,
      organizationId: r.organizationId,
      entidadId: (r.cuerpo.data as { id: string }).id,
    };
  });
}

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
