-- FU-11 · Los dominios desechables que se colaron el 17-18 de septiembre de 2026.
--
-- POR QUE ESTA MIGRACION EXISTE SI RF-32 DICE «sin desplegar». Porque las dos
-- cosas son verdad y sirven a momentos distintos: la lista se amplia en caliente
-- con un INSERT —y asi se hizo el mismo dia—, pero una base recreada desde cero
-- volveria a nacer sin estos dominios. Lo que se aprende en produccion se
-- devuelve al repositorio, o se vuelve a aprender igual de caro.
--
-- QUE PASO. Cinco registros basura llegaron al CRM por `/api/contacto`. Las tres
-- capas de FU-11 funcionaban y las tres los dejaron pasar:
--   · la TRAMPA, porque el bot posteaba directo a la API y nunca envio el campo
--     (arreglado en `lib/antiabuso/trampa.ts`: la ausencia tambien descarta);
--   · el LIMITE, porque cinco envios en dos dias con correo distinto cada vez no
--     se acercan al umbral;
--   · el DOMINIO, porque estos no son proveedores conocidos sino dominios
--     desechables recien registrados, que no figuran en ninguna lista publica.
--
-- Esta tabla NO va a ganar la carrera contra quien registra dominios nuevos: la
-- capa que de verdad cierra la puerta es la trampa. Esto es el complemento.

INSERT INTO free_email_domain (domain, added_by, note) VALUES
  ('mylossless.com',    'incidente-2026-09-18', 'desechable · spam al CRM'),
  ('microversemail.com','incidente-2026-09-18', 'desechable · spam al CRM'),
  ('glorzomail.com',    'incidente-2026-09-18', 'desechable · spam al CRM'),
  ('hypercubemail.com', 'incidente-2026-09-18', 'desechable · spam al CRM'),
  ('belettersmail.com', 'incidente-2026-09-18', 'desechable · spam al CRM'),
  -- Desechables muy extendidos que faltaban en la lista inicial.
  ('getnada.com',       'incidente-2026-09-18', 'desechable'),
  ('tempmail.com',      'incidente-2026-09-18', 'desechable'),
  ('dispostable.com',   'incidente-2026-09-18', 'desechable'),
  ('maildrop.cc',       'incidente-2026-09-18', 'desechable'),
  ('fakeinbox.com',     'incidente-2026-09-18', 'desechable'),
  ('throwawaymail.com', 'incidente-2026-09-18', 'desechable'),
  ('mohmal.com',        'incidente-2026-09-18', 'desechable'),
  ('emailondeck.com',   'incidente-2026-09-18', 'desechable'),
  ('spamgourmet.com',   'incidente-2026-09-18', 'desechable'),
  ('mintemail.com',     'incidente-2026-09-18', 'desechable')
ON CONFLICT (domain) DO NOTHING;
