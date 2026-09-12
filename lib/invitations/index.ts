/**
 * index.ts — La superficie pública del servicio de invitaciones.
 *
 * El acceso de clientes es **solo por invitación** (§10-10): esta es la puerta
 * por la que entra todo el mundo. Por eso no hay atajos —ni una función que
 * emita sin comprobar B.3, ni una que canjee sin comprobar el correo— y por eso
 * las cinco reglas de FU-07 están probadas una a una contra PostgreSQL real.
 */

export {
  emitirInvitacion,
  reenviarInvitacion,
  revocarInvitacion,
  aceptarInvitacion,
  consultarTestigo,
  caducarPendientesVencidas,
  MENSAJE_DE_TESTIGO_INVALIDO,
  type Invitacion,
  type ResultadoDeEmision,
  type ResultadoDeAceptacion,
  type EstadoDeTestigo,
} from "./service.ts";

export {
  VIGENCIA_EN_HORAS,
  generarTestigo,
  hashDeTestigo,
  enlaceDeInvitacion,
  caducidadDesdeAhora,
} from "./token.ts";
