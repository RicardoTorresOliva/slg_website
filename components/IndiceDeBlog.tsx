import { loadCollection, loadUiStrings } from "@/lib/content/loader";

import { HeroTipografico, TarjetaDeArticulo } from "./piezas";

/**
 * Índice del blog — **solo el índice, y a propósito**.
 *
 * `/blog` es uno de los cinco destinos de RF-01, así que el marco de DU-02 no
 * puede apuntar a un 404. Lo que DU-02 construye es la ruta y su listado; el
 * resto del blog —artículo, etiquetas, RSS y borradores— es **DU-11**, y no se
 * adelanta aquí.
 *
 * **Los borradores no se listan.** `status: draft` no aparece en producción, ni
 * en el índice ni en ningún sitio (A.5): un borrador publicado por accidente es
 * un texto sin revisar con la firma de SLG encima.
 */
export function IndiceDeBlog({ lang }: { lang: "es" | "en" }) {
  const t = loadUiStrings()[lang];
  const articulos = loadCollection<{
    title: string;
    description: string;
    date: string;
    status?: string;
    tags?: readonly string[];
  }>("post", lang).filter((p) => p.data.status !== "draft");

  return (
    <div style={{ maxWidth: "72rem", margin: "0 auto", padding: "0 1.25rem" }}>
      <HeroTipografico titular={t["blog.title"]} apoyo="" />

      {articulos.length === 0 ? (
        <p style={{ color: "var(--slg-ink-2)", paddingBottom: "3rem" }}>{t["blog.empty"]}</p>
      ) : (
        <ul style={rejilla}>
          {articulos.map((a) => (
            <li key={a.slug}>
              <TarjetaDeArticulo
                titulo={a.data.title}
                resumen={a.data.description}
                fecha={a.data.date}
                href={`${lang === "en" ? "/en" : ""}/blog/${a.slug}`}
                etiquetas={a.data.tags ?? []}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const rejilla: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(18rem, 1fr))",
  gap: "1.25rem",
  listStyle: "none",
  margin: 0,
  padding: "0 0 3rem",
};
