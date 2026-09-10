-- ============================================================================
-- 0006 · Política adicional: resolver la propia empresa es trabajo de sistema
-- ----------------------------------------------------------------------------
-- Mismo hueco que 0005, encontrado por la misma prueba (`test-auth.ts`,
-- sección E): `organizacionDelUsuario` (lib/auth/org.ts) lee `membership`
-- para responder "¿de qué empresa es este usuario ya autenticado?" — y esa
-- pregunta es EXACTAMENTE la que construye el contexto (`organization_id`)
-- que la política de 0001 exige para poder leer. Sin esta política adicional,
-- ningún `client_admin`/`client_member` habría resuelto nunca su empresa: la
-- política de 0001 exige `organization_id = app_organization_id()` —que
-- todavía no existe— o el rol `slg_admin`/`slg_operator` —que no tienen—.
--
-- Política ADICIONAL y permisiva (se combina con OR sobre la de 0001), y
-- acotada a SELECT: el trabajo de sistema aquí es leer, nunca escribir una
-- membresía ajena. Ver D-53 en `docs/decision_log.md`.
-- ============================================================================

CREATE POLICY pol_membership_resolucion_sistema ON membership
  FOR SELECT
  USING (app_actor_role() = 'system');
