-- ============================================================================
-- 0008 · La invitación completa: seis columnas nuestras, sus coherencias y la
--        única vía de canje
-- ----------------------------------------------------------------------------
-- FU-07. `data_model` §5.7 especifica seis columnas propias sobre la tabla del
-- plugin y cinco restricciones. Hasta ahora existían dos de las columnas
-- (`token_hash`, `accepted_at`) y **ninguna** de las coherencias.
--
-- SOBRE `token_hash` Y EL «NO NULO» DE §5.7. D-54 la dejó opcional porque el
-- plugin `organization` crea filas sin conocerla. La garantía que importa se
-- conserva entera: sigue siendo ÚNICA —y en PostgreSQL un índice único admite
-- varios NULL, así que las invitaciones sin enlace conviven— y el servicio de
-- FU-07, que es quien emite de verdad, la rellena siempre.
-- ============================================================================

-- ─── Las cuatro columnas que faltaban ───────────────────────────────────────

-- Nulo = creada pero no enviada. Es la evidencia de RF-119: si el correo falla,
-- la invitación EXISTE y se puede reenviar.
ALTER TABLE "invitation" ADD COLUMN IF NOT EXISTS "sent_at" timestamptz;

ALTER TABLE "invitation" ADD COLUMN IF NOT EXISTS "accepted_by_user_id" text;
ALTER TABLE "invitation" ADD COLUMN IF NOT EXISTS "revoked_at" timestamptz;
ALTER TABLE "invitation" ADD COLUMN IF NOT EXISTS "revoked_by_user_id" text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invitation_accepted_by_fk') THEN
    ALTER TABLE "invitation" ADD CONSTRAINT "invitation_accepted_by_fk"
      FOREIGN KEY ("accepted_by_user_id") REFERENCES "user"("id") ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invitation_revoked_by_fk') THEN
    ALTER TABLE "invitation" ADD CONSTRAINT "invitation_revoked_by_fk"
      FOREIGN KEY ("revoked_by_user_id") REFERENCES "user"("id") ON DELETE SET NULL;
  END IF;

  -- El rol que concede la invitación sale del mismo vocabulario que `user.role`:
  -- una invitación no puede conceder un rol que no existe.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invitation_role_valid') THEN
    ALTER TABLE "invitation" ADD CONSTRAINT "invitation_role_valid"
      CHECK ("role" IN ('slg_admin','slg_operator','client_admin','client_member'));
  END IF;

  -- Estados imposibles, prohibidos en la base y no solo en el código: aceptada
  -- sin fecha, o con fecha sin estar aceptada. Lo mismo para la revocación.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invitation_accepted_coherent') THEN
    ALTER TABLE "invitation" ADD CONSTRAINT "invitation_accepted_coherent"
      CHECK (("status" = 'accepted') = ("accepted_at" IS NOT NULL));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invitation_canceled_coherent') THEN
    ALTER TABLE "invitation" ADD CONSTRAINT "invitation_canceled_coherent"
      CHECK (("status" = 'canceled') = ("revoked_at" IS NOT NULL));
  END IF;
END
$$;

-- Dos invitaciones vigentes al mismo correo en la misma empresa producen dos
-- enlaces válidos y la duda de cuál revocar (RF-78). Parcial a propósito: el
-- histórico de aceptadas y canceladas se conserva sin estorbar.
CREATE UNIQUE INDEX IF NOT EXISTS "uq_invitation_pending_per_email_org"
  ON "invitation" ("organization_id", lower("email")) WHERE "status" = 'pending';

CREATE INDEX IF NOT EXISTS "idx_invitation_org_status"
  ON "invitation" ("organization_id", "status", "created_at" DESC);

-- Solo las pendientes caducan: el índice parcial es el barrido de caducadas.
CREATE INDEX IF NOT EXISTS "idx_invitation_pending_expiry"
  ON "invitation" ("expires_at") WHERE "status" = 'pending';

-- ─── La única vía de canje ──────────────────────────────────────────────────
--
-- Mismo problema y misma forma que la pertenencia (0004) y la clave de API
-- (0006): `invitation` está bajo row level security FORZADA, y quien llega con
-- un enlace **no tiene sesión ni empresa** —aceptar la invitación es lo que se
-- la va a dar—. Sin contexto, la consulta devuelve cero.
--
-- La función es estrecha por diseño: exige el hash exacto, **no lo devuelve**, y
-- no sirve para listar invitaciones. Listar es de DU-14 y va con contexto.
CREATE OR REPLACE FUNCTION app_invitacion_por_hash(p_token_hash text)
RETURNS TABLE (
  id text,
  organization_id text,
  email text,
  role text,
  status text,
  expires_at timestamptz,
  accepted_at timestamptz,
  revoked_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT i.id, i.organization_id, i.email, i.role, i.status,
         i.expires_at, i.accepted_at, i.revoked_at
  FROM invitation i
  WHERE i.token_hash = p_token_hash
$$;

REVOKE ALL ON FUNCTION app_invitacion_por_hash(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_invitacion_por_hash(text) TO slg_app;

-- Canje: marca la invitación como aceptada y da de alta la pertenencia, en UNA
-- transacción. Que sean dos operaciones separadas es justo el hueco por el que
-- se cuela una invitación consumida sin cuenta ligada, o al revés.
CREATE OR REPLACE FUNCTION app_canjear_invitacion(
  p_invitation_id text,
  p_user_id text,
  p_membership_id text
)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_org text;
  v_role text;
BEGIN
  -- La condición `status = 'pending'` es la que hace el UN SOLO USO real: dos
  -- canjes simultáneos del mismo enlace, y solo uno actualiza una fila.
  UPDATE invitation
     SET status = 'accepted',
         accepted_at = now(),
         accepted_by_user_id = p_user_id
   WHERE id = p_invitation_id
     AND status = 'pending'
     AND expires_at > now()
  RETURNING organization_id, role INTO v_org, v_role;

  IF v_org IS NULL THEN
    RETURN false;
  END IF;

  -- `org_role` guarda EL MISMO rol de B.3, no el vocabulario `admin`/`member`
  -- del plugin. `data_model` §3.4 describe el del plugin, pero la migración 0000
  -- ya fijó el CHECK sobre los cuatro roles de B.3 y el defecto en
  -- `client_member`: la base manda sobre el documento, y escribir 'admin' aquí
  -- viola la restricción. Ver D-59.
  INSERT INTO membership (id, user_id, organization_id, org_role)
  VALUES (p_membership_id, p_user_id, v_org, v_role)
  ON CONFLICT (user_id, organization_id) DO NOTHING;

  -- El rol de B.3 lo hereda la cuenta (RF-61).
  UPDATE "user" SET role = v_role, updated_at = now() WHERE id = p_user_id;

  RETURN true;
END
$$;

REVOKE ALL ON FUNCTION app_canjear_invitacion(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_canjear_invitacion(text, text, text) TO slg_app;

COMMENT ON FUNCTION app_canjear_invitacion(text, text, text) IS
  'FU-07. Canje atómico: consume la invitación, crea la pertenencia y hereda el '
  'rol, en una transacción. La condición status = pending es la que hace el un '
  'solo uso real (RF-60). Llamante único: lib/invitations/.';
