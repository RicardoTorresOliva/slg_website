-- D-163 · La empresa del CRM y la de aquí se relacionan por el identificador del CRM (2026-09-21).
--
-- D-162 DEJÓ QUE EL CRM CREARA AQUÍ LA CARPETA DEL CLIENTE, PERO EL CRM NO
-- SABÍA QUÉ EMPRESA USAR: las empresas de aquí y las del CRM no estaban
-- relacionadas, y `POST /api/v1/organizations/{id}/projects` pide un `{id}`
-- de este sitio que el CRM no tiene forma de conocer. Se relacionan guardando
-- el identificador del CRM al lado de cada empresa de aquí, y dando al CRM una
-- puerta (`POST /api/v1/organizations`, alcance `orgs:write`) para crear o
-- encontrar la empresa por ese identificador.
--
-- LO QUE ESTA COLUMNA NO ES. Igual que `project.crm_project_id` (0019): no se
-- importa nada comercial —ni etapa, ni importe, ni propietario comercial—. La
-- frontera (a) de `scope.md` no se mueve; `check:fronteras` y la revisión
-- rechazan cualquier columna de esas.
--
-- POR QUÉ EL ÍNDICE ES ÚNICO Y PARCIAL. Un reintento del CRM tras una llamada
-- cortada no puede duplicar la empresa: la ruta devuelve la existente en vez
-- de crear otra, y la base garantiza que aunque la ruta se equivocara, el mismo
-- `crm_company_id` no entraría dos veces. Parcial porque las empresas que ya
-- existían no lo tienen y varios NULL no colisionan.

-- ─── 1. El identificador del CRM, al lado de la empresa ─────────────────────
ALTER TABLE organization ADD COLUMN IF NOT EXISTS crm_company_id text;--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS uq_organization_crm_id
  ON organization (crm_company_id)
  WHERE crm_company_id IS NOT NULL;--> statement-breakpoint

COMMENT ON COLUMN organization.crm_company_id IS
  'Identificador de la empresa en el CRM (D-163): es lo que permite al CRM crear aquí sus proyectos. Nulo en las anteriores. Aquí no entra nada comercial: ni etapa, ni importe, ni propietario.';--> statement-breakpoint

-- ─── 2. Un alcance más para las claves de agente (D-163) ─────────────────────
-- Se reescribe la contención entera, como hicieron 0018 y 0019: nueve pasan a
-- diez. Un alcance inventado sigue sin poder guardarse (RF-147).
ALTER TABLE api_key DROP CONSTRAINT IF EXISTS api_key_scopes_valid;--> statement-breakpoint
ALTER TABLE api_key ADD CONSTRAINT api_key_scopes_valid
  CHECK (scopes <@ '["captures:read","orgs:read","orgs:write","deliverables:read","deliverables:write","announcements:write","events:write","news:write","milestones:write","projects:write"]'::jsonb);
