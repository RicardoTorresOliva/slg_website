import { ArmazonPublico } from "@/components/ArmazonPublico";
import { Portada } from "@/components/Portada";

/** Portada en **inglés, bajo `/en`** (§10-5, RF-03). Los siete bloques de RF-09. */
export default function HomeEn() {
  return (
    <ArmazonPublico ruta="/en">
      <Portada lang="en" />
    </ArmazonPublico>
  );
}
