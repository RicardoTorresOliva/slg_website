-- ============================================================================
-- 0007 · Los alcances de una clave, restringidos en la BASE DE DATOS
-- ----------------------------------------------------------------------------
-- HUECO ENCONTRADO EN FU-06. `data_model` §3.6 especifica dos restricciones
-- sobre `api_key.scopes` y **ninguna de las dos existía**: la tabla solo tenía
-- su clave primaria y su clave foránea. Se podía guardar `["superpoderes:todo"]`
-- o `[]` sin que nada protestara.
--
-- Por qué importa, y por qué no basta con validarlo en el código: el código que
-- valida es el que lee. Si mañana una clave se crea desde una consola, un
-- script de migración o una unidad futura que olvide validar, la fila entra. La
-- restricción en la base es la que no se puede olvidar.
--
-- `data_model` §3.6 lo escribe con `text[]`; la columna es `jsonb` (D-27), así
-- que esta es la misma regla en el tipo real: contención de jsonb.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'api_key_scopes_es_lista') THEN
    ALTER TABLE api_key ADD CONSTRAINT api_key_scopes_es_lista
      CHECK (jsonb_typeof(scopes) = 'array');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'api_key_scopes_valid') THEN
    -- Contención: cada elemento debe ser uno de los SEIS. Un alcance inventado
    -- no llega a guardarse (RF-147, criterio 4 de FU-06).
    ALTER TABLE api_key ADD CONSTRAINT api_key_scopes_valid
      CHECK (scopes <@ '["captures:read","orgs:read","deliverables:read","deliverables:write","announcements:write","events:write"]'::jsonb);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'api_key_scopes_not_empty') THEN
    -- Una clave sin alcance no puede hacer nada y solo sirve para confundir en
    -- HQ: es un error de creación, no un estado válido.
    ALTER TABLE api_key ADD CONSTRAINT api_key_scopes_not_empty
      CHECK (jsonb_array_length(scopes) > 0);
  END IF;
END
$$;
