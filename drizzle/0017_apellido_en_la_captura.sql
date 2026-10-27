-- El apellido de quien rellena un formulario público.
--
-- POR QUÉ UNA COLUMNA Y NO PARTIR `name` POR EL PRIMER ESPACIO. El CRM exige
-- nombre y apellido por separado al crear un contacto, y adivinarlos desde un
-- texto libre falla con los nombres compuestos y con los apellidos dobles: «Ana
-- María Ruiz» y «Juan Pérez de la Cruz» se parten mal en ambos sentidos. Se
-- pide como dos campos, obligatorios los dos, y `name` pasa a significar SOLO el
-- nombre.
--
-- Es nullable porque las capturas anteriores a esta migración no lo traen: para
-- ellas el adaptador del CRM conserva el repliegue provisional (parte local del
-- correo y dominio entre paréntesis), que se ve a simple vista y se completa a
-- mano al abrir la oportunidad (RF-57).

ALTER TABLE lead_capture ADD COLUMN IF NOT EXISTS last_name text;

COMMENT ON COLUMN lead_capture.name IS
  'Solo el nombre (given name). El apellido va en last_name.';
COMMENT ON COLUMN lead_capture.last_name IS
  'Apellido. Obligatorio en los formularios públicos; NULL solo en capturas anteriores a esta columna.';
