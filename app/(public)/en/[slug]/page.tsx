import { notFound } from "next/navigation";

import { ArmazonPublico } from "@/components/ArmazonPublico";
import { PaginaProvisional } from "@/components/PaginaProvisional";
import { loadCollection } from "@/lib/content/loader";

/**
 * Páginas públicas en INGLÉS, bajo `/en` (§10-5).
 *
 * `home` queda fuera: su ruta es `/en`, no `/en/home`.
 */
export async function generateStaticParams() {
  return loadCollection("page", "en")
    .filter((p) => p.slug !== "home")
    .map((p) => ({ slug: p.slug }));
}

export const dynamicParams = false;

export default async function PublicPageEn({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = loadCollection("page", "en").find((p) => p.slug === slug);
  if (!page) notFound();

  return (
    <ArmazonPublico ruta={`/en/${slug}`}>
      <PaginaProvisional registro={page} lang="en" />
    </ArmazonPublico>
  );
}
