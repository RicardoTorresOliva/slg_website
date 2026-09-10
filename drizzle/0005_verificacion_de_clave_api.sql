-- ============================================================================
-- 0005 · Política adicional: verificar una clave de API es trabajo de sistema
-- ----------------------------------------------------------------------------
-- Hueco encontrado escribiendo FU-06, antes de que llegara a producción:
-- `api_key` está en ORG_SCOPED_TABLES (0001) con la política uniforme de
-- aislamiento — correcta para LEER u operar sobre claves ya sabiendo de qué
-- empresa son. Pero VERIFICAR una clave que llega en `Authorization: Bearer`
-- es, por definición, anterior a saber la empresa: es la operación que
-- establece la identidad, no una que ya la tiene. Con la sola política de
-- 0001, ninguna clave habría verificado nunca — ni siquiera las de SLG
-- (organization_id NULL: `NULL = NULL` no es `true` en SQL, así que el
-- `WITH CHECK`/`USING` uniforme tampoco la habría dejado pasar).
--
-- Política ADICIONAL (permisiva: en PostgreSQL, varias políticas permisivas
-- sobre la misma tabla se combinan con OR), no una que sustituye a la de
-- 0001. `lib/auth/api-keys.ts` la usa exclusivamente para verificar una clave
-- entrante y anotar su último uso — nunca para crear ni revocar, que siguen
-- exigiendo el contexto real de un `slg_admin` a través de la política de
-- 0001. Ver D-53 en `docs/decision_log.md`.
-- ============================================================================

CREATE POLICY pol_api_key_verificacion_sistema ON api_key
  USING (app_actor_role() = 'system')
  WITH CHECK (app_actor_role() = 'system');
