import type { Metadata } from "next";

import { Blog } from "@/components/blog/Blog";
import { loadUiStrings } from "@/lib/content/loader";

/** Índice del blog (DU-11). */
export async function generateMetadata(): Promise<Metadata> {
  const t = loadUiStrings()["es"];
  return { title: t["blog.title"] };
}

export default function PaginaDeBlog() {
  return <Blog locale="es" />;
}
