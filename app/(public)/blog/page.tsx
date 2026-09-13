import { ArmazonPublico } from "@/components/ArmazonPublico";
import { IndiceDeBlog } from "@/components/IndiceDeBlog";

export default function Blog() {
  return (
    <ArmazonPublico ruta="/blog">
      <IndiceDeBlog lang="es" />
    </ArmazonPublico>
  );
}
