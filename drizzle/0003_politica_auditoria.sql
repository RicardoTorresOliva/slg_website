-- ============================================================================
-- 0003 · Política de fila para audit_log
-- ----------------------------------------------------------------------------
-- Hueco encontrado por la prueba de catálogo de `test-isolation.ts`, que
-- recorre `pg_class` en vez de una lista escrita a mano: `audit_log` tiene
-- `organization_id` y no tenía política, así que un cliente podría haber leído
-- las entradas de auditoría de otra empresa.
--
-- La matriz de permisos B.3 es explícita: «Ver auditoría → slg_admin ✔, el
-- resto —». La lectura se restringe a ese rol.
--
-- La ESCRITURA queda abierta a propósito: la aplicación registra acciones de
-- cualquier empresa, y una auditoría que no puede escribirse no sirve de nada.
-- Que no pueda modificarse ni borrarse ya lo garantizan los disparadores de
-- 0001 y la revocación de privilegios (RNF-29).
-- ============================================================================

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log FORCE ROW LEVEL SECURITY;

CREATE POLICY pol_audit_log_lectura ON audit_log
  FOR SELECT
  USING (app_actor_role() = 'slg_admin');

CREATE POLICY pol_audit_log_insercion ON audit_log
  FOR INSERT
  WITH CHECK (true);
