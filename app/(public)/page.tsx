import { ArmazonPublico } from "@/components/ArmazonPublico";
import { PortadaProvisional } from "@/components/PortadaProvisional";

/**
 * Portada en **español, servida desde la raíz** (§10-5, RF-03).
 *
 * Lo que hay dentro es provisional: la Home real —hero, las dos puertas, las
 * tres tarjetas, franja Doctrina, últimos artículos y descarga destacada— es
 * **DU-03**, y no se construye hasta que el copy maestro pase su compuerta.
 *
 * Lo que DU-02 sí cierra aquí es **el marco**: navegación, sheet, pie y
 * conmutador de idioma, que es por lo que se navega todo lo demás.
 */
export default function Portada() {
  return (
    <ArmazonPublico ruta="/">
      <PortadaProvisional lang="es" />
    </ArmazonPublico>
  );
}
