import type { Metadata } from "next";

import { FichaDeDocumento } from "@/components/downloads/FichaDeDocumento";
import { buscarDocumento, listarDocumentos } from "@/lib/content/downloads";

/**
 * Ficha de documento (DU-08). Los parámetros salen del contenido: publicar un
 * documento nuevo es añadir su registro y subir el archivo (RF-27, criterio 3).
 */
export function generateStaticParams() {
  return listarDocumentos("en").map((d) => ({ slug: d.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = buscarDocumento(slug, "en");
  return doc ? { title: doc.titulo || undefined, description: doc.publico || undefined } : {};
}

export default async function EnglishDocumentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <FichaDeDocumento slug={slug} locale="en" />;
}
