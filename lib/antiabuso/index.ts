/**
 * `lib/antiabuso` — la protección de todo formulario público (FU-11).
 *
 * **Sin un solo script de terceros** (D-16, RF-35). Ni reCAPTCHA, ni Turnstile,
 * ni nada que cargue código de otro dominio en la capa pública: la frontera (h)
 * lo prohíbe y el gate D1 lo mide. La protección es propia y son tres capas:
 *
 *   1. **Dominios de correo gratuito** — lista en base de datos, ampliable **sin
 *      desplegar** (RF-31, RF-32).
 *   2. **Campo trampa** — invisible para una persona, irresistible para un bot.
 *      Relleno ⇒ se descarta **en silencio** (RF-33).
 *   3. **Límite de peticiones** por IP y por correo, con umbral configurable, y
 *      **429 sin revelar el umbral** (RF-34).
 *
 * El orden importa y es este: trampa → límite → dominio. La trampa es gratis y
 * descarta al bot antes de tocar la base; el límite protege de la avalancha; y
 * el dominio es el único de los tres que **le habla al visitante**, porque es el
 * único que una persona real puede provocar sin querer.
 */
export {
  dominioDeCorreoGratuito,
  esCorreoCorporativo,
  olvidarCacheDeDominios,
  RESULTADO_TRAMPA,
  type Veredicto,
  verificarEnvio,
} from "./service.ts";
export { NOMBRE_DEL_CAMPO_TRAMPA, campoTrampaRelleno } from "./trampa.ts";
export { limitar, type ResultadoDeLimite } from "./limite.ts";
