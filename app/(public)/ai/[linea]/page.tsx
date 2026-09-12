import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Overview } from "@/components/overview/Overview";
import { cargarOverview, type SlugDeOverview } from "@/lib/content/overview";

/**
 * Las tres líneas de `SLG_AI` (DU-04).
 *
 * El segmento de URL es el mismo en los dos idiomas (`ui_wireframes` §1.3),
 * así que la traducción está solo en el contenido, no en la ruta.
 */
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
  const o = cargarOverview(slug, "es");
  return { title: o.titulo, description: o.descripcion };
}

export default async function PaginaDeLinea({ params }: { params: Promise<{ linea: string }> }) {
  const { linea } = await params;
  const slug = LINEAS[linea];
  if (!slug) notFound();
  return <Overview slug={slug} locale="es" />;
}
