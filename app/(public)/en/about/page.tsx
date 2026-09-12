import type { Metadata } from "next";

import { PaginaDeTexto } from "@/components/texto/PaginaDeTexto";
import { loadCollection } from "@/lib/content/loader";

/** About (DU-06). Pública y sin autenticación: las pantallas de consentimiento OAuth la exigen (RF-12). */
export async function generateMetadata(): Promise<Metadata> {
  const r = loadCollection<{ title: string; description: string; pair: string | null }>("page", "en")
    .find((p) => p.data.pair === "nosotros");
  return r ? { title: r.data.title, description: r.data.description } : {};
}

export default function EnglishAboutPage() {
  return <PaginaDeTexto slugEs="nosotros" locale="en" />;
}
