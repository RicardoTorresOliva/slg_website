import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ServicePage } from "@/components/service/ServicePage";
import { cargarServicio } from "@/lib/content/service";
import { loadCollection } from "@/lib/content/loader";
import { ruta } from "@/lib/routes/map";

/**
 * Las diez páginas de servicio de `SLG_AI` en inglés (DU-05).
 *
 * Los parámetros se derivan de `content/services/`: añadir un servicio es
 * añadir su registro, no tocar código (RF-27). El segmento de URL es el slug
 * español en los dos idiomas (`ui_wireframes` §1.3).
 */
export function generateStaticParams() {
  return loadCollection<{ parent: string | null }>("service", "es")
    .filter((s) => s.data.parent !== null)
    .map((s) => ({
      linea: s.data.parent!.replace(/^slg-/, ""),
      servicio: s.slug,
    }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ servicio: string }>;
}): Promise<Metadata> {
  const { servicio } = await params;
  try {
    const s = cargarServicio(servicio, "en", ruta("descargas", "en"));
    return { title: s.nombre, description: s.queEs || undefined };
  } catch {
    return {};
  }
}

export default async function EnglishServicePage({
  params,
}: {
  params: Promise<{ servicio: string }>;
}) {
  const { servicio } = await params;
  const existe = loadCollection("service", "es").some((s) => s.slug === servicio);
  if (!existe) notFound();
  return <ServicePage slug={servicio} locale="en" />;
}
