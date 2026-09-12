import type { Metadata } from "next";

import { Biblioteca } from "@/components/downloads/Biblioteca";
import { loadUiStrings } from "@/lib/content/loader";

/** Biblioteca de documentos (DU-08). */
export async function generateMetadata(): Promise<Metadata> {
  const t = loadUiStrings()["es"];
  return { title: t["downloads.libraryTitle"], description: t["downloads.libraryIntro"] };
}

export default function PaginaDeDescargas() {
  return <Biblioteca locale="es" />;
}
