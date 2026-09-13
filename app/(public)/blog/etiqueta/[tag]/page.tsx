import { notFound } from "next/navigation";

import { ArmazonPublico } from "@/components/ArmazonPublico";
import { IndiceDeBlog } from "@/components/IndiceDeBlog";
import { etiquetas } from "@/lib/content/blog";

/** Página de etiqueta en español. Solo existen las etiquetas con artículos publicados. */
export async function generateStaticParams() {
  return etiquetas("es").map((e) => ({ tag: e.url }));
}

export const dynamicParams = false;

export default async function EtiquetaEs({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params;
  const e = etiquetas("es").find((x) => x.url === tag);
  if (!e) notFound();

  return (
    <ArmazonPublico ruta={`/blog/etiqueta/${tag}`}>
      <IndiceDeBlog lang="es" etiqueta={{ nombre: e.etiqueta, url: e.url }} />
    </ArmazonPublico>
  );
}
