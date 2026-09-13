import { notFound } from "next/navigation";

import { Articulo } from "@/components/Articulo";
import { ArmazonPublico } from "@/components/ArmazonPublico";
import { articulo, articulos } from "@/lib/content/blog";

/**
 * Un artículo en inglés.
 *
 * `dynamicParams = false` con `generateStaticParams` sobre los PUBLICADOS: un
 * borrador no tiene ruta. No es que devuelva 404 desde el código —que también—:
 * es que su URL no existe en la compilación (RF-22).
 */
export async function generateStaticParams() {
  return articulos("en").map((a) => ({ slug: a.slug }));
}

export const dynamicParams = false;

export default async function ArticuloEn({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = articulo("en", slug);
  if (!a) notFound();

  return (
    <ArmazonPublico ruta={`/en/blog/${slug}`}>
      <Articulo articulo={a} lang="en" />
    </ArmazonPublico>
  );
}
