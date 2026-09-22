import type { Metadata } from "next";

import { cssDeLaMarca, sitio } from "@/lib/sitio";

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
  // una pestaña sin título en staging. Salen de la ficha (D-165): el nombre y
  // el lema son del cliente, no del motor.
  title: sitio.marca.nombre,
  description: sitio.marca.lema,
};

/**
 * Los colores de marca, desde la ficha (`site.config.ts`), en un `<style>` del
 * `<head>` servido.
 *
 * **POR QUÉ ASÍ Y NO GENERANDO `tokens.css`.** Un CSS generado es un segundo
 * archivo que dice lo mismo que la ficha y que puede quedarse viejo si alguien
 * cambia la ficha y no regenera; aquí no hay nada que regenerar. Y no hace
 * falta JavaScript en el cliente: el armazón es un componente de servidor, la
 * regla se escribe una vez al prerrenderizar y viaja en el HTML, antes que
 * cualquier hoja de estilos. La CSP la admite porque `style-src` conserva
 * `'unsafe-inline'` a propósito (`middleware.ts`).
 *
 * **Y `tokens.css` YA NO TIENE ESTOS NUEVE VALORES**, en vez de tenerlos como
 * respaldo que este bloque pisa: con dos fuentes, cuál gana depende del orden
 * en que Next escriba las etiquetas del `<head>`, y un cliente vería el azul de
 * SLG si ese orden cambiara. Con una sola no hay carrera que ganar.
 */
const COLORES_DE_MARCA = cssDeLaMarca();

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <head>
        <style dangerouslySetInnerHTML={{ __html: COLORES_DE_MARCA }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
