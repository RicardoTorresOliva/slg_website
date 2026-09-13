/**
 * index.ts — La superficie pública del módulo de identidad.
 *
 * TODO lo que el resto del proyecto sabe de sesión, rol, empresa y clave de API
 * entra por aquí. Ni una página, ni un layout, ni un endpoint importa
 * `better-auth`, ni `better-auth.ts`, ni consulta `session` o `api_key`
 * directamente (criterio 1 de FU-06, mitigación de R-19).
 *
 * Eso no es una convención: `npm run check:auth-boundary` lo comprueba y el
 * pipeline se pone rojo si alguien lo salta.
 *
 * Si mañana hay que sustituir Better Auth, se reescriben `better-auth.ts` y
 * `session.ts`. Esta lista de exportaciones no cambia, y por eso nada más
 * cambia.
 */

export { auth } from "./better-auth.ts";
export { exigirRolSinBypassRls, cerrarConexionDeAuth } from "./db.ts";

export {
  sesionActual,
  exigirSesion,
  exigirSuperficie,
  SinSesion,
  type SesionResuelta,
} from "./session.ts";

export {
  pertenenciasDe,
  empresaDeLaSesion,
  type Pertenencia,
} from "./membership.ts";

export {
  puede,
  exigir,
  ErrorDeAutorizacion,
  type Veredicto,
  type Circunstancias,
} from "./permissions.ts";

export {
  MENSAJE_NEUTRO,
  proveedoresDisponibles,
  esperaPendienteEnSegundos,
  registrarFallo,
  registrarAcierto,
  reiniciarBloqueos,
  cerrarSesion,
  cerrarTodasLasSesiones,
  sesionesVivas,
  marcarCorreoVerificado,
  type Puerta,
} from "./acceso.ts";

export {
  verificarClave,
  respuestaDeFallo,
  hashDeClave,
  reiniciarContadorDeLimite,
  type ResultadoDeClave,
  type FalloDeClave,
} from "./api-key.ts";

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
