import { notFound } from "next/navigation";

import { ArmazonPublico } from "@/components/ArmazonPublico";
import { PaginaDeServicio } from "@/components/PaginaDeServicio";
import { SERVICIOS } from "@/lib/content/rutas";

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

export default async function ServicioEn({ params }: { params: Promise<{ servicio: string }> }) {
  const { servicio } = await params;
  const s = DE_ESTA_RAMA.find((x) => x.es.endsWith(`/${servicio}`));
  if (!s) notFound();

  return (
    <ArmazonPublico ruta={`/en${s.es}`}>
      <PaginaDeServicio slug={`${s.slug}-en`} lang="en" />
    </ArmazonPublico>
  );
}
