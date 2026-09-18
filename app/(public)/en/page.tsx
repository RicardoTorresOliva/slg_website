import { ArmazonPublico } from "@/components/ArmazonPublico";
import { MapaDelSitio } from "@/components/MapaDelSitio";
import { metadatosDePagina } from "@/lib/content/seo";

/** La versión inglesa de la portada: «Start here». Ver `app/(public)/page.tsx`. */
export const metadata = metadatosDePagina("start-here", "en", "/en");

export default function HomeEn() {
  return (
    <ArmazonPublico ruta="/en">
      <MapaDelSitio slug="start-here" lang="en" />
    </ArmazonPublico>
  );
}
