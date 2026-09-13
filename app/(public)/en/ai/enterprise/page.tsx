import { ArmazonPublico } from "@/components/ArmazonPublico";
import { OverviewDeRama } from "@/components/OverviewDeRama";

/** Overview de la línea (DU-04): su índice de servicios. */
export default function OverviewEn() {
  return (
    <ArmazonPublico ruta="/en/ai/enterprise">
      <OverviewDeRama slug="slg-enterprise" lang="en" />
    </ArmazonPublico>
  );
}
