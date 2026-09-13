import { notFound } from "next/navigation";

import { ArmazonPublico } from "@/components/ArmazonPublico";
import { IndiceDeBlog } from "@/components/IndiceDeBlog";
import { etiquetas } from "@/lib/content/blog";
import { loadUiStrings } from "@/lib/content/loader";
import { metadatosDe } from "@/lib/content/seo";

/** Página de etiqueta en inglés. Solo existen las etiquetas con artículos publicados. */
export async function generateStaticParams() {
  return etiquetas("en").map((e) => ({ tag: e.url }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params;
  const e = etiquetas("en").find((x) => x.url === tag);
  if (!e) return {};
  return metadatosDe({
    ruta: `/en/blog/tag/${tag}`,
    titulo: e.etiqueta,
    descripcion: loadUiStrings()["en"]["blog.taggedWith"],
  });
}

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
