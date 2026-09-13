import Link from "next/link";

import { loadCollection, loadUiStrings } from "@/lib/content/loader";

import { HeroTipografico } from "./piezas";

/**
 * `/descargas` — la biblioteca (DU-08, criterio 2).
 *
 * Lista los documentos con su **estado**: `available` o `coming-soon`. Los
 * `draft` **no se listan** (RF-29), igual que en el blog y por lo mismo: un
 * borrador publicado por accidente es material sin revisar con nuestra firma.
 */
export function BibliotecaDeDescargas({ lang }: { lang: "es" | "en" }) {
  const t = loadUiStrings()[lang];
  const pagina = loadCollection<{ title: string; description: string }>("page", lang).find(
    (p) => p.slug === (lang === "en" ? "downloads" : "descargas"),
  );
  const documentos = loadCollection<{
    title: string;
    audience: string;
    status: string;
  }>("download", lang).filter((d) => d.data.status !== "draft");

  const base = lang === "en" ? "/en/downloads" : "/descargas";

  return (
    <div style={{ maxWidth: "72rem", margin: "0 auto", padding: "0 1.25rem 4rem" }}>
      <HeroTipografico titular={pagina?.data.title ?? ""} apoyo={pagina?.data.description ?? ""} />

      {documentos.length === 0 ? (
        // Criterio 10: biblioteca vacía, resuelta con texto.
        <p style={{ color: "var(--slg-ink-2)" }}>{t["downloads.empty"]}</p>
      ) : (
        <ul style={rejilla}>
          {documentos.map((d) => (
            <li key={d.slug} style={{ listStyle: "none" }}>
              <article className="slg-card" style={tarjeta}>
                <p style={estado}>
                  {d.data.status === "available" ? t["downloads.available"] : t["download.comingSoon"]}
                </p>
                <h2 style={titulo}>
                  <Link href={`${base}/${d.slug}`} style={{ color: "inherit", textDecoration: "none" }}>
                    {d.data.title}
                  </Link>
                </h2>
                <p style={texto}>{d.data.audience}</p>
              </article>
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
  margin: 0,
  padding: 0,
};

const tarjeta: React.CSSProperties = {
  background: "var(--slg-paper)",
  border: "1px solid var(--slg-line)",
  borderRadius: "var(--slg-radius-lg)",
  padding: "1.5rem",
  height: "100%",
};

const estado: React.CSSProperties = {
  margin: "0 0 0.5rem",
  fontSize: "0.75rem",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--slg-blue-primary)",
};

const titulo: React.CSSProperties = {
  margin: "0 0 0.5rem",
  fontSize: "1.125rem",
  lineHeight: 1.25,
  color: "var(--slg-blue-deep)",
  fontWeight: 700,
};

const texto: React.CSSProperties = { margin: 0, color: "var(--slg-ink-2)", fontSize: "0.9375rem" };
