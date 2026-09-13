import { ArmazonPublico } from "@/components/ArmazonPublico";
import { BibliotecaDeDescargas } from "@/components/BibliotecaDeDescargas";
import { metadatosDePagina } from "@/lib/content/seo";

export const metadata = metadatosDePagina("downloads", "en", "/en/downloads");

/** `/en/downloads` — la biblioteca de documentos (DU-08). */
export default function BibliotecaEn() {
  return (
    <ArmazonPublico ruta="/en/downloads">
      <BibliotecaDeDescargas lang="en" />
    </ArmazonPublico>
  );
}
