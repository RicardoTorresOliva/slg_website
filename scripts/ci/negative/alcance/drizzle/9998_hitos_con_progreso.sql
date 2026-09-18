-- FIXTURE NEGATIVO de `check:alcance` (R-26), añadido con FU-15. No se aplica
-- nunca: no está en el journal y vive fuera de `drizzle/`.
--
-- Es la migración «pequeña y razonable» que convertiría los hitos y pendientes
-- de la Academy en un expediente de alumno: un porcentaje en el hito, una
-- cohorte en el pendiente, un «completado» por persona. Cada columna parece una
-- comodidad y las tres juntas son un LMS. El freno tiene que verlas también en
-- las tablas nuevas, no solo en `membership`.
ALTER TABLE milestone ADD COLUMN progress_pct integer NOT NULL DEFAULT 0;
ALTER TABLE action_item ADD COLUMN cohort text;
CREATE TABLE completion_record (id text PRIMARY KEY, user_id text NOT NULL, completion boolean NOT NULL DEFAULT false);
