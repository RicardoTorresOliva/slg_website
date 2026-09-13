import { notFound } from "next/navigation";

import { ArmazonPublico } from "@/components/ArmazonPublico";
import { PaginaProvisional } from "@/components/PaginaProvisional";
import { loadCollection } from "@/lib/content/loader";
import { PAGINAS_CON_RUTA_PROPIA } from "@/lib/content/rutas";

/**
 * Páginas públicas en INGLÉS, bajo `/en` (§10-5).
 *
 * Las páginas con ruta propia quedan fuera: sus rutas son las del Anexo A.2.
 */
export async function generateStaticParams() {
  return loadCollection("page", "en")
    .filter((p) => !PAGINAS_CON_RUTA_PROPIA.has(p.slug))
    .map((p) => ({ slug: p.slug }));
}

export const dynamicParams = false;

export default async function PublicPageEn({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = loadCollection("page", "en").find((p) => p.slug === slug);
  if (!page || PAGINAS_CON_RUTA_PROPIA.has(slug)) notFound();

  return (
    <ArmazonPublico ruta={`/en/${slug}`}>
      <PaginaProvisional registro={page} lang="en" />
    </ArmazonPublico>
  );
}
