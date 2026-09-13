import { ArmazonPublico } from "@/components/ArmazonPublico";
import { IndiceDeBlog } from "@/components/IndiceDeBlog";
import { loadUiStrings } from "@/lib/content/loader";
import { metadatosDe } from "@/lib/content/seo";

export const metadata = metadatosDe({
  ruta: "/en/blog",
  titulo: loadUiStrings()["en"]["blog.title"],
  descripcion: loadUiStrings()["en"]["blog.metaDescription"],
});

export default function BlogEn() {
  return (
    <ArmazonPublico ruta="/en/blog">
      <IndiceDeBlog lang="en" />
    </ArmazonPublico>
  );
}
