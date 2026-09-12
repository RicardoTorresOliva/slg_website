/**
 * index.ts — La superficie pública del módulo de correo.
 *
 * CRITERIO 1 DE FU-08: **ningún caso de uso importa el cliente del proveedor**.
 * Todos entran por aquí. Lo comprueba `npm run check:fronteras`, no una
 * revisión: una revisión encuentra la primera importación directa y se pierde la
 * tercera.
 *
 * Lo que NO se exporta, y es deliberado: el transporte. `nodemailer` vive
 * exclusivamente en `smtp.ts`. Si mañana el proveedor exige otra cosa, se
 * escribe otro adaptador que implemente `PuertoDeCorreo` y nada más cambia.
 */

export { enviarCorreo, destinatarioDeAvisos, type ResultadoDeEnvio } from "./service.ts";

export {
  encolarCorreo,
  barrerCorreo,
  recuentoDeCola,
  MAXIMO_DE_INTENTOS,
  type ResultadoDelBarrido,
  type CorreoEnCola,
} from "./queue.ts";

export { componer, type CorreoCompuesto } from "./templates.ts";

export {
  adaptadorSmtp,
  configuracionDelEntorno,
  type ConfiguracionSmtp,
} from "./smtp.ts";

export {
  ErrorDeCorreo,
  TIPOS_DE_CORREO,
  IDIOMAS,
  CLASES_DE_FALLO,
  type TipoDeCorreo,
  type Idioma,
  type ClaseDeFallo,
  type MensajeSaliente,
  type EnvioAceptado,
  type PuertoDeCorreo,
} from "./port.ts";
