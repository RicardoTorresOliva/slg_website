import { notFound } from "next/navigation";

import { ArmazonPublico } from "@/components/ArmazonPublico";
import { PaginaProvisional } from "@/components/PaginaProvisional";
import { loadCollection } from "@/lib/content/loader";
import { metadatosDe } from "@/lib/content/seo";
import { PAGINAS_CON_RUTA_PROPIA } from "@/lib/content/rutas";

/**
 * Páginas públicas en ESPAÑOL, servidas desde la raíz (§10-5).
 *
 * El contenido se carga y valida en tiempo de build: un frontmatter inválido
 * detiene el despliegue en vez de publicar una página a medias.
 *
 * Las páginas con ruta propia —la portada, `SLG_AI` y las tres líneas— quedan
 * FUERA de esta lista: sus rutas son las del Anexo A.2, anidadas. Servir la
 * misma página en dos URL divide los enlaces y duplica contenido para los
 * buscadores.
 */
export async function generateStaticParams() {
  return loadCollection("page", "es")
    .filter((p) => !PAGINAS_CON_RUTA_PROPIA.has(p.slug))
    .map((p) => ({ slug: p.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = loadCollection<{ title: string; description: string }>("page", "es").find(
    (x) => x.slug === slug,
  );
  return metadatosDe({
    ruta: `/${slug}`,
    titulo: p?.data.title ?? "SLG Agency",
    descripcion: p?.data.description ?? "",
  });
}

export default async function PublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = loadCollection("page", "es").find((p) => p.slug === slug);
  if (!page || PAGINAS_CON_RUTA_PROPIA.has(slug)) notFound();

  return (
    <ArmazonPublico ruta={`/${slug}`}>
      <PaginaProvisional registro={page} lang="es" />
    </ArmazonPublico>
  );
}
