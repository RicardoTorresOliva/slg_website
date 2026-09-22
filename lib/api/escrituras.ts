/**
 * escrituras.ts — Las **doce escrituras** de `/api/v1`: cuatro de DU-23
 * (RF-102 · RF-104 · RF-105 · RF-111 · RF-146), cinco de la Academy, DU-30
 * (RF-153 · RF-156), dos del proyecto que nace en el CRM (D-162) y una de la
 * empresa que el CRM crea o encuentra por su identificador (D-163).
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
import { and, eq, sql } from "drizzle-orm";

import {
  actualizarHito,
  cerrarPendiente,
  crearHito,
  crearNoticia,
  crearPendiente,
  type EstadoDeHito,
  type Hito,
  type Importancia,
  type Noticia,
  type Pendiente,
  type QuienCierra,
} from "../academy/index.ts";
import type { AuthContext } from "../db/context.ts";
import {
  agentEvent,
  announcement,
  contact,
  deliverable,
  organization,
  project,
  PROJECT_SERVICES,
  user,
} from "../db/schema.ts";
import { withScope } from "../db/scope.ts";
import { adaptadorDeArchivos, validarSubida } from "../files/index.ts";
import { DatoInvalido, slugDe } from "../hq/empresas.ts";
import { destinoDe } from "../hq/entregables.ts";
import { anunciarAviso, anunciarEntregable } from "../webhooks/index.ts";

import { ErrorDeApi } from "./errores.ts";
import { empresaDelContrato, empresaVisible, proyectoDelContrato } from "./lecturas.ts";

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
 *
 * Las de la Academy (5–9) no escriben por su cuenta: delegan en `lib/academy`,
 * que es la única puerta a esas tres tablas y que apunta las escrituras de las
 * personas —HQ, portal—. Para una clave de API omite el apunte de dominio por
 * exactamente esta razón (`lib/academy/comun.ts`).
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
        const firmada = await adaptadorDeArchivos().firmarSubida({
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
        const esta = await adaptadorDeArchivos().existe({ bucket: "deliverables", clave: fila.fileKey });
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

/* ══════════════════════════════════════════════════════════════════════════
 * M6 · Academy (DU-30 · RF-153 · RF-156) — lo común a las cinco
 * ══════════════════════════════════════════════════════════════════════════ */

/**
 * **EL 404 SE DECIDE ANTES DE TOCAR LA PUERTA.** La empresa o el proyecto de la
 * ruta se comprueban con el contexto de la clave (§2.6): ajeno o inexistente
 * responden **404 con el mismo cuerpo**, nunca 403, porque un 403 confirmaría
 * que existen (RF-71). Solo después se llama a `lib/academy`, que vuelve a
 * exigir la acción y a validar: la API no es un atajo a la puerta, es un
 * cliente más de ella.
 */
async function proyectoVisibleOr404(ctx: AuthContext, projectId: string): Promise<void> {
  const filas = await withScope(ctx, (db) =>
    db.select({ id: project.id }).from(project).where(eq(project.id, projectId)).limit(1),
  );
  if (filas.length === 0) throw new ErrorDeApi(404, `proyecto ${projectId} fuera del universo de la clave`);
}

/**
 * De los códigos de campo de la puerta a los nombres del contrato. Existe como
 * red: el catálogo ya validó el cuerpo, así que un `DatoInvalido` aquí es un
 * caso que la declaración no supo prever, y tiene que salir como 422 con su
 * campo y no como un 500 mudo.
 */
const CAMPO_DEL_CONTRATO: Readonly<Record<string, string>> = {
  titulo: "title",
  fuente: "source_url",
  resumen: "summary_md",
  comentario: "comment_md",
  importancia: "importance",
  publicar: "publish",
  fecha: "due_at",
  posicion: "position",
  cierra: "closes_by",
};

async function porLaPuerta<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof DatoInvalido) {
      throw new ErrorDeApi(422, `la puerta rechazó ${e.campo}`, [
        { field: CAMPO_DEL_CONTRATO[e.campo] ?? e.campo, code: "invalid" },
      ]);
    }
    throw e;
  }
}

function actor(tipo: string | null, id: string | null, etiqueta: string | null) {
  return tipo ? { actor_type: tipo, actor_id: id, actor_label: etiqueta } : null;
}

function noticiaDelContrato(n: Noticia) {
  return {
    id: n.id,
    organization_id: n.organizationId,
    title: n.titulo,
    source_url: n.fuenteUrl,
    summary_md: n.resumenMd,
    comment_md: n.comentarioMd,
    importance: n.importancia,
    published_at: n.publicadaEn,
    author: actor(n.autorTipo, n.autorId, n.autor),
    created_at: n.creadaEn,
  };
}

function hitoDelContrato(h: Hito) {
  return {
    id: h.id,
    project_id: h.projectId,
    organization_id: h.organizationId,
    title: h.titulo,
    due_at: h.venceEn,
    status: h.estado,
    position: h.posicion,
    done_at: h.hechoEn,
    created_at: h.creadoEn,
    updated_at: h.actualizadoEn,
  };
}

function pendienteDelContrato(p: Pendiente) {
  return {
    id: p.id,
    project_id: p.projectId,
    organization_id: p.organizationId,
    title: p.titulo,
    due_at: p.venceEn,
    status: p.estado,
    closes_by: p.cierra,
    done_at: p.hechoEn,
    done_by: actor(p.hechoPorTipo, p.hechoPorId, p.hechoPor),
    created_at: p.creadoEn,
    updated_at: p.actualizadoEn,
  };
}

/* ══════════════════════════════════════════════════════════════════════════
 * 5 · POST /organizations/{id}/news
 * ══════════════════════════════════════════════════════════════════════════ */

export async function crearNoticiaPorApi(
  ctx: AuthContext,
  datos: {
    organizationId: string;
    titulo: string;
    fuenteUrl: string | null;
    resumenMd: string;
    comentarioMd: string;
    importancia: number;
    publicar: boolean;
  },
) {
  if (!(await empresaVisible(ctx, datos.organizationId))) {
    throw new ErrorDeApi(404, `empresa ${datos.organizationId} fuera del universo de la clave`);
  }
  // Como `external_url` en los entregables: un esquema ejecutable en un enlace
  // que un cliente abre desde su portal no es un dato, es un ataque.
  if (datos.fuenteUrl) {
    let protocolo = "";
    try {
      protocolo = new URL(datos.fuenteUrl).protocol;
    } catch {
      throw new ErrorDeApi(422, "source_url ilegible", [{ field: "source_url", code: "malformed" }]);
    }
    if (protocolo !== "http:" && protocolo !== "https:") {
      throw new ErrorDeApi(422, "source_url con esquema no admitido", [
        { field: "source_url", code: "scheme_not_allowed" },
      ]);
    }
  }

  const noticia = await porLaPuerta(() =>
    crearNoticia(ctx, {
      organizationId: datos.organizationId,
      titulo: datos.titulo,
      fuenteUrl: datos.fuenteUrl,
      resumenMd: datos.resumenMd,
      comentarioMd: datos.comentarioMd,
      // El catálogo ya acotó el entero a 1…3: aquí solo se le pone el nombre.
      importancia: datos.importancia as Importancia,
      publicar: datos.publicar,
    }),
  );
  return { organizationId: noticia.organizationId, cuerpo: { data: noticiaDelContrato(noticia) } };
}

/* ══════════════════════════════════════════════════════════════════════════
 * 6 · POST /projects/{id}/milestones
 * ══════════════════════════════════════════════════════════════════════════ */

export async function crearHitoPorApi(
  ctx: AuthContext,
  datos: { projectId: string; titulo: string; venceEn: Date; posicion: number | null },
) {
  await proyectoVisibleOr404(ctx, datos.projectId);
  const hito = await porLaPuerta(() => crearHito(ctx, datos));
  return { organizationId: hito.organizationId, cuerpo: { data: hitoDelContrato(hito) } };
}

/* ══════════════════════════════════════════════════════════════════════════
 * 7 · POST /milestones/{id}/done · POST /milestones/{id}/reopen
 * ══════════════════════════════════════════════════════════════════════════ */

export async function cambiarEstadoDeHitoPorApi(ctx: AuthContext, id: string, estado: EstadoDeHito) {
  // `null` es «no existe para esta clave»: ajeno o inexistente, el mismo 404.
  const hito = await porLaPuerta(() => actualizarHito(ctx, id, { estado }));
  if (!hito) throw new ErrorDeApi(404, `hito ${id} fuera del universo de la clave`);
  return { organizationId: hito.organizationId, cuerpo: { data: hitoDelContrato(hito) } };
}

/* ══════════════════════════════════════════════════════════════════════════
 * 8 · POST /projects/{id}/action-items
 * ══════════════════════════════════════════════════════════════════════════ */

export async function crearPendientePorApi(
  ctx: AuthContext,
  datos: { projectId: string; titulo: string; venceEn: Date | null; cierra: QuienCierra },
) {
  await proyectoVisibleOr404(ctx, datos.projectId);
  const pendiente = await porLaPuerta(() => crearPendiente(ctx, datos));
  return { organizationId: pendiente.organizationId, cuerpo: { data: pendienteDelContrato(pendiente) } };
}

/* ══════════════════════════════════════════════════════════════════════════
 * 9 · POST /action-items/{id}/done
 * ══════════════════════════════════════════════════════════════════════════ */

export async function cerrarPendientePorApi(ctx: AuthContext, id: string) {
  const pendiente = await porLaPuerta(() => cerrarPendiente(ctx, id));
  if (!pendiente) throw new ErrorDeApi(404, `pendiente ${id} fuera del universo de la clave`);
  return { organizationId: pendiente.organizationId, cuerpo: { data: pendienteDelContrato(pendiente) } };
}

/* ══════════════════════════════════════════════════════════════════════════
 * D-162 · El proyecto nace en el CRM; este sitio lo recibe — lo común a las dos
 * ══════════════════════════════════════════════════════════════════════════ */

/**
 * **NO PASA POR `lib/hq/proyectos.ts`, Y NO ES UN OLVIDO.** Esa puerta es la de
 * las personas: resuelve «asignados» contra `owner_user_id` y apunta la
 * auditoría con `conAuditoria`, que aquí escribiría la segunda fila que D-140
 * prohíbe (el manejador ya apunta toda llamada). Lo que sí se comparte es la
 * forma del proyecto en el contrato (`proyectoDelContrato`, de las lecturas) y
 * la lista de servicios (`PROJECT_SERVICES`, la de la ficha del sitio).
 *
 * **EL SERVICIO SE VUELVE A MIRAR AQUÍ, AUNQUE EL CATÁLOGO YA LO MIRÓ.** Hasta
 * la migración 0024 había una tercera defensa: el `CHECK` de PostgreSQL. Ya no
 * está —listaba los servicios de un solo cliente (D-166)—, así que la última
 * palabra antes de la inserción es esta. Una defensa que depende de que otra
 * capa se acuerde se pierde en el primer refactor.
 *
 * `owner_user_id` queda nulo a propósito: el responsable es una persona de
 * SLG y se asigna en HQ, no lo decide el CRM.
 */

/** Un proyecto con su responsable, **bajo el contexto de la clave**. */
async function proyectoConDueno(ctx: AuthContext, projectId: string) {
  const filas = await withScope(ctx, (db) =>
    db
      .select({ p: project, duenoId: user.id, duenoNombre: user.name })
      .from(project)
      .leftJoin(user, eq(user.id, project.ownerUserId))
      .where(eq(project.id, projectId))
      .limit(1),
  );
  const fila = filas[0];
  if (!fila) return null;
  return {
    organizationId: fila.p.organizationId,
    cuerpo: {
      data: proyectoDelContrato(fila.p, fila.duenoId ? { id: fila.duenoId, name: fila.duenoNombre } : null),
    },
  };
}

/**
 * ¿Chocó con `uq_project_crm_id`? Drizzle deja el error del driver en `cause`
 * (y el driver, a veces, directamente en `code`): se miran los dos sitios.
 */
function chocaConElIndiceDelCrm(e: unknown): boolean {
  const mira = (x: unknown) =>
    typeof x === "object" &&
    x !== null &&
    (x as { code?: unknown }).code === "23505" &&
    String((x as { constraint_name?: unknown }).constraint_name ?? "") === "uq_project_crm_id";
  return mira(e) || mira((e as { cause?: unknown })?.cause);
}

const CRM_ID_TOMADO = () =>
  new ErrorDeApi(422, "crm_project_id ya pertenece a un proyecto de otra empresa", [
    { field: "crm_project_id", code: "already_taken" },
  ]);

/* ══════════════════════════════════════════════════════════════════════════
 * 10 · POST /organizations/{id}/projects
 * ══════════════════════════════════════════════════════════════════════════ */

/**
 * **IDEMPOTENTE POR `crm_project_id`.** Un reintento del CRM tras una llamada
 * cortada no puede duplicar la carpeta del cliente: si esa empresa ya tiene un
 * proyecto con ese identificador, se devuelve **200 con el existente**, ni se
 * crea otro ni se responde 409. El índice único parcial de 0019 sostiene la
 * promesa aunque dos reintentos lleguen a la vez: el segundo choca, se relee y
 * devuelve el mismo proyecto.
 *
 * El mismo `crm_project_id` en **otra** empresa es un dato mal enviado, no un
 * reintento: 422 sobre el campo. Un proyecto del CRM pertenece a una sola.
 */
export async function crearProyectoPorApi(
  ctx: AuthContext,
  datos: {
    organizationId: string;
    nombre: string;
    servicio: string;
    crmProjectId: string;
    estado: string;
    empiezaEn: Date | null;
    terminaEn: Date | null;
  },
) {
  if (!(await empresaVisible(ctx, datos.organizationId))) {
    throw new ErrorDeApi(404, `empresa ${datos.organizationId} fuera del universo de la clave`);
  }
  // El catálogo midió la longitud; que no sea solo espacios lo mira HQ
  // (`validar`) y aquí también: un proyecto sin nombre no se elige en el portal.
  if (datos.nombre.trim().length === 0) {
    throw new ErrorDeApi(422, "name en blanco", [{ field: "name", code: "invalid" }]);
  }
  // La lista es la de la ficha: fuera de ella, 422 con el mismo código que el
  // catálogo, y nunca un proyecto con un nombre que la oferta no tiene.
  if (!PROJECT_SERVICES.includes(datos.servicio)) {
    throw new ErrorDeApi(422, "service fuera de la oferta", [{ field: "service", code: "not_in_vocabulary" }]);
  }
  // Como en HQ: un proyecto que termina antes de empezar es un error de teclado
  // que se descubre en pantalla meses después.
  if (datos.empiezaEn && datos.terminaEn && datos.terminaEn < datos.empiezaEn) {
    throw new ErrorDeApi(422, "ends_at anterior a starts_at", [{ field: "ends_at", code: "before_starts_at" }]);
  }

  const yaExiste = async () => {
    const filas = await withScope(ctx, (db) =>
      db
        .select({ id: project.id, organizationId: project.organizationId })
        .from(project)
        .where(eq(project.crmProjectId, datos.crmProjectId))
        .limit(1),
    );
    return filas[0] ?? null;
  };

  const previo = await yaExiste();
  if (previo) {
    if (previo.organizationId !== datos.organizationId) throw CRM_ID_TOMADO();
    const existente = await proyectoConDueno(ctx, previo.id);
    if (!existente) throw new ErrorDeApi(404, `proyecto ${previo.id} fuera del universo de la clave`);
    return { ...existente, creado: false };
  }

  const id = crypto.randomUUID();
  try {
    await withScope(ctx, (db) =>
      db.insert(project).values({
        id,
        organizationId: datos.organizationId,
        name: datos.nombre.trim(),
        service: datos.servicio,
        status: datos.estado,
        ownerUserId: null,
        startsAt: datos.empiezaEn,
        endsAt: datos.terminaEn,
        crmProjectId: datos.crmProjectId,
      }),
    );
  } catch (e) {
    if (!chocaConElIndiceDelCrm(e)) throw e;
    // La carrera: otro reintento entró primero. Si es de esta empresa, es el
    // mismo proyecto; si no se ve —de otra empresa, o fuera del universo de una
    // clave acotada—, el identificador está tomado.
    const ganador = await yaExiste();
    if (ganador && ganador.organizationId === datos.organizationId) {
      const existente = await proyectoConDueno(ctx, ganador.id);
      if (existente) return { ...existente, creado: false };
    }
    throw CRM_ID_TOMADO();
  }

  const creado = await proyectoConDueno(ctx, id);
  if (!creado) throw new ErrorDeApi(404, `proyecto ${id} fuera del universo de la clave`);
  return { ...creado, creado: true };
}

/* ══════════════════════════════════════════════════════════════════════════
 * 11 · POST /projects/{id}/close · POST /projects/{id}/reopen
 * ══════════════════════════════════════════════════════════════════════════ */

/**
 * Como los hitos: un acto con nombre, no un campo que se parchea. Idempotente
 * —cerrar lo cerrado o reabrir lo activo responde 200 sin tocar la fila— y con
 * el 404 decidido antes de escribir: ajeno o inexistente, el mismo cuerpo.
 * `paused` solo se pone desde HQ; el CRM sabe si un proyecto está o no.
 */
export async function cambiarEstadoDeProyectoPorApi(ctx: AuthContext, id: string, estado: "active" | "closed") {
  const filas = await withScope(ctx, (db) =>
    db.select({ status: project.status }).from(project).where(eq(project.id, id)).limit(1),
  );
  const actual = filas[0];
  if (!actual) throw new ErrorDeApi(404, `proyecto ${id} fuera del universo de la clave`);

  if (actual.status !== estado) {
    await withScope(ctx, (db) =>
      db
        .update(project)
        .set({ status: estado })
        .where(and(eq(project.id, id), eq(project.status, actual.status))),
    );
  }

  const proyecto = await proyectoConDueno(ctx, id);
  if (!proyecto) throw new ErrorDeApi(404, `proyecto ${id} fuera del universo de la clave`);
  return proyecto;
}

/* ══════════════════════════════════════════════════════════════════════════
 * 12 · POST /organizations
 * ══════════════════════════════════════════════════════════════════════════ */

/**
 * **NO PASA POR `lib/hq/empresas.ts`, POR LA MISMA RAZÓN QUE EL PROYECTO** (10):
 * esa puerta audita con `conAuditoria` y aquí escribiría la segunda fila que
 * D-140 prohíbe. Lo que sí se comparte es la derivación del slug (`slugDe`) y
 * la forma de la empresa en el contrato (`empresaDelContrato`).
 */

/** Una empresa con su contacto principal, **bajo el contexto de la clave**. */
async function empresaConContacto(ctx: AuthContext, organizationId: string) {
  const filas = await withScope(ctx, (db) =>
    db
      .select({ o: organization, contactoId: contact.id, contactoNombre: contact.name })
      .from(organization)
      .leftJoin(contact, and(eq(contact.organizationId, organization.id), eq(contact.isPrimary, true)))
      .where(eq(organization.id, organizationId))
      .limit(1),
  );
  const fila = filas[0];
  if (!fila) return null;
  return {
    organizationId: fila.o.id,
    cuerpo: {
      data: empresaDelContrato(fila.o, fila.contactoId ? { id: fila.contactoId, name: fila.contactoNombre } : null),
    },
  };
}

/**
 * ¿Con qué índice único chocó? Drizzle deja el error del driver en `cause` (y
 * el driver, a veces, directamente en `code`): se miran los dos sitios. Aquí
 * hay dos índices que pueden saltar —el del slug y el del CRM— y responden
 * distinto, así que hace falta el nombre, no solo el `23505`.
 */
function indiceQueChoco(e: unknown): "uq_organization_slug" | "uq_organization_crm_id" | null {
  const mira = (x: unknown): string | null =>
    typeof x === "object" && x !== null && (x as { code?: unknown }).code === "23505"
      ? String((x as { constraint_name?: unknown }).constraint_name ?? "")
      : null;
  const nombre = mira(e) ?? mira((e as { cause?: unknown })?.cause);
  if (nombre === "uq_organization_slug" || nombre === "uq_organization_crm_id") return nombre;
  return null;
}

const SLUG_TOMADO = () =>
  new ErrorDeApi(422, "slug ya pertenece a otra empresa", [{ field: "slug", code: "already_taken" }]);

/**
 * **IDEMPOTENTE POR `crm_company_id`.** Si ya hay una empresa con ese
 * identificador, se devuelve **200 con la existente** y el resto del cuerpo se
 * ignora: la que manda es la que ya está. Si no, se crea como cliente activa
 * (`type = client`, `status = active`) y responde 201. El índice único parcial
 * de 0020 sostiene la promesa aunque dos reintentos lleguen a la vez: el
 * segundo choca, se relee y devuelve la misma empresa.
 *
 * **UNA CLAVE ACOTADA A UNA EMPRESA NO CREA EMPRESAS: 403.** Es el criterio de
 * `crearProyectoPorApi` para la empresa ajena —su universo es exactamente la
 * suya—, pero sin recurso en la ruta no hay «no existe» que responder: crear
 * otra empresa está fuera de lo que esa clave puede hacer, y decirlo no revela
 * la existencia de nadie.
 *
 * Un `slug` ya usado por otra empresa es un dato mal enviado, no un reintento:
 * 422 sobre el campo. Y como el slug se deriva del nombre cuando falta,
 * repetir un nombre con otro `crm_company_id` cae aquí.
 */
export async function crearEmpresaPorApi(
  ctx: AuthContext,
  datos: { nombre: string; crmCompanyId: string; slug: string | null },
) {
  if (ctx.organizationId !== null) {
    throw new ErrorDeApi(403, "una clave acotada a una empresa no puede crear empresas");
  }
  // El catálogo midió la longitud; que no sea solo espacios lo mira HQ
  // (`validar`) y aquí también: una empresa sin nombre no se elige en HQ.
  const nombre = datos.nombre.trim();
  if (nombre.length === 0) {
    throw new ErrorDeApi(422, "name en blanco", [{ field: "name", code: "invalid" }]);
  }
  const slug = slugDe(datos.slug?.trim() || nombre);
  if (slug.length === 0) {
    throw new ErrorDeApi(422, "slug vacío tras normalizar", [{ field: "slug", code: "invalid" }]);
  }

  const yaExiste = async () => {
    const filas = await withScope(ctx, (db) =>
      db
        .select({ id: organization.id })
        .from(organization)
        .where(eq(organization.crmCompanyId, datos.crmCompanyId))
        .limit(1),
    );
    return filas[0]?.id ?? null;
  };

  const previo = await yaExiste();
  if (previo) {
    const existente = await empresaConContacto(ctx, previo);
    if (!existente) throw new ErrorDeApi(404, `empresa ${previo} fuera del universo de la clave`);
    return { ...existente, creado: false };
  }

  const id = crypto.randomUUID();
  try {
    await withScope(ctx, (db) =>
      db.insert(organization).values({
        id,
        name: nombre,
        slug,
        type: "client",
        status: "active",
        crmCompanyId: datos.crmCompanyId,
      }),
    );
  } catch (e) {
    const indice = indiceQueChoco(e);
    if (indice === "uq_organization_slug") throw SLUG_TOMADO();
    if (indice !== "uq_organization_crm_id") throw e;
    // La carrera: otro reintento entró primero con el mismo identificador. Es
    // la misma empresa; se relee y se devuelve.
    const ganador = await yaExiste();
    const existente = ganador ? await empresaConContacto(ctx, ganador) : null;
    if (!existente) throw new ErrorDeApi(404, "empresa del CRM fuera del universo de la clave");
    return { ...existente, creado: false };
  }

  const creada = await empresaConContacto(ctx, id);
  if (!creada) throw new ErrorDeApi(404, `empresa ${id} fuera del universo de la clave`);
  return { ...creada, creado: true };
}
