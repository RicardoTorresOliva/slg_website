import { ArmazonPublico } from "@/components/ArmazonPublico";
import { MapaDelSitio } from "@/components/MapaDelSitio";
import { metadatosDePagina } from "@/lib/content/seo";

/**
 * La portada es «Empieza aquí»: el mapa del sitio (decisión de Ricardo,
 * 2026-09-18). Poco contenido, toda la estructura a la vista, y desde ahí a
 * Servicios, que es la casa comercial. La portada anterior vive en `/servicios`.
 */
export const metadata = metadatosDePagina("empieza-aqui", "es", "/");

export default function Home() {
  return (
    <ArmazonPublico ruta="/">
      <MapaDelSitio slug="empieza-aqui" lang="es" />
    </ArmazonPublico>
  );
}
