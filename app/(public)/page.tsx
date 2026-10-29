import { ArmazonPublico } from "@/components/ArmazonPublico";
import { Propuesta } from "@/components/Propuesta";
import { metadatosDePagina } from "@/lib/content/seo";

/**
 * La portada dice qué hace SLG, para quién y cuál es el siguiente paso
 * (reingeniería, 2026-10-27; `planning/reingenieria/`). El mapa del sitio,
 * que fue la portada desde el 2026-09-18, vive en `/empieza-aqui`.
 */
export const metadata = metadatosDePagina("inicio", "es", "/");

export default function Home() {
  return (
    <ArmazonPublico ruta="/">
      <Propuesta lang="es" />
    </ArmazonPublico>
  );
}
