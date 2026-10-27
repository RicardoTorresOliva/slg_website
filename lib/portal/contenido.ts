/**
 * contenido.ts — El texto de un entregable Markdown, traído del bucket.
 *
 * SE TRAE EN EL SERVIDOR Y SE RENDERIZA AQUÍ, y no se le da al navegador la URL
 * firmada: si el cliente descargara el `.md` directamente, el contenido se
 * serviría desde el origen de MinIO, sin nuestra CSP y sin nuestro conversor.
 * El Markdown se renderiza con `components/Markdown`, que **no produce HTML
 * arbitrario** y acota el esquema de los enlaces (D-119) — que es lo que RNF-31
 * pide para el contenido que no viene del repositorio.
 */
import { and, eq } from "drizzle-orm";

import type { AuthContext } from "../db/context.ts";
import { deliverable } from "../db/schema.ts";
import { withScope } from "../db/scope.ts";
import { adaptadorDeArchivos } from "../files/index.ts";

/** Tope: un entregable Markdown es un documento, no un volcado. */
const MAXIMO = 2 * 1024 * 1024;

/**
 * **VA CON EL CONTEXTO DE LA SESIÓN, Y ANTES NO.** La primera versión leía con
 * `withSystemScope`, que fija `app.actor_role = 'system'` — un rol que **no
 * está en la lista de la política de fila** y no debe estarlo. Resultado: la
 * consulta devolvía cero filas siempre y **todo entregable Markdown se
 * renderizaba vacío**. Lo encontró la revisión independiente, no el uso.
 *
 * Aquí sí hay sesión —la pantalla del portal la resolvió— así que la política de
 * fila puede hacer su trabajo y acota por empresa sola. Las dos condiciones del
 * `WHERE` se quedan como segunda capa: la política dice de quién es la fila, y
 * estas dicen qué clase de fila se puede leer por esta puerta.
 */
export async function textoDeMarkdown(ctx: AuthContext, id: string): Promise<string | null> {
  const fila = await withScope(ctx, async (db) => {
      const filas = await db
        .select({ clave: deliverable.fileKey })
        .from(deliverable)
        .where(and(eq(deliverable.id, id), eq(deliverable.visibility, "client"), eq(deliverable.type, "md")))
        .limit(1);
      return filas[0] ?? null;
  });
  if (!fila?.clave) return null;

  try {
    const firmada = await adaptadorDeArchivos().firmarDescarga({
      bucket: "deliverables",
      clave: fila.clave,
      uso: "deliverable",
    });
    const r = await fetch(firmada.url);
    if (!r.ok) return null;
    const texto = await r.text();
    return texto.length > MAXIMO ? texto.slice(0, MAXIMO) : texto;
  } catch {
    return null;
  }
}
