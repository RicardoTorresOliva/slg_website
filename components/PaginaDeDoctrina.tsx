import { loadCollection, loadUiStrings } from "@/lib/content/loader";

import { FormularioPublico } from "./FormularioPublico";
import { Markdown } from "./Markdown";
import { HeroTipografico } from "./piezas";

/**
 * `/doctrina` — el resumen ejecutivo público, los tres pilares y el bloque
 * «documento completo a solicitud» (DU-06).
 *
 * **Las secciones salen de la colección `doctrine`, ordenadas por su campo
 * `order`.** Añadir una sección a la doctrina es añadir un `.md`: esta página
 * no sabe cuántas hay ni cómo se llaman.
 *
 * El bloque «documento completo a solicitud» **ya tiene su formulario** (DU-10):
 * produce un `lead_capture` con `source: doctrine-request` y recorre
 * exactamente el mismo camino que una descarga — misma validación, misma cola,
 * mismo aviso. Una sola máquina, tres puertas.
 */
export function PaginaDeDoctrina({ lang }: { lang: "es" | "en" }) {
  const t = loadUiStrings()[lang];
  const pagina = loadCollection<{ title: string; description: string }>("page", lang).find(
    (p) => p.slug === (lang === "en" ? "doctrine" : "doctrina"),
  );
  const secciones = loadCollection<{ title: string; order: number }>("doctrine", lang).sort(
    (a, b) => (a.data.order ?? 0) - (b.data.order ?? 0),
  );

  return (
    <div style={{ maxWidth: "44rem", margin: "0 auto", padding: "0 1.25rem 4rem" }} lang={lang}>
      <HeroTipografico titular={pagina?.data.title ?? ""} apoyo={pagina?.data.description ?? ""} />

      {secciones.map((s) => (
        <section key={s.slug} style={{ padding: "2rem 0", borderTop: "1px solid var(--slg-line)" }}>
          <h2 style={titulo}>{s.data.title}</h2>
          <Markdown texto={s.body} />
        </section>
      ))}

      {/* «Documento completo a solicitud» — su formulario es DU-10. */}
      <section style={caja} aria-labelledby="solicitud">
        <h2 id="solicitud" style={{ ...titulo, marginTop: 0 }}>
          {t["doctrine.requestTitle"]}
        </h2>
        <p style={{ margin: "0 0 1.25rem", color: "var(--slg-ink-2)" }}>{t["doctrine.requestIntro"]}</p>
        <FormularioPublico
          lang={lang}
          origen="doctrine-request"
          titulo={t["doctrine.requestTitle"]}
        />
      </section>
    </div>
  );
}

const titulo: React.CSSProperties = {
  margin: "0 0 1rem",
  fontSize: "1.375rem",
  color: "var(--slg-blue-deep)",
  fontWeight: 700,
};

const caja: React.CSSProperties = {
  marginTop: "2.5rem",
  background: "var(--slg-paper-2)",
  border: "1px solid var(--slg-line)",
  borderRadius: "var(--slg-radius-lg)",
  padding: "1.75rem",
};
