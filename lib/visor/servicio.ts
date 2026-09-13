/**
 * servicio.ts — Lo que el visor necesita de la base y del bucket.
 *
 * ESTÁ APARTE DE LA RUTA a propósito: la ruta es HTTP —cabeceras, estados,
 * política— y esto es dominio. Mezclarlas haría que la comprobación de
 * visibilidad, que es la única línea que separa un entregable interno de uno de
 * cliente en un origen **sin sesión**, quedara enterrada entre `Response`s.
 */
import { and, eq } from "drizzle-orm";

import { deliverable } from "../db/schema.ts";
import { withSystemScope } from "../db/scope.ts";
import { adaptadorS3 } from "../files/index.ts";

export type DocumentoDelVisor = {
  readonly id: string;
  readonly titulo: string;
  readonly claveDeArchivo: string;
};

/**
 * Busca un entregable **HTML y de visibilidad `client`**, y nada más.
 *
 * LA COMPROBACIÓN DE VISIBILIDAD ES EXPLÍCITA Y ESTÁ AQUÍ. En el resto del
 * sistema, lo que impide que un cliente vea un `internal` es la política de
 * fila más `entregablesDelCliente()` (D-118). En el visor **no hay sesión** —el
 * navegador no manda las cookies del dominio de la aplicación a este
 * subdominio, que es justo el mecanismo de aislamiento—, así que no hay
 * política que acote: **esta condición es lo único que separa los dos casos**.
 *
 * Por eso va en el `WHERE` y no en un filtro posterior: un filtro después de la
 * consulta se puede olvidar al refactorizar; una condición en el `WHERE` hace
 * que olvidarla devuelva otra cosa, no de más.
 */
export async function documentoParaElVisor(id: string): Promise<DocumentoDelVisor | null> {
  const fila = await withSystemScope(
    "DU-19 · el visor sirve un documento en un origen sin sesión; la autorización se resolvió en el portal.",
    async (db) => {
      const filas = await db
        .select({ id: deliverable.id, titulo: deliverable.title, clave: deliverable.fileKey })
        .from(deliverable)
        .where(
          and(
            eq(deliverable.id, id),
            eq(deliverable.visibility, "client"),
            eq(deliverable.type, "html"),
          ),
        )
        .limit(1);
      return filas[0] ?? null;
    },
  );
  if (!fila?.clave) return null;
  return { id: fila.id, titulo: fila.titulo, claveDeArchivo: fila.clave };
}

/**
 * La URL firmada del objeto, **para uso del servidor**.
 *
 * El navegador del cliente nunca la ve: el visor descarga el HTML por dentro y
 * devuelve el contenido. Si la URL del bucket llegara al navegador, el
 * documento se serviría desde el origen de MinIO —sin nuestra CSP, sin nuestras
 * cabeceras— y el control se habría perdido justo en el último paso.
 */
export async function urlFirmadaDelObjeto(clave: string): Promise<string> {
  const firmada = await adaptadorS3().firmarDescarga({
    bucket: "deliverables",
    clave,
    uso: "deliverable",
  });
  return firmada.url;
}
