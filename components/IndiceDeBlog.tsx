import Link from "next/link";

import { articulos, etiquetas, prefijo, segmentoDeEtiqueta } from "@/lib/content/blog";
import { loadUiStrings } from "@/lib/content/loader";

import { HeroTipografico, TarjetaDeArticulo } from "./piezas";

/**
 * Índice del blog y página de etiqueta: **la misma plantilla**, como manda
 * `ui_wireframes` §…; la de etiqueta solo añade de qué etiqueta se trata.
 *
 * Los borradores no aparecen aquí porque no aparecen en ninguna parte: lo
 * decide `status`, en `lib/content/blog.ts`, y no esta pantalla.
 */
export function IndiceDeBlog({
  lang,
  etiqueta,
}: {
  lang: "es" | "en";
  /** Cuando viene, esto es una página de etiqueta y no el índice. */
  etiqueta?: { nombre: string; url: string };
}) {
  const t = loadUiStrings()[lang];
  const todos = articulos(lang);
  const lista = etiqueta
    ? todos.filter((a) => a.etiquetas.some((e) => e.toLowerCase() === etiqueta.nombre.toLowerCase()))
    : todos;
  const nubes = etiquetas(lang);
  const base = prefijo(lang);

  return (
    <div style={{ maxWidth: "72rem", margin: "0 auto", padding: "0 1.25rem" }}>
      <HeroTipografico
        titular={etiqueta ? etiqueta.nombre : t["blog.title"]}
        apoyo={etiqueta ? t["blog.taggedWith"] : ""}
      />

      {nubes.length > 0 ? (
        <nav aria-label={t["blog.tags"]} style={{ paddingBottom: "2rem" }}>
          <ul style={listaEtiquetas}>
            {etiqueta ? (
              <li>
                <Link href={`${base}/blog`} style={pastilla}>
                  {t["blog.all"]}
                </Link>
              </li>
            ) : null}
            {nubes.map((e) => (
              <li key={e.url}>
                <Link
                  href={`${base}/blog/${segmentoDeEtiqueta(lang)}/${e.url}`}
                  aria-current={etiqueta?.url === e.url ? "page" : undefined}
                  style={{
                    ...pastilla,
                    borderColor: etiqueta?.url === e.url ? "var(--slg-blue-primary)" : "var(--slg-line)",
                  }}
                >
                  {e.etiqueta}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      {lista.length === 0 ? (
        <p style={{ color: "var(--slg-ink-2)", paddingBottom: "3rem" }}>
          {etiqueta ? t["blog.emptyTag"] : t["blog.empty"]}
        </p>
      ) : (
        <ul style={rejilla}>
          {lista.map((a) => (
            <li key={a.slug}>
              <TarjetaDeArticulo
                titulo={a.titulo}
                resumen={a.descripcion}
                fecha={a.fecha}
                href={`${base}/blog/${a.slug}`}
                etiquetas={a.etiquetas}
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

const listaEtiquetas: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "0.5rem",
  listStyle: "none",
  margin: 0,
  padding: 0,
};

const pastilla: React.CSSProperties = {
  display: "inline-block",
  padding: "0.3rem 0.7rem",
  border: "1px solid var(--slg-line)",
  borderRadius: "999px",
  fontSize: "0.8125rem",
  color: "var(--slg-ink-2)",
  textDecoration: "none",
};
