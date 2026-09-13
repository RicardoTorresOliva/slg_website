import { buscarRuta } from "@/lib/api/catalogo";
import { organizaciones } from "@/lib/api/lecturas";
import { manejar } from "@/lib/api/manejador";
import { validarQuery } from "@/lib/api/validador";

/**
 * `GET /api/v1/organizations` — las empresas (DU-22 · RF-101 · alcance
 * `orgs:read`).
 *
 * **Si la clave lleva empresa, la colección tiene exactamente un elemento: el
 * suyo** (§3.2). No es un filtro que el agente pueda ampliar pasando parámetros:
 * el acotado sale del contexto de la clave, no de la petición.
 *
 * `status = 'archived'` **no se esconde**: se puede pedir. Lo que cambia con el
 * archivado es el acceso de sus miembros al portal (`data_model` §4.3), no la
 * visibilidad para una clave de SLG que audita.
 */
export const dynamic = "force-dynamic";

const RUTA = buscarRuta("GET", "/api/v1/organizations");

export async function GET(request: Request) {
  return manejar(request, { ruta: RUTA, apunte: "organization.list", entidad: "organization" }, async (ctx) => {
    const q = validarQuery(new URL(request.url), RUTA);
    const cuerpo = await organizaciones(ctx, {
      status: q.status as string,
      tipo: q.type as string,
      limit: q.limit as number,
      cursor: (q.cursor as string | undefined) ?? null,
    });
    return { cuerpo, organizationId: ctx.organizationId };
  });
}
