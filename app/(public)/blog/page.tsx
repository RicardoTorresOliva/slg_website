import { ArmazonPublico } from "@/components/ArmazonPublico";
import { IndiceDeBlog } from "@/components/IndiceDeBlog";
import { loadUiStrings } from "@/lib/content/loader";
import { metadatosDe } from "@/lib/content/seo";

export const metadata = metadatosDe({
  ruta: "/blog",
  titulo: loadUiStrings()["es"]["blog.title"],
  descripcion: loadUiStrings()["es"]["blog.metaDescription"],
});

export default function Blog() {
  return (
    <ArmazonPublico ruta="/blog">
      <IndiceDeBlog lang="es" />
    </ArmazonPublico>
  );
}
