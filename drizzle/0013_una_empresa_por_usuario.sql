-- DU-20 · `membership` NO ES UNA MATRÍCULA (criterio 3 · RF-69 · RF-144).
--
-- El criterio pide que «en v1 un usuario pertenece a una sola empresa cliente y
-- la restricción es explícita EN EL MODELO». Explícita en el modelo quiere decir
-- aquí, no en una frase de la documentación ni en un `if` de un caso de uso.
--
-- Hasta esta migración el único índice era `uq_membership_user_org`, que impide
-- repetir el par usuario+empresa pero **permite que el mismo usuario esté en dos
-- empresas cliente**. Esa es exactamente la puerta por la que `membership` se
-- convierte en matrícula: si un usuario puede colgar de varias empresas, la
-- tabla deja de decir «de quién es esta persona» y empieza a decir «en cuántos
-- programas está apuntada», que es el modelo de un LMS y la frontera (b) de
-- `scope.md` lo excluye.
--
-- El índice es PARCIAL a propósito: solo los roles de cliente. Una persona de
-- SLG pertenece a la organización de SLG y su relación con las empresas cliente
-- no pasa por `membership`, así que restringirla aquí sería inventar un límite
-- que nadie pidió.
CREATE UNIQUE INDEX IF NOT EXISTS uq_membership_una_empresa_cliente
  ON membership (user_id)
  WHERE org_role IN ('client_admin', 'client_member');

COMMENT ON INDEX uq_membership_una_empresa_cliente IS
  'DU-20 · RF-69 · RF-144: en v1 un usuario cliente pertenece a UNA empresa. '
  'membership dice de quién es una persona, no en qué programas está matriculada: '
  'sin progreso, sin cohorte, sin fecha de finalización. No es un LMS.';

COMMENT ON TABLE membership IS
  'Pertenencia de una persona a una empresa. NO es una matrícula: no lleva '
  'progreso, ni cohorte, ni evaluación, ni certificado (frontera (b) de scope.md).';
