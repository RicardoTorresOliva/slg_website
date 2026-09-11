-- ============================================================================
-- 0010 · RLS de las tablas de anti-abuso (FU-11)
-- ----------------------------------------------------------------------------
-- `blocked_email_domain` y `rate_limit_event` no llevan `organization_id`:
-- son mecanismo interno del sitio público, sin contexto de empresa — por eso
-- no entran en la política uniforme de 0001 (que cubre las OCHO tablas con
-- `organization_id`) ni en `ORG_SCOPED_TABLES`.
--
-- Quien las consulta es siempre una Server Action de un formulario público
-- SIN sesión (un visitante anónimo no es un actor autenticado): ese código
-- corre con `withSystemScope`, nunca con `withScope`. De ahí que la única
-- política sea "system, todo permitido" — no hay otro actor legítimo hoy.
-- Cuando exista una pantalla de HQ para editar la lista de dominios (fuera
-- de FU-11), esa unidad añade la política de `slg_admin` que le haga falta,
-- siguiendo el mismo patrón que D-53/D-55 en unidades anteriores.
--
-- Fuentes: planning/requirements.md RF-31 a RF-35 · docs/decision_log.md D-16
-- ============================================================================

ALTER TABLE blocked_email_domain ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_email_domain FORCE ROW LEVEL SECURITY;

CREATE POLICY pol_blocked_email_domain_sistema ON blocked_email_domain
  USING (app_actor_role() = 'system')
  WITH CHECK (app_actor_role() = 'system');

ALTER TABLE rate_limit_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_event FORCE ROW LEVEL SECURITY;

CREATE POLICY pol_rate_limit_event_sistema ON rate_limit_event
  USING (app_actor_role() = 'system')
  WITH CHECK (app_actor_role() = 'system');

-- Semilla: exactamente la lista PROVISIONAL que ya vivía hardcodeada en
-- components/download-form/free-email-domains.ts — se traslada, no se amplía
-- (esa lista era del prototipo de FU-10; ampliarla es trabajo de contenido
-- posterior, no de esta migración). Esa constante del cliente sigue siendo
-- solo la primera señal (RNF-33); esta tabla pasa a ser la autoridad real.
INSERT INTO blocked_email_domain (domain) VALUES
  ('gmail.com'),
  ('yahoo.com'),
  ('hotmail.com'),
  ('outlook.com'),
  ('icloud.com'),
  ('aol.com'),
  ('protonmail.com'),
  ('gmx.com'),
  ('mail.com'),
  ('live.com'),
  ('yandex.com')
ON CONFLICT (domain) DO NOTHING;
