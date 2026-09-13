/**
 * origen.ts — **El origen separado del visor** (DU-19 · D-45 · RF-90 · RNF-21).
 *
 * EL SUBDOMINIO ES `visor.softlandingglobal.com`, y con esto queda fijado el
 * `[PENDIENTE]` que D-45 dejó abierto para M4. Se llama así y no
 * `entregables.` ni `docs.` por una razón concreta: **nombra el mecanismo, no
 * el contenido**. El día que por ahí se sirva algo que no es un entregable —un
 * informe nativo de `SLG_Readiness`, por ejemplo, que §5.3 deja «previsto»— un
 * subdominio llamado `entregables.` obligaría a elegir entre un nombre que
 * miente o una migración de URLs.
 *
 * POR QUÉ HAY UN ORIGEN SEPARADO Y NO BASTA EL `sandbox`. Parte de los
 * entregables HTML los generan **agentes Hermes**. Servido desde el dominio de
 * la aplicación, un script hostil dentro de uno de esos HTML **comparte origen
 * con la sesión del cliente**: puede leer `document.cookie`, puede llamar a la
 * API con las credenciales del navegador, puede leer el `localStorage`. Desde
 * un subdominio propio no puede, y no porque nosotros lo impidamos: porque **el
 * navegador lo aísla por política de origen**, que es una garantía del
 * navegador y no una configuración nuestra.
 *
 * El `iframe sandbox` sin `allow-same-origin` y la CSP estricta **se
 * mantienen**, y no como alternativa: como defensa en profundidad. Con solo
 * `sandbox`, la protección depende de que una configuración esté bien puesta
 * siempre; con origen separado, sigue en pie aunque esa configuración falle.
 *
 * SI LA VARIABLE NO ESTÁ, EL VISOR NO SIRVE HTML. No cae a servirlo desde el
 * mismo origen «mientras tanto»: ese repliegue es exactamente el fallo que D-45
 * prohíbe, y un repliegue silencioso a la opción insegura es peor que no tener
 * la función. Se enseña un estado de error que dice qué falta.
 */

/** El host del visor, o `null` si no está configurado. */
export function origenDelVisor(): string | null {
  const v = process.env.DELIVERABLE_VIEWER_ORIGIN?.trim();
  if (!v) return null;
  try {
    return new URL(v).origin;
  } catch {
    return null;
  }
}

/** El host de la aplicación, para poder compararlos. */
export function origenDeLaApp(): string | null {
  const v = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!v) return null;
  try {
    return new URL(v).origin;
  } catch {
    return null;
  }
}

/**
 * ¿Está el visor **de verdad** en otro origen?
 *
 * Esta es la comprobación que el criterio 2 pide con todas las letras: «el
 * origen separado **se verifica como tal, no se da por hecho**». Configurar la
 * variable con el mismo dominio de la aplicación dejaría todo compilando,
 * todos los `sandbox` puestos… y el aislamiento evaporado.
 */
export function visorEstaSeparado(): boolean {
  const visor = origenDelVisor();
  const app = origenDeLaApp();
  return Boolean(visor && app && visor !== app);
}

/** La URL del documento dentro del visor. Lleva el id y nada más. */
export function urlDelVisor(deliverableId: string): string | null {
  const base = origenDelVisor();
  if (!base || !visorEstaSeparado()) return null;
  return `${base}/visor/${encodeURIComponent(deliverableId)}`;
}

/**
 * La CSP del documento servido por el visor.
 *
 * **`default-src 'none'`**: ni scripts, ni imágenes de fuera, ni tipografías,
 * ni peticiones. Un entregable HTML es un documento, no una aplicación, y todo
 * lo que necesite de fuera es una vía para exfiltrar.
 *
 * `frame-ancestors` deja que **solo la aplicación** lo enmarque: sin eso,
 * cualquier web podría meter el visor en un iframe y montar un clickjacking
 * sobre el contenido de un cliente.
 */
export function politicaDelVisor(): string {
  const app = origenDeLaApp();
  return [
    "default-src 'none'",
    // Los estilos en línea del propio documento: un entregable sin estilos es
    // ilegible, y `style-src` no ejecuta código.
    "style-src 'unsafe-inline'",
    // Imágenes incrustadas en el propio documento, nunca de fuera.
    "img-src data:",
    "script-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    `frame-ancestors ${app ?? "'none'"}`,
    "sandbox allow-popups",
  ].join("; ");
}
