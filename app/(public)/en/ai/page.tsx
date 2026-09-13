import { ArmazonPublico } from "@/components/ArmazonPublico";
import { PuertaDeAI } from "@/components/PuertaDeAI";

/** `SLG_AI` — la puerta a las tres líneas (DU-04). */
export default function AiEn() {
  return (
    <ArmazonPublico ruta="/en/ai">
      <PuertaDeAI lang="en" />
    </ArmazonPublico>
  );
}
