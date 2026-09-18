-- FU-15 · La Academy: noticias, hitos y pendientes (spec-delta 2026-09-18, D-160).
--
-- TRES TABLAS, LAS TRES CON `organization_id` Y LAS TRES CON LA MISMA POLÍTICA
-- DE FILA que las ocho de 0001/0015. No es una tabla más y luego su política: la
-- política va en la misma migración, porque `test:isolation` (comprobación 8)
-- recorre el catálogo y marca en rojo cualquier tabla con `organization_id` sin
-- RLS forzada — y ese rojo tiene que ser imposible de producir con una migración
-- a medias.
--
-- LO QUE ESTAS TABLAS NO SON. Un hito es entrega de proyecto, no una lección; un
-- pendiente es una obligación del contrato («envíanos el organigrama antes del
-- 30»), no una tarea evaluable. No hay progreso por persona, ni cohorte, ni
-- certificado: la frontera (b) de `scope.md` sigue donde estaba, y
-- `check:alcance` la vigila también sobre estas tres (fixture 9998).
--
-- `news_item` lleva DOS textos y no uno: `summary_md` es la noticia; `comment_md`
-- es lo que esa noticia significa PARA ESA EMPRESA. Por eso una noticia pertenece
-- a una empresa y no se comparte: el comentario es el producto.

-- ─── 1. Noticias ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS news_item (
  id            text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organization(id) ON DELETE RESTRICT,
  title         text NOT NULL,
  source_url    text,
  summary_md    text NOT NULL,
  comment_md    text NOT NULL,
  importance    integer NOT NULL DEFAULT 2,
  published_at  timestamptz,
  author_type   text,
  author_id     text,
  author_label  text,
  created_at    timestamptz NOT NULL DEFAULT now()
);--> statement-breakpoint

ALTER TABLE news_item ADD CONSTRAINT news_item_importance_valid
  CHECK (importance BETWEEN 1 AND 3);--> statement-breakpoint
-- Publicado ⇔ con autor: una noticia no puede salir al portal sin que conste quién la puso.
ALTER TABLE news_item ADD CONSTRAINT news_item_published_needs_author
  CHECK ((published_at IS NULL) = (author_id IS NULL));--> statement-breakpoint

-- La consulta de «Hoy» (RF-149): las de mi empresa, primero las importantes, luego las recientes.
CREATE INDEX IF NOT EXISTS idx_news_item_portal
  ON news_item (organization_id, importance, published_at DESC)
  WHERE published_at IS NOT NULL;--> statement-breakpoint

-- ─── 2. Hitos del proyecto ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS milestone (
  id            text PRIMARY KEY,
  project_id    text NOT NULL REFERENCES project(id) ON DELETE RESTRICT,
  organization_id text NOT NULL REFERENCES organization(id) ON DELETE RESTRICT,
  title         text NOT NULL,
  due_at        timestamptz NOT NULL,
  status        text NOT NULL DEFAULT 'pending',
  position      integer NOT NULL DEFAULT 0,
  done_at       timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);--> statement-breakpoint

ALTER TABLE milestone ADD CONSTRAINT milestone_status_valid
  CHECK (status IN ('pending','done'));--> statement-breakpoint
ALTER TABLE milestone ADD CONSTRAINT milestone_done_has_date
  CHECK ((status = 'done') = (done_at IS NOT NULL));--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_milestone_project ON milestone (project_id, position);--> statement-breakpoint
-- «Próximo hito de cada proyecto activo» (RF-149): por empresa, por fecha, solo los pendientes.
CREATE INDEX IF NOT EXISTS idx_milestone_next
  ON milestone (organization_id, due_at)
  WHERE status = 'pending';--> statement-breakpoint

-- ─── 3. Pendientes del cliente ───────────────────────────────────────────────
-- `closes_by` dice QUIÉN puede cerrarlo. El cliente solo cierra los suyos (RF-151);
-- eso se decide en el servidor con esta columna, no en la pantalla.
CREATE TABLE IF NOT EXISTS action_item (
  id            text PRIMARY KEY,
  project_id    text NOT NULL REFERENCES project(id) ON DELETE RESTRICT,
  organization_id text NOT NULL REFERENCES organization(id) ON DELETE RESTRICT,
  title         text NOT NULL,
  due_at        timestamptz,
  status        text NOT NULL DEFAULT 'open',
  closes_by     text NOT NULL DEFAULT 'client',
  done_at       timestamptz,
  done_by_type  text,
  done_by_id    text,
  done_by_label text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);--> statement-breakpoint

ALTER TABLE action_item ADD CONSTRAINT action_item_status_valid
  CHECK (status IN ('open','done'));--> statement-breakpoint
ALTER TABLE action_item ADD CONSTRAINT action_item_closes_by_valid
  CHECK (closes_by IN ('client','slg'));--> statement-breakpoint
-- Cerrado ⇔ con fecha y con actor: quién lo cerró es parte del hecho.
ALTER TABLE action_item ADD CONSTRAINT action_item_done_is_complete
  CHECK ((status = 'done') = (done_at IS NOT NULL AND done_by_id IS NOT NULL));--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_action_item_project ON action_item (project_id, status);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_action_item_open
  ON action_item (organization_id, due_at)
  WHERE status = 'open';--> statement-breakpoint

-- ─── 4. Aislamiento: la MISMA política que 0015, sobre las tres ──────────────
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['news_item','milestone','action_item']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'pol_' || t || '_aislamiento', t);
    EXECUTE format($f$
      CREATE POLICY %I ON %I
      USING (
        organization_id = app_organization_id()
        OR app_actor_role() IN ('slg_admin','slg_operator','agent_slg')
      )
      WITH CHECK (
        organization_id = app_organization_id()
        OR app_actor_role() IN ('slg_admin','slg_operator','agent_slg')
      )
    $f$, 'pol_' || t || '_aislamiento', t);
  END LOOP;
END
$$;--> statement-breakpoint

-- El rol de aplicación solo tiene permisos sobre las tablas que existían cuando
-- se le dieron (0001: «ON ALL TABLES»). Las nuevas hay que dárselas a mano.
GRANT SELECT, INSERT, UPDATE, DELETE ON news_item, milestone, action_item TO slg_app;--> statement-breakpoint

-- ─── 5. Dos alcances más para las claves de agente (RF-153) ──────────────────
-- Se reescribe la contención entera: seis pasan a ocho. Un alcance inventado
-- sigue sin poder guardarse (RF-147).
ALTER TABLE api_key DROP CONSTRAINT IF EXISTS api_key_scopes_valid;--> statement-breakpoint
ALTER TABLE api_key ADD CONSTRAINT api_key_scopes_valid
  CHECK (scopes <@ '["captures:read","orgs:read","deliverables:read","deliverables:write","announcements:write","events:write","news:write","milestones:write"]'::jsonb);--> statement-breakpoint

COMMENT ON TABLE news_item IS
  'Noticia con comentario PARA una empresa (RF-150). Pertenece a esa empresa; no se comparte.';
COMMENT ON TABLE milestone IS
  'Hito de entrega de un proyecto (RF-151). No es una lección ni mide progreso de personas.';
COMMENT ON TABLE action_item IS
  'Obligación pendiente de un proyecto (RF-151). closes_by dice quién puede cerrarla.';
