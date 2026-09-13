-- FU-11 · Anti-abuso propio: la lista de dominios y el contador del límite.
--
-- POR QUÉ SON TABLAS Y NO ARCHIVOS (D-82). RF-32 exige que la lista de dominios
-- de correo gratuito sea «dato editable **sin desplegar**». Un archivo del
-- repositorio no lo es: cambiarlo obliga a recompilar y volver a desplegar, que
-- es exactamente lo que el requisito prohíbe. Una fila se añade con un INSERT y
-- surte efecto en la petición siguiente.
--
-- El contador del límite también vive en la base y no en memoria del proceso:
-- con dos instancias del servidor, un contador en memoria permite el doble de
-- peticiones y nadie se entera.

CREATE TABLE IF NOT EXISTS free_email_domain (
  domain      text PRIMARY KEY,
  -- Quién y cuándo lo añadió: una lista que rechaza correos tiene que poder
  -- explicarse cuando alguien pregunta por qué su dirección no vale.
  added_by    text,
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT free_email_domain_minuscula CHECK (domain = lower(domain)),
  CONSTRAINT free_email_domain_sin_arroba CHECK (position('@' in domain) = 0)
);

COMMENT ON TABLE free_email_domain IS
  'RF-31/RF-32 · Dominios de correo gratuito rechazados en los formularios públicos. Editable sin desplegar: un INSERT basta.';

CREATE TABLE IF NOT EXISTS rate_limit_hit (
  -- La clave ya viene HASHEADA desde la aplicación: una IP es un dato personal
  -- y una dirección de correo lo es más. Aquí no se guarda ninguna de las dos.
  key_hash    text NOT NULL,
  window_start timestamptz NOT NULL,
  hits        integer NOT NULL DEFAULT 1,
  PRIMARY KEY (key_hash, window_start),
  CONSTRAINT rate_limit_hit_positivo CHECK (hits > 0)
);

COMMENT ON TABLE rate_limit_hit IS
  'RF-34 · Contador por ventana del limite de formularios publicos. La clave va hasheada: ni la IP ni el correo se guardan.';

-- La limpieza barre por ventana: indice sobre la columna por la que se borra.
CREATE INDEX IF NOT EXISTS idx_rate_limit_window ON rate_limit_hit (window_start);

-- ── Aislamiento ───────────────────────────────────────────────────────────
-- Ninguna de las dos lleva organization_id: no son datos de cliente. Pero el
-- rol de aplicacion solo puede hacer con ellas lo que necesita.
ALTER TABLE free_email_domain ENABLE ROW LEVEL SECURITY;
ALTER TABLE free_email_domain FORCE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_hit ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_hit FORCE ROW LEVEL SECURITY;

-- La lista se LEE desde el formulario publico, y no se escribe desde ahi.
DROP POLICY IF EXISTS free_email_domain_lectura ON free_email_domain;
CREATE POLICY free_email_domain_lectura ON free_email_domain FOR SELECT USING (true);

-- El contador se lee y se escribe: es su trabajo.
DROP POLICY IF EXISTS rate_limit_hit_todo ON rate_limit_hit;
CREATE POLICY rate_limit_hit_todo ON rate_limit_hit FOR ALL USING (true) WITH CHECK (true);

GRANT SELECT ON free_email_domain TO slg_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON rate_limit_hit TO slg_app;

-- ── La lista inicial ──────────────────────────────────────────────────────
-- Los proveedores de correo personal mas comunes. NO pretende ser exhaustiva:
-- pretende ser ampliable, que es lo que RF-32 pide. Se amplia con un INSERT.
INSERT INTO free_email_domain (domain, added_by, note) VALUES
  ('gmail.com',       'FU-11', 'lista inicial'),
  ('googlemail.com',  'FU-11', 'lista inicial'),
  ('hotmail.com',     'FU-11', 'lista inicial'),
  ('hotmail.es',      'FU-11', 'lista inicial'),
  ('outlook.com',     'FU-11', 'lista inicial'),
  ('outlook.es',      'FU-11', 'lista inicial'),
  ('live.com',        'FU-11', 'lista inicial'),
  ('msn.com',         'FU-11', 'lista inicial'),
  ('yahoo.com',       'FU-11', 'lista inicial'),
  ('yahoo.es',        'FU-11', 'lista inicial'),
  ('ymail.com',       'FU-11', 'lista inicial'),
  ('icloud.com',      'FU-11', 'lista inicial'),
  ('me.com',          'FU-11', 'lista inicial'),
  ('mac.com',         'FU-11', 'lista inicial'),
  ('aol.com',         'FU-11', 'lista inicial'),
  ('gmx.com',         'FU-11', 'lista inicial'),
  ('gmx.es',          'FU-11', 'lista inicial'),
  ('mail.com',        'FU-11', 'lista inicial'),
  ('zoho.com',        'FU-11', 'lista inicial'),
  ('yandex.com',      'FU-11', 'lista inicial'),
  ('protonmail.com',  'FU-11', 'lista inicial'),
  ('proton.me',       'FU-11', 'lista inicial'),
  ('tutanota.com',    'FU-11', 'lista inicial'),
  ('mailinator.com',  'FU-11', 'desechable'),
  ('yopmail.com',     'FU-11', 'desechable'),
  ('guerrillamail.com','FU-11', 'desechable'),
  ('10minutemail.com','FU-11', 'desechable'),
  ('temp-mail.org',   'FU-11', 'desechable'),
  ('trashmail.com',   'FU-11', 'desechable'),
  ('sharklasers.com', 'FU-11', 'desechable')
ON CONFLICT (domain) DO NOTHING;
