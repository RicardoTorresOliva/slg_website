-- REVISIÓN FINAL · **El visor no podía leer ningún entregable.** Corrige el
-- hallazgo C-1 de la revisión independiente (DU-19 · RF-90 · RNF-21).
--
-- EL FALLO, TAL COMO ERA. `lib/visor/servicio.ts` leía `deliverable` a través de
-- `withSystemScope`, que fija `app.actor_role = 'system'`. La política de fila
-- deja cruzar empresas a `slg_admin`, `slg_operator` y `agent_slg` — **`system`
-- no está en la lista, y no debe estarlo**: si lo estuviera, todo trabajo de
-- fondo vería todas las empresas. Resultado: la consulta devolvía **cero filas
-- siempre**, y `/visor/[id]` respondía 404 a todo. No era «falta el subdominio»:
-- era que la unidad no podía funcionar en ninguna configuración.
--
-- POR QUÉ NO LO VIO LA PRUEBA. `test:visor` no importa este módulo: sus 25
-- comprobaciones son sobre el saneador y sobre las funciones puras del origen.
-- Veinticinco verdes que no tocaban ni la base ni la ruta.
--
-- LA SOLUCIÓN, Y POR QUÉ ESTA. El visor vive en un **origen sin sesión** —esa es
-- su razón de ser— así que no hay contexto que fijar y no puede haber política
-- que acote. Se usa el mismo patrón que ya resuelve ese problema en identidad
-- (`app_clave_api_por_hash`, `app_memberships_de_usuario`): una función
-- `SECURITY DEFINER` **estrechísima**, que no recibe filtros, no admite
-- variaciones y devuelve como mucho una fila.
--
-- **La autorización está DENTRO de la función**, no en quien la llama: cliente,
-- HTML y publicado. Un entregable `internal`, uno de otro tipo o uno sin
-- publicar no salen de aquí aunque el código de la aplicación se equivoque —que
-- es justo lo que acaba de pasar—. Y `published_at IS NOT NULL` es nuevo: un
-- entregable creado y no publicado no se sirve, que es lo que el ciclo de tres
-- pasos de DU-23 promete.
CREATE OR REPLACE FUNCTION app_entregable_para_el_visor(p_id text)
RETURNS TABLE (id text, title text, file_key text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.id, d.title, d.file_key
    FROM deliverable d
   WHERE d.id = p_id
     AND d.visibility = 'client'
     AND d.type = 'html'
     AND d.published_at IS NOT NULL
     AND d.file_key IS NOT NULL
   LIMIT 1
$$;

REVOKE ALL ON FUNCTION app_entregable_para_el_visor(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_entregable_para_el_visor(text) TO slg_app;

COMMENT ON FUNCTION app_entregable_para_el_visor(text) IS
  'DU-19 · la única lectura de deliverable desde un origen sin sesión. La '
  'autorización va dentro: client + html + publicado. No admite filtros de quien '
  'llama, así que no se puede ampliar desde el código.';
