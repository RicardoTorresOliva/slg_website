/**
 * servicio.ts — Lo que el visor necesita de la base y del bucket.
 *
 * ESTÁ APARTE DE LA RUTA a propósito: la ruta es HTTP —cabeceras, estados,
 * política— y esto es dominio. Mezclarlas haría que la comprobación de
 * visibilidad, que es la única línea que separa un entregable interno de uno de
 * cliente en un origen **sin sesión**, quedara enterrada entre `Response`s.
 */
import { sql } from "drizzle-orm";

import { withSystemScope } from "../db/scope.ts";
import { adaptadorS3 } from "../files/index.ts";

export type DocumentoDelVisor = {
  readonly id: string;
  readonly titulo: string;
  readonly claveDeArchivo: string;
};

/**
 * Busca un entregable **HTML, de visibilidad `client` y publicado**.
 *
 * **LA AUTORIZACIÓN NO ESTÁ AQUÍ: ESTÁ EN LA BASE** (migración 0016), y ese
 * cambio lo forzó un defecto real. La primera versión ponía las tres
 * condiciones en el `WHERE` de una consulta hecha con `withSystemScope` —y
 * `withSystemScope` **no puede leer `deliverable`**: fija `app.actor_role =
 * 'system'`, que no está en la lista de la política de fila y no debe estarlo—.
 * La consulta devolvía cero filas **siempre**, así que el visor respondía 404 a
 * todo. No era un problema de configuración: la unidad no podía funcionar.
 *
 * `app_entregable_para_el_visor` es `SECURITY DEFINER` y **no recibe filtros**:
 * cliente, HTML y publicado están dentro. Desde aquí no se puede ampliar lo que
 * devuelve, que es exactamente la propiedad que hacía falta en un origen **sin
 * sesión** — donde no hay contexto que fijar y, por tanto, no hay política que
 * acote.
 */
export async function documentoParaElVisor(id: string): Promise<DocumentoDelVisor | null> {
  const fila = await withSystemScope(
    "DU-19 · el visor sirve un documento en un origen sin sesión; la autorización vive dentro " +
      "de `app_entregable_para_el_visor`, no en esta consulta.",
    async (db) => {
      const filas = (await db.execute(
        sql`select id, title, file_key from app_entregable_para_el_visor(${id})`,
      )) as unknown as { id: string; title: string; file_key: string | null }[];
      return filas[0] ?? null;
    },
  );
  if (!fila?.file_key) return null;
  return { id: fila.id, titulo: fila.title, claveDeArchivo: fila.file_key };
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
