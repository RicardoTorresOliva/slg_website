-- ============================================================================
-- 0004 · Identidad: lo que Better Auth necesita, y la única puerta a la
--        pertenencia de un usuario
-- ----------------------------------------------------------------------------
-- FU-06. Dos bloques, con motivos distintos:
--
--   A) Columnas que exigen Better Auth y sus plugins `organization` y `admin`.
--      Son ADITIVAS: ninguna toca el tipo ni el nombre de nada existente, así
--      que no rozan D-26 ni D-27 ([IRREVERSIBLE-TRAS-FU-04]).
--
--   B) `app_memberships_de_usuario`: una función `SECURITY DEFINER` que responde
--      UNA sola pregunta. Ver el porqué abajo.
-- ============================================================================

-- ─── A · Columnas de Better Auth ────────────────────────────────────────────

-- Plugin `admin`: suspensión de cuentas.
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "banned" boolean DEFAULT false;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "ban_reason" text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "ban_expires" timestamp with time zone;

-- Plugin `organization`: empresa activa de la sesión. NO es autorización: el
-- `organization_id` autoritativo se resuelve contra la base en cada petición
-- (architecture §2.4). Esta columna es comodidad de interfaz, y por eso NO se
-- usa nunca como filtro.
ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "active_organization_id" text;
-- Plugin `admin`: suplantación. Queda declarada para que el adaptador no falle;
-- la funcionalidad NO se habilita en v1.
ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "impersonated_by" text;

ALTER TABLE "account" ADD COLUMN IF NOT EXISTS "refresh_token_expires_at" timestamp with time zone;

ALTER TABLE "verification" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;

ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "logo" text;
ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "metadata" text;

-- `invitation.status` con los CUATRO valores del plugin, tal cual los escribe
-- —incluida la grafía `canceled`— para no pelear con su lógica interna
-- (`data_model` §3.5). «Caducada» NO es un valor: se deduce de
-- `expires_at < now()` sobre una `pending`, porque un estado derivado del reloj
-- que además se guarda exige un proceso que lo actualice, y ese proceso es
-- justo el que falla en silencio.
ALTER TABLE "invitation" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'pending' NOT NULL;
ALTER TABLE "invitation" ADD COLUMN IF NOT EXISTS "inviter_id" text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invitation_status_valid'
  ) THEN
    ALTER TABLE "invitation" ADD CONSTRAINT "invitation_status_valid"
      CHECK ("status" IN ('pending','accepted','rejected','canceled'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invitation_inviter_fk'
  ) THEN
    ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviter_fk"
      FOREIGN KEY ("inviter_id") REFERENCES "user"("id") ON DELETE SET NULL;
  END IF;
END
$$;

-- ─── B · La única puerta a la pertenencia ───────────────────────────────────
--
-- EL PROBLEMA. `membership` está bajo Row Level Security FORZADA (migración
-- 0001): sin `app.organization_id` fijado, devuelve CERO filas. Eso es
-- exactamente lo que queremos... salvo en un momento: **el inicio de sesión**.
-- Ahí todavía no sabemos a qué empresa pertenece quien entra —esa es justo la
-- pregunta—, así que no hay contexto que fijar y la consulta no ve nada.
--
-- LO QUE NO SE HACE, Y POR QUÉ:
--   · Añadir 'system' a la política de las ocho tablas → abriría de golpe
--     `project`, `deliverable`, `announcement` y `contact` a cualquier código
--     que llame a `withSystemScope`. El agujero sería ocho veces mayor que el
--     problema.
--   · Conectar Better Auth con el rol dueño → el dueño lleva BYPASSRLS y todo
--     el aislamiento se vuelve decorativo. Es el hallazgo de FU-04 repetido.
--
-- LO QUE SE HACE. Una función `SECURITY DEFINER` que contesta UNA pregunta —
-- «¿a qué organizaciones activas pertenece este usuario?»— y no puede
-- reutilizarse para nada más: no acepta filtros, no devuelve datos de proyecto
-- ni de entregable, y `search_path` va fijado para que nadie la redirija.
-- El único llamante es `lib/auth/`, y hay un gate que lo comprueba.
CREATE OR REPLACE FUNCTION app_memberships_de_usuario(p_user_id text)
RETURNS TABLE (
  organization_id text,
  org_role text,
  org_type text,
  org_status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT m.organization_id, m.org_role, o.type, o.status
  FROM membership m
  JOIN organization o ON o.id = m.organization_id
  WHERE m.user_id = p_user_id
    AND o.status = 'active'
  ORDER BY o.type DESC, o.name
$$;

REVOKE ALL ON FUNCTION app_memberships_de_usuario(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_memberships_de_usuario(text) TO slg_app;

COMMENT ON FUNCTION app_memberships_de_usuario(text) IS
  'FU-06. Única vía para resolver la pertenencia durante el inicio de sesión, '
  'cuando todavía no hay contexto de empresa que fijar. SECURITY DEFINER a '
  'propósito y deliberadamente estrecha: no acepta filtros ni devuelve nada '
  'fuera de la pertenencia. Llamante único: lib/auth/.';
