import { ArmazonPublico } from "@/components/ArmazonPublico";
import { PuertaDeAI } from "@/components/PuertaDeAI";

import { metadatosDePagina } from "@/lib/content/seo";

/** Metadatos únicos por página e idioma, con canonical y hreflang recíproco (RF-05). */
export const metadata = metadatosDePagina("ai", "en", "/en/ai");

/** `SLG_AI` — la puerta a las tres líneas (DU-04). */
export default function AiEn() {
  return (
    <ArmazonPublico ruta="/en/ai">
      <PuertaDeAI lang="en" />
    </ArmazonPublico>
  );
}
