import { ArmazonPublico } from "@/components/ArmazonPublico";
import { Portada } from "@/components/Portada";

/** Portada en **español, servida desde la raíz** (§10-5, RF-03). Los siete bloques de RF-09. */
export default function Home() {
  return (
    <ArmazonPublico ruta="/">
      <Portada lang="es" />
    </ArmazonPublico>
  );
}
