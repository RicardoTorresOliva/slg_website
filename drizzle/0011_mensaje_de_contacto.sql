-- DU-10 · El mensaje que la persona escribe en `/contacto`.
--
-- POR QUÉ UNA COLUMNA Y NO UN CAMPO DE `utm`. `utm` es un mapa de procedencia,
-- y meter ahí un texto libre lo convierte en un cajón: la siguiente consulta
-- por campaña tendría que esquivarlo.
--
-- Y POR QUÉ NO CONTRADICE LA AUSENCIA DELIBERADA de `data_model` §5.11. Lo que
-- esa nota prohíbe es el PIPELINE —etapa, propietario, importe, probabilidad,
-- próximo paso—, que vive en el CRM. El mensaje no es pipeline: es el dato que
-- la persona escribió, y sin él un formulario de contacto no sirve para nada.
-- Viaja al CRM dentro de la nota y aquí queda como respaldo.

ALTER TABLE lead_capture ADD COLUMN IF NOT EXISTS message text;

COMMENT ON COLUMN lead_capture.message IS
  'DU-10 · Texto libre del formulario de contacto. No es pipeline (RF-57): viaja al CRM en la nota.';
