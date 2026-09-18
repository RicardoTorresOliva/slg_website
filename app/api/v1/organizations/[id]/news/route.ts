import { buscarRuta } from "@/lib/api/catalogo";
import { crearNoticiaPorApi } from "@/lib/api/escrituras";
import { manejar } from "@/lib/api/manejador";
import { identificadorDeRuta } from "@/lib/api/validador";

/**
 * `POST /api/v1/organizations/{id}/news` — noticia con comentario para una
 * empresa (DU-30 · RF-150 · RF-153 · alcance `news:write`).
 *
 * **La empresa va en la ruta y se verifica, no se cree** (§2.6): ajena o
 * inexistente responden 404 con el mismo cuerpo. **`publish` es obligatorio y
 * sin defecto**, como en los avisos: que un cliente vea o no una noticia es
 * una decisión, y las decisiones no se toman por omisión.
 */
export const dynamic = "force-dynamic";

const RUTA = buscarRuta("POST", "/api/v1/organizations/{id}/news");

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return manejar(request, { ruta: RUTA, apunte: "news.create", entidad: "news_item" }, async (ctx, c) => {
    const { id } = await params;
    const r = await crearNoticiaPorApi(ctx, {
      organizationId: identificadorDeRuta(id),
      titulo: c.title as string,
      fuenteUrl: (c.source_url as string | undefined) ?? null,
      resumenMd: c.summary_md as string,
      comentarioMd: c.comment_md as string,
      importancia: c.importance as number,
      publicar: c.publish as boolean,
    });
    return {
      cuerpo: r.cuerpo,
      estado: 201,
      organizationId: r.organizationId,
      entidadId: (r.cuerpo.data as { id: string }).id,
    };
  });
}
