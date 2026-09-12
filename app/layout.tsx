import type { Metadata } from "next";
import { headers } from "next/headers";

import { localeDeRuta } from "@/lib/routes/map";
import "./globals.css";

/**
 * Armazón raíz.
 *
 * `lang` se resuelve **por petición** desde la ruta (DU-02), no se fija a
 * `"es"`. Hasta DU-02 esta etiqueta decía español en todo el sitio, incluidas
 * las páginas bajo `/en`: un lector de pantalla leía el inglés con fonética
 * española y los buscadores recibían la señal de idioma equivocada en la mitad
 * del sitio. Se encontró verificando `/en/doctrine` en el navegador, no
 * leyendo el código.
 */
export const metadata: Metadata = {
  // Metadatos por página e idioma: FU-06. Aquí solo el mínimo para no servir
  // una pestaña sin título en staging.
  title: "SLG Agency",
  description: "Precision with Purpose.",
};

/**
 * Renderizado dinámico en TODO el sitio (FU-07, hallazgo propio).
 *
 * La CSP con nonce que `proxy.ts` fija en cada petición es, según la propia
 * documentación de Next.js, incompatible con la optimización estática y con
 * ISR: una página generada en el build no puede llevar un nonce que todavía
 * no existe. La alternativa —sin nonce— es la que dejaba bloqueada TODA la
 * hidratación de React bajo la CSP estricta (ver `next.config.ts` y
 * `docs/decision_log.md`). Se hereda a cada ruta; ninguna necesita declararlo
 * por su cuenta. Verificado que el gate D1 (Lighthouse, D-50) sigue en verde
 * con este cambio — `docs/work_log.md`.
 */
export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = (await headers()).get("x-pathname") ?? "/";

  return (
    <html lang={localeDeRuta(pathname)}>
      <body>{children}</body>
    </html>
  );
}
