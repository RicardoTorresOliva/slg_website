import { ArmazonPublico } from "@/components/ArmazonPublico";
import { PaginaDeGracias } from "@/components/PaginaDeGracias";
import { metadatosDePagina } from "@/lib/content/seo";

export const metadata = metadatosDePagina("thank-you", "en", "/en/thank-you");

/**
 * `/en/thank-you` — recibe al visitante con su enlace (RF-42).
 *
 * Es **dinámica** porque el enlace firmado llega en la URL y cambia en cada
 * entrega: prerrenderizarla serviría el enlace de otra persona.
 */
export const dynamic = "force-dynamic";

export default async function ThankYou({
  searchParams,
}: {
  searchParams: Promise<{ url?: string; doc?: string; estado?: string }>;
}) {
  const { url, doc, estado } = await searchParams;
  return (
    <ArmazonPublico ruta="/en/thank-you">
      <PaginaDeGracias lang="en" url={url} doc={doc} estado={estado} />
    </ArmazonPublico>
  );
}
