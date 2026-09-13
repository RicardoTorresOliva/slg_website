import { ArmazonPublico } from "@/components/ArmazonPublico";
import { PaginaDeTexto } from "@/components/PaginaDeTexto";

import { metadatosDePagina } from "@/lib/content/seo";

/** Metadatos únicos por página e idioma, con canonical y hreflang recíproco (RF-05). */
export const metadata = metadatosDePagina("about", "en", "/en/about");

/**
 * `/nosotros` (DU-06).
 *
 * **Cero cifras, premios, mentorías o casos sin respaldo** (criterio 2, RF-11):
 * lo vigila `check:copy`, que exige `[fuente: …]` en la misma línea o un
 * `[PENDIENTE: …]`. Es la página donde más tienta añadir un dato que suena bien.
 */
export default function AboutEn() {
  return (
    <ArmazonPublico ruta="/en/about">
      <PaginaDeTexto slug="about" lang="en" />
    </ArmazonPublico>
  );
}
