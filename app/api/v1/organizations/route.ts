import { buscarRuta } from "@/lib/api/catalogo";
import { crearEmpresaPorApi } from "@/lib/api/escrituras";
import { organizaciones } from "@/lib/api/lecturas";
import { manejar } from "@/lib/api/manejador";
import { validarQuery } from "@/lib/api/validador";

/**
 * `GET /api/v1/organizations` — las empresas (DU-22 · RF-101 · alcance
 * `orgs:read`) y `POST` (D-163 · alcance `orgs:write`).
 *
 * **Si la clave lleva empresa, la colección tiene exactamente un elemento: el
 * suyo** (§3.2). No es un filtro que el agente pueda ampliar pasando parámetros:
 * el acotado sale del contexto de la clave, no de la petición.
 *
 * `status = 'archived'` **no se esconde**: se puede pedir. Lo que cambia con el
 * archivado es el acceso de sus miembros al portal (`data_model` §4.3), no la
 * visibilidad para una clave de SLG que audita.
 *
 * El `POST` es por donde el CRM crea o encuentra aquí la empresa por su
 * `crm_company_id` (D-163): sin esto, el CRM no sabía qué `{id}` usar para
 * crear la carpeta del cliente (D-162). **Idempotente**: repetir el mismo
 * identificador responde 200 con la que ya existe, no 201 ni 409. Una clave
 * acotada a una empresa responde 403: crear otra está fuera de su universo.
 */
export const dynamic = "force-dynamic";

const RUTA = buscarRuta("GET", "/api/v1/organizations");
const RUTA_ALTA = buscarRuta("POST", "/api/v1/organizations");

export async function POST(request: Request) {
  return manejar(request, { ruta: RUTA_ALTA, apunte: "organization.create", entidad: "organization" }, async (ctx, c) => {
    const r = await crearEmpresaPorApi(ctx, {
      nombre: c.name as string,
      crmCompanyId: c.crm_company_id as string,
      slug: (c.slug as string | undefined) ?? null,
    });
    return {
      cuerpo: r.cuerpo,
      estado: r.creado ? 201 : 200,
      organizationId: r.organizationId,
      entidadId: r.organizationId,
    };
  });
}

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
