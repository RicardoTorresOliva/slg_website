-- ============================================================================
-- 0002 · El rol de aplicación deja de ser el dueño del esquema
-- ----------------------------------------------------------------------------
-- HALLAZGO QUE MOTIVA ESTA MIGRACIÓN (FU-04):
-- el usuario creado por la imagen de PostgreSQL es SUPERUSUARIO y lleva
-- `rolbypassrls`. Conectando con él, las políticas de fila **no se aplican**:
-- una consulta sin contexto devolvía las dos empresas en vez de ninguna.
--
-- Todo el aislamiento de 0001 depende de que la aplicación NO se conecte como
-- dueño. Esta migración lo hace posible; que se cumpla lo verifica una prueba
-- automatizada que falla si el usuario de `DATABASE_URL` puede saltarse RLS.
--
-- Reparto de responsabilidades:
--   · dueño   (`slg`)     → migraciones. Nunca sirve peticiones.
--   · aplicación (`slg_app`) → peticiones. Sin BYPASSRLS, sin ser dueño.
-- ============================================================================

ALTER ROLE slg_app WITH LOGIN;
ALTER ROLE slg_app NOBYPASSRLS;

-- Sin privilegios sobre tablas futuras salvo los que se conceden a propósito.
GRANT USAGE ON SCHEMA public TO slg_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO slg_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO slg_app;

-- Una tabla nueva nace accesible para la aplicación, pero su política de fila
-- hay que declararla: la prueba de catálogo la exige y falla si falta.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO slg_app;

-- La auditoría sigue siendo solo de inserción y lectura, también aquí.
REVOKE UPDATE, DELETE, TRUNCATE ON audit_log FROM slg_app;
