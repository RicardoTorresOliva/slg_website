import { ArmazonPublico } from "@/components/ArmazonPublico";
import { MapaDelSitio } from "@/components/MapaDelSitio";
import { metadatosDePagina } from "@/lib/content/seo";

/** «Start here»: the site map. Ver `app/(public)/empieza-aqui/page.tsx`. */
export const metadata = metadatosDePagina("start-here", "en", "/en/start-here");

export default function StartHereEn() {
  return (
    <ArmazonPublico ruta="/en/start-here">
      <MapaDelSitio slug="start-here" lang="en" />
    </ArmazonPublico>
  );
}
