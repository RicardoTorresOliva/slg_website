import { ArmazonPublico } from "@/components/ArmazonPublico";
import { Portada } from "@/components/Portada";

import { metadatosDePagina } from "@/lib/content/seo";

/** Metadatos únicos por página e idioma, con canonical y hreflang recíproco (RF-05). */
export const metadata = metadatosDePagina("home", "es", "/");

/** Portada en **español, servida desde la raíz** (§10-5, RF-03). Los siete bloques de RF-09. */
export default function Home() {
  return (
    <ArmazonPublico ruta="/">
      <Portada lang="es" />
    </ArmazonPublico>
  );
}
