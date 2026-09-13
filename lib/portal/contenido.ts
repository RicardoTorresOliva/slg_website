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

import { deliverable } from "../db/schema.ts";
import { withSystemScope } from "../db/scope.ts";
import { adaptadorS3 } from "../files/index.ts";

/** Tope: un entregable Markdown es un documento, no un volcado. */
const MAXIMO = 2 * 1024 * 1024;

export async function textoDeMarkdown(id: string): Promise<string | null> {
  const fila = await withSystemScope(
    "DU-19 · leer el cuerpo de un entregable ya autorizado por la pantalla que lo pide.",
    async (db) => {
      const filas = await db
        .select({ clave: deliverable.fileKey })
        .from(deliverable)
        .where(and(eq(deliverable.id, id), eq(deliverable.visibility, "client"), eq(deliverable.type, "md")))
        .limit(1);
      return filas[0] ?? null;
    },
  );
  if (!fila?.clave) return null;

  try {
    const firmada = await adaptadorS3().firmarDescarga({
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
