import { ArmazonPublico } from "@/components/ArmazonPublico";
import { PaginaDeContacto } from "@/components/PaginaDeContacto";
import { metadatosDePagina } from "@/lib/content/seo";

export const metadata = metadatosDePagina("contact", "en", "/en/contact");

/** `/en/contact` — el formulario es una comodidad, no un filtro (DU-10). */
export default function ContactEn() {
  return (
    <ArmazonPublico ruta="/en/contact">
      <PaginaDeContacto lang="en" />
    </ArmazonPublico>
  );
}
