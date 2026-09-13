import { buscarRuta } from "@/lib/api/catalogo";
import { capturas } from "@/lib/api/lecturas";
import { manejar } from "@/lib/api/manejador";
import { rechazar, validarQuery } from "@/lib/api/validador";
import { loadCollection } from "@/lib/content/loader";

/**
 * `GET /api/v1/captures` — **evidencia** del embudo de captura (DU-22 · RF-100 ·
 * RF-110 · alcance `captures:read`).
 *
 * **NO ES GESTIÓN DE LEADS.** El lead se trabaja en el CRM, por su propio MCP:
 * es la frontera (a) de `scope.md`. Aquí no hay etapa, ni propietario, ni valor,
 * ni próximo paso, ni puntuación — y no por olvido: `lib/api/lecturas.ts`
 * enumera esa ausencia para que una revisión pueda comprobarla.
 *
 * **Solo lectura, y no por convención**: la ruta no exporta `POST`, así que un
 * `POST /api/v1/captures` es un 405 del propio framework. No hay mutación que
 * esconder detrás de un parámetro.
 */
export const dynamic = "force-dynamic";

/** El catálogo de documentos, para resolver `doc_code` y título. */
function documentos() {
  const mapa = new Map<string, { docCode: string; titulo: string; estado: string }>();
  for (const registro of loadCollection<{ title: string; status: string }>("download", "es")) {
    mapa.set(registro.slug, {
      // El código del documento **es** su slug en mayúsculas (`d-01` → `D-01`):
      // el frontmatter no lo repite, y repetirlo sería un segundo sitio donde
      // pueden discrepar.
      docCode: registro.slug.toUpperCase(),
      titulo: registro.data.title,
      estado: registro.data.status,
    });
  }
  return mapa;
}

const RUTA = buscarRuta("GET", "/api/v1/captures");

export async function GET(request: Request) {
  return manejar(request, { ruta: RUTA, apunte: "capture.list", entidad: "lead_capture" }, async (ctx) => {
    const q = validarQuery(new URL(request.url), RUTA);
    const since = (q.since as Date | undefined) ?? null;
    const until = (q.until as Date | undefined) ?? null;
    // Una regla que no cabe en la declaración de un campo suelto porque habla
    // de DOS: el catálogo declara la forma; esto, la coherencia entre ellos.
    if (since && until && since > until) rechazar("since", "after_until");

    const cuerpo = await capturas(
      ctx,
      {
        since,
        until,
        source: (q.source as string | undefined) ?? null,
        crmSyncStatus: (q.crm_sync_status as string | undefined) ?? null,
        docCode: (q.doc_code as string | undefined) ?? null,
        limit: q.limit as number,
        cursor: (q.cursor as string | undefined) ?? null,
      },
      documentos(),
    );
    return { cuerpo };
  });
}
