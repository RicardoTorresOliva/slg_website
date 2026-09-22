-- Plantilla, paso 5b · La captura de un sitio SIN CRM (D-165, 2026-09-22).
--
-- EL DEFECTO QUE ESTO CIERRA. El motor nació para un sitio con CRM: cada
-- captura se guarda en `lead_capture` con `crm_sync_status = 'pending'` y la
-- cola `crm_delivery` la entrega. En un sitio cuya ficha dice `modulos.crm:
-- false` no hay a quién entregarla, y lo que pasaba era peor que no hacer
-- nada: la cola intentaba llamar a un CRM inexistente, fallaba cinco veces y,
-- a las ~31 horas, mandaba un aviso de FALLO por un problema que no existía.
-- Mientras tanto nadie se enteraba del contacto: la captura estaba a salvo en
-- una tabla que el cliente no mira.
--
-- LO QUE HACE AHORA UN SITIO SIN CRM. La misma cola, el mismo barrido, la
-- misma reserva con `FOR UPDATE SKIP LOCKED` y la misma escalera de espera;
-- cambia lo que se hace con cada fila: en vez de llamar al CRM, se manda un
-- correo al buzón del cliente (`MAIL_LEADS_TO`) con los datos del contacto.
-- Es la cola la que avisa, y no el manejador del formulario, por lo mismo que
-- con el CRM: el visitante no espera al proveedor de correo, y si el proceso
-- muere entre guardar y avisar, la fila sigue `pending` y el barrido
-- siguiente la avisa. Un aviso en línea se habría perdido con el proceso.
--
-- POR QUÉ DOS ESTADOS NUEVOS Y NO LOS TRES DE SIEMPRE. Ninguno de los tres
-- describe lo que pasó:
--   · `delivered` diría que la captura llegó a un CRM, y HQ enseñaría al lado
--     un «abrir en el CRM» y un «pide oportunidad» que no significan nada;
--   · `pending` es justo el defecto: una fila que dice «en cola» para siempre;
--   · `failed` es «el CRM no la aceptó», y su aviso y su botón hablan del CRM.
-- Así que:
--   · `notified`      — el proveedor de correo aceptó el aviso. Terminal.
--   · `notify_failed` — cinco intentos de aviso sin salir. Terminal hasta que
--     una persona pulsa «Reintentar» en HQ, que abre un ciclo nuevo igual que
--     con `failed` (D-50). El último error queda en `crm_last_error`.
-- Los nombres siguen en inglés, como los tres de antes: son vocabulario de la
-- base y de la API v1, no texto de pantalla.
--
-- POR QUÉ LAS COLUMNAS `crm_*` Y NO UNAS `notice_*` NUEVAS. Porque son la
-- maquinaria de la cola —intentos, ciclo, próximo intento, último error— y no
-- la del CRM en particular: duplicarla habría dado dos colas sobre la misma
-- fila, y la reserva de una no protegería de la otra. `crm_mode`,
-- `crm_contact_id` y `crm_delivered_at` se quedan en NULL en una captura
-- avisada: no hubo CRM, y esas columnas lo dicen sin mentir.
--
-- UN SITIO CON CRM NO CAMBIA EN NADA. Los dos estados nuevos solo los escribe
-- el barrido cuando la ficha tiene el CRM apagado; con él encendido, ningún
-- camino llega a ellos. El índice parcial de la cola (`crm_sync_status =
-- 'pending'`) no se toca: los dos estados son terminales y no se barren.
--
-- UN `CHECK` NO SE EDITA: SE QUITA Y SE PONE, con la lista completa, como
-- hicieron 0018-0021. El espejo en TypeScript es `CAPTURE_SYNC_STATUS`
-- (`lib/db/schema.ts`), que se mueve en el mismo commit.

ALTER TABLE lead_capture DROP CONSTRAINT IF EXISTS lead_capture_sync_status_valid;--> statement-breakpoint
ALTER TABLE lead_capture ADD CONSTRAINT lead_capture_sync_status_valid
  CHECK (crm_sync_status IN ('pending','delivered','failed','notified','notify_failed'));--> statement-breakpoint

COMMENT ON COLUMN lead_capture.crm_sync_status IS
  'Con CRM: pending · delivered · failed (entrega al CRM). Sin CRM (ficha con modulos.crm = false): '
  'pending · notified · notify_failed (aviso por correo a MAIL_LEADS_TO). Migración 0025.';
