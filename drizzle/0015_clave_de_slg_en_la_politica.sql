-- DU-22 · **Una clave de API sin empresa es un actor que cruza empresas, y eso
-- se escribe en la POLÍTICA, no en el código** (`api_contracts` §2.3 · RF-101).
--
-- EL PROBLEMA, TAL COMO APARECIÓ. `api_key.organization_id` nulo significa
-- «clave de SLG»: su universo son todas las empresas (§2.3), y `GET
-- /organizations` —criterio 5 de DU-22— es, por definición, una consulta que
-- las cruza. Pero la política de la migración 0001 deja cruzar solo a
-- `slg_admin` y `slg_operator`, y el contexto de una clave lleva el rol
-- `agent`. Resultado: **una clave de SLG leía cero filas**. No es un fallo de
-- la política: es que el actor que hacía falta no estaba nombrado en ella.
--
-- POR QUÉ SE NOMBRA EN LA POLÍTICA Y NO SE RESUELVE EN LA APLICACIÓN. Las dos
-- alternativas eran peores:
--
--   · `withSystemScope` no sirve —y además tampoco habría funcionado—: pone
--     `app.actor_role = 'system'`, que **tampoco** está en la lista. Si se le
--     añadiera, cualquier trabajo de sistema pasaría a ver todas las empresas,
--     que es exactamente lo que esa función promete no hacer.
--   · Filtrar en el código («si la clave es de SLG, no pongas WHERE») devuelve
--     la decisión de aislamiento a un `if` que alguien puede olvidar. La razón
--     de que este proyecto ponga el aislamiento en la base es que el olvido
--     devuelva CERO filas y no todas.
--
-- Así que se nombra el actor: `agent_slg`. La marca la pone `withScope` **solo**
-- cuando el contexto es de una clave verificada y su `organization_id` es nulo;
-- y cruzar empresas sigue exigiendo, además, el alcance de la ruta. Dos
-- condiciones, una en la base y otra en B.3.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'contact','membership','invitation','api_key',
    'project','deliverable','announcement','agent_event'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'pol_' || t || '_aislamiento', t);
    EXECUTE format($f$
      CREATE POLICY %I ON %I
      USING (
        organization_id = app_organization_id()
        OR app_actor_role() IN ('slg_admin','slg_operator','agent_slg')
      )
      WITH CHECK (
        organization_id = app_organization_id()
        OR app_actor_role() IN ('slg_admin','slg_operator','agent_slg')
      )
    $f$, 'pol_' || t || '_aislamiento', t);
  END LOOP;
END
$$;

COMMENT ON FUNCTION app_actor_role() IS
  'Rol del actor de la petición. Cruzan empresas: slg_admin, slg_operator y '
  'agent_slg (clave de API sin organization_id, DU-22). NUNCA agent ni system.';
