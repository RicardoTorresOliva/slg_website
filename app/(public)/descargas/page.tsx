import { ArmazonPublico } from "@/components/ArmazonPublico";
import { BibliotecaDeDescargas } from "@/components/BibliotecaDeDescargas";
import { metadatosDePagina } from "@/lib/content/seo";

export const metadata = metadatosDePagina("descargas", "es", "/descargas");

/** `/descargas` — la biblioteca de documentos (DU-08). */
export default function Biblioteca() {
  return (
    <ArmazonPublico ruta="/descargas">
      <BibliotecaDeDescargas lang="es" />
    </ArmazonPublico>
  );
}
