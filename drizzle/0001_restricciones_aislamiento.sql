-- ============================================================================
-- 0001 · Restricciones, inmutabilidad de auditoría y aislamiento entre empresas
-- ----------------------------------------------------------------------------
-- Escrita a mano: drizzle-kit genera tablas e índices, no políticas de fila,
-- disparadores de guarda ni privilegios. Estas son justamente las piezas que
-- convierten el modelo en una defensa y no en una intención.
--
-- Fuentes: START_PROJECT.md B.2, B.3, B.8 · design_docs/data_model.md
--          planning/risks.md R-10 (fuga entre empresas, crítico) y RNF-29
-- ============================================================================

-- ─── 1. Vocabularios cerrados ───────────────────────────────────────────────
-- Se expresan como CHECK sobre `text` (D-27): visibles en el diff, cambiables
-- en una transacción, sin arrastrar orden implícito a los ORDER BY.

ALTER TABLE "user" ADD CONSTRAINT user_role_valid
  CHECK (role IN ('slg_admin','slg_operator','client_admin','client_member'));
ALTER TABLE "user" ADD CONSTRAINT user_locale_valid
  CHECK (locale IN ('es','en'));

ALTER TABLE organization ADD CONSTRAINT organization_type_valid
  CHECK (type IN ('slg','client'));
ALTER TABLE organization ADD CONSTRAINT organization_status_valid
  CHECK (status IN ('active','archived'));

ALTER TABLE membership ADD CONSTRAINT membership_org_role_valid
  CHECK (org_role IN ('client_admin','client_member','slg_admin','slg_operator'));

ALTER TABLE invitation ADD CONSTRAINT invitation_role_valid
  CHECK (role IN ('client_admin','client_member','slg_admin','slg_operator'));

ALTER TABLE project ADD CONSTRAINT project_status_valid
  CHECK (status IN ('active','paused','closed'));

-- Nomenclatura literal e intraducible (RF-14). Escribir «SLG Readiness» sin
-- guion bajo se rechaza en la INSERCIÓN, no en la revisión.
ALTER TABLE project ADD CONSTRAINT project_service_literal
  CHECK (service IN (
    'Phoenix PEEx','Phoenix TEAx','Phoenix RETx',
    'Customize Programs','AI Coaching for Directors',
    'SLG_Readiness','SLG_Implement',
    'APP_Building','AGE_Building','CoO as a Service',
    'SLG_Holdings'
  ));

ALTER TABLE deliverable ADD CONSTRAINT deliverable_type_valid
  CHECK (type IN ('pdf','html','md','link','material'));
ALTER TABLE deliverable ADD CONSTRAINT deliverable_visibility_valid
  CHECK (visibility IN ('client','internal'));
ALTER TABLE deliverable ADD CONSTRAINT deliverable_version_positive
  CHECK (version >= 1);

ALTER TABLE lead_capture ADD CONSTRAINT lead_capture_source_valid
  CHECK (source IN ('download','contact','doctrine-request'));
ALTER TABLE lead_capture ADD CONSTRAINT lead_capture_sync_status_valid
  CHECK (crm_sync_status IN ('pending','delivered','failed'));
ALTER TABLE lead_capture ADD CONSTRAINT lead_capture_crm_mode_valid
  CHECK (crm_mode IS NULL OR crm_mode IN ('contact_note','lead_admission'));

-- Modo `contact_note`: el CRM de hoy no permite crear empresa ni oportunidad
-- por clave de API (B.6). Si aparecen rellenas en ese modo, es un dato falso.
ALTER TABLE lead_capture ADD CONSTRAINT lead_capture_contact_note_shape
  CHECK (
    crm_mode IS DISTINCT FROM 'contact_note'
    OR (crm_company_id IS NULL AND crm_opportunity_id IS NULL)
  );

ALTER TABLE webhook_delivery ADD CONSTRAINT webhook_status_valid
  CHECK (status IN ('pending','delivered','failed'));
ALTER TABLE email_delivery ADD CONSTRAINT email_status_valid
  CHECK (status IN ('pending','delivered','failed'));

-- Cinco intentos por ciclo (B.6). El reintento manual sobre una captura
-- `failed` abre un CICLO nuevo en vez de superar el tope: así RF-52 convive
-- con el límite en lugar de contradecirlo (resuelve CF-1).
ALTER TABLE crm_delivery ADD CONSTRAINT crm_delivery_attempt_bounded
  CHECK (attempt BETWEEN 1 AND 5);
ALTER TABLE crm_delivery ADD CONSTRAINT crm_delivery_cycle_positive
  CHECK (cycle >= 1);

-- `agent_event.kind` es un enumerado ABIERTO (RF-146): un agente nuevo registra
-- un tipo de actividad sin migración. La disciplina que sí se exige es de FORMA.
ALTER TABLE agent_event ADD CONSTRAINT agent_event_kind_shape
  CHECK (kind ~ '^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$');

ALTER TABLE audit_log ADD CONSTRAINT audit_log_actor_type_valid
  CHECK (actor_type IN ('user','api_key','system'));

-- ─── 2. audit_log inmutable (RNF-29) ────────────────────────────────────────
-- Tres capas, no una promesa: disparador de guarda, y más abajo la revocación
-- de privilegios al rol de aplicación.

CREATE OR REPLACE FUNCTION audit_log_es_inmutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION
    'audit_log es inmutable: no se puede % una fila de auditoría (RNF-29). '
    'Si necesitas corregir un registro, añade uno nuevo que lo explique.',
    lower(TG_OP);
END;
$$;

CREATE TRIGGER audit_log_sin_update
  BEFORE UPDATE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_es_inmutable();

CREATE TRIGGER audit_log_sin_delete
  BEFORE DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_es_inmutable();

-- ─── 3. Rol de aplicación y aislamiento entre empresas ──────────────────────
-- El corazón del DoD #5 y del riesgo R-10.
--
-- Principio: olvidar el filtro devuelve CERO filas, no todas. La política de
-- fila compara contra `app.organization_id`, que la capa de acceso fija dentro
-- de la transacción de cada petición. Sin ese ajuste, la variable está vacía y
-- ninguna fila coincide.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'slg_app') THEN
    CREATE ROLE slg_app NOLOGIN;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO slg_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO slg_app;

-- La auditoría solo admite lectura y escritura. Nunca corrección ni borrado.
REVOKE UPDATE, DELETE, TRUNCATE ON audit_log FROM slg_app;

-- Contexto de la petición. `current_setting(..., true)` devuelve NULL si no se
-- ha fijado: ese NULL es lo que hace que una consulta sin contexto no vea nada.
CREATE OR REPLACE FUNCTION app_organization_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT nullif(current_setting('app.organization_id', true), '')
$$;

CREATE OR REPLACE FUNCTION app_actor_role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT nullif(current_setting('app.actor_role', true), '')
$$;

-- Política uniforme sobre las ocho tablas con `organization_id`.
-- FORCE incluye al propietario de la tabla: sin él, migrar con el usuario dueño
-- saltaría la política sin avisar.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'contact','membership','invitation','api_key',
    'project','deliverable','announcement','agent_event'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format($f$
      CREATE POLICY %I ON %I
      USING (
        organization_id = app_organization_id()
        OR app_actor_role() IN ('slg_admin','slg_operator')
      )
      WITH CHECK (
        organization_id = app_organization_id()
        OR app_actor_role() IN ('slg_admin','slg_operator')
      )
    $f$, 'pol_' || t || '_aislamiento', t);
  END LOOP;
END
$$;
