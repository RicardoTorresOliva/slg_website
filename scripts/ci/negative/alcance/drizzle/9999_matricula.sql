-- FIXTURE NEGATIVO de `check:alcance` (R-26). No se aplica nunca: no está en el
-- journal y vive fuera de `drizzle/`. Es la migración que convertiría el portal
-- en una plataforma de formación, escrita como se escribiría de verdad.
ALTER TABLE membership ADD COLUMN progress integer NOT NULL DEFAULT 0;
ALTER TABLE membership ADD COLUMN cohort text;
CREATE TABLE lesson (id text PRIMARY KEY, completion boolean NOT NULL DEFAULT false);
SELECT id FROM deliverable WHERE type = 'material';
