import { ArmazonPublico } from "@/components/ArmazonPublico";
import { OverviewDeRama } from "@/components/OverviewDeRama";

/** Overview de la línea (DU-04): su índice de servicios. */
export default function Overview() {
  return (
    <ArmazonPublico ruta="/ai/factory">
      <OverviewDeRama slug="slg-factory" lang="es" />
    </ArmazonPublico>
  );
}
