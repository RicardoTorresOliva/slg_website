import { notFound } from "next/navigation";

import { ArmazonPublico } from "@/components/ArmazonPublico";
import { PaginaDeDocumento } from "@/components/PaginaDeDocumento";
import { loadCollection } from "@/lib/content/loader";
import { metadatosDe } from "@/lib/content/seo";

/**
 * La página de un documento, con su formulario (DU-08).
 *
 * Los `draft` NO tienen ruta: `generateStaticParams` no los incluye y
 * `dynamicParams = false` cierra la puerta (RF-29). Es la misma regla del blog.
 */
export async function generateStaticParams() {
  return loadCollection<{ status: string }>("download", "en")
    .filter((d) => d.data.status !== "draft")
    .map((d) => ({ slug: d.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = loadCollection<{ title: string; audience: string }>("download", "en").find(
    (x) => x.slug === slug,
  );
  if (!d) return {};
  return metadatosDe({ ruta: `/en/downloads/${slug}`, titulo: d.data.title, descripcion: d.data.audience });
}

export default async function DocumentoEn({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = loadCollection<{ status: string }>("download", "en").find((x) => x.slug === slug);
  if (!d || d.data.status === "draft") notFound();

  return (
    <ArmazonPublico ruta={`/en/downloads/${slug}`}>
      <PaginaDeDocumento slug={slug} lang="en" />
    </ArmazonPublico>
  );
}
