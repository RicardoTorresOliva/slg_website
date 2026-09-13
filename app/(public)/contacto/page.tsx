import { ArmazonPublico } from "@/components/ArmazonPublico";
import { PaginaDeContacto } from "@/components/PaginaDeContacto";
import { metadatosDePagina } from "@/lib/content/seo";

export const metadata = metadatosDePagina("contacto", "es", "/contacto");

/** `/contacto` — el formulario es una comodidad, no un filtro (DU-10). */
export default function Contacto() {
  return (
    <ArmazonPublico ruta="/contacto">
      <PaginaDeContacto lang="es" />
    </ArmazonPublico>
  );
}
