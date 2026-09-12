import type { Metadata } from "next";

import { Gracias } from "@/components/downloads/Gracias";

/**
 * Página de gracias (DU-08, RF-42). `noindex` y sin caché: enseña un enlace
 * que es secreto de un solo destinatario y caduca.
 */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function EnglishThankYouPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; v?: string }>;
}) {
  const { e, v } = await searchParams;
  return <Gracias locale="en" eventoId={e} variante={v} />;
}
