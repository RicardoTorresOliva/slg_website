/**
 * servicio.ts — Lo que el visor necesita de la base y del bucket.
 *
 * ESTÁ APARTE DE LA RUTA a propósito: la ruta es HTTP —cabeceras, estados,
 * política— y esto es dominio. Mezclarlas haría que la comprobación de
 * visibilidad, que es la única línea que separa un entregable interno de uno de
 * cliente en un origen **sin sesión**, quedara enterrada entre `Response`s. Esa
 * línea hoy tiene dos mitades —el ámbito del vale y el `WHERE` de la función de
 * la base— y las dos se leen de un tirón por estar aquí.
 */
import { sql } from "drizzle-orm";

import { withSystemScope } from "../db/scope.ts";
import { adaptadorDeArchivos } from "../files/index.ts";
import type { AmbitoDelVale } from "./origen.ts";

export type DocumentoDelVisor = {
  readonly id: string;
  readonly titulo: string;
  readonly claveDeArchivo: string;
};

/**
 * Busca un entregable **HTML, publicado y con archivo**: siempre si es de
 * visibilidad `client`, y también si es `internal` **cuando el ámbito es `hq`**.
 *
 * **LA AUTORIZACIÓN NO ESTÁ AQUÍ: ESTÁ EN LA BASE** (migraciones 0016 y 0022), y
 * ese reparto lo forzó un defecto real. La primera versión ponía las condiciones
 * en el `WHERE` de una consulta hecha con `withSystemScope` —y `withSystemScope`
 * **no puede leer `deliverable`**: fija `app.actor_role = 'system'`, que no está
 * en la lista de la política de fila y no debe estarlo—. La consulta devolvía
 * cero filas **siempre**, así que el visor respondía 404 a todo. No era un
 * problema de configuración: la unidad no podía funcionar.
 *
 * `app_entregable_para_el_visor` es `SECURITY DEFINER` y **lo único que recibe
 * de quien llama es el ámbito** — ni empresa, ni proyecto, ni fecha, ni
 * visibilidad suelta—. Y el ámbito no se lo inventa este módulo: llega de un
 * vale firmado por la pantalla que sí tenía sesión (`origen.ts`). De ahí que
 * sea un parámetro obligatorio en los dos lados: olvidarlo no amplía nada en
 * silencio, no ejecuta.
 *
 * **Un `internal` no puede salir por el portal** aunque alguien se equivoque
 * aquí: el portal solo conoce identificadores de `entregablesDelCliente()`, y
 * el vale que emite es de ámbito `cliente`.
 */
export async function documentoParaElVisor(
  id: string,
  ambito: AmbitoDelVale,
): Promise<DocumentoDelVisor | null> {
  const fila = await withSystemScope(
    "DU-19 · el visor sirve un documento en un origen sin sesión; la autorización vive dentro " +
      "de `app_entregable_para_el_visor`, no en esta consulta.",
    async (db) => {
      const filas = (await db.execute(
        sql`select id, title, file_key from app_entregable_para_el_visor(${id}, ${ambito})`,
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
  const firmada = await adaptadorDeArchivos().firmarDescarga({
    bucket: "deliverables",
    clave,
    uso: "deliverable",
  });
  return firmada.url;
}
