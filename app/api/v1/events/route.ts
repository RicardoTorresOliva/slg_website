import { buscarRuta } from "@/lib/api/catalogo";
import { registrarEvento } from "@/lib/api/escrituras";
import { manejar } from "@/lib/api/manejador";

/**
 * `POST /api/v1/events` — actividad del agente (DU-23 · RF-105 · RF-146 ·
 * alcance `events:write`).
 *
 * **`kind` es un enumerado ABIERTO** y esa es la unidad: un agente nuevo
 * registra un tipo de actividad **sin migrar el esquema**. Lo que sí se exige es
 * la **forma** `<recurso>.<acción>`; fuera de forma, 422. Y la respuesta dice
 * `schema_known: false` cuando el `kind` no está en el catálogo inicial, para
 * que quien escribió `reviews.verdict` en vez de `review.verdict` se entere.
 */
export const dynamic = "force-dynamic";

const RUTA = buscarRuta("POST", "/api/v1/events");

export async function POST(request: Request) {
  return manejar(request, { ruta: RUTA, apunte: "event.create", entidad: "agent_event" }, async (ctx, c) => {
    const r = await registrarEvento(ctx, {
      kind: c.kind as string,
      organizationId: (c.organization_id as string | undefined) ?? null,
      payload: c.payload as Record<string, unknown>,
    });
    return {
      cuerpo: r.cuerpo,
      estado: 201,
      organizationId: r.organizationId,
      entidadId: (r.cuerpo.data as { id: string }).id,
    };
  });
}
