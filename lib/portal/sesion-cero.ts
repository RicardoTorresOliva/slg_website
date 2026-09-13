/**
 * sesion-cero.ts — El paso «Agenda tu Sesión Cero» (DU-21 · RF-94 · RF-96).
 *
 * **DOS REQUISITOS QUE TIRAN EN DIRECCIONES OPUESTAS, Y LOS DOS SE CUMPLEN:**
 *
 *   · RF-96 — la Sesión Cero **no existe en la capa pública**. Ni como llamada a
 *     la acción, ni como agenda embebida, ni nombrada. Una firma que asesora
 *     directorios no pone un calendario en su portada: lo que ofrece en público
 *     es criterio, y el único CTA de una página de servicio es su descarga
 *     (RF-07). Por eso este módulo vive en `lib/portal/` y `check:alcance` frena
 *     a quien lo nombre fuera del portal.
 *   · RF-94 — **mientras la URL no exista, el paso no rompe la pantalla**. Se
 *     muestra «próximamente» y ya. La alternativa —un enlace a `undefined`, o
 *     esconder el paso— deja al cliente sin saber que el paso existe.
 *
 * LA URL VIVE EN `content/ui`, no en una variable de entorno, porque la fija
 * quien escribe el contenido y cambia con la herramienta de agenda, no con el
 * despliegue. Una cadena vacía es **el estado declarado de «todavía no»**, no un
 * descuido: la clave existe en los dos idiomas desde el primer día para que
 * ponerla sea rellenar un hueco y no inventarse un nombre.
 */

/** La clave de `content/ui` donde vive la URL. Un solo sitio. */
export const CLAVE_DE_URL = "portal.sesion0.url";

export type PasoDeSesionCero =
  | { readonly estado: "disponible"; readonly url: string }
  | { readonly estado: "proximamente" };

/**
 * Resuelve el paso a partir de las cadenas de interfaz ya cargadas.
 *
 * **Solo `https:`**. La URL la escribe una persona en un JSON, y un `javascript:`
 * ahí sería un enlace ejecutable en la pantalla de un cliente autenticado; un
 * `http:` mandaría a una agenda por texto claro. Si no valida, el paso degrada a
 * «próximamente» en vez de pintar un enlace roto: el criterio 4 pide que **no
 * rompa la pantalla**, y una URL mal escrita es tan «ausente» como ninguna.
 */
export function pasoDeSesionCero(textos: Record<string, string>): PasoDeSesionCero {
  const crudo = (textos[CLAVE_DE_URL] ?? "").trim();
  if (!crudo) return { estado: "proximamente" };
  try {
    const u = new URL(crudo);
    if (u.protocol !== "https:") return { estado: "proximamente" };
    return { estado: "disponible", url: u.toString() };
  } catch {
    return { estado: "proximamente" };
  }
}
