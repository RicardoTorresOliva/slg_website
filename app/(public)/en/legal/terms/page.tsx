import type { Metadata } from "next";

import { PaginaDeTexto } from "@/components/texto/PaginaDeTexto";
import { loadCollection } from "@/lib/content/loader";

/** Terms of use (DU-06). Pública y sin autenticación: las pantallas de consentimiento OAuth la exigen (RF-12). */
export async function generateMetadata(): Promise<Metadata> {
  const r = loadCollection<{ title: string; description: string; pair: string | null }>("page", "en")
    .find((p) => p.data.pair === "terminos");
  return r ? { title: r.data.title, description: r.data.description } : {};
}

export default function EnglishTermsPage() {
  return <PaginaDeTexto slugEs="terminos" locale="en" />;
}
