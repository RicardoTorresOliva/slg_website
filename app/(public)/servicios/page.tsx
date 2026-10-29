import { ArmazonPublico } from "@/components/ArmazonPublico";
import { Portada } from "@/components/Portada";
import { metadatosDePagina } from "@/lib/content/seo";

/**
 * `/servicios` — el índice de toda la oferta por fase del método (reingeniería,
 * DU-RC02): los bloques de RF-09 que declara la ficha. La propuesta vive en la
 * portada; aquí entra quien ya sabe lo que busca.
 */
export const metadata = metadatosDePagina("servicios", "es", "/servicios");

export default function Servicios() {
  return (
    <ArmazonPublico ruta="/servicios">
      <Portada lang="es" />
    </ArmazonPublico>
  );
}
