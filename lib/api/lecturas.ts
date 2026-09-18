/**
 * lecturas.ts — Las **cuatro lecturas** de `/api/v1` (DU-22 · RF-100 · RF-101 ·
 * RF-103 · RF-110).
 *
 * TODAS SE RESUELVEN CON `withScope`, NUNCA CON UN `WHERE organization_id`. El
 * identificador que llega por la ruta se comprueba de forma y después **no entra
 * en ninguna consulta** (§2.6): quien acota es la política de fila con el
 * contexto de la clave. Por eso «empresa ajena → 404» es cierto sin comprobación
 * añadida: la fila sencillamente no vuelve.
 *
 * LA FORMA DE LA RESPUESTA ES CONTRATO. Cada campo que sale de aquí está en
 * `api_contracts` §3; lo que **no** está, no sale. En particular
 * `GET /captures` **no lleva etapa, propietario, valor, moneda, próximo paso ni
 * puntuación**: eso es pipeline, vive en el CRM y la frontera (a) de `scope.md`
 * lo prohíbe (RF-57, RF-110). Enumerarlo aquí es lo que permite que una revisión
 * lo verifique en vez de creerlo.
 *
 * **NINGUNA RESPUESTA LLEVA URL DE DESCARGA DE UN ARCHIVO** (§3.6). Se devuelve
 * el `checksum_sha256`. Emitir aquí una URL firmada convertiría cada respuesta
 * en una credencial de lectura con vida propia, imposible de revocar y fácil de
 * acabar registrando en el log de un agente (R-11, R-14).
 *
 * TRES DESVIACIONES DEL DOCUMENTO DE CONTRATO, DICHAS EN VOZ ALTA. El contrato
 * se escribió antes que el esquema y describe tres campos que **la base no
 * tiene**: `organization.updated_at`, `project.updated_at` y el `mime_type` y
 * `size_bytes` de un entregable. No se inventan —un `updated_at` igual al
 * `created_at` es un dato falso— : los dos primeros **no se sirven** y los dos
 * últimos viajan como `null`, que es lo que son. Queda anotado en el `work_log`
 * para que el contrato se corrija o el esquema crezca, pero con una decisión
 * tomada y no con un campo mentiroso.
 */
import { and, eq, gte, lt, sql } from "drizzle-orm";

import { enlaceAlContacto } from "../crm/index.ts";
import type { AuthContext } from "../db/context.ts";
import {
  contact,
  deliverable,
  downloadEvent,
  leadCapture,
  organization,
  project,
  user,
} from "../db/schema.ts";
import { withScope, withSystemScope } from "../db/scope.ts";

import { decodificarCursor, despuesDelCursor, ordenDeColeccion, paginar, type Pagina } from "./cursor.ts";
import { ErrorDeApi } from "./errores.ts";

/**
 * El orden de las cuatro colecciones es `created_at DESC, id DESC`, y el cursor
 * pide «lo estrictamente menor que esta posición». El desempate por `id` no es
 * adorno: dos filas con la misma marca de tiempo —que en una inserción por lote
 * es lo normal— harían que una página repitiera o saltara elementos.
 */

type Envoltorio<T> = { readonly data: T[]; readonly page: Pagina };

/* ══════════════════════════════════════════════════════════════════════════
 * 1 · GET /captures — evidencia, no gestión de leads
 * ══════════════════════════════════════════════════════════════════════════ */

export type FiltrosDeCapturas = {
  readonly since: Date | null;
  readonly until: Date | null;
  readonly source: string | null;
  readonly crmSyncStatus: string | null;
  readonly docCode: string | null;
  readonly limit: number;
  readonly cursor: string | null;
};

export async function capturas(
  ctx: AuthContext,
  filtros: FiltrosDeCapturas,
  documentos: ReadonlyMap<string, { docCode: string; titulo: string; estado: string }>,
): Promise<Envoltorio<unknown>> {
  /**
   * **SOLO UNA CLAVE DE SLG, Y ANTES ESTO NO SE COMPROBABA EN NINGUNA PARTE.**
   *
   * Lo encontró la revisión independiente, y era una fuga de datos personales:
   * `lead_capture` **no tiene `organization_id`** —una captura es de un visitante
   * anónimo, no de una empresa cliente— así que la política de fila no la acota y
   * esta consulta va por `withSystemScope`. El comentario que había aquí decía
   * «solo SLG y una clave con ese alcance ven capturas»… y el «solo SLG» no
   * estaba implementado en ninguna capa. Una clave acotada a una empresa con
   * `captures:read` leía el correo, el nombre, la empresa y el cargo de **todos
   * los visitantes del sitio**.
   *
   * Ahora son dos capas: esta, y la validación de `lib/hq/claves.ts`, que impide
   * crear la combinación. La de aquí manda: una clave creada antes del arreglo
   * sigue existiendo y tiene que rebotar.
   */
  if (ctx.organizationId !== null) {
    throw new ErrorDeApi(
      403,
      "clave acotada a una empresa pidiendo capturas: el embudo público no pertenece a ninguna",
    );
  }

  const posicion = filtros.cursor ? decodificarCursor("captures", filtros.cursor) : null;

  const filas = await withSystemScope(
    "DU-22 · `GET /api/v1/captures` — las capturas no pertenecen a ninguna empresa " +
      "cliente: son evidencia del embudo público, y el alcance de la clave es quien " +
      "decide si se ven.",
    (db) =>
      db
        .select({
          c: leadCapture,
          d: downloadEvent,
        })
        .from(leadCapture)
        .leftJoin(downloadEvent, eq(downloadEvent.leadCaptureId, leadCapture.id))
        .where(
          and(
            filtros.since ? gte(leadCapture.createdAt, filtros.since) : undefined,
            filtros.until ? lt(leadCapture.createdAt, filtros.until) : undefined,
            filtros.source ? eq(leadCapture.source, filtros.source) : undefined,
            filtros.crmSyncStatus ? eq(leadCapture.crmSyncStatus, filtros.crmSyncStatus) : undefined,
            filtros.docCode ? eq(leadCapture.downloadSlug, filtros.docCode.toLowerCase()) : undefined,
            posicion ? despuesDelCursor(leadCapture.createdAt, leadCapture.id, posicion) : undefined,
          ),
        )
        .orderBy(...ordenDeColeccion(leadCapture.createdAt, leadCapture.id))
        .limit(filtros.limit + 1),
  );

  const { data, page } = paginar("captures", filas, filtros.limit, (f) => ({
    createdAt: f.c.createdAt,
    id: f.c.id,
  }));

  return {
    page,
    data: data.map(({ c, d }) => {
      const doc = c.downloadSlug ? documentos.get(c.downloadSlug) : undefined;
      return {
        id: c.id,
        created_at: c.createdAt.toISOString(),
        source: c.source,
        email: c.email,
        email_domain: c.emailDomain,
        name: c.name,
        last_name: c.lastName,
        company: c.company,
        job_title: c.jobTitle,
        locale: c.locale,
        page_path: c.pagePath,
        utm: {
          source: c.utm?.source ?? null,
          medium: c.utm?.medium ?? null,
          campaign: c.utm?.campaign ?? null,
          term: c.utm?.term ?? null,
          content: c.utm?.content ?? null,
        },
        consent_at: c.consentAt.toISOString(),
        privacy_version: c.privacyVersion,
        // `null` cuando la captura no es de descarga: lo impone la restricción
        // `lead_capture_download_required`, no esta respuesta.
        download: c.downloadSlug
          ? {
              slug: c.downloadSlug,
              doc_code: doc?.docCode ?? c.downloadSlug.toUpperCase(),
              title: doc?.titulo ?? null,
              status: doc?.estado ?? null,
            }
          : null,
        // `null` mientras no se haya emitido firma: el caso de un documento
        // `coming-soon`, que captura el correo igual y no firma nada (RF-40).
        delivery: d
          ? {
              signed_url_issued_at: d.signedUrlIssuedAt.toISOString(),
              completed_at: d.completedAt?.toISOString() ?? null,
            }
          : null,
        crm: {
          sync_status: c.crmSyncStatus,
          mode: c.crmMode,
          contact_id: c.crmContactId,
          // SIEMPRE nulos en modo `contact_note`: la clave del CRM no puede
          // crear empresa ni oportunidad hoy (R-04). No es una carencia de esta
          // respuesta: es el hecho, y la base lo impone.
          company_id: c.crmCompanyId,
          opportunity_id: c.crmOpportunityId,
          attempts: c.crmAttempts,
          delivered_at: c.crmDeliveredAt?.toISOString() ?? null,
          // Viaja **saneado tal como está persistido** (RNF-32): sin cabeceras,
          // sin credencial, sin traza.
          last_error: c.crmLastError,
          // La MISMA función que construye el enlace del aviso por correo
          // (RF-54): una plantilla configurable en un solo sitio.
          contact_url: enlaceAlContacto(c.crmContactId),
        },
      };
    }),
  };
}

/* ══════════════════════════════════════════════════════════════════════════
 * 2 · GET /organizations
 * ══════════════════════════════════════════════════════════════════════════ */

export async function organizaciones(
  ctx: AuthContext,
  filtros: { status: string; tipo: string; limit: number; cursor: string | null },
): Promise<Envoltorio<unknown>> {
  const posicion = filtros.cursor ? decodificarCursor("organizations", filtros.cursor) : null;

  /**
   * `organization` **no está bajo política de fila** —no tiene
   * `organization_id`, es la tabla de las empresas mismas—, así que aquí el
   * acotado sí es explícito: si la clave lleva empresa, la colección tiene
   * exactamente un elemento, **el suyo**, y no es un filtro que el agente pueda
   * ampliar (§3.2). La comparación va contra `ctx`, que solo se construye desde
   * una clave verificada.
   */
  const suya = ctx.organizationId;

  const filas = await withScope(ctx, (db) =>
    db
      .select({
        o: organization,
        contactoId: contact.id,
        contactoNombre: contact.name,
      })
      .from(organization)
      .leftJoin(
        contact,
        and(eq(contact.organizationId, organization.id), eq(contact.isPrimary, true)),
      )
      .where(
        and(
          eq(organization.status, filtros.status),
          eq(organization.type, filtros.tipo),
          suya ? eq(organization.id, suya) : undefined,
          posicion ? despuesDelCursor(organization.createdAt, organization.id, posicion) : undefined,
        ),
      )
      .orderBy(...ordenDeColeccion(organization.createdAt, organization.id))
      .limit(filtros.limit + 1),
  );

  const { data, page } = paginar("organizations", filas, filtros.limit, (f) => ({
    createdAt: f.o.createdAt,
    id: f.o.id,
  }));

  return {
    page,
    data: data.map(({ o, contactoId, contactoNombre }) => ({
      id: o.id,
      name: o.name,
      slug: o.slug,
      type: o.type,
      status: o.status,
      // **Sin el correo del contacto**: un agente que lista empresas no
      // necesita datos personales para hacerlo (minimización, C.6).
      primary_contact: contactoId ? { id: contactoId, name: contactoNombre } : null,
      created_at: o.createdAt.toISOString(),
    })),
  };
}

/* ══════════════════════════════════════════════════════════════════════════
 * 3 · GET /organizations/{id}/projects
 * ══════════════════════════════════════════════════════════════════════════ */

export async function proyectosDeEmpresa(
  ctx: AuthContext,
  organizationId: string,
  filtros: { estado: string | null; servicio: string | null; limit: number; cursor: string | null },
): Promise<Envoltorio<unknown>> {
  const posicion = filtros.cursor ? decodificarCursor("projects", filtros.cursor) : null;

  const filas = await withScope(ctx, (db) =>
    db
      .select({ p: project, duenoId: user.id, duenoNombre: user.name })
      .from(project)
      .leftJoin(user, eq(user.id, project.ownerUserId))
      .where(
        and(
          /**
           * **La única consulta de este archivo en la que el id de la ruta entra
           * en un `WHERE`, y solo puede hacerlo porque la política de fila ya ha
           * acotado la tabla**: para una clave de empresa, pedir otra empresa
           * devuelve cero filas aunque el `WHERE` la nombre. Para una clave de
           * SLG, el `WHERE` es lo que selecciona la empresa pedida. El 404 de
           * §2.6 lo decide la ruta viendo que no vuelve nada.
           */
          eq(project.organizationId, organizationId),
          filtros.estado ? eq(project.status, filtros.estado) : undefined,
          filtros.servicio ? eq(project.service, filtros.servicio) : undefined,
          posicion ? despuesDelCursor(project.createdAt, project.id, posicion) : undefined,
        ),
      )
      .orderBy(...ordenDeColeccion(project.createdAt, project.id))
      .limit(filtros.limit + 1),
  );

  const { data, page } = paginar("projects", filas, filtros.limit, (f) => ({
    createdAt: f.p.createdAt,
    id: f.p.id,
  }));

  return {
    page,
    data: data.map(({ p, duenoId, duenoNombre }) => ({
      id: p.id,
      organization_id: p.organizationId,
      name: p.name,
      // Literal e intraducible (RF-14). Un agente que reciba `SLG Readiness`
      // sin guion bajo está leyendo un dato corrupto — y la base lo habría
      // rechazado antes, con `project_service_literal`.
      service: p.service,
      status: p.status,
      owner: duenoId ? { id: duenoId, name: duenoNombre } : null,
      // Fechas de calendario, sin hora y sin huso (§3.3).
      starts_at: p.startsAt ? p.startsAt.toISOString().slice(0, 10) : null,
      ends_at: p.endsAt ? p.endsAt.toISOString().slice(0, 10) : null,
      created_at: p.createdAt.toISOString(),
    })),
  };
}

/** ¿Existe esa empresa **para esta clave**? Si no, la ruta responde 404. */
export async function empresaVisible(ctx: AuthContext, organizationId: string): Promise<boolean> {
  const filas = await withScope(ctx, (db) =>
    db
      .select({ id: organization.id })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1),
  );
  if (filas.length === 0) return false;
  return ctx.organizationId === null || ctx.organizationId === organizationId;
}

/* ══════════════════════════════════════════════════════════════════════════
 * 4 · GET /projects/{id}/deliverables
 * ══════════════════════════════════════════════════════════════════════════ */

export async function entregablesDeProyecto(
  ctx: AuthContext,
  projectId: string,
  filtros: {
    tipo: string | null;
    publicado: boolean | null;
    soloUltima: boolean;
    limit: number;
    cursor: string | null;
  },
): Promise<Envoltorio<unknown> | null> {
  const posicion = filtros.cursor ? decodificarCursor("deliverables", filtros.cursor) : null;

  // El proyecto primero: si la política de fila no lo devuelve, es 404 y no se
  // consulta nada más (§2.6).
  const proyecto = await withScope(ctx, (db) =>
    db.select({ id: project.id }).from(project).where(eq(project.id, projectId)).limit(1),
  );
  if (proyecto.length === 0) return null;

  /**
   * **La regla de visibilidad de §3.6.** Una clave acotada a una empresa es, por
   * definición, una clave que puede acabar operada desde el lado del cliente:
   * darle lo `internal` reproduciría por API la fuga que RF-89 prohíbe por
   * interfaz. Una clave de SLG ve todo el proyecto.
   */
  const acotada = ctx.organizationId !== null;

  const filas = await withScope(ctx, (db) =>
    db
      .select()
      .from(deliverable)
      .where(
        and(
          eq(deliverable.projectId, projectId),
          acotada ? eq(deliverable.visibility, "client") : undefined,
          acotada ? sql`${deliverable.publishedAt} is not null` : undefined,
          filtros.tipo ? eq(deliverable.type, filtros.tipo) : undefined,
          filtros.publicado === true ? sql`${deliverable.publishedAt} is not null` : undefined,
          filtros.publicado === false ? sql`${deliverable.publishedAt} is null` : undefined,
          /**
           * **`only_latest` se resuelve EN LA CONSULTA, y antes no.** Se
           * deduplicaba en memoria sobre la ventana ya traída (`limit + 1`), así
           * que `has_more` se calculaba sobre la lista **ya reducida**: un
           * proyecto con seis versiones de una familia y cuatro familias más
           * devolvía **un** elemento con `has_more: false`, y un agente que
           * pagina bien concluía que el proyecto tenía un entregable.
           *
           * Es la misma clase de fallo que D-141 —una página que miente sobre lo
           * que falta— en el mismo archivo, y lo encontró la revisión
           * independiente. La subconsulta correlacionada se apoya en
           * `uq_deliverable_family_version`, que ya existe.
           */
          filtros.soloUltima
            ? sql`${deliverable.version} = (
                select max(d2.version) from deliverable d2 where d2.family_id = ${deliverable.familyId}
              )`
            : undefined,
          posicion ? despuesDelCursor(deliverable.createdAt, deliverable.id, posicion) : undefined,
        ),
      )
      .orderBy(...ordenDeColeccion(deliverable.createdAt, deliverable.id))
      .limit(filtros.limit + 1),
  );

  const { data, page } = paginar("deliverables", filas, filtros.limit, (f) => ({
    createdAt: f.createdAt,
    id: f.id,
  }));

  return {
    page,
    data: data.map((d) => ({
      id: d.id,
      project_id: d.projectId,
      organization_id: d.organizationId,
      family_id: d.familyId,
      version: d.version,
      title: d.title,
      type: d.type,
      source: d.type === "link" ? "link" : "file",
      visibility: d.visibility,
      // `mime_type` y `size_bytes` viajan nulos porque **el esquema no los
      // guarda**: inventarlos sería peor que no darlos. Ver la cabecera.
      file: d.fileKey ? { mime_type: null, size_bytes: null, checksum_sha256: d.checksumSha256 } : null,
      external_url: d.url,
      published_at: d.publishedAt?.toISOString() ?? null,
      published_by: d.publishedByType
        ? {
            actor_type: d.publishedByType,
            actor_id: d.publishedById,
            actor_label: d.publishedByLabel,
          }
        : null,
      created_at: d.createdAt.toISOString(),
    })),
  };
}
