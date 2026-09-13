import { FormularioPublico } from "./FormularioPublico";
import { Markdown } from "./Markdown";
import { HeroTipografico } from "./piezas";

import { loadCollection, loadUiStrings } from "@/lib/content/loader";

/**
 * `/contacto` (DU-10).
 *
 * El texto de la página dice que se puede escribir directamente a
 * `support@`, y sigue siendo cierto: el formulario es **una comodidad**, no un
 * filtro. No hay calificación, no hay campos obligatorios de empresa ni de
 * presupuesto, y no hay llamada de descubrimiento — eso es lo que el modelo
 * informativo de §10-8 significa en una pantalla.
 */
export function PaginaDeContacto({ lang }: { lang: "es" | "en" }) {
  const t = loadUiStrings()[lang];
  const pagina = loadCollection<{ title: string; description: string }>("page", lang).find(
    (p) => p.slug === (lang === "en" ? "contact" : "contacto"),
  );

  return (
    <div style={{ maxWidth: "44rem", margin: "0 auto", padding: "0 1.25rem 4rem" }} lang={lang}>
      <HeroTipografico titular={pagina?.data.title ?? ""} apoyo={pagina?.data.description ?? ""} />
      <div style={{ paddingBottom: "2rem" }}>
        <Markdown texto={pagina?.body ?? ""} />
      </div>
      <FormularioPublico lang={lang} origen="contact" conMensaje titulo={t["form.send"]} />
    </div>
  );
}
