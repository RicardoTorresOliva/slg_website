-- El visor abre también los entregables `internal`, **pero solo desde HQ** (2026-09-21).
--
-- EL DEFECTO, TAL COMO ESTABA ANOTADO EN `ui_wireframes` §6.13. La función que
-- introdujo 0016 sirve `visibility = 'client'` y nada más, así que el tablero
-- que un agente Hermes publica para HQ —un `html` con visibilidad `internal`—
-- **no se abre desde `/hq/entregables`**: la ficha enseñaba un aviso en vez de
-- un enlace, porque un enlace habría llevado a un 404. La pantalla desde la que
-- se publica ese tablero es la única desde la que no se puede leer.
--
-- POR QUÉ 0016 SE ESCRIBIÓ SOLO PARA `client`, Y POR QUÉ ESO NO FUE UN
-- DESCUIDO. El visor vive en un **origen sin sesión** —esa es su razón de ser:
-- el navegador aísla el subdominio de la cookie de la aplicación—, así que ahí
-- no hay contexto que fijar y no puede haber política de fila que acote. Toda
-- la autorización tenía que caber **dentro** de la función, y la única
-- respuesta que una función sin quién puede dar con seguridad es la más
-- estrecha: lo que ve cualquiera que llegue con un identificador válido. Servir
-- `internal` desde ahí, sin más, sería servírselo también a un usuario de
-- cliente que conociera el identificador. **Eso no cambia con esta migración y
-- no debe cambiar nunca.**
--
-- LO QUE SÍ CAMBIA: EL VALE YA DICE DESDE DÓNDE SE EMITIÓ. El vale (`origen.ts`,
-- hallazgo C-3) es un HMAC que firma **quien sí tiene sesión** después de haber
-- comprobado empresa, rol y asignación; el visor no autoriza, verifica. Hasta
-- hoy se firmaba `<id>.<caducidad>`, que dice *qué* se puede abrir y *hasta
-- cuándo*, pero no *para quién*. Ahora se firma `<id>.<caducidad>.<ámbito>`, con
-- ámbito `cliente` o `hq`, y ese ámbito es lo que la función recibe. Un vale de
-- portal no se puede presentar como vale de HQ: cambiar la letra rompe la firma,
-- y el secreto no está en ningún navegador.
--
-- POR QUÉ EL PARÁMETRO ES OBLIGATORIO Y NO TIENE VALOR POR DEFECTO. Este
-- repositorio ya rechazó una vez el filtro opcional: `entregablesDelCliente()`
-- existe aparte de `entregables()` porque «un filtro opcional es un filtro que
-- alguien olvida pasar, y el olvido enseña material interno a un cliente». Sin
-- `DEFAULT`, olvidarlo no es una lectura silenciosamente ampliada: es una
-- llamada que **no compila y no ejecuta**. Y cualquier valor que no sea
-- exactamente `'hq'` —incluido el vacío y el nulo— cae en el criterio de
-- siempre: solo `client`. Falla cerrado.
--
-- QUÉ NO CAMBIA, DICHO UNA POR UNA. `type = 'html'`, `published_at IS NOT NULL`
-- y `file_key IS NOT NULL` siguen dentro y siguen siendo innegociables: un
-- borrador, un PDF o un entregable sin archivo no salen de aquí en ningún
-- ámbito. Sigue siendo `SECURITY DEFINER` con `search_path` fijado, sigue
-- devolviendo como mucho una fila, y sigue sin aceptar ningún filtro de
-- empresa, proyecto o fecha: lo único que quien llama puede decir es desde qué
-- superficie pregunta, y eso lo respalda una firma. **El portal del cliente no
-- se toca**: `entregablesDelCliente()` nunca devuelve un `internal`, así que el
-- portal no llega a tener el identificador con el que pedir un vale, y el vale
-- que emite es de ámbito `cliente` por construcción.
--
-- POR QUÉ SE HACE `DROP` Y NO SOLO `CREATE OR REPLACE`. La función pasa de uno
-- a dos parámetros, y PostgreSQL trata eso como **otra función**: sin el `DROP`
-- quedarían las dos, y la vieja —la de un solo argumento, la que no sabe de
-- ámbitos— seguiría ahí, con permiso de ejecución, lista para que una llamada
-- descuidada la encontrara. Una migración que deja atrás la versión insegura de
-- lo que acaba de arreglar no ha arreglado nada.
DROP FUNCTION IF EXISTS app_entregable_para_el_visor(text);--> statement-breakpoint

CREATE OR REPLACE FUNCTION app_entregable_para_el_visor(p_id text, p_ambito text)
RETURNS TABLE (id text, title text, file_key text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.id, d.title, d.file_key
    FROM deliverable d
   WHERE d.id = p_id
     -- Un `client` se sirve en los dos ámbitos: HQ no necesita un segundo visor
     -- para ver lo que ve el cliente. Un `internal`, solo con vale de HQ.
     AND (d.visibility = 'client' OR (p_ambito = 'hq' AND d.visibility = 'internal'))
     AND d.type = 'html'
     AND d.published_at IS NOT NULL
     AND d.file_key IS NOT NULL
   LIMIT 1
$$;--> statement-breakpoint

REVOKE ALL ON FUNCTION app_entregable_para_el_visor(text, text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app_entregable_para_el_visor(text, text) TO slg_app;--> statement-breakpoint

COMMENT ON FUNCTION app_entregable_para_el_visor(text, text) IS
  'DU-19 · la única lectura de deliverable desde un origen sin sesión. La '
  'autorización va dentro: html + publicado + con archivo, y `client` siempre. '
  'Un `internal` solo con ámbito `hq`, que no lo dice el código sino el vale '
  'firmado por la pantalla que sí tenía sesión. El ámbito es obligatorio: sin '
  'él la llamada no ejecuta, en vez de ampliar en silencio.';
