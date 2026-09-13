import { notFound } from "next/navigation";

import { ArmazonPublico } from "@/components/ArmazonPublico";
import { PaginaProvisional } from "@/components/PaginaProvisional";
import { loadCollection } from "@/lib/content/loader";

/**
 * Páginas públicas en ESPAÑOL, servidas desde la raíz (§10-5).
 *
 * El contenido se carga y valida en tiempo de build: un frontmatter inválido
 * detiene el despliegue en vez de publicar una página a medias.
 *
 * `home` queda FUERA de esta lista: su ruta es `/`, no `/home`. Servir la misma
 * página en dos URL distintas divide los enlaces y duplica el contenido para
 * los buscadores.
 */
export async function generateStaticParams() {
  return loadCollection("page", "es")
    .filter((p) => p.slug !== "home")
    .map((p) => ({ slug: p.slug }));
}

export const dynamicParams = false;

export default async function PublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = loadCollection("page", "es").find((p) => p.slug === slug);
  if (!page) notFound();

  return (
    <ArmazonPublico ruta={`/${slug}`}>
      <PaginaProvisional registro={page} lang="es" />
    </ArmazonPublico>
  );
}
