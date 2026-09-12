import type { Metadata } from "next";

import { ServicePage } from "@/components/service/ServicePage";
import { cargarServicio } from "@/lib/content/service";
import { ruta } from "@/lib/routes/map";

/**
 * `SLG_Holdings` — la undécima página de servicio (D-11), con la misma
 * plantilla del contrato A.3 que las otras diez. Vive en la raíz y no bajo
 * `/ai` porque es una **rama**, no una línea: su registro es el único con
 * `parent: null` (DU-05, `offer-structure` §3).
 */
export async function generateMetadata(): Promise<Metadata> {
  const s = cargarServicio("holdings", "es", ruta("descargas", "es"));
  return { title: s.nombre, description: s.queEs || undefined };
}

export default function PaginaHoldings() {
  return <ServicePage slug="holdings" locale="es" />;
}
