-- DU-18 · El idioma EN QUE SE ESCRIBIÓ un aviso.
--
-- POR QUÉ HACE FALTA. RF-72 dice que el contenido entregado se muestra **tal
-- como se entregó**, sin traducir, y que la interfaz va en el idioma de la
-- preferencia de la cuenta. Para cumplir la primera mitad hay que **saber en
-- qué idioma está el contenido**, y `announcement` no lo guardaba: el portal
-- solo podía marcar el aviso con el idioma de la INTERFAZ, que es justo lo
-- contrario de lo que RF-72 pide.
--
-- QUÉ CAMBIA DE VERDAD, y no es cosmético. El atributo `lang` es lo que hace
-- que un lector de pantalla lea un aviso en inglés con fonética inglesa en vez
-- de deletrearlo en español — que es el caso de un cliente internacional
-- leyendo lo que SLG le escribió. Sin este dato, ese atributo mentía.
--
-- El defecto por defecto es `es`, que es el idioma de la casa: los avisos que
-- ya existan quedan marcados como españoles, que es lo que son.

ALTER TABLE announcement ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'es';

ALTER TABLE announcement ADD CONSTRAINT announcement_locale_valid
  CHECK (locale IN ('es','en'));

COMMENT ON COLUMN announcement.locale IS
  'DU-18 · Idioma en que se ESCRIBIÓ el aviso, no el de la interfaz de quien lo lee (RF-72).';
