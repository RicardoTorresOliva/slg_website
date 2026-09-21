-- Vocabulario de servicios: la base decía `SLG_Holdings` donde la oferta dice
-- `Holdings by SLG` (2026-09-21).
--
-- EL DEFECTO, DICHO SIN RODEOS: un proyecto de la línea de Holdings NO SE PODÍA
-- CREAR. El `CHECK project_service_literal` de 0001 se escribió con el nombre
-- que la marca tenía entonces, `SLG_Holdings`; el 18-09 la línea pasó a
-- llamarse `Holdings by SLG` y con ella cambiaron el contenido
-- (`content/services/es/slg-holdings.md`), las páginas públicas, el desplegable
-- de HQ —que deriva sus opciones de la colección de contenido, no de aquí— y
-- `data_model` §3.13. La base se quedó sola con el nombre viejo. Resultado: HQ
-- ofrecía «Holdings by SLG» en la lista, el servidor lo daba por bueno porque
-- `esServicioLiteral` consulta el contenido, y PostgreSQL rechazaba la
-- inserción en el último metro. Un 500 donde el contrato promete un 422
-- (D-162), y un servicio de la oferta inoperante.
--
-- POR QUÉ ES UNA MIGRACIÓN Y NO UNA CORRECCIÓN DE TEXTO. Justamente porque el
-- `CHECK` existe: §3.13 asume el coste a cambio de que un nombre traducido o
-- alterado se rechace en la INSERCIÓN y no en la revisión. Esa garantía solo
-- vale si el vocabulario de la base es el mismo que el de la oferta; en cuanto
-- se separan, el `CHECK` deja de proteger la nomenclatura y pasa a bloquear a
-- quien la escribe bien. Renombrar un servicio es, por diseño, una migración.
--
-- POR QUÉ EL `UPDATE` VA PRIMERO Y CON EL NOMBRE VIEJO EXPLÍCITO. Aquí no
-- debería haber ninguna fila —el nombre viejo nunca llegó a usarse porque la
-- oferta ya se llamaba de otra manera cuando se crearon los primeros
-- proyectos—, pero un entorno de desarrollo o un sembrado antiguo pueden
-- tenerlas, y añadir la contención antes de traducirlas haría fallar la
-- migración a mitad. Traducir primero y contener después deja la base
-- consistente en cualquiera de los dos casos, y el `UPDATE` no toca nada
-- cuando no hay nada que tocar.
--
-- POR QUÉ SE REESCRIBE LA CONTENCIÓN ENTERA. Un `CHECK` no se edita: se quita y
-- se pone. Es lo que hicieron 0018, 0019 y 0020 con `api_key.scopes`, y tiene
-- la ventaja de que el texto de la migración es la lista completa y legible de
-- lo que la base acepta, en vez de un delta que obliga a reconstruirla leyendo
-- cuatro archivos. Siguen siendo once servicios: cambia uno, no el número.
-- El espejo en TypeScript es `PROJECT_SERVICES` (`lib/db/schema.ts`), que se
-- mueve en el mismo commit.

-- ─── 1. Los proyectos que llevaran el nombre viejo, traducidos ──────────────
UPDATE project SET service = 'Holdings by SLG' WHERE service = 'SLG_Holdings';--> statement-breakpoint

-- ─── 2. La contención, con el vocabulario de hoy (§3.13) ────────────────────
ALTER TABLE project DROP CONSTRAINT IF EXISTS project_service_literal;--> statement-breakpoint
ALTER TABLE project ADD CONSTRAINT project_service_literal
  CHECK (service IN (
    'Phoenix PEEx','Phoenix TEAx','Phoenix RETx',
    'Customize Programs','AI Coaching for Directors',
    'SLG_Readiness','SLG_Implement',
    'APP_Building','AGE_Building','CoO as a Service',
    'Holdings by SLG'
  ));
