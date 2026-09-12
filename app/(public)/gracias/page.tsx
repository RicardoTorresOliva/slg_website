import type { Metadata } from "next";

import { Gracias } from "@/components/downloads/Gracias";

/**
 * Página de gracias (DU-08, RF-42). `noindex` y sin caché: enseña un enlace
 * que es secreto de un solo destinatario y caduca.
 */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function PaginaDeGracias({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; p?: string }>;
}) {
  const { e, p } = await searchParams;
  return <Gracias locale="es" eventoId={e} pendiente={p === "1"} />;
}
