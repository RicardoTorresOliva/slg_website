import { buscarRuta } from "@/lib/api/catalogo";
import { crearEntregable } from "@/lib/api/escrituras";
import { manejar } from "@/lib/api/manejador";

/**
 * `POST /api/v1/deliverables` — crear metadatos y obtener la URL firmada de
 * subida (DU-23 · RF-102 · RF-111 · alcance `deliverables:write`).
 *
 * **Es el primero de tres pasos**: crear → subir (`PUT` contra la URL firmada,
 * que **no es una ruta nuestra**) → publicar. El endpoint no recibe el archivo.
 *
 * **El recurso nace no publicado y, sin `visibility`, `internal`.** Un entregable
 * a medias no puede quedar visible para el cliente: si la subida se corta, lo
 * que queda es un estado seguro y con nombre, no un enlace roto en un portal.
 */
export const dynamic = "force-dynamic";

const RUTA = buscarRuta("POST", "/api/v1/deliverables");

export async function POST(request: Request) {
  return manejar(request, { ruta: RUTA, apunte: "deliverable.create", entidad: "deliverable" }, async (ctx, c) => {
    const archivo = c.file as
      | { filename: string; mime_type: string; size_bytes: number; checksum_sha256?: string }
      | undefined;

    const r = await crearEntregable(ctx, {
      projectId: c.project_id as string,
      titulo: c.title as string,
      tipo: c.type as string,
      fuente: c.source as "file" | "link",
      visibilidad: c.visibility as string,
      archivo: archivo
        ? {
            filename: archivo.filename,
            mime: archivo.mime_type,
            bytes: archivo.size_bytes,
            checksum: archivo.checksum_sha256 ?? null,
          }
        : null,
      urlExterna: (c.external_url as string | undefined) ?? null,
      familyId: (c.family_id as string | undefined) ?? null,
    });

    return {
      cuerpo: r.cuerpo,
      estado: 201,
      organizationId: r.organizationId,
      entidadId: (r.cuerpo.data as { id: string }).id,
      location: `/api/v1/projects/${c.project_id as string}/deliverables`,
    };
  });
}
