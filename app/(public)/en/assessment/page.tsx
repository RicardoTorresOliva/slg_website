import { ArmazonPublico } from "@/components/ArmazonPublico";
import { PaginaDelAssessment } from "@/components/PaginaDelAssessment";
import { metadatosDePagina } from "@/lib/content/seo";

export const metadata = metadatosDePagina("assessment", "en", "/en/assessment");

/** `/en/assessment` — optional questionnaire that screens no one out (DU-10). */
export default function PaginaPublicaDelAssessmentEn() {
  return (
    <ArmazonPublico ruta="/en/assessment">
      <PaginaDelAssessment lang="en" />
    </ArmazonPublico>
  );
}
