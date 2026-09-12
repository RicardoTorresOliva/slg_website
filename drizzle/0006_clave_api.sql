-- ============================================================================
-- 0006 · La única puerta a la verificación de una clave de API
-- ----------------------------------------------------------------------------
-- FU-06. Mismo problema que la pertenencia en 0004, y misma forma de
-- resolverlo: `api_key` está bajo row level security FORZADA, y verificar una
-- clave ocurre ANTES de saber a qué empresa pertenece —esa es justo la
-- pregunta—, así que no hay `app.organization_id` que fijar y la consulta
-- devuelve cero filas.
--
-- La función es deliberadamente estrecha: solo acepta un hash exacto, solo
-- devuelve lo necesario para autorizar, y NUNCA devuelve el hash. No sirve para
-- listar claves: eso es DU-17, y va con contexto de `slg_admin`.
--
-- `app_registrar_uso_de_clave` existe aparte porque escribir es otro permiso:
-- que la verificación pueda leer no implica que pueda marcar uso.
-- ============================================================================

CREATE OR REPLACE FUNCTION app_clave_api_por_hash(p_key_hash text)
RETURNS TABLE (
  id text,
  name text,
  organization_id text,
  scopes jsonb,
  rate_limit_max integer,
  rate_limit_window_seconds integer,
  expires_at timestamptz,
  revoked_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT k.id, k.name, k.organization_id, k.scopes,
         k.rate_limit_max, k.rate_limit_window_seconds,
         k.expires_at, k.revoked_at
  FROM api_key k
  WHERE k.key_hash = p_key_hash
$$;

REVOKE ALL ON FUNCTION app_clave_api_por_hash(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_clave_api_por_hash(text) TO slg_app;

CREATE OR REPLACE FUNCTION app_registrar_uso_de_clave(p_id text)
RETURNS void
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  UPDATE api_key SET last_used_at = now() WHERE id = p_id
$$;

REVOKE ALL ON FUNCTION app_registrar_uso_de_clave(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_registrar_uso_de_clave(text) TO slg_app;

COMMENT ON FUNCTION app_clave_api_por_hash(text) IS
  'FU-06. Única vía para verificar una clave de API, que ocurre antes de que '
  'exista contexto de empresa. SECURITY DEFINER y estrecha a propósito: exige '
  'el hash exacto y no lo devuelve. Llamante único: lib/auth/api-key.ts.';
