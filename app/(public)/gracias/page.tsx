import { ArmazonPublico } from "@/components/ArmazonPublico";
import { PaginaDeGracias } from "@/components/PaginaDeGracias";
import { metadatosDePagina } from "@/lib/content/seo";

export const metadata = metadatosDePagina("gracias", "es", "/gracias");

/**
 * `/gracias` — recibe al visitante con su enlace (RF-42).
 *
 * Es **dinámica** porque el enlace firmado llega en la URL y cambia en cada
 * entrega: prerrenderizarla serviría el enlace de otra persona.
 */
export const dynamic = "force-dynamic";

export default async function Gracias({
  searchParams,
}: {
  searchParams: Promise<{ url?: string; doc?: string; estado?: string }>;
}) {
  const { url, doc, estado } = await searchParams;
  return (
    <ArmazonPublico ruta="/gracias">
      <PaginaDeGracias lang="es" url={url} doc={doc} estado={estado} />
    </ArmazonPublico>
  );
}
