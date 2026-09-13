import { ArmazonPublico } from "@/components/ArmazonPublico";
import { PaginaDeDoctrina } from "@/components/PaginaDeDoctrina";

import { metadatosDePagina } from "@/lib/content/seo";

/** Metadatos únicos por página e idioma, con canonical y hreflang recíproco (RF-05). */
export const metadata = metadatosDePagina("doctrine", "en", "/en/doctrine");

/** `/doctrina` — resumen ejecutivo, los tres pilares de DAL OS y la solicitud (DU-06). */
export default function DoctrineEn() {
  return (
    <ArmazonPublico ruta="/en/doctrine">
      <PaginaDeDoctrina lang="en" />
    </ArmazonPublico>
  );
}
