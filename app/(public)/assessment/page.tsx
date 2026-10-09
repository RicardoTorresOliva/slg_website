import { ArmazonPublico } from "@/components/ArmazonPublico";
import { PaginaDelAssessment } from "@/components/PaginaDelAssessment";
import { metadatosDePagina } from "@/lib/content/seo";

export const metadata = metadatosDePagina("assessment", "es", "/assessment");

/** `/assessment` — cuestionario opcional y sin filtro (DU-10). */
export default function PaginaPublicaDelAssessment() {
  return (
    <ArmazonPublico ruta="/assessment">
      <PaginaDelAssessment lang="es" />
    </ArmazonPublico>
  );
}
