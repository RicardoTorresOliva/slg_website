/**
 * idioma.ts — El idioma de la interfaz dentro de HQ y del portal (RF-72).
 *
 * **SALE DE LA PREFERENCIA DEL USUARIO, Y DE NADA MÁS.** Ni de la URL —dentro
 * de la aplicación no hay `/en/…`—, ni de `Accept-Language`, ni de una cookie.
 * Y por eso **no hay conmutador de idioma** (criterio 3): no hay dos URL entre
 * las que conmutar, y un conmutador haría creer que el contenido entregado
 * también cambia de idioma, cuando `ContenidoEntregado` existe para lo
 * contrario.
 *
 * Cambiar de idioma es cambiar la preferencia de la cuenta, en el perfil. Es un
 * cambio de cuenta, no de vista.
 */
import type { Lang } from "../content/schema.ts";

/**
 * Un `locale` desconocido cae a español, que es el idioma de la casa. **No
 * lanza**: un valor raro en la base no puede dejar a nadie sin interfaz.
 */
export function idiomaDeInterfaz(locale: string | null | undefined): Lang {
  return locale === "en" ? "en" : "es";
}
