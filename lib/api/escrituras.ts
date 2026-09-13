/**
 * escrituras.ts — Las **cuatro escrituras** de `/api/v1` (DU-23 · RF-102 ·
 * RF-104 · RF-105 · RF-111 · RF-146).
 *
 * **CREAR Y PUBLICAR SON DOS ACTOS, Y ESA ES LA UNIDAD.** El ciclo es
 * crear → subir → publicar, y no un `POST` que hace las tres cosas. La razón no
 * es purismo REST: es que **la subida puede fallar**. Con un solo paso, un
 * archivo que se corta a la mitad deja un entregable publicado que el cliente
 * abre y no encuentra. Con tres, el estado intermedio —creado, no publicado— es
 * un estado **seguro y con nombre**, y publicar sin archivo responde 409 en vez
 * de dejar el hueco (criterio 8).
 *
 * **LA ATRIBUCIÓN SALE DEL CONTEXTO, NUNCA DE UN PARÁMETRO** (RF-111). Quien
 * escribe no elige cómo se le atribuye, y `actor_type` distingue una clave de
 * una persona. Esa distinción no es decorativa: es lo que HQ enseña y lo que la
 * auditoría conserva.
 *
 * **LA EMPRESA SE VERIFICA, NO SE CREE.** Todo `organization_id` que llega por
 * el cuerpo pasa por la política de fila antes de escribirse: para una clave
 * acotada, una empresa ajena sencillamente no existe, y la ruta responde 404 con
 * el mismo cuerpo que si no existiera (§2.6, RF-71).
 */
import { eq, sql } from "drizzle-orm";

import type { AuthContext } from "../db/context.ts";
import { agentEvent, announcement, deliverable, organization, project } from "../db/schema.ts";
import { withScope } from "../db/scope.ts";
import { adaptadorS3, validarSubida } from "../files/index.ts";
import { destinoDe } from "../hq/entregables.ts";
import { anunciarAviso, anunciarEntregable } from "../webhooks/index.ts";

import { ErrorDeApi } from "./errores.ts";

/**
 * **AQUÍ NO SE AUDITA, Y NO ES UN OLVIDO** (D-140).
 *
 * Estas funciones solo se llaman desde `/api/v1`, y el manejador audita **toda**
 * llamada —incluidas las que acaban en 403, 404, 409 o 422— con más contexto del
 * que un apunte de dominio puede tener: código de estado, ruta, método y el
 * identificador que viaja de vuelta como `request_id`. Envolverlas además en
 * `conAuditoria` escribía **dos filas por acto**, con la misma acción y el mismo
 * actor, y el `request_id` de la respuesta apuntaba solo a una de las dos: un
 * registro que se lee peor y que miente por duplicado. Lo encontró la prueba,
 * que exige que todo apunte lleve su ruta.
 *
 * Si algún día estas funciones se llaman desde fuera de la API, el apunte se
 * añade **ahí**, no aquí.
 */

/* ══════════════════════════════════════════════════════════════════════════
 * 1 · POST /deliverables — crear metadatos y firmar la subida
 * ══════════════════════════════════════════════════════════════════════════ */

export type DatosDeCreacion = {
  readonly projectId: string;
  readonly titulo: string;
  readonly tipo: string;
  readonly fuente: "file" | "link";
  readonly visibilidad: string;
  readonly archivo: {
    readonly filename: string;
    readonly mime: string;
    readonly bytes: number;
    readonly checksum: string | null;
  } | null;
  readonly urlExterna: string | null;
  readonly familyId: string | null;
};

/** La clave del objeto. **Lleva la versión**: dos versiones nunca se pisan. */
function claveDe(familyId: string, version: number, nombre: string): string {
  const limpio = nombre.replace(/[^A-Za-z0-9._-]/g, "-").slice(-80);
  return `${familyId}/v${version}/${limpio}`;
}

export async function crearEntregable(ctx: AuthContext, datos: DatosDeCreacion) {
  const id = crypto.randomUUID();

  // La coherencia entre `source`, `file` y `external_url` no cabe en la
  // declaración de un campo suelto porque habla de varios a la vez.
  if (datos.fuente === "file" && (datos.urlExterna || !datos.archivo)) {
    throw new ErrorDeApi(422, "source=file exige `file` y excluye `external_url`", [
      { field: datos.archivo ? "external_url" : "file", code: "incoherent_with_source" },
    ]);
  }
  if (datos.fuente === "link") {
    if (datos.archivo || !datos.urlExterna) {
      throw new ErrorDeApi(422, "source=link exige `external_url` y excluye `file`", [
        { field: datos.archivo ? "file" : "external_url", code: "incoherent_with_source" },
      ]);
    }
    if (datos.tipo !== "link" && datos.tipo !== "material") {
      throw new ErrorDeApi(422, "source=link solo admite type link o material", [
        { field: "type", code: "incoherent_with_source" },
      ]);
    }
    let protocolo = "";
    try {
      protocolo = new URL(datos.urlExterna).protocol;
    } catch {
      throw new ErrorDeApi(422, "external_url ilegible", [{ field: "external_url", code: "malformed" }]);
    }
    // Solo http(s): un `javascript:` o un `file:` en un entregable es un enlace
    // que se abre en el navegador de un cliente.
    if (protocolo !== "http:" && protocolo !== "https:") {
      throw new ErrorDeApi(422, "external_url con esquema no admitido", [
        { field: "external_url", code: "scheme_not_allowed" },
      ]);
    }
  }

  return (async () => {
      // El proyecto, por la política de fila: ajeno o inexistente da lo mismo.
      const filas = await withScope(ctx, (db) =>
        db
          .select({ id: project.id, organizationId: project.organizationId })
          .from(project)
          .where(eq(project.id, datos.projectId))
          .limit(1),
      );
      const proyecto = filas[0];
      if (!proyecto) throw new ErrorDeApi(404, `proyecto ${datos.projectId} fuera del universo de la clave`);

      /**
       * La familia: si llega, **tiene que ser de este proyecto**. Sin esta
       * comprobación, un `family_id` de otro proyecto convertiría un entregable
       * ajeno en «la versión 2» de este, y el histórico de los dos quedaría mal.
       */
      let familyId = datos.familyId?.trim() || null;
      if (familyId) {
        const hermanos = await withScope(ctx, (db) =>
          db
            .select({ projectId: deliverable.projectId })
            .from(deliverable)
            .where(eq(deliverable.familyId, familyId as string))
            .limit(1),
        );
        if (hermanos.length === 0 || hermanos[0]!.projectId !== datos.projectId) {
          throw new ErrorDeApi(422, "family_id inexistente o de otro proyecto", [
            { field: "family_id", code: "not_in_project" },
          ]);
        }
      }
      familyId ??= id;

      // La versión sale de lo que ya hay en la familia, no de un contador del
      // cuerpo: dos publicaciones a la vez no pueden acordar un número.
      const version = await withScope(ctx, async (db) => {
        const filas = (await db.execute(sql`
          SELECT coalesce(max(version), 0) + 1 AS siguiente
            FROM deliverable WHERE family_id = ${familyId}
        `)) as unknown as { siguiente: number }[];
        return Number(filas[0]?.siguiente ?? 1);
      });

      let fileKey: string | null = null;
      let subida: { url: string; caducaEn: string; maxBytes: number } | null = null;

      if (datos.fuente === "file" && datos.archivo) {
        const destino = destinoDe(datos.tipo);
        if (!destino) {
          throw new ErrorDeApi(422, `el tipo ${datos.tipo} no admite archivo`, [
            { field: "type", code: "no_upload_for_type" },
          ]);
        }
        fileKey = claveDe(familyId, version, datos.archivo.filename);

        /**
         * **ANTES DE LA FIRMA** (RNF-25). Si el tipo o el tamaño no encajan, no
         * se emite URL y no hay forma de escribir en el bucket: no existe
         * ninguna ventana en la que un archivo no validado esté ahí.
         */
        const veredicto = validarSubida({
          destino,
          mime: datos.archivo.mime,
          bytes: datos.archivo.bytes,
          clave: fileKey,
        });
        if (!veredicto.ok) {
          throw new ErrorDeApi(422, `subida rechazada: ${veredicto.motivo}`, [
            { field: "file", code: "upload_rejected" },
          ]);
        }
        const firmada = await adaptadorS3().firmarSubida({
          destino,
          clave: fileKey,
          mime: datos.archivo.mime,
          bytes: datos.archivo.bytes,
        });
        subida = {
          url: firmada.url,
          caducaEn: firmada.caducaEn.toISOString(),
          maxBytes: veredicto.limite,
        };
      }

      await withScope(ctx, (db) =>
        db.insert(deliverable).values({
          id,
          projectId: datos.projectId,
          organizationId: proyecto.organizationId,
          title: datos.titulo,
          type: datos.tipo,
          fileKey,
          url: datos.fuente === "link" ? datos.urlExterna : null,
          checksumSha256: datos.archivo?.checksum ?? null,
          version,
          familyId,
          visibility: datos.visibilidad,
          // **Nace NO publicado**: un entregable a medias no puede quedar
          // visible para el cliente (§3.4).
          publishedAt: null,
        }),
      );

      return {
        organizationId: proyecto.organizationId,
        cuerpo: {
          data: {
            id,
            project_id: datos.projectId,
            organization_id: proyecto.organizationId,
            family_id: familyId,
            version,
            title: datos.titulo,
            type: datos.tipo,
            source: datos.fuente,
            visibility: datos.visibilidad,
            mime_type: datos.archivo?.mime ?? null,
            size_bytes: datos.archivo?.bytes ?? null,
            checksum_sha256: datos.archivo?.checksum ?? null,
            external_url: datos.fuente === "link" ? datos.urlExterna : null,
            published_at: null,
            published_by: null,
            created_at: new Date().toISOString(),
          },
          // **El bloque `upload` no aparece cuando la fuente es un enlace.**
          // La URL firmada no se registra en ningún sitio: contiene la firma
          // (RNF-26). Solo se registra que se emitió.
          ...(subida
            ? {
                upload: {
                  method: "PUT",
                  url: subida.url,
                  headers: {
                    "Content-Type": datos.archivo!.mime,
                    "Content-Length": String(datos.archivo!.bytes),
                  },
                  expires_at: subida.caducaEn,
                  max_bytes: subida.maxBytes,
                },
              }
            : {}),
        },
      };
  })();
}

/* ══════════════════════════════════════════════════════════════════════════
 * 2 · POST /deliverables/{id}/publish
 * ══════════════════════════════════════════════════════════════════════════ */

export async function publicarEntregablePorApi(ctx: AuthContext, id: string) {
  return (async () => {
      const filas = await withScope(ctx, (db) =>
        db.select().from(deliverable).where(eq(deliverable.id, id)).limit(1),
      );
      const fila = filas[0];
      if (!fila) throw new ErrorDeApi(404, `entregable ${id} fuera del universo de la clave`);
      if (fila.publishedAt !== null) throw new ErrorDeApi(409, `entregable ${id} ya publicado`);

      /**
       * **El archivo tiene que estar ahí.** Es el criterio 8: una subida
       * abortada a medias no puede acabar en el portal de un cliente como un
       * enlace que no abre. Si no está, 409 y el entregable se queda donde
       * estaba — creado y sin publicar, que es el estado seguro.
       */
      if (fila.fileKey) {
        const esta = await adaptadorS3().existe({ bucket: "deliverables", clave: fila.fileKey });
        if (!esta) throw new ErrorDeApi(409, `entregable ${id} sin archivo subido`);
      }

      const publicadoEn = new Date();
      await withScope(ctx, (db) =>
        db
          .update(deliverable)
          .set({
            publishedAt: publicadoEn,
            // RF-111: del contexto, no de un parámetro.
            publishedByType: ctx.actorType,
            publishedById: ctx.actorId,
            publishedByLabel: ctx.actorLabel,
          })
          .where(eq(deliverable.id, id)),
      );

      // Después de la escritura, y sin llevar título ni archivo: un webhook que
      // sale de nuestra infraestructura no es la puerta por donde viaja material
      // de un cliente (§10-6).
      await anunciarEntregable({
        deliverableId: id,
        projectId: fila.projectId,
        organizationId: fila.organizationId,
      });

      return {
        organizationId: fila.organizationId,
        cuerpo: {
          data: {
            id,
            project_id: fila.projectId,
            organization_id: fila.organizationId,
            family_id: fila.familyId,
            version: fila.version,
            title: fila.title,
            type: fila.type,
            source: fila.type === "link" ? "link" : "file",
            visibility: fila.visibility,
            published_at: publicadoEn.toISOString(),
            published_by: {
              actor_type: ctx.actorType,
              actor_id: ctx.actorId,
              actor_label: ctx.actorLabel,
            },
            created_at: fila.createdAt.toISOString(),
          },
        },
      };
  })();
}

/* ══════════════════════════════════════════════════════════════════════════
 * 3 · POST /announcements
 * ══════════════════════════════════════════════════════════════════════════ */

export async function crearAvisoPorApi(
  ctx: AuthContext,
  datos: {
    organizationId: string;
    titulo: string;
    cuerpoMd: string;
    publicar: boolean;
    idioma: string;
  },
) {
  const id = crypto.randomUUID();
  return (async () => {
      const empresas = await withScope(ctx, (db) =>
        db
          .select({ id: organization.id })
          .from(organization)
          .where(eq(organization.id, datos.organizationId))
          .limit(1),
      );
      /**
       * La empresa se verifica **contra el contexto** (§2.6). `organization` no
       * está bajo política de fila —es la tabla de las empresas mismas—, así que
       * aquí la comprobación es explícita: una clave acotada solo puede escribir
       * en la suya.
       */
      const ajena = ctx.organizationId !== null && ctx.organizationId !== datos.organizationId;
      if (empresas.length === 0 || ajena) {
        throw new ErrorDeApi(404, `empresa ${datos.organizationId} fuera del universo de la clave`);
      }

      const publicadoEn = datos.publicar ? new Date() : null;
      await withScope(ctx, (db) =>
        db.insert(announcement).values({
          id,
          organizationId: datos.organizationId,
          title: datos.titulo,
          // Se guarda **tal cual** y se sanea al renderizar (RNF-31): el portal
          // lo pasa por `components/Markdown`, que no produce HTML arbitrario.
          bodyMd: datos.cuerpoMd,
          locale: datos.idioma,
          publishedAt: publicadoEn,
          // Sin publicar no hay autor: lo impone
          // `announcement_published_needs_author` en la base, no esta función.
          authorType: datos.publicar ? ctx.actorType : null,
          authorId: datos.publicar ? ctx.actorId : null,
          authorLabel: datos.publicar ? ctx.actorLabel : null,
        }),
      );

      if (datos.publicar) {
        await anunciarAviso({ announcementId: id, organizationId: datos.organizationId });
      }

      return {
        organizationId: datos.organizationId,
        cuerpo: {
          data: {
            id,
            organization_id: datos.organizationId,
            title: datos.titulo,
            body_md: datos.cuerpoMd,
            locale: datos.idioma,
            published_at: publicadoEn?.toISOString() ?? null,
            author: datos.publicar
              ? { actor_type: ctx.actorType, actor_id: ctx.actorId, actor_label: ctx.actorLabel }
              : null,
            created_at: new Date().toISOString(),
          },
        },
      };
  })();
}

/* ══════════════════════════════════════════════════════════════════════════
 * 4 · POST /events
 * ══════════════════════════════════════════════════════════════════════════ */

/**
 * El catálogo inicial de `kind` (`data_model` §3.11). **No es una lista
 * cerrada**: un `kind` fuera de ella se acepta y se devuelve
 * `schema_known: false`, que es exactamente lo que RF-146 pide para que un
 * agente validador registre un veredicto estructurado **sin migrar el esquema**.
 *
 * Decir la verdad sobre eso no cuesta nada y evita un fallo silencioso: un
 * agente que se equivoca escribiendo `kind` —`reviews.verdict` en vez de
 * `review.verdict`— no se enteraría nunca sin este campo.
 */
export const KINDS_CONOCIDOS = [
  "deliverable.created",
  "deliverable.published",
  "announcement.created",
  "event.recorded",
] as const;

export async function registrarEvento(
  ctx: AuthContext,
  datos: { kind: string; organizationId: string | null; payload: Record<string, unknown> },
) {
  const id = crypto.randomUUID();
  return (async () => {
      if (datos.organizationId) {
        const empresas = await withScope(ctx, (db) =>
          db
            .select({ id: organization.id })
            .from(organization)
            .where(eq(organization.id, datos.organizationId as string))
            .limit(1),
        );
        const ajena = ctx.organizationId !== null && ctx.organizationId !== datos.organizationId;
        if (empresas.length === 0 || ajena) {
          throw new ErrorDeApi(404, `empresa ${datos.organizationId} fuera del universo de la clave`);
        }
      }

      const creadoEn = new Date();
      await withScope(ctx, (db) =>
        db.insert(agentEvent).values({
          id,
          apiKeyId: ctx.actorType === "api_key" ? ctx.actorId : null,
          organizationId: datos.organizationId,
          kind: datos.kind,
          payloadJson: datos.payload,
          createdAt: creadoEn,
        }),
      );

      return {
        organizationId: datos.organizationId,
        cuerpo: {
          data: {
            id,
            kind: datos.kind,
            organization_id: datos.organizationId,
            api_key: ctx.actorType === "api_key" ? { id: ctx.actorId, name: ctx.actorLabel } : null,
            payload: datos.payload,
            schema_known: (KINDS_CONOCIDOS as readonly string[]).includes(datos.kind),
            created_at: creadoEn.toISOString(),
          },
        },
      };
  })();
}
