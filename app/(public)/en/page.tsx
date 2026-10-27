import { ArmazonPublico } from "@/components/ArmazonPublico";
import { Propuesta } from "@/components/Propuesta";
import { metadatosDePagina } from "@/lib/content/seo";

/** La versión inglesa de la portada. Ver `app/(public)/page.tsx`. */
export const metadata = metadatosDePagina("home", "en", "/en");

export default function HomeEn() {
  return (
    <ArmazonPublico ruta="/en">
      <Propuesta lang="en" />
    </ArmazonPublico>
  );
}
