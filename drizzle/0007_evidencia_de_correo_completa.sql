-- ============================================================================
-- 0007 · email_delivery: columnas, restricciones e índices que faltaban
-- ----------------------------------------------------------------------------
-- FU-04 (0000) creó `email_delivery` con solo las columnas que las unidades ya
-- construidas necesitaban. `data_model.md` §5.19 —el diseño aprobado— define
-- cinco columnas más (`related_entity_type`, `related_entity_id`,
-- `organization_id`, `sent_at`), cuatro restricciones y tres índices que
-- ninguna migración había añadido todavía. FU-08 es la primera unidad que
-- escribe filas de verdad en esta tabla y depende de todo esto: encontrado
-- escribiendo FU-08, no en el diseño (mismo patrón que D-53).
--
-- `related_entity_id` es la consulta que justifica la tabla («¿se envió el
-- correo de esta invitación, y cuándo?», RF-119) y `organization_id` permite
-- acotar por empresa. Ninguna de las dos lleva FK dura a la fila de origen
-- (`related_entity_id`: sin FK por diseño, §2.4; `organization_id`: FK a
-- `organization` con ON DELETE RESTRICT, igual que `agent_event`).
--
-- CON RLS, no sin ella (corregido tras `test-isolation.ts`, comprobación 8:
-- "toda tabla con `organization_id` tiene RLS activa, FORZADA y con
-- política" es una regla de CATÁLOGO sin excepciones — cualquier tabla con
-- esa columna la exige, sea o no "dato de cliente". `email_delivery` se une
-- a las ocho de 0001 y, como `api_key` (0005), casi todo lo que la toca hoy
-- es trabajo de sistema (la cola de FU-08) sin `organization_id` en
-- contexto: por eso lleva la misma política adicional para `system`.
-- ============================================================================

ALTER TABLE email_delivery
  ADD COLUMN related_entity_type text,
  ADD COLUMN related_entity_id text,
  ADD COLUMN organization_id text REFERENCES organization(id) ON DELETE RESTRICT,
  ADD COLUMN sent_at timestamp with time zone;

ALTER TABLE email_delivery ADD CONSTRAINT email_kind_valid
  CHECK (kind IN ('invitation','password_reset','capture_notice','capture_failed_alert'));
ALTER TABLE email_delivery ADD CONSTRAINT email_locale_valid
  CHECK (locale IN ('es','en'));
ALTER TABLE email_delivery ADD CONSTRAINT email_sent_coherent
  CHECK ((status = 'delivered') = (sent_at IS NOT NULL));
ALTER TABLE email_delivery ADD CONSTRAINT email_related_pair
  CHECK ((related_entity_type IS NULL) = (related_entity_id IS NULL));

-- Renombrado para que el nombre real coincida con el que documentan
-- `data_model` §5.19 y `architecture` §6.1 (`idx_email_queue`, no
-- `idx_email_pending`). NOTA: `idx_lead_capture_pending` e
-- `idx_webhook_pending` tienen la misma discrepancia de nombre contra
-- `architecture` §6.1 (que los llama `idx_lead_capture_queue` /
-- `idx_webhook_queue`) y **no** se tocan aquí — pertenecen a `lead_capture`
-- (FU-04) y `webhook_delivery` (DU-12), fuera del alcance de FU-08. Queda
-- anotado para quien construya DU-12.
ALTER INDEX idx_email_pending RENAME TO idx_email_queue;

CREATE INDEX idx_email_related ON email_delivery
  (related_entity_type, related_entity_id, created_at DESC);
CREATE INDEX idx_email_to ON email_delivery (lower(to_email), created_at DESC);
CREATE INDEX idx_email_failed ON email_delivery (created_at DESC)
  WHERE status = 'failed';

-- Misma política uniforme que las ocho tablas de 0001 (mismo nombre de
-- convención `pol_<tabla>_aislamiento`): deja ver/escribir filas de la propia
-- empresa, o cualquiera a slg_admin/slg_operator. Sola, esta política NO
-- basta para el uso real de hoy (la cola de FU-08 no tiene organization_id en
-- contexto), por eso sigue la política adicional de más abajo.
ALTER TABLE email_delivery ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_delivery FORCE ROW LEVEL SECURITY;

CREATE POLICY pol_email_delivery_aislamiento ON email_delivery
  USING (
    organization_id = app_organization_id()
    OR app_actor_role() IN ('slg_admin','slg_operator')
  )
  WITH CHECK (
    organization_id = app_organization_id()
    OR app_actor_role() IN ('slg_admin','slg_operator')
  );

-- Política ADICIONAL y permisiva (se combina con OR sobre la de arriba,
-- igual que D-53): enviar y reintentar correo es trabajo de sistema
-- (`lib/db/scope.ts`, `withSystemScope`), casi siempre sin empresa en
-- contexto — un `capture_notice` sobre un lead que todavía no es cliente no
-- tiene `organization_id`, y `NULL = NULL` no es `true` en SQL.
CREATE POLICY pol_email_delivery_sistema ON email_delivery
  USING (app_actor_role() = 'system')
  WITH CHECK (app_actor_role() = 'system');
