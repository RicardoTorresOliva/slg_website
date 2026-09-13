import { buscarRuta } from "@/lib/api/catalogo";
import { manejar } from "@/lib/api/manejador";
import { documentoOpenApi } from "@/lib/api/openapi";

/**
 * `GET /api/v1/openapi.json` — la especificación (DU-23 · RF-106).
 *
 * **Responde a cualquier clave válida**, sea cual sea su alcance; sin clave,
 * 401. No es pública: describe la superficie de escritura de la aplicación. Y no
 * hay interfaz de documentación servida desde el dominio — sería un script de
 * terceros en la capa pública, contra RF-35 y el gate D1.
 *
 * El documento **se genera del catálogo**, que es lo mismo que valida las
 * peticiones: no hay dos descripciones que puedan discrepar.
 */
export const dynamic = "force-dynamic";

const RUTA = buscarRuta("GET", "/api/v1/openapi.json");

export async function GET(request: Request) {
  return manejar(request, { ruta: RUTA, apunte: "openapi.read", entidad: "api" }, async () => {
    const origen = new URL(request.url).origin;
    return { cuerpo: documentoOpenApi(`${origen}/api/v1`) };
  });
}
