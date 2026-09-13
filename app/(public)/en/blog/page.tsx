import { ArmazonPublico } from "@/components/ArmazonPublico";
import { IndiceDeBlog } from "@/components/IndiceDeBlog";

export default function BlogEn() {
  return (
    <ArmazonPublico ruta="/en/blog">
      <IndiceDeBlog lang="en" />
    </ArmazonPublico>
  );
}
