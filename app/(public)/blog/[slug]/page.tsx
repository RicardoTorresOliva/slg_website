import { notFound } from "next/navigation";

import { Articulo } from "@/components/Articulo";
import { ArmazonPublico } from "@/components/ArmazonPublico";
import { articulo, articulos } from "@/lib/content/blog";
import { metadatosDe } from "@/lib/content/seo";

/**
 * Un artículo en español.
 *
 * `dynamicParams = false` con `generateStaticParams` sobre los PUBLICADOS: un
 * borrador no tiene ruta. No es que devuelva 404 desde el código —que también—:
 * es que su URL no existe en la compilación (RF-22).
 */
export async function generateStaticParams() {
  return articulos("es").map((a) => ({ slug: a.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = articulo("es", slug);
  if (!a) return {};
  return metadatosDe({ ruta: `/blog/${slug}`, titulo: a.titulo, descripcion: a.descripcion });
}

export default async function ArticuloEs({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = articulo("es", slug);
  if (!a) notFound();

  return (
    <ArmazonPublico ruta={`/blog/${slug}`}>
      <Articulo articulo={a} lang="es" />
    </ArmazonPublico>
  );
}
