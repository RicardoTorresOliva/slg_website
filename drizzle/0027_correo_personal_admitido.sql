-- D-181 · Los formularios públicos admiten correo personal (Gmail, Hotmail,
-- Outlook, Yahoo, iCloud…). Lo pidió Ricardo el 2026-11-12: exigir correo
-- corporativo dejaba fuera a gente real que quería el documento.
--
-- Se borran SOLO los proveedores personales de la lista inicial (0010). Los
-- desechables —los de 0010 marcados «desechable» y todos los de 0023— se quedan:
-- esos no son personas, son el spam que entró al CRM en septiembre.
--
-- Idempotente: aplicarla dos veces no hace nada la segunda.
DELETE FROM free_email_domain
WHERE added_by = 'FU-11' AND note = 'lista inicial';
