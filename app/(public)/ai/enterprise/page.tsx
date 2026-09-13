import { ArmazonPublico } from "@/components/ArmazonPublico";
import { OverviewDeRama } from "@/components/OverviewDeRama";

/** Overview de la línea (DU-04): su índice de servicios. */
export default function Overview() {
  return (
    <ArmazonPublico ruta="/ai/enterprise">
      <OverviewDeRama slug="slg-enterprise" lang="es" />
    </ArmazonPublico>
  );
}
