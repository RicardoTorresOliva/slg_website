import { ArmazonPublico } from "@/components/ArmazonPublico";
import { Portada } from "@/components/Portada";
import { metadatosDePagina } from "@/lib/content/seo";

/**
 * `/servicios` — la casa comercial (decisión de Ricardo, 2026-09-18): los
 * bloques de RF-09 que antes eran la portada. La portada es ahora el mapa.
 */
export const metadata = metadatosDePagina("servicios", "es", "/servicios");

export default function Servicios() {
  return (
    <ArmazonPublico ruta="/servicios">
      <Portada lang="es" />
    </ArmazonPublico>
  );
}
