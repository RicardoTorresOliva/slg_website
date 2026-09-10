import type { Metadata } from "next";
import "./globals.css";

/**
 * Armazón raíz.
 *
 * Deliberadamente mínimo en FU-02: la navegación, el pie y el conmutador de
 * idioma son de FU-06 y M1-A. Aquí solo se fija el idioma del documento y la
 * cadena de fuentes, para que ninguna página nazca sin ellos.
 *
 * `lang="es"` porque el español vive en la raíz y el inglés bajo `/en` (§10-5).
 * La resolución real de idioma la hará el middleware en FU-03.
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
