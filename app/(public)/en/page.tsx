import { ArmazonPublico } from "@/components/ArmazonPublico";
import { PortadaProvisional } from "@/components/PortadaProvisional";

/**
 * Portada en **inglés, bajo `/en`** (§10-5, RF-03).
 *
 * Esta ruta existía como hueco: el logo en inglés llevaba a `/en` y `/en` era
 * un 404. Lo encontró DU-02 al construir el marco, que es justo para lo que
 * sirve construir el marco antes que las páginas.
 */
export default function HomeEn() {
  return (
    <ArmazonPublico ruta="/en">
      <PortadaProvisional lang="en" />
    </ArmazonPublico>
  );
}
