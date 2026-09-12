import type { Metadata } from "next";

import { Overview } from "@/components/overview/Overview";
import { cargarOverview } from "@/lib/content/overview";

/** `SLG_AI` — la rama, como puerta a sus tres líneas (DU-04). */
export async function generateMetadata(): Promise<Metadata> {
  const o = cargarOverview("slg-ai", "es");
  return { title: o.titulo, description: o.descripcion };
}

export default function PaginaSlgAi() {
  return <Overview slug="slg-ai" locale="es" />;
}
