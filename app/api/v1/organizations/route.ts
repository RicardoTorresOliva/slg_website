import { Lector } from "@/lib/api/entrada";
import { organizaciones } from "@/lib/api/lecturas";
import { manejar } from "@/lib/api/manejador";
import { ORG_STATUS, ORG_TYPES } from "@/lib/db/schema";

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

export async function GET(request: Request) {
  return manejar(
    request,
    { accion: "org.read", apunte: "organization.list", entidad: "organization" },
    async (ctx) => {
      const lector = new Lector(new URL(request.url));
      const status = lector.enumerado("status", ORG_STATUS) ?? "active";
      const tipo = lector.enumerado("type", ORG_TYPES) ?? "client";
      const limit = lector.limite();
      const cursor = lector.cursor();
      lector.exigirValido();

      const cuerpo = await organizaciones(ctx, { status, tipo, limit, cursor });
      return { cuerpo, organizationId: ctx.organizationId };
    },
  );
}
