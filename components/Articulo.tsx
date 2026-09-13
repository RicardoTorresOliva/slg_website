import Link from "next/link";

import { prefijo, segmentoDeEtiqueta, type Articulo as Registro } from "@/lib/content/blog";
import { loadUiStrings } from "@/lib/content/loader";

import { Markdown } from "./Markdown";

/**
 * Un artículo.
 *
 * Wayfinding (C.6): **dónde estoy** — el título y la fecha; **a dónde puedo
 * ir** — sus etiquetas, que son navegación y no decoración; **cómo salgo** —
 * el enlace al índice, al final, que es donde se termina de leer.
 */
export function Articulo({ articulo, lang }: { articulo: Registro; lang: "es" | "en" }) {
  const t = loadUiStrings()[lang];
  const base = prefijo(lang);

  return (
    <article style={{ maxWidth: "44rem", margin: "0 auto", padding: "3rem 1.25rem 0" }} lang={lang}>
      <p style={meta}>
        {/* `<time>` con `dateTime`: la fecha es dato, no adorno. */}
        <time dateTime={articulo.fecha}>{articulo.fecha}</time>
        {" · "}
        {t["blog.by"]} {articulo.autor}
      </p>

      <h1 style={titulo}>{articulo.titulo}</h1>
      <p style={entradilla}>{articulo.descripcion}</p>

      <Markdown texto={articulo.cuerpo} />

      {articulo.etiquetas.length > 0 ? (
        <nav aria-label={t["blog.tags"]} style={{ paddingTop: "2rem" }}>
          <ul style={listaEtiquetas}>
            {articulo.etiquetas.map((e) => (
              <li key={e}>
                <Link
                  href={`${base}/blog/${segmentoDeEtiqueta(lang)}/${paraUrlLocal(e)}`}
                  style={pastilla}
                >
                  {e}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      <p style={{ padding: "2rem 0 3rem" }}>
        <Link href={`${base}/blog`} style={{ color: "var(--slg-link)", fontSize: "0.9375rem" }}>
          {t["blog.backToIndex"]}
        </Link>
      </p>
    </article>
  );
}

/** La misma normalización que `lib/content/blog.ts`, para no importar de más. */
function paraUrlLocal(etiqueta: string): string {
  return etiqueta
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const meta: React.CSSProperties = {
  margin: 0,
  fontSize: "0.8125rem",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "var(--slg-ink-2)",
};

const titulo: React.CSSProperties = {
  margin: "0.75rem 0 0",
  fontSize: "clamp(1.875rem, 5vw, 2.75rem)",
  lineHeight: 1.1,
  letterSpacing: "-0.02em",
  color: "var(--slg-blue-deep)",
  fontWeight: 700,
};

const entradilla: React.CSSProperties = {
  margin: "1rem 0 2rem",
  fontSize: "1.125rem",
  lineHeight: 1.6,
  color: "var(--slg-ink-2)",
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
