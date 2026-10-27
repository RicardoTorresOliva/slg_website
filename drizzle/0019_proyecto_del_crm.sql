-- D-162 · El proyecto nace en el CRM; este sitio lo recibe (2026-09-18).
--
-- HASTA HOY UN PROYECTO SE CREABA DOS VECES, A MANO, Y NADA LAS RELACIONABA:
-- una en el CRM y otra aquí, en HQ. A partir de ahora el CRM (o Hermes por él)
-- crea aquí la «carpeta del cliente» por `POST /api/v1/organizations/{id}/projects`
-- y deja al lado su identificador. El proyecto de este sitio sigue siendo lo que
-- el cliente ve en su portal: de él cuelgan entregables, materiales, hitos y
-- pendientes. Lo único que cambia es quién lo da de alta.
--
-- LO QUE ESTA COLUMNA NO ES. No se importa nada comercial: ni etapa, ni importe,
-- ni propietario comercial, ni probabilidad. La frontera (a) de `scope.md` —«dos
-- sistemas de registro comercial es cero sistemas de registro»— no se mueve un
-- milímetro; `check:fronteras` y la revisión rechazan cualquier columna de esas.
--
-- POR QUÉ EL ÍNDICE ES ÚNICO Y PARCIAL. Un reintento del CRM tras una llamada
-- cortada no puede duplicar la carpeta del cliente: la ruta devuelve el proyecto
-- existente en vez de crear otro, y la base garantiza que aunque la ruta se
-- equivocara, el mismo `crm_project_id` no entraría dos veces. Parcial porque
-- los proyectos que ya existían no lo tienen y varios NULL no colisionan.

-- ─── 1. El identificador del CRM, al lado del proyecto ──────────────────────
ALTER TABLE project ADD COLUMN IF NOT EXISTS crm_project_id text;--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS uq_project_crm_id
  ON project (crm_project_id)
  WHERE crm_project_id IS NOT NULL;--> statement-breakpoint

COMMENT ON COLUMN project.crm_project_id IS
  'Identificador del proyecto en el CRM (D-162): el CRM lo crea y este sitio lo recibe. Nulo en los anteriores. Aquí no entra nada comercial: ni etapa, ni importe, ni propietario.';--> statement-breakpoint

-- ─── 2. Un alcance más para las claves de agente (D-162) ─────────────────────
-- Se reescribe la contención entera, como hizo 0018: ocho pasan a nueve. Un
-- alcance inventado sigue sin poder guardarse (RF-147).
ALTER TABLE api_key DROP CONSTRAINT IF EXISTS api_key_scopes_valid;--> statement-breakpoint
ALTER TABLE api_key ADD CONSTRAINT api_key_scopes_valid
  CHECK (scopes <@ '["captures:read","orgs:read","deliverables:read","deliverables:write","announcements:write","events:write","news:write","milestones:write","projects:write"]'::jsonb);
