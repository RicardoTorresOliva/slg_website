import { FormularioDelAssessment } from "./FormularioDelAssessment";
import { Markdown } from "./Markdown";
import { HeroTipografico } from "./piezas";

import { loadCollection, loadUiStrings } from "@/lib/content/loader";

/**
 * `/assessment` (spec-delta-assessment).
 *
 * Opcional y sin filtro (DU-10): el texto de la página lo dice, ninguna
 * respuesta es obligatoria y el envío es el único llamado a la acción.
 */
export function PaginaDelAssessment({ lang }: { lang: "es" | "en" }) {
  const t = loadUiStrings()[lang];
  const pagina = loadCollection<{ title: string; description: string }>("page", lang).find((p) => p.slug === "assessment");
  const textos = Object.fromEntries(
    Object.entries(t).filter(([k]) =>
      k.startsWith("assessment.") ||
      ["form.name", "form.lastName", "download.emailLabel", "download.freeEmailRejected", "download.incompleteData", "downloads.privacy", "downloads.privacyLink"].includes(k),
    ),
  ) as Record<string, string>;

  return (
    <div style={{ maxWidth: "44rem", margin: "0 auto", padding: "0 1.25rem 4rem" }} lang={lang}>
      <HeroTipografico titular={pagina?.data.title ?? ""} apoyo={pagina?.data.description ?? ""} />
      <div style={{ paddingBottom: "2rem" }}>
        <Markdown texto={pagina?.body ?? ""} />
      </div>
      <FormularioDelAssessment lang={lang} textos={textos} />
    </div>
  );
}
