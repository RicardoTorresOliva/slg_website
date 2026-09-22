/**
 * schema.ts — El modelo de datos de slg_website (B.2 del brief).
 *
 * Dos ausencias son deliberadas y deben defenderse en cada revisión:
 *
 *   1. `lead_capture` NO tiene etapa, propietario, valor de oportunidad ni
 *      próximo paso. Es evidencia y cola de entrega, no un CRM. El sistema de
 *      registro comercial es el CRM Softlanding Global (§10-13, RF-57).
 *   2. `membership` NO tiene semántica de matrícula: ni progreso, ni cohorte,
 *      ni fecha de finalización. Esto no es un LMS (§5.2).
 *
 * Si alguien añade una de esas columnas, no está ampliando el modelo: está
 * cruzando una frontera que `planning/scope.md` declara cerrada.
 */

import { sql, type SQL } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/* ══════════════════════════════════════════════════════════════════════════
 * Vocabularios cerrados
 * Se expresan como CHECK sobre `text`, no como ENUM nativo (D-27): se revisan
 * en el diff, se cambian en una transacción y no arrastran orden implícito.
 * ══════════════════════════════════════════════════════════════════════════ */

export const USER_ROLES = ["slg_admin", "slg_operator", "client_admin", "client_member"] as const;
export const ORG_TYPES = ["slg", "client"] as const;
export const ORG_STATUS = ["active", "archived"] as const;
export const PROJECT_STATUS = ["active", "paused", "closed"] as const;
/**
 * Los once servicios de A.2, tal como los admite `project_service_literal`
 * (0001, reescrito por 0021). **Espejo del CHECK, no de la colección de
 * contenido**: es lo que la base acepta en la inserción, y un valor que la API
 * anunciara y la base rechazara sería un 500 donde el contrato promete un 422
 * (D-162).
 *
 * Ser espejo del `CHECK` no autoriza a discrepar del contenido: cuando 0001
 * decía `SLG_Holdings` y la oferta ya decía `Holdings by SLG`, esta lista
 * copiaba fielmente a la base y el servicio entero era inoperante —HQ lo
 * ofrecía, el servidor lo aceptaba y PostgreSQL lo rechazaba—. El arreglo
 * nunca es tocar solo esta lista: es la migración, y esta constante detrás.
 */
export const PROJECT_SERVICES = [
  "Phoenix PEEx",
  "Phoenix TEAx",
  "Phoenix RETx",
  "Customize Programs",
  "AI Coaching for Directors",
  "SLG_Readiness",
  "SLG_Implement",
  "APP_Building",
  "AGE_Building",
  "CoO as a Service",
  "Holdings by SLG",
] as const;
export const LEAD_SOURCES = ["download", "contact", "doctrine-request"] as const;
export const QUEUE_STATUS = ["pending", "delivered", "failed"] as const;
/**
 * El estado de una captura es el de las colas MÁS DOS, y los dos solo existen
 * en un sitio sin CRM (plantilla, paso 5b · migración 0025). Allí no hay a quién
 * «entregar»: la captura se avisa por correo al buzón del cliente, y su estado
 * tiene que decir si ese aviso salió (`notified`) o se agotó sin salir
 * (`notify_failed`). Reutilizar `delivered` mentiría —diría que llegó a un CRM
 * que no existe— y dejarla en `pending` la tendría en cola para siempre.
 */
export const CAPTURE_SYNC_STATUS = [...QUEUE_STATUS, "notified", "notify_failed"] as const;
export const CRM_MODES = ["contact_note", "lead_admission"] as const;
export const DOWNLOAD_STATUS = ["draft", "coming-soon", "published"] as const;
export const DELIVERABLE_TYPES = ["pdf", "html", "md", "link", "material"] as const;
/** FU-15 · Academy. Un hito se entrega o no; un pendiente lo cierra quien `closes_by` diga. */
export const MILESTONE_STATUS = ["pending", "done"] as const;
export const ACTION_ITEM_STATUS = ["open", "done"] as const;
export const ACTION_ITEM_CLOSER = ["client", "slg"] as const;
/** Importancia editorial de una noticia (D-161): la fija quien la escribe, 1 = más importante. */
export const NEWS_IMPORTANCE = [1, 2, 3] as const;
export const VISIBILITY = ["client", "internal"] as const;
export const API_SCOPES = [
  "captures:read",
  "orgs:read",
  // D-163: el CRM crea o encuentra aquí la empresa por su `crm_company_id`.
  // Solo nombre, slug e identificador; nada comercial cruza. No implica
  // `orgs:read` ni `projects:write` (RF-147).
  "orgs:write",
  "deliverables:read",
  "deliverables:write",
  "announcements:write",
  "events:write",
  // FU-15 · Academy (RF-153). Sin implicación entre alcances: `news:write` no
  // permite tocar hitos ni al revés (RF-147).
  "news:write",
  "milestones:write",
  // D-162: el CRM crea aquí la carpeta del cliente. Solo el proyecto —nombre,
  // servicio, fechas, estado— y su `crm_project_id`; nada comercial cruza.
  "projects:write",
] as const;

export type UserRole = (typeof USER_ROLES)[number];
export type DeliverableType = (typeof DELIVERABLE_TYPES)[number];
export type ApiScope = (typeof API_SCOPES)[number];

const id = () => text("id").primaryKey();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

/* ══════════════════════════════════════════════════════════════════════════
 * Identidad — Better Auth más nuestros campos
 * ══════════════════════════════════════════════════════════════════════════ */

export const user = pgTable(
  "user",
  {
    id: id(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    // Campos propios, encima de lo que crea Better Auth
    role: text("role").notNull().default("client_member"),
    locale: text("locale").notNull().default("es"),
    // Plugin `admin` de Better Auth (FU-06). Suspensión de cuenta.
    banned: boolean("banned").default(false),
    banReason: text("ban_reason"),
    banExpires: timestamp("ban_expires", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("uq_user_email").on(t.email)],
);

export const account = pgTable(
  "account",
  {
    id: id(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    // `credential` | `google` | `microsoft`
    providerId: text("provider_id").notNull(),
    // Entra puede no emitir email para usuarios gestionados: el ancla es `oid` (F.1)
    accountId: text("account_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("uq_account_provider").on(t.providerId, t.accountId),
    index("idx_account_user").on(t.userId),
  ],
);

export const session = pgTable(
  "session",
  {
    id: id(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    /**
     * Plugin `organization`. COMODIDAD DE INTERFAZ, NO AUTORIZACIÓN: el
     * `organization_id` autoritativo se resuelve contra la base en cada
     * petición (architecture §2.4). Esta columna NUNCA se usa como filtro.
     */
    activeOrganizationId: text("active_organization_id"),
    /** Plugin `admin`. Declarada para el adaptador; NO se habilita en v1. */
    impersonatedBy: text("impersonated_by"),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("uq_session_token").on(t.token),
    index("idx_session_user").on(t.userId),
  ],
);

export const verification = pgTable(
  "verification",
  {
    id: id(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_verification_identifier").on(t.identifier)],
);

/* ══════════════════════════════════════════════════════════════════════════
 * Organizaciones y personas
 * ══════════════════════════════════════════════════════════════════════════ */

export const organization = pgTable(
  "organization",
  {
    id: id(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    type: text("type").notNull().default("client"),
    status: text("status").notNull().default("active"),
    // Plugin `organization` de Better Auth (FU-06).
    logo: text("logo"),
    metadata: text("metadata"),
    /**
     * El identificador de la empresa EN EL CRM (D-163): es lo que permite al
     * CRM crear aquí sus proyectos sin conocer el `id` de este sitio. Nulo en
     * las que ya existían. Como en `project.crm_project_id`, aquí no entra
     * nada comercial: la frontera (a) de `scope.md` no se mueve.
     */
    crmCompanyId: text("crm_company_id"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("uq_organization_slug").on(t.slug),
    // Único y parcial: la misma empresa del CRM no entra dos veces, y eso es
    // lo que hace seguro reintentar la creación.
    uniqueIndex("uq_organization_crm_id").on(t.crmCompanyId).where(sql`crm_company_id IS NOT NULL`),
  ],
);

/**
 * contact — D-48.
 *
 * «A quién llamo en esta empresa cliente». Puede no tener cuenta de portal:
 * por eso no es un `user`. Cuando se le invita y acepta, `user_id` lo enlaza.
 *
 * FRONTERA QUE SE DEFIENDE: aquí NO entra estado comercial. Ni etapa, ni
 * importe, ni probabilidad, ni próximo paso. Eso es pipeline y vive en el CRM.
 * Una columna de esas en esta tabla rechaza la revisión.
 */
export const contact = pgTable(
  "contact",
  {
    id: id(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    email: text("email"),
    jobTitle: text("job_title"),
    /** La «etiqueta de tipo principal» de D-48. */
    isPrimary: boolean("is_primary").notNull().default(false),
    /** Se rellena si esa persona acaba teniendo cuenta. */
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [
    index("idx_contact_org").on(t.organizationId),
    // Un solo contacto principal por empresa.
    uniqueIndex("uq_contact_primary_per_org")
      .on(t.organizationId)
      .where(sqlTrue(t.isPrimary)),
  ],
);

export const membership = pgTable(
  "membership",
  {
    id: id(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    orgRole: text("org_role").notNull().default("client_member"),
    createdAt: createdAt(),
    // SIN progreso, SIN cohorte, SIN fecha de finalización: esto no es un LMS.
  },
  (t) => [
    uniqueIndex("uq_membership_user_org").on(t.userId, t.organizationId),
    /**
     * **UNA SOLA EMPRESA CLIENTE POR PERSONA** (DU-20, criterio 3 · RF-69 ·
     * RF-144). El índice de arriba impide repetir el par, no estar en dos
     * empresas: sin este, `membership` admite que alguien cuelgue de varias y
     * la tabla pasa de decir «de quién es esta persona» a decir «en cuántos
     * programas está apuntada» — que es una matrícula, y la frontera (b) de
     * `scope.md` la excluye. Parcial porque a SLG no le aplica.
     */
    uniqueIndex("uq_membership_una_empresa_cliente")
      .on(t.userId)
      .where(sql`org_role IN ('client_admin', 'client_member')`),
    index("idx_membership_org").on(t.organizationId),
  ],
);

export const invitation = pgTable(
  "invitation",
  {
    id: id(),
    email: text("email").notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("client_member"),
    /**
     * Opcional a propósito (migración 0005): el plugin `organization` crea la
     * invitación y FU-07 es quien genera el enlace y guarda su hash. El índice
     * único sigue: en PostgreSQL admite varios NULL, así que las invitaciones
     * sin enlace conviven y dos enlaces iguales siguen siendo imposibles.
     */
    tokenHash: text("token_hash"),
    /**
     * Los CUATRO valores del plugin, con su grafía (`canceled`), para no pelear
     * con su lógica interna. «Caducada» NO es un valor: se deduce de
     * `expires_at < now()` sobre una `pending` (data_model §3.5).
     */
    status: text("status").notNull().default("pending"),
    inviterId: text("inviter_id").references(() => user.id, { onDelete: "set null" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    /** Nulo = creada pero NO enviada. Es la evidencia de RF-119 (FU-07). */
    sentAt: timestamp("sent_at", { withTimezone: true }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    acceptedByUserId: text("accepted_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokedByUserId: text("revoked_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("uq_invitation_token").on(t.tokenHash),
    index("idx_invitation_org").on(t.organizationId),
    index("idx_invitation_org_status").on(t.organizationId, t.status, t.createdAt),
  ],
);

export const apiKey = pgTable(
  "api_key",
  {
    id: id(),
    name: text("name").notNull(),
    keyHash: text("key_hash").notNull(),
    organizationId: text("organization_id").references(() => organization.id, {
      onDelete: "cascade",
    }),
    scopes: jsonb("scopes").$type<ApiScope[]>().notNull().default([]),
    rateLimitMax: integer("rate_limit_max").notNull().default(60),
    rateLimitWindowSeconds: integer("rate_limit_window_seconds").notNull().default(60),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("uq_api_key_hash").on(t.keyHash),
    index("idx_api_key_org").on(t.organizationId),
  ],
);

/* ══════════════════════════════════════════════════════════════════════════
 * Captura de leads — evidencia y cola, NUNCA pipeline
 * ══════════════════════════════════════════════════════════════════════════ */

export const leadCapture = pgTable(
  "lead_capture",
  {
    id: id(),
    email: text("email").notNull(),
    emailDomain: text("email_domain").notNull(),
    /** Solo el nombre. El apellido va aparte: el CRM los exige por separado. */
    name: text("name"),
    /** Obligatorio en los formularios públicos; `NULL` solo en capturas anteriores a la columna. */
    lastName: text("last_name"),
    company: text("company"),
    jobTitle: text("job_title"),
    /**
     * El texto libre de `/contacto` (DU-10). No es pipeline —eso vive en el
     * CRM (RF-57)—: es lo que la persona escribió, y viaja al CRM dentro de la
     * nota. Aquí queda como respaldo.
     */
    message: text("message"),
    source: text("source").notNull(),
    downloadSlug: text("download_slug"),
    pagePath: text("page_path").notNull(),
    locale: text("locale").notNull(),
    utm: jsonb("utm").$type<Record<string, string>>(),
    consentAt: timestamp("consent_at", { withTimezone: true }).notNull(),
    privacyVersion: text("privacy_version").notNull(),

    // Entrega al CRM (D-19). El modo con el que se ENTREGÓ, no el configurado
    // hoy: si se dedujera de la variable de entorno, activar `lead_admission`
    // haría parecer que todo el histórico se entregó en el modo nuevo.
    crmMode: text("crm_mode"),
    crmContactId: text("crm_contact_id"),
    crmCompanyId: text("crm_company_id"),
    crmOpportunityId: text("crm_opportunity_id"),
    /** `CAPTURE_SYNC_STATUS`: con CRM, entrega; sin CRM, aviso por correo (0025). */
    crmSyncStatus: text("crm_sync_status").notNull().default("pending"),
    crmAttempts: integer("crm_attempts").notNull().default(0),
    crmCycle: integer("crm_cycle").notNull().default(1),
    crmLastError: text("crm_last_error"),
    crmNextAttemptAt: timestamp("crm_next_attempt_at", { withTimezone: true }),
    crmDeliveredAt: timestamp("crm_delivered_at", { withTimezone: true }),

    createdAt: createdAt(),

    // AUSENCIA DELIBERADA (RF-57): sin etapa, sin propietario, sin importe,
    // sin probabilidad, sin próximo paso. El pipeline vive en el CRM.
  },
  (t) => [
    index("idx_lead_capture_email").on(t.email),
    // La cola de reintentos barre por estado: índice parcial, no total.
    index("idx_lead_capture_pending").on(t.crmNextAttemptAt).where(sqlPending(t.crmSyncStatus)),
    index("idx_lead_capture_created").on(t.createdAt),
  ],
);

export const crmDelivery = pgTable(
  "crm_delivery",
  {
    id: id(),
    leadCaptureId: text("lead_capture_id")
      .notNull()
      .references(() => leadCapture.id, { onDelete: "restrict" }),
    cycle: integer("cycle").notNull().default(1),
    attempt: integer("attempt").notNull(),
    endpoint: text("endpoint").notNull(),
    requestBody: jsonb("request_body"),
    responseCode: integer("response_code"),
    responseBody: text("response_body"),
    createdAt: createdAt(),
  },
  (t) => [
    // `cycle` permite el reintento manual sobre una captura ya `failed` sin
    // romper el tope de cinco intentos: abre un ciclo nuevo (resuelve CF-1).
    uniqueIndex("uq_crm_delivery_attempt").on(t.leadCaptureId, t.cycle, t.attempt, t.endpoint),
    index("idx_crm_delivery_lead").on(t.leadCaptureId),
  ],
);

export const downloadEvent = pgTable(
  "download_event",
  {
    id: id(),
    leadCaptureId: text("lead_capture_id")
      .notNull()
      .references(() => leadCapture.id, { onDelete: "restrict" }),
    downloadSlug: text("download_slug").notNull(),
    signedUrlIssuedAt: timestamp("signed_url_issued_at", { withTimezone: true }).notNull(),
    signedUrlExpiresAt: timestamp("signed_url_expires_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("idx_download_event_lead").on(t.leadCaptureId)],
);

/* ══════════════════════════════════════════════════════════════════════════
 * Proyectos, entregables y avisos — todo con organization_id
 * ══════════════════════════════════════════════════════════════════════════ */

export const project = pgTable(
  "project",
  {
    id: id(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    /** Nomenclatura literal: el CHECK lo fija la migración (RF-14). */
    service: text("service").notNull(),
    status: text("status").notNull().default("active"),
    ownerUserId: text("owner_user_id").references(() => user.id, { onDelete: "set null" }),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    /**
     * El identificador del proyecto EN EL CRM (D-162): el CRM es donde nace un
     * proyecto y este sitio lo recibe. Nulo en los que ya existían. Aquí no
     * entra nada comercial —ni etapa, ni importe, ni propietario—: la
     * frontera (a) de `scope.md` no se mueve con esta columna.
     */
    crmProjectId: text("crm_project_id"),
    createdAt: createdAt(),
  },
  (t) => [
    index("idx_project_org").on(t.organizationId),
    // Único y parcial: el mismo proyecto del CRM no entra dos veces, y eso es
    // lo que hace seguro reintentar la creación.
    uniqueIndex("uq_project_crm_id").on(t.crmProjectId).where(sql`crm_project_id IS NOT NULL`),
  ],
);

export const deliverable = pgTable(
  "deliverable",
  {
    id: id(),
    projectId: text("project_id").notNull().references(() => project.id, { onDelete: "restrict" }),
    /** Desnormalizado para que la política de fila decida sin subconsulta. */
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    /**
     * VALOR DE DATOS, nunca rama de código (RF-142). El renderizador se resuelve
     * por un mapa declarado en `lib/deliverables/renderers.ts`: añadir un tipo
     * es añadir una entrada, no un `if`.
     * `material` cuelga siempre de un proyecto — por eso `project_id` es NOT NULL.
     */
    type: text("type").notNull(),
    fileKey: text("file_key"),
    url: text("url"),
    checksumSha256: text("checksum_sha256"),
    /** Versionado desde el primer día, aunque v1 no muestre historial (RF-143). */
    version: integer("version").notNull().default(1),
    familyId: text("family_id").notNull(),
    visibility: text("visibility").notNull().default("client"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    // Actor polimórfico: puede publicar una persona o una clave de API.
    publishedByType: text("published_by_type"),
    publishedById: text("published_by_id"),
    publishedByLabel: text("published_by_label"),
    createdAt: createdAt(),
  },
  (t) => [
    index("idx_deliverable_org").on(t.organizationId),
    index("idx_deliverable_project").on(t.projectId),
    uniqueIndex("uq_deliverable_family_version").on(t.familyId, t.version),
  ],
);

export const announcement = pgTable(
  "announcement",
  {
    id: id(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    bodyMd: text("body_md").notNull(),
    /**
     * El idioma EN QUE SE ESCRIBIÓ, no el de quien lo lee (RF-72, DU-18). Sin
     * él, el portal solo podía marcar el aviso con el idioma de la interfaz, y
     * el atributo `lang` —el que decide cómo lo pronuncia un lector de
     * pantalla— mentía.
     */
    locale: text("locale").notNull().default("es"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    authorType: text("author_type"),
    authorId: text("author_id"),
    authorLabel: text("author_label"),
    createdAt: createdAt(),
  },
  (t) => [index("idx_announcement_org").on(t.organizationId)],
);

/* ══════════════════════════════════════════════════════════════════════════
 * Agentes, auditoría y colas
 * ══════════════════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════════════════
 * Academy (FU-15, spec-delta 2026-09-18, D-160) — noticias, hitos y pendientes
 *
 * Tres tablas con `organization_id` y la MISMA política de fila que las ocho de
 * 0001/0015 (migración 0018). Lo que NO son: lecciones, progreso por persona,
 * cohortes ni certificados. La frontera (b) de `scope.md` no se mueve, y
 * `check:alcance` la vigila también aquí.
 * ══════════════════════════════════════════════════════════════════════════ */

/**
 * news_item — una noticia CON comentario PARA una empresa (RF-150).
 *
 * Dos textos y no uno: `summaryMd` es la noticia; `commentMd` es lo que esa
 * noticia significa para esa empresa. El comentario es el producto, y por eso
 * la fila pertenece a la empresa y no se comparte entre varias.
 */
export const newsItem = pgTable(
  "news_item",
  {
    id: id(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    sourceUrl: text("source_url"),
    summaryMd: text("summary_md").notNull(),
    commentMd: text("comment_md").notNull(),
    /** 1 = más importante. Editorial (D-161), nunca calculada. */
    importance: integer("importance").notNull().default(2),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    // Actor polimórfico: la escribe un usuario de SLG o una clave de agente.
    authorType: text("author_type"),
    authorId: text("author_id"),
    authorLabel: text("author_label"),
    createdAt: createdAt(),
  },
  (t) => [
    index("idx_news_item_portal")
      .on(t.organizationId, t.importance, t.publishedAt)
      .where(sql`published_at is not null`),
  ],
);

/**
 * milestone — un hito de ENTREGA de un proyecto (RF-151). Fecha, hecho o no,
 * y orden. Nada más: no mide a nadie.
 */
export const milestone = pgTable(
  "milestone",
  {
    id: id(),
    projectId: text("project_id").notNull().references(() => project.id, { onDelete: "restrict" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    status: text("status").notNull().default("pending"),
    position: integer("position").notNull().default(0),
    doneAt: timestamp("done_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_milestone_project").on(t.projectId, t.position),
    index("idx_milestone_next").on(t.organizationId, t.dueAt).where(sql`status = 'pending'`),
  ],
);

/**
 * action_item — una obligación pendiente de un proyecto (RF-151): «envíanos el
 * organigrama antes del 30». `closesBy` dice QUIÉN puede cerrarla, y eso se
 * decide en el servidor con esta columna, no en la pantalla.
 */
export const actionItem = pgTable(
  "action_item",
  {
    id: id(),
    projectId: text("project_id").notNull().references(() => project.id, { onDelete: "restrict" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }),
    status: text("status").notNull().default("open"),
    closesBy: text("closes_by").notNull().default("client"),
    doneAt: timestamp("done_at", { withTimezone: true }),
    // Quién lo cerró es parte del hecho: actor polimórfico (§2.4).
    doneByType: text("done_by_type"),
    doneById: text("done_by_id"),
    doneByLabel: text("done_by_label"),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_action_item_project").on(t.projectId, t.status),
    index("idx_action_item_open").on(t.organizationId, t.dueAt).where(sql`status = 'open'`),
  ],
);

export const agentEvent = pgTable(
  "agent_event",
  {
    id: id(),
    apiKeyId: text("api_key_id").references(() => apiKey.id, { onDelete: "set null" }),
    organizationId: text("organization_id").references(() => organization.id, {
      onDelete: "restrict",
    }),
    /**
     * ENUMERADO ABIERTO a propósito (RF-146): un agente nuevo puede registrar un
     * tipo de actividad sin migración de esquema. La disciplina que sí se aplica
     * es de FORMA — `<recurso>.<acción>` — y el `payload_json` se valida contra
     * esquema EN LA ESCRITURA, no al leer.
     */
    kind: text("kind").notNull(),
    payloadJson: jsonb("payload_json").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [
    index("idx_agent_event_org").on(t.organizationId),
    index("idx_agent_event_created").on(t.createdAt),
  ],
);

/**
 * audit_log — INMUTABLE.
 *
 * No existe camino de código que actualice o borre una fila, ni siquiera para
 * `slg_admin`. La migración revoca UPDATE/DELETE/TRUNCATE al rol de aplicación
 * y añade un disparador de guarda; una prueba lo demuestra intentándolo (RNF-29).
 *
 * Actores polimórficos sin clave foránea: un CASCADE reescribiría la historia.
 */
export const auditLog = pgTable(
  "audit_log",
  {
    id: id(),
    actorType: text("actor_type").notNull(),
    actorId: text("actor_id"),
    actorLabel: text("actor_label"),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    organizationId: text("organization_id"),
    ip: text("ip"),
    /**
     * Contexto **saneado** de la llamada (DU-22, `api_contracts` §2.8): código
     * de estado, ruta, método, alcance exigido. **Nunca** el cuerpo, la clave ni
     * el valor de un campo personal (RNF-26, RNF-32). Sin esto, una llamada
     * rechazada y una atendida dejaban filas idénticas.
     */
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: createdAt(),
  },
  (t) => [
    index("idx_audit_log_created").on(t.createdAt),
    index("idx_audit_log_entity").on(t.entity, t.entityId),
  ],
);

export const webhookDelivery = pgTable(
  "webhook_delivery",
  {
    id: id(),
    event: text("event").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    targetUrl: text("target_url").notNull(),
    status: text("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("idx_webhook_pending").on(t.nextAttemptAt).where(sqlPending(t.status))],
);

/**
 * email_delivery — evidencia propia de entrega de correo.
 *
 * El tramo gratuito de Resend retiene registros 30 días (D-22). La auditoría del
 * Anexo D necesita prueba más allá de eso, así que la guardamos nosotros.
 *
 * NO guarda el cuerpo, NO guarda ningún enlace con token, y NO tiene columnas de
 * apertura ni de clic: la ausencia de columna es la garantía de que el
 * seguimiento desactivado de D-22 se mantiene aunque alguien lo active en el
 * panel del proveedor.
 */
export const emailDelivery = pgTable(
  "email_delivery",
  {
    id: id(),
    kind: text("kind").notNull(),
    toEmail: text("to_email").notNull(),
    fromEmail: text("from_email").notNull(),
    replyTo: text("reply_to"),
    templateKey: text("template_key").notNull(),
    subjectKey: text("subject_key").notNull(),
    locale: text("locale").notNull(),
    status: text("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    providerMessageId: text("provider_message_id"),
    /** Lo que diga el proveedor, verbatim: enumerar un vocabulario ajeno es inventarlo. */
    providerStatus: text("provider_status"),
    lastError: text("last_error"),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("idx_email_pending").on(t.nextAttemptAt).where(sqlPending(t.status))],
);

/* ── Ayudas de índice parcial ─────────────────────────────────────────────── */
function sqlPending(col: unknown): SQL {
  return sql`${col} = 'pending'`;
}
function sqlTrue(col: unknown): SQL {
  return sql`${col} = true`;
}

/** Tablas con `organization_id`: las que la política de aislamiento debe cubrir. */
export const ORG_SCOPED_TABLES = [
  "contact",
  "membership",
  "invitation",
  "api_key",
  "project",
  "deliverable",
  "announcement",
  "agent_event",
] as const;
