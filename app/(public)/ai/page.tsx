import { ArmazonPublico } from "@/components/ArmazonPublico";
import { PuertaDeAI } from "@/components/PuertaDeAI";

/** `SLG_AI` — la puerta a las tres líneas (DU-04). */
export default function Ai() {
  return (
    <ArmazonPublico ruta="/ai">
      <PuertaDeAI lang="es" />
    </ArmazonPublico>
  );
}
