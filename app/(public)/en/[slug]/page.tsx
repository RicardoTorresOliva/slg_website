import { notFound } from "next/navigation";

import { loadCollection } from "@/lib/content/loader";

/**
 * Páginas públicas en INGLÉS, servidas bajo /en (§10-5).
 *
 * El contenido se carga y valida en tiempo de build: un frontmatter inválido
 * detiene el despliegue en vez de publicar una página a medias.
 */
export async function generateStaticParams() {
  return loadCollection("page", "en").map((p) => ({ slug: p.slug }));
}

export const dynamicParams = false;

export default async function PublicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = loadCollection("page", "en").find((p) => p.slug === slug);
  if (!page) notFound();

  const title = page.data.title as string;

  return (
    <main style={{ maxWidth: "42rem", margin: "0 auto", padding: "4rem 1.5rem" }}>
      <p
        style={{
          margin: 0,
          fontSize: "0.75rem",
          letterSpacing: "0.09em",
          textTransform: "uppercase",
          color: "var(--slg-blue-primary)",
        }}
      >
        English
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
    </main>
  );
}
