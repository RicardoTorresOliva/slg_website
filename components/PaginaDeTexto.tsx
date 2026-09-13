import { loadCollection } from "@/lib/content/loader";

import { Markdown } from "./Markdown";
import { HeroTipografico } from "./piezas";

/**
 * Una página de texto corrido: los legales y cualquier otra que sea prosa.
 *
 * Columna estrecha —44 rem— porque una línea de más de unos 75 caracteres se
 * lee peor: el ojo pierde el renglón al volver. No es una preferencia, es la
 * razón por la que los periódicos tienen columnas.
 */
export function PaginaDeTexto({ slug, lang }: { slug: string; lang: "es" | "en" }) {
  const pagina = loadCollection<{ title: string; description: string }>("page", lang).find(
    (p) => p.slug === slug,
  );

  return (
    <div style={{ maxWidth: "44rem", margin: "0 auto", padding: "0 1.25rem 4rem" }} lang={lang}>
      <HeroTipografico titular={pagina?.data.title ?? ""} apoyo={pagina?.data.description ?? ""} />
      <Markdown texto={pagina?.body ?? ""} />
    </div>
  );
}
