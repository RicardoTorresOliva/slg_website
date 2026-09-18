import { ArmazonPublico } from "@/components/ArmazonPublico";
import { Portada } from "@/components/Portada";
import { metadatosDePagina } from "@/lib/content/seo";

/** `/en/services`: la versión inglesa de `/servicios`. Ver esa ruta. */
export const metadata = metadatosDePagina("services", "en", "/en/services");

export default function ServicesEn() {
  return (
    <ArmazonPublico ruta="/en/services">
      <Portada lang="en" />
    </ArmazonPublico>
  );
}
