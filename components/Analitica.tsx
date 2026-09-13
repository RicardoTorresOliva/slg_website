import Script from "next/script";

/**
 * La analítica de la capa pública (DU-12, criterio 6 · RF-127 · RF-35).
 *
 * **AUTOALOJADA O NADA.** Este componente no sabe cargar Google Analytics ni
 * ningún otro: solo emite la etiqueta de una instancia de Umami **nuestra**,
 * cuya URL viene de `NEXT_PUBLIC_UMAMI_SCRIPT_URL`. Si la variable no está,
 * **no se emite ningún script** y la página queda exactamente igual de
 * funcional. Que la ausencia de analítica sea el estado por defecto es la
 * garantía de que un despliegue nuevo nunca nace midiendo con terceros.
 *
 * **NO PONE NI UNA COOKIE.** Umami identifica visitas con un hash efímero del
 * lado del servidor y no escribe almacenamiento en el navegador. Por eso la
 * capa pública **no lleva banner de consentimiento**: no hay nada que
 * consentir, y un banner sobre una medición anónima es teatro de cumplimiento.
 *
 * `strategy="afterInteractive"`: la medición nunca compite con el contenido.
 * Si el script tardara o no cargara, la página ya es usable — una analítica que
 * puede retrasar el primer pintado es una analítica que empeora lo que mide.
 *
 * LA CSP TAMBIÉN TIENE QUE SABERLO. El origen de esta URL se añade a
 * `script-src` y `connect-src` en `middleware.ts`, leyendo la MISMA variable:
 * si se cambia el dominio de la instancia, la política lo sigue sola.
 */
export function Analitica() {
  const url = process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL;
  const sitio = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
  if (!url || !sitio) return null;

  return <Script src={url} data-website-id={sitio} strategy="afterInteractive" defer />;
}
