import type { Metadata } from "next";

import { Overview } from "@/components/overview/Overview";
import { cargarOverview } from "@/lib/content/overview";

/** `SLG_AI` en inglés (DU-04). */
export async function generateMetadata(): Promise<Metadata> {
  const o = cargarOverview("slg-ai", "en");
  return { title: o.titulo, description: o.descripcion };
}

export default function EnglishSlgAiPage() {
  return <Overview slug="slg-ai" locale="en" />;
}
