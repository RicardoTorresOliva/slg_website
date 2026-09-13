import { identificadorDeRuta, Lector } from "@/lib/api/entrada";
import { ErrorDeApi } from "@/lib/api/errores";
import { entregablesDeProyecto } from "@/lib/api/lecturas";
import { manejar } from "@/lib/api/manejador";
import { DELIVERABLE_TYPES } from "@/lib/db/schema";

/**
 * `GET /api/v1/projects/{id}/deliverables` (DU-22 · RF-103 · alcance
 * `deliverables:read`).
 *
 * **Nunca devuelve una URL de descarga.** Devuelve `checksum_sha256`. Quien
 * abre el archivo es el portal, con su propia URL firmada y su visor aislado
 * (RF-90, RNF-21): emitir aquí una firma convertiría cada respuesta en una
 * credencial de lectura con vida propia, imposible de revocar y fácil de acabar
 * en el registro de un agente (R-11, R-14).
 *
 * **Una clave acotada a una empresa solo ve lo `client` y publicado** (§3.6):
 * es, por definición, una clave que puede acabar operada desde el lado del
 * cliente, y darle lo `internal` reproduciría por API la fuga que RF-89 prohíbe
 * por interfaz.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return manejar(
    request,
    { accion: "deliverable.read", apunte: "deliverable.list", entidad: "deliverable" },
    async (ctx) => {
      const { id } = await params;
      const projectId = identificadorDeRuta(id);

      const lector = new Lector(new URL(request.url));
      const tipo = lector.enumerado("type", DELIVERABLE_TYPES);
      const publicado = lector.booleano("published");
      const soloUltima = lector.booleano("only_latest") ?? false;
      const limit = lector.limite();
      const cursor = lector.cursor();
      lector.exigirValido();

      const cuerpo = await entregablesDeProyecto(ctx, projectId, {
        tipo,
        publicado,
        soloUltima,
        limit,
        cursor,
      });
      // Proyecto ajeno o inexistente: el mismo 404, con el mismo cuerpo (§2.6).
      if (cuerpo === null) {
        throw new ErrorDeApi(404, `proyecto ${projectId} fuera del universo de la clave`);
      }
      return { cuerpo };
    },
  );
}
