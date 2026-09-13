import { ArmazonPublico } from "@/components/ArmazonPublico";
import { PuertaDeAI } from "@/components/PuertaDeAI";

import { metadatosDePagina } from "@/lib/content/seo";

/** Metadatos únicos por página e idioma, con canonical y hreflang recíproco (RF-05). */
export const metadata = metadatosDePagina("ai", "es", "/ai");

/** `SLG_AI` — la puerta a las tres líneas (DU-04). */
export default function Ai() {
  return (
    <ArmazonPublico ruta="/ai">
      <PuertaDeAI lang="es" />
    </ArmazonPublico>
  );
}
