-- DU-22 · `audit_log.metadata`: el contexto SANEADO de cada llamada
-- (`api_contracts` §2.8 · RF-107 · RNF-26 · RNF-32).
--
-- POR QUÉ HACE FALTA UNA COLUMNA Y NO BASTA CON LO QUE HAY. La API audita
-- **toda** llamada, incluidas las que acaban en 401, 403 y 429. Con las columnas
-- actuales, una llamada rechazada y una atendida dejan filas **idénticas**: la
-- misma acción, la misma entidad, el mismo actor. Un registro que no distingue
-- «lo hizo» de «lo intentó y se le negó» no responde la única pregunta por la
-- que se audita una API de agentes —«¿alguien ha estado probando puertas?»— y es
-- justo la pregunta que el criterio 6 quiere poder contestar.
--
-- QUÉ ENTRA Y QUÉ NO. Entra lo que describe la LLAMADA: código de estado, ruta,
-- método, alcance exigido. **No entra el cuerpo**, no entra la clave, no entra
-- el valor de ningún campo personal (RNF-26, RNF-32). La regla es que esta
-- columna debe poder leerse en voz alta en una revisión sin exponer a nadie.
--
-- `jsonb` y no `text`: se consulta por dentro (`metadata->>'status'`) al buscar
-- todos los rechazos de una clave, y con `text` eso sería un `LIKE`.
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS metadata jsonb;

COMMENT ON COLUMN audit_log.metadata IS
  'DU-22 · contexto saneado de la llamada: status, ruta, método, alcance exigido. '
  'NUNCA el cuerpo, ni la clave, ni el valor de un campo personal (RNF-26, RNF-32).';

-- La tabla es de SOLO INSERCIÓN desde la migración 0003: añadir una columna no
-- lo cambia. `slg_app` sigue sin UPDATE, DELETE ni TRUNCATE sobre ella.
