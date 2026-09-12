import type { Metadata } from "next";

import { Articulo } from "@/components/blog/Articulo";
import { buscarArticulo, listarArticulos } from "@/lib/content/blog";

/**
 * Artículo (DU-11). Los parámetros salen de los artículos PUBLICADOS: un
 * borrador no genera ruta, así que no se sirve ni conociendo su slug (RF-22).
 */
export function generateStaticParams() {
  return listarArticulos("en").map((a) => ({ slug: a.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const a = buscarArticulo(slug, "en");
  return a ? { title: a.titulo, description: a.descripcion } : {};
}

export default async function EnglishArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <Articulo slug={slug} locale="en" />;
}
