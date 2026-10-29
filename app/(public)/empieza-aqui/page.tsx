import { ArmazonPublico } from "@/components/ArmazonPublico";
import { MapaDelSitio } from "@/components/MapaDelSitio";
import { metadatosDePagina } from "@/lib/content/seo";

/**
 * «Empieza aquí»: el mapa del sitio en una página. Fue la portada entre el
 * 2026-09-18 y la reingeniería del 2026-10-27; desde entonces la portada es la
 * propuesta de valor y el mapa sigue en el menú, con su forma intacta.
 */
export const metadata = metadatosDePagina("empieza-aqui", "es", "/empieza-aqui");

export default function EmpiezaAqui() {
  return (
    <ArmazonPublico ruta="/empieza-aqui">
      <MapaDelSitio slug="empieza-aqui" lang="es" />
    </ArmazonPublico>
  );
}
