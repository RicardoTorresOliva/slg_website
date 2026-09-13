import { Lector } from "@/lib/api/entrada";
import { capturas } from "@/lib/api/lecturas";
import { manejar } from "@/lib/api/manejador";
import { LEAD_SOURCES, QUEUE_STATUS } from "@/lib/db/schema";
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

export async function GET(request: Request) {
  return manejar(
    request,
    { accion: "capture.read", apunte: "capture.list", entidad: "lead_capture" },
    async () => {
      const lector = new Lector(new URL(request.url));
      const since = lector.fechaHora("since");
      const until = lector.fechaHora("until");
      const source = lector.enumerado("source", LEAD_SOURCES);
      const crmSyncStatus = lector.enumerado("crm_sync_status", QUEUE_STATUS);
      const docCode = lector.texto("doc_code", 20, /^[Dd]-\d{2}$/);
      const limit = lector.limite();
      const cursor = lector.cursor();
      if (since && until && since > until) lector.invalido("since", "after_until");
      lector.exigirValido();

      const cuerpo = await capturas(
        { since, until, source, crmSyncStatus, docCode, limit, cursor },
        documentos(),
      );
      return { cuerpo };
    },
  );
}
