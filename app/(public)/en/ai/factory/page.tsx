import { ArmazonPublico } from "@/components/ArmazonPublico";
import { OverviewDeRama } from "@/components/OverviewDeRama";

import { metadatosDePagina } from "@/lib/content/seo";

/** Metadatos únicos por página e idioma, con canonical y hreflang recíproco (RF-05). */
export const metadata = metadatosDePagina("slg-factory-en", "en", "/en/ai/factory");

/** Overview de la línea (DU-04): su índice de servicios. */
export default function OverviewEn() {
  return (
    <ArmazonPublico ruta="/en/ai/factory">
      <OverviewDeRama slug="slg-factory" lang="en" />
    </ArmazonPublico>
  );
}
