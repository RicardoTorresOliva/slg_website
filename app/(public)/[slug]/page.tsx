import { notFound } from "next/navigation";

import { loadCollection } from "@/lib/content/loader";
import { PAGINAS_CON_RUTA_PROPIA } from "@/lib/content/overview";

/**
 * Páginas públicas en ESPAÑOL, servidas desde la raíz (§10-5).
 *
 * El contenido se carga y valida en tiempo de build: un frontmatter inválido
 * detiene el despliegue en vez de publicar una página a medias.
 */
/**
 * Las páginas con ruta propia (la portada, los cuatro overviews) se excluyen:
 * si no, `/slg-ai` y `/ai` servirían lo mismo — contenido duplicado para un
 * buscador, con dos URLs compitiendo por posicionar la misma página.
 */
export async function generateStaticParams() {
  return loadCollection("page", "es")
    .filter((p) => !PAGINAS_CON_RUTA_PROPIA.includes(p.slug))
    .map((p) => ({ slug: p.slug }));
}

export const dynamicParams = false;

export default async function PublicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = loadCollection("page", "es").find((p) => p.slug === slug);
  if (!page) notFound();

  const title = page.data.title as string;

  return (
    <div style={{ maxWidth: "42rem", margin: "0 auto", padding: "4rem 1.5rem" }}>
      <p
        style={{
          margin: 0,
          fontSize: "0.75rem",
          letterSpacing: "0.09em",
          textTransform: "uppercase",
          color: "var(--slg-blue-primary)",
        }}
      >
        Español
      </p>
      <h1
        style={{
          margin: "0.5rem 0 1rem",
          fontSize: "clamp(2rem, 5vw, 3rem)",
          lineHeight: 1.05,
          letterSpacing: "-0.02em",
          fontWeight: 700,
          color: "var(--slg-blue-deep)",
        }}
      >
        {title}
      </h1>
      <p style={{ color: "var(--slg-ink-2)" }}>{page.data.description as string}</p>
    </div>
  );
}
