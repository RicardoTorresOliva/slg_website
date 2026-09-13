import { ArmazonPublico } from "@/components/ArmazonPublico";
import { OverviewDeRama } from "@/components/OverviewDeRama";

import { metadatosDePagina } from "@/lib/content/seo";

/** Metadatos únicos por página e idioma, con canonical y hreflang recíproco (RF-05). */
export const metadata = metadatosDePagina("slg-enterprise", "es", "/ai/enterprise");

/** Overview de la línea (DU-04): su índice de servicios. */
export default function Overview() {
  return (
    <ArmazonPublico ruta="/ai/enterprise">
      <OverviewDeRama slug="slg-enterprise" lang="es" />
    </ArmazonPublico>
  );
}
