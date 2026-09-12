-- FIXTURE NEGATIVO — migración escrita a mano y NO declarada en el journal.
-- Es exactamente el fallo real de FU-04: el archivo existe, la revisión lo ve,
-- y drizzle-kit no lo aplica nunca.
SELECT 1;
