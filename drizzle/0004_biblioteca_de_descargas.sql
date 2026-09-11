-- ============================================================================
-- 0004 · `download`, `download_event` y `deliverable` completos
-- ----------------------------------------------------------------------------
-- HALLAZGO: FU-04 migró las 19 tablas, pero tres de ellas se quedaron a medio
-- construir frente a lo que design_docs/data_model.md §5.10, §5.11 y §5.14
-- especifican — el criterio 1 de FU-04 exige que TODAS las entidades de B.2
-- migren, y esta era la parte que faltaba:
--
--   · `download` no existía en absoluto. Sin ella, `download_event` no tenía
--     ancla de identidad real: apuntaba a un `slug` en texto libre, y renombrar
--     un documento habría roto la trazabilidad de toda captura anterior.
--   · `download_event.download_slug` era texto libre en vez de
--     `FK → download.id`, y le faltaban el CHECK de coherencia temporal y el
--     índice por documento que el tablero de HQ necesita (RF-73).
--   · `deliverable` no distinguía `source` (archivo/enlace) de `type`: un
--     entregable podía tener `file_key` y `url` (hoy `external_url`) a la vez,
--     dejando al visor eligiendo — justo lo que RF-142 prohíbe.
--
-- Escrita a mano, igual que 0001-0003: drizzle-kit no genera CHECK, y aquí
-- además hay una columna renombrada (`deliverable.url` → `external_url`) y una
-- reescrita con distinto significado (`download_event.download_slug` →
-- `download_id`), que su generador de diffs no resuelve sin intervención.
--
-- Sin tocar: `lead_capture` también difiere de `data_model.md` §5.9 en varios
-- puntos (columna `download_id` en vez de `download_slug`, columnas UTM
-- separadas, `email_domain` generada, etc.). Es una brecha real y mayor, pero
-- distinta de la que motiva esta migración — no se toca aquí (docs/decision_log.md).
--
-- Fuentes: design_docs/data_model.md §5.10, §5.11, §5.14, §3.10, §3.13, §4.2.
-- ============================================================================

-- ─── 1. `download` — ancla de identidad del documento de descarga (§5.10) ───

CREATE TABLE "download" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"doc_code" text,
	"service" text,
	"title_es" text NOT NULL,
	"title_en" text NOT NULL,
	"file_key" text,
	"mime_type" text,
	"size_bytes" bigint,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "uq_download_slug" ON "download" USING btree ("slug");
CREATE UNIQUE INDEX "uq_download_doc_code" ON "download" USING btree ("doc_code");
CREATE INDEX "idx_download_status" ON "download" USING btree ("status", "doc_code");

ALTER TABLE "download" ADD CONSTRAINT download_status_valid
  CHECK (status IN ('draft','coming-soon','published'));

-- Mismo vocabulario que `project_service_literal` (0001): once servicios,
-- literales e intraducibles (§3.13, RF-14).
ALTER TABLE "download" ADD CONSTRAINT download_service_literal
  CHECK (service IS NULL OR service IN (
    'Phoenix PEEx','Phoenix TEAx','Phoenix RETx',
    'Customize Programs','AI Coaching for Directors',
    'SLG_Readiness','SLG_Implement',
    'APP_Building','AGE_Building','CoO as a Service',
    'SLG_Holdings'
  ));

-- La restricción que sostiene RF-40: mientras falte el PDF, el estado correcto
-- es `coming-soon`, que captura el correo igual sin emitir una URL firmada
-- hacia nada.
ALTER TABLE "download" ADD CONSTRAINT download_published_needs_file
  CHECK (status <> 'published' OR file_key IS NOT NULL);

-- 25 MB de §2.6 (RNF-25, D-25), en bytes.
ALTER TABLE "download" ADD CONSTRAINT download_size_within_limit
  CHECK (size_bytes IS NULL OR size_bytes <= 26214400);

-- ─── 2. `download_event` — de `download_slug` de texto a `FK` real (§5.11) ──

-- Fixture de desarrollo, no evidencia real (no existe producción todavía):
-- `scripts/db/seed.ts` trunca y repuebla esta tabla en cada ejecución, y la
-- fila que hoy contiene referencia un `slug` que no tiene ancla porque
-- `download` no existía hasta esta migración. Vaciarla aquí es correcto y se
-- rellena con `npm run db:seed`.
TRUNCATE TABLE "download_event";

ALTER TABLE "download_event" DROP COLUMN "download_slug";
ALTER TABLE "download_event" ADD COLUMN "download_id" text NOT NULL
  REFERENCES "download"("id") ON DELETE RESTRICT;

ALTER TABLE "download_event" ADD CONSTRAINT download_event_completed_after_issue
  CHECK (completed_at IS NULL OR completed_at >= signed_url_issued_at);

-- `idx_download_event_lead` (0000) era `(lead_capture_id)` a secas; el doc la
-- nombra `idx_download_event_capture` y la pide ordenada por emisión (detalle
-- de una captura en HQ, RF-84).
DROP INDEX "idx_download_event_lead";
CREATE INDEX "idx_download_event_capture" ON "download_event"
  USING btree ("lead_capture_id", "signed_url_issued_at" DESC);

-- Recuento de descargas completadas por documento en el tablero (RF-73).
CREATE INDEX "idx_download_event_download" ON "download_event"
  USING btree ("download_id", "completed_at" DESC);

-- ─── 3. `deliverable` — `source`, tamaño y coherencia archivo/enlace (§5.14) ─

ALTER TABLE "deliverable" ADD COLUMN "source" text;
UPDATE "deliverable" SET "source" = CASE
  WHEN "file_key" IS NOT NULL THEN 'file'
  WHEN "url" IS NOT NULL THEN 'link'
END;
ALTER TABLE "deliverable" ALTER COLUMN "source" SET NOT NULL;

ALTER TABLE "deliverable" RENAME COLUMN "url" TO "external_url";
ALTER TABLE "deliverable" ADD COLUMN "mime_type" text;
ALTER TABLE "deliverable" ADD COLUMN "size_bytes" bigint;
ALTER TABLE "deliverable" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;

ALTER TABLE "deliverable" ADD CONSTRAINT deliverable_source_valid
  CHECK (source IN ('file','link'));

-- Un entregable con archivo Y enlace deja al visor eligiendo, y ahí es donde
-- el tipo se convierte en una rama de código — lo que RF-142 prohíbe.
ALTER TABLE "deliverable" ADD CONSTRAINT deliverable_payload_coherent
  CHECK (
    (source = 'file' AND file_key IS NOT NULL AND external_url IS NULL)
    OR (source = 'link' AND external_url IS NOT NULL AND file_key IS NULL)
  );

-- Un `pdf` que en realidad es un enlace externo miente al portal sobre cómo
-- abrirlo.
ALTER TABLE "deliverable" ADD CONSTRAINT deliverable_link_not_file_type
  CHECK (source <> 'link' OR type IN ('link','material'));

-- 50 MB de §2.6, en bytes. El límite por tipo (html 5 MB, md 1 MB) lo aplica
-- el servidor en la subida, con la misma constante única (lib/db/limits.ts).
ALTER TABLE "deliverable" ADD CONSTRAINT deliverable_size_within_limit
  CHECK (size_bytes IS NULL OR size_bytes <= 52428800);

-- Publicado sin autor es una publicación sin responsable (RF-111).
ALTER TABLE "deliverable" ADD CONSTRAINT deliverable_published_needs_actor
  CHECK ((published_at IS NULL) = (published_by_id IS NULL));

-- `deliverable_version_positive` ya existe desde 0001: no se repite aquí.

-- La consulta del portal (RF-89): entregables visibles de un proyecto de mi
-- empresa. Parcial e íntegramente cubierta — un `internal` no llega ni al
-- índice.
CREATE INDEX "idx_deliverable_portal" ON "deliverable"
  USING btree ("organization_id", "project_id", "published_at" DESC)
  WHERE "visibility" = 'client' AND "published_at" IS NOT NULL;

-- «Materiales de programa», que el portal separa de los entregables de
-- proyecto (RF-91, RF-144).
CREATE INDEX "idx_deliverable_materials" ON "deliverable"
  USING btree ("organization_id", "project_id", "published_at" DESC)
  WHERE "type" = 'material' AND "visibility" = 'client' AND "published_at" IS NOT NULL;
