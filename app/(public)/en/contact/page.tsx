import type { Metadata } from "next";

import { Contacto } from "@/components/contacto/Contacto";
import { loadUiStrings } from "@/lib/content/loader";

/** Contacto (DU-10). Sin agenda embebida ni widget de terceros (RF-08). */
export async function generateMetadata(): Promise<Metadata> {
  const t = loadUiStrings()["en"];
  return { title: t["contact.title"], description: t["contact.intro"] };
}

export default function EnglishContactPage() {
  return <Contacto locale="en" />;
}
