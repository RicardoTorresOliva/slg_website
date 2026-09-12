import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Overview } from "@/components/overview/Overview";
import { cargarOverview, type SlugDeOverview } from "@/lib/content/overview";

/** Las tres líneas de `SLG_AI` en inglés (DU-04). Mismos segmentos de URL que en español. */
const LINEAS: Record<string, SlugDeOverview> = {
  academy: "slg-academy",
  enterprise: "slg-enterprise",
  factory: "slg-factory",
};

export function generateStaticParams() {
  return Object.keys(LINEAS).map((linea) => ({ linea }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ linea: string }>;
}): Promise<Metadata> {
  const { linea } = await params;
  const slug = LINEAS[linea];
  if (!slug) return {};
  const o = cargarOverview(slug, "en");
  return { title: o.titulo, description: o.descripcion };
}

export default async function EnglishLinePage({ params }: { params: Promise<{ linea: string }> }) {
  const { linea } = await params;
  const slug = LINEAS[linea];
  if (!slug) notFound();
  return <Overview slug={slug} locale="en" />;
}
