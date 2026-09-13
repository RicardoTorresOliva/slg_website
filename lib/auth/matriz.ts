/**
 * matriz.ts — La **segunda puerta pública** del módulo de identidad: su mitad
 * PURA.
 *
 * POR QUÉ HAY QUE ABRIRLA, y por qué no es un agujero en la frontera de FU-06.
 * `@/lib/auth` es la puerta buena, y arrastra Better Auth y el pool de
 * PostgreSQL al cargarse — tiene que hacerlo, porque resolver una sesión es ir
 * a la base de datos. Pero hay código que **solo necesita la matriz B.3**: la
 * tabla de secciones de FU-12, el freno `check:shell` que la recorre sin
 * levantar nada, una prueba que comprueba los cuatro roles sin servidor. Para
 * ese código, entrar por `@/lib/auth` significa exigir `DATABASE_URL` para
 * responder una pregunta que es aritmética sobre una tabla.
 *
 * Es el mismo caso que `@/lib/auth/edge`, que existe por lo mismo al revés: el
 * middleware no puede cargar `node:crypto`.
 *
 * LO QUE NO SALE POR AQUÍ: nada que resuelva identidad. Ni `sesionActual`, ni
 * `exigirSesion`, ni `verificarClave`, ni una sola consulta. Solo la matriz, sus
 * roles y el veredicto sobre ella. Quien necesite saber **quién** es alguien
 * sigue teniendo una única puerta.
 */
export {
  puede,
  exigir,
  ErrorDeAutorizacion,
  type Veredicto,
  type Circunstancias,
} from "./permissions.ts";

export {
  ACCIONES,
  MATRIZ_B3,
  ROLES_DE_PERSONA,
  ROLES_DE_SLG,
  RUTAS_SOLO_ADMIN,
  SUPERFICIES_ABIERTAS,
  superficieDelRol,
  type Accion,
  type ActorRole,
  type ReglaB3,
  type Superficie,
} from "./roles.ts";
