-- ============================================================================
-- 0009 · Barrido de invitaciones caducadas
-- ----------------------------------------------------------------------------
-- FU-07. Las invitaciones se ESCRIBEN con el contexto de quien invita, y la
-- política de fila de `invitation` hace cumplir la pertenencia sola: un
-- `client_admin` no puede tocar las de otra empresa aunque el código lo
-- intentara. Esa es la forma correcta y es la que usa el servicio.
--
-- El barrido de caducadas es la excepción, y por eso está aquí: recorre TODAS
-- las empresas y no tiene actor. Sin contexto, la política devuelve cero filas y
-- el barrido no barrería nada — en silencio, que es lo peor que puede hacer.
--
-- Estrecha como las otras tres: no acepta filtros, solo cierra lo que YA venció,
-- y borra el testigo al hacerlo. Una invitación caducada con hash guardado es un
-- secreto que ya no abre nada y que sigue ahí para confundir una auditoría.
-- ============================================================================

CREATE OR REPLACE FUNCTION app_caducar_invitaciones()
RETURNS integer
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_n integer;
BEGIN
  UPDATE invitation
     SET status = 'rejected',
         token_hash = NULL
   WHERE status = 'pending'
     AND expires_at <= now();
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END
$$;

REVOKE ALL ON FUNCTION app_caducar_invitaciones() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_caducar_invitaciones() TO slg_app;

COMMENT ON FUNCTION app_caducar_invitaciones() IS
  'FU-07. Cierra las invitaciones pendientes vencidas en todas las empresas. '
  'SECURITY DEFINER porque el barrido no tiene actor y la política de fila, sin '
  'contexto, devolvería cero filas sin decir nada. Llamante único: lib/invitations/.';
