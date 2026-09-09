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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
