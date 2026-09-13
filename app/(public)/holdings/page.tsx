import { ArmazonPublico } from "@/components/ArmazonPublico";
import { PaginaDeServicio } from "@/components/PaginaDeServicio";

/**
 * `SLG_Holdings` — destino de menú Y página de servicio.
 *
 * El Anexo A.2 le asigna el documento D-11 y el contrato A.3, así que **la
 * sirve el registro de `service`**, no uno de `page`. Un segundo registro de
 * página para la misma URL habría sido dos fuentes para un solo texto.
 */
export default function Holdings() {
  return (
    <ArmazonPublico ruta="/holdings">
      <PaginaDeServicio slug="slg-holdings" lang="es" />
    </ArmazonPublico>
  );
}
