import { ArmazonPublico } from "@/components/ArmazonPublico";
import { PaginaDeServicio } from "@/components/PaginaDeServicio";
import { loadCollection } from "@/lib/content/loader";
import { metadatosDe } from "@/lib/content/seo";
import { secciones } from "@/lib/content/secciones";
import { sitio } from "@/lib/sitio";

const registro = loadCollection<{ name: string }>("service", "es").find(
  (r) => r.slug === "slg-holdings",
);

export const metadata = metadatosDe({
  ruta: "/holdings",
  titulo: registro?.data.name ?? sitio.marca.nombre,
  descripcion: secciones(registro?.body ?? "")[0]?.cuerpo.split("\n")[0] ?? "",
});

/**
 * `Holdings by SLG` — destino de menú Y página de servicio.
 *
 * El Anexo A.2 le asigna el documento D-11 y el contrato A.3, así que **la
 * sirve el registro de `service`**, no uno de `page`. Un segundo registro de
 * página para la misma URL habría sido dos fuentes para un solo texto.
 */
export default function Holdings() {
  return (
    <ArmazonPublico ruta="/holdings">
      <PaginaDeServicio slug="slg-holdings" lang="es" ruta="/holdings" />
    </ArmazonPublico>
  );
}
