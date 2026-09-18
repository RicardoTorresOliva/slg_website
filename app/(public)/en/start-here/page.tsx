import { ArmazonPublico } from "@/components/ArmazonPublico";
import { MapaDelSitio } from "@/components/MapaDelSitio";

import { metadatosDePagina } from "@/lib/content/seo";

/** Metadatos únicos por página e idioma, con canonical y hreflang recíproco (RF-05). */
export const metadata = metadatosDePagina("start-here", "en", "/en/start-here");

/**
 * `/en/start-here`: la versión inglesa de `/empieza-aqui`. Ver esa ruta.
 */
export default function StartHereEn() {
  return (
    <ArmazonPublico ruta="/en/start-here">
      <MapaDelSitio slug="start-here" lang="en" />
    </ArmazonPublico>
  );
}
