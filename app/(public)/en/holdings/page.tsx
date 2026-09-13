import { ArmazonPublico } from "@/components/ArmazonPublico";
import { PaginaDeServicio } from "@/components/PaginaDeServicio";
import { loadCollection } from "@/lib/content/loader";
import { metadatosDe } from "@/lib/content/seo";
import { secciones } from "@/lib/content/secciones";

const registro = loadCollection<{ name: string }>("service", "en").find(
  (r) => r.slug === "slg-holdings-en",
);

export const metadata = metadatosDe({
  ruta: "/en/holdings",
  titulo: registro?.data.name ?? "SLG Agency",
  descripcion: secciones(registro?.body ?? "")[0]?.cuerpo.split("\n")[0] ?? "",
});

/**
 * `SLG_Holdings` — destino de menú Y página de servicio.
 *
 * El Anexo A.2 le asigna el documento D-11 y el contrato A.3, así que **la
 * sirve el registro de `service`**, no uno de `page`. Un segundo registro de
 * página para la misma URL habría sido dos fuentes para un solo texto.
 */
export default function HoldingsEn() {
  return (
    <ArmazonPublico ruta="/en/holdings">
      <PaginaDeServicio slug="slg-holdings-en" lang="en" ruta="/en/holdings" />
    </ArmazonPublico>
  );
}
