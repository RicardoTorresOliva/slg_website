import { notFound } from "next/navigation";

import { ArmazonPublico } from "@/components/ArmazonPublico";
import { PaginaDeServicio } from "@/components/PaginaDeServicio";
import { loadCollection } from "@/lib/content/loader";
import { SERVICIOS } from "@/lib/content/rutas";
import { metadatosDe } from "@/lib/content/seo";
import { secciones } from "@/lib/content/secciones";

const DE_ESTA_RAMA = SERVICIOS.filter((s) => s.rama === "slg-enterprise");

/**
 * Las páginas de servicio de esta línea (DU-05).
 *
 * `dynamicParams = false`: solo existen las rutas declaradas en la tabla. Una
 * URL inventada bajo esta rama devuelve 404 y no una página vacía.
 */
export async function generateStaticParams() {
  return DE_ESTA_RAMA.map((s) => ({ servicio: s.es.split("/").pop()! }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ servicio: string }> }) {
  const { servicio } = await params;
  const s = DE_ESTA_RAMA.find((x) => x.es.endsWith(`/${servicio}`));
  if (!s) return {};
  const registro = loadCollection<{ name: string }>("service", "en").find(
    (r) => r.slug === `${s.slug}-en`,
  );
  // La descripción sale de la PRIMERA sección del contrato A.3 —«para quién y
  // qué problema»—, que es exactamente lo que un resultado de búsqueda tiene
  // que decir: para quién es esto.
  const primera = secciones(registro?.body ?? "")[0]?.cuerpo.split("\n")[0] ?? "";
  return metadatosDe({
    ruta: `/en${s.es}`,
    titulo: registro?.data.name ?? "SLG Agency",
    descripcion: primera,
  });
}

export default async function ServicioEn({ params }: { params: Promise<{ servicio: string }> }) {
  const { servicio } = await params;
  const s = DE_ESTA_RAMA.find((x) => x.es.endsWith(`/${servicio}`));
  if (!s) notFound();

  return (
    <ArmazonPublico ruta={`/en${s.es}`}>
      <PaginaDeServicio slug={`${s.slug}-en`} lang="en" ruta={`/en${s.es}`} />
    </ArmazonPublico>
  );
}
