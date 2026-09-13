/**
 * La puerta pública de `lib/crm`.
 *
 * Lo que NO se exporta: el cliente HTTP y la clave. El resto del código habla
 * con el puerto, nunca con el CRM.
 */
export {
  adaptadorDelModo,
  arrancarBarrendero,
  barrerUnaVez,
  ESCALERA_MINUTOS,
  INTERVALO_MS,
  MAX_INTENTOS,
  modoActivo,
  pararBarrendero,
} from "./cola.ts";
export { enlaceAlContacto, MODOS_DE_CRM, type CapturaParaCrm, type ModoDeCrm, type PuertoDeCrm } from "./port.ts";
