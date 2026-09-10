-- ============================================================================
-- 0008 · invitation: columnas, restricciones y políticas que faltaban
-- ----------------------------------------------------------------------------
-- Mismo patrón que 0007 (email_delivery) para FU-08: FU-04 creó `invitation`
-- con solo `id, organization_id, email, role, token_hash, expires_at,
-- accepted_at, created_at` — `data_model.md` §5.7, ya aprobado entonces,
-- define seis columnas más (`status`, `inviter_id`, `sent_at`,
-- `accepted_by_user_id`, `revoked_at`, `revoked_by_user_id`) y cinco
-- restricciones que ninguna migración había añadido. FU-07 es la primera
-- unidad que escribe de verdad en esta tabla — encontrado escribiéndola.
-- ============================================================================

ALTER TABLE invitation
  ADD COLUMN status text NOT NULL DEFAULT 'pending',
  ADD COLUMN inviter_id text REFERENCES "user"(id) ON DELETE SET NULL,
  ADD COLUMN sent_at timestamp with time zone,
  ADD COLUMN accepted_by_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  ADD COLUMN revoked_at timestamp with time zone,
  ADD COLUMN revoked_by_user_id text REFERENCES "user"(id) ON DELETE SET NULL;

ALTER TABLE invitation ADD CONSTRAINT invitation_status_valid
  CHECK (status IN ('pending','accepted','rejected','canceled'));
-- invitation_role_valid ya existe desde 0001 (idéntica a la de `data_model`
-- §5.7): no se repite aquí.
ALTER TABLE invitation ADD CONSTRAINT invitation_accepted_coherent
  CHECK ((status = 'accepted') = (accepted_at IS NOT NULL));
ALTER TABLE invitation ADD CONSTRAINT invitation_canceled_coherent
  CHECK ((status = 'canceled') = (revoked_at IS NOT NULL));

-- Parcial: el histórico de invitaciones aceptadas o canceladas se conserva
-- sin estorbar un reenvío nuevo al mismo correo (`data_model` §5.7).
CREATE UNIQUE INDEX uq_invitation_pending_per_email_org ON invitation
  (organization_id, lower(email)) WHERE status = 'pending';

CREATE INDEX idx_invitation_org_status ON invitation (organization_id, status, created_at DESC);
CREATE INDEX idx_invitation_pending_expiry ON invitation (expires_at) WHERE status = 'pending';

-- ── Política adicional: canjear un token es trabajo de sistema ─────────────
-- Mismo razonamiento que D-53 (api_key, migración 0005): validar el token de
-- un enlace de invitación es, por definición, ANTERIOR a tener el contexto
-- de empresa que la política uniforme de 0001 exige para leer. Sin esto,
-- ningún enlace de invitación se habría podido canjear nunca.
CREATE POLICY pol_invitation_canje_sistema ON invitation
  USING (app_actor_role() = 'system')
  WITH CHECK (app_actor_role() = 'system');

-- ── Política RESTRICTIVA: un client_admin no invita fuera de su alcance ────
-- `data_model` §5.7: "un client_admin puede invitar a miembros de SU empresa
-- (RF-92), y de ahí se sigue que no puede emitir una invitación con
-- role='slg_admin' ni a una organización de tipo slg". La política uniforme
-- de 0001 ya exige `organization_id = app_organization_id()` (no puede
-- invitar a OTRA empresa), pero no limita el ROL de la invitación — eso
-- exige mirar la fila que se está insertando, no solo el contexto. RESTRICTIVE
-- porque debe combinarse con AND sobre la política permisiva de 0001, no con
-- OR (un `client_admin` no queda exento de la comprobación de organización
-- por cumplir esta). `slg_admin`/`slg_operator` quedan exentos: son personal
-- de confianza que invita dentro y fuera de SLG (B.3, fila `identidad.invitar_slg`).
--
-- La prueba ADVERSARIAL exhaustiva de esta política es explícitamente de
-- FU-13 (`data_model` §5.7, nota debajo de la restricción); FU-07 prueba solo
-- el caso positivo y el caso negativo directo, no la batería completa.
CREATE POLICY invitation_insert_policy ON invitation
  AS RESTRICTIVE FOR INSERT
  WITH CHECK (
    app_actor_role() IN ('slg_admin', 'slg_operator')
    OR (
      app_actor_role() = 'client_admin'
      AND role IN ('client_admin', 'client_member')
      AND EXISTS (
        SELECT 1 FROM organization o WHERE o.id = organization_id AND o.type = 'client'
      )
    )
  );

-- ── Política adicional: crear una membership al aceptar es trabajo de sistema ──
-- `membership` (0006) ya permite `system` en SELECT (resolver la propia
-- empresa de un usuario). Aceptar una invitación es la primera operación que
-- necesita ESCRIBIR una membership sin contexto de empresa todavía — antes de
-- esta fila, quien acepta no pertenece a ninguna. Acotada a INSERT: el
-- resto de escrituras sobre membership (cambiar de rol, expulsar) siguen
-- exigiendo el contexto real de un `slg_admin`/`slg_operator`/`client_admin`
-- a través de la política de 0001.
CREATE POLICY pol_membership_creacion_sistema ON membership
  FOR INSERT
  WITH CHECK (app_actor_role() = 'system');
