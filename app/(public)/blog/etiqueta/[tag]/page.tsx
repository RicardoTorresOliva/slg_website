import type { Metadata } from "next";

import { Blog } from "@/components/blog/Blog";

/**
 * Índice por etiqueta (DU-11). Dinámico: las etiquetas nacen del frontmatter
 * de los artículos, así que una etiqueta nueva no puede exigir un despliegue.
 */
export async function generateMetadata({ params }: { params: Promise<{ tag: string }> }): Promise<Metadata> {
  const { tag } = await params;
  return { title: decodeURIComponent(tag) };
}

export default async function PaginaDeEtiqueta({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params;
  return <Blog locale="es" etiqueta={tag} />;
}
