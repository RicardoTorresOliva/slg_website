import { ArmazonPublico } from "@/components/ArmazonPublico";
import { MapaDelSitio } from "@/components/MapaDelSitio";

import { metadatosDePagina } from "@/lib/content/seo";

/** Metadatos únicos por página e idioma, con canonical y hreflang recíproco (RF-05). */
export const metadata = metadatosDePagina("empieza-aqui", "es", "/empieza-aqui");

/**
 * `/empieza-aqui`: el mapa del sitio en una página.
 *
 * Ruta propia y no `/[slug]` porque su interior no es prosa: es el árbol que
 * `MapaDelSitio` genera desde la tabla de rutas. Entra en el pie, no en la
 * barra: los destinos del menú siguen siendo cinco (RF-01).
 */
export default function EmpiezaAqui() {
  return (
    <ArmazonPublico ruta="/empieza-aqui">
      <MapaDelSitio slug="empieza-aqui" lang="es" />
    </ArmazonPublico>
  );
}
