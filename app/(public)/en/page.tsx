import { ArmazonPublico } from "@/components/ArmazonPublico";
import { Portada } from "@/components/Portada";

import { metadatosDePagina } from "@/lib/content/seo";

/** Metadatos únicos por página e idioma, con canonical y hreflang recíproco (RF-05). */
export const metadata = metadatosDePagina("home", "en", "/en");

/** Portada en **inglés, bajo `/en`** (§10-5, RF-03). Los siete bloques de RF-09. */
export default function HomeEn() {
  return (
    <ArmazonPublico ruta="/en">
      <Portada lang="en" />
    </ArmazonPublico>
  );
}
