import { ArmazonPublico } from "@/components/ArmazonPublico";
import { OverviewDeRama } from "@/components/OverviewDeRama";

import { metadatosDePagina } from "@/lib/content/seo";

/** Metadatos únicos por página e idioma, con canonical y hreflang recíproco (RF-05). */
export const metadata = metadatosDePagina("slg-enterprise-en", "en", "/en/ai/enterprise");

/** Overview de la línea (DU-04): su índice de servicios. */
export default function OverviewEn() {
  return (
    <ArmazonPublico ruta="/en/ai/enterprise">
      <OverviewDeRama slug="slg-enterprise" lang="en" />
    </ArmazonPublico>
  );
}
