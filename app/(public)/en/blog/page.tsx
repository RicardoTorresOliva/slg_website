import type { Metadata } from "next";

import { Blog } from "@/components/blog/Blog";
import { loadUiStrings } from "@/lib/content/loader";

/** Índice del blog (DU-11). */
export async function generateMetadata(): Promise<Metadata> {
  const t = loadUiStrings()["en"];
  return { title: t["blog.title"] };
}

export default function EnglishBlogPage() {
  return <Blog locale="en" />;
}
