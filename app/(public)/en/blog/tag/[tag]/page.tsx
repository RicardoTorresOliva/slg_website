import { notFound } from "next/navigation";

import { ArmazonPublico } from "@/components/ArmazonPublico";
import { IndiceDeBlog } from "@/components/IndiceDeBlog";
import { etiquetas } from "@/lib/content/blog";

/** Página de etiqueta en inglés. Solo existen las etiquetas con artículos publicados. */
export async function generateStaticParams() {
  return etiquetas("en").map((e) => ({ tag: e.url }));
}

export const dynamicParams = false;

export default async function EtiquetaEn({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params;
  const e = etiquetas("en").find((x) => x.url === tag);
  if (!e) notFound();

  return (
    <ArmazonPublico ruta={`/en/blog/tag/${tag}`}>
      <IndiceDeBlog lang="en" etiqueta={{ nombre: e.etiqueta, url: e.url }} />
    </ArmazonPublico>
  );
}
