import type { Metadata } from "next";

import { Doctrina } from "@/components/doctrina/Doctrina";
import { loadCollection } from "@/lib/content/loader";

/** Doctrina (DU-06). */
export async function generateMetadata(): Promise<Metadata> {
  const r = loadCollection<{ title: string; description: string; pair: string | null }>("page", "es")
    .find((p) => p.slug === "doctrina");
  return r ? { title: r.data.title, description: r.data.description } : {};
}

export default function PaginaDeDoctrina() {
  return <Doctrina locale="es" />;
}
