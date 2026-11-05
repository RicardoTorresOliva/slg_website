"use client";

import { useEffect } from "react";

/**
 * Pone el idioma de la página en `<html lang>` (las páginas `/en/*`).
 *
 * POR QUÉ ASÍ. Hay un solo armazón raíz (`app/layout.tsx`) y fija `lang="es"`
 * en el HTML estático; leer la ruta allí haría dinámicas las rutas públicas
 * (ver `ArmazonPublico`). El HTML servido ya lleva el idioma correcto en
 * `<main lang>`, que es lo que leen los lectores de pantalla para el contenido;
 * esto corrige además el documento entero en cuanto la página se hidrata.
 * No dibuja nada.
 */
export function IdiomaDelDocumento({ lang }: { lang: "es" | "en" }) {
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return null;
}
