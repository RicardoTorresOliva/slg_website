import Link from "next/link";

import { loadCollection, loadUiStrings } from "@/lib/content/loader";

import { HeroTipografico } from "./piezas";

/**
 * `/gracias` — donde aterriza el visitante con su enlace (RF-42).
 *
 * Tres estados, los tres redactados (criterio 10):
 *   · con enlace — el documento existe y la firma se emitió;
 *   · «próximamente» — se capturó el correo y no hay archivo todavía (RF-40);
 *   · sin nada — alguien llegó a esta URL de frente, y no se le deja en blanco.
 *
 * **El enlace NO se abre solo.** Un `<meta refresh>` o un `location.href` aquí
 * dispararía la descarga sin que el visitante lo pidiera, y en un móvil eso es
 * un archivo que aparece sin contexto. Se muestra el botón, y lo pulsa él.
 */
export function PaginaDeGracias({
  lang,
  url,
  doc,
  estado,
}: {
  lang: "es" | "en";
  url?: string;
  doc?: string;
  estado?: string;
}) {
  const t = loadUiStrings()[lang];
  const pagina = loadCollection<{ title: string; description: string }>("page", lang).find(
    (p) => p.slug === (lang === "en" ? "thank-you" : "gracias"),
  );
  const documento = doc
    ? loadCollection<{ title: string }>("download", lang).find((d) => d.slug === doc)
    : undefined;
  const contacto = lang === "en" ? "/en/contact" : "/contacto";

  return (
    <div style={{ maxWidth: "44rem", margin: "0 auto", padding: "0 1.25rem 4rem" }} lang={lang}>
      <HeroTipografico titular={pagina?.data.title ?? ""} apoyo={pagina?.data.description ?? ""} />

      {url ? (
        <section style={caja}>
          <p style={etiqueta}>{t["thanks.linkTitle"]}</p>
          <p style={titulo}>{documento?.data.title ?? ""}</p>
          {/* Enlace directo al objeto firmado: es una URL de otro origen y
              caduca, así que no pasa por `next/link`. */}
          <a href={url} style={boton} rel="noopener">
            {t["thanks.linkCta"]}
          </a>
          <p style={aviso}>{t["thanks.expires"]}</p>
        </section>
      ) : estado === "proximamente" ? (
        <section style={caja}>
          <p style={{ margin: 0, color: "var(--slg-ink-2)" }}>{t["thanks.comingSoon"]}</p>
        </section>
      ) : null}

      <section style={{ paddingTop: "2rem" }}>
        <h2 style={{ ...titulo, fontSize: "1.125rem" }}>{t["thanks.next"]}</h2>
        <p style={{ color: "var(--slg-ink-2)" }}>
          <Link href={contacto} style={{ color: "var(--slg-link)" }}>
            {t["service.contact"]}
          </Link>
        </p>
      </section>
    </div>
  );
}

const caja: React.CSSProperties = {
  background: "var(--slg-paper-2)",
  border: "1px solid var(--slg-line)",
  borderRadius: "var(--slg-radius-lg)",
  padding: "1.75rem",
};

const etiqueta: React.CSSProperties = {
  margin: "0 0 0.25rem",
  fontSize: "0.75rem",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--slg-blue-primary)",
};

const titulo: React.CSSProperties = {
  margin: "0 0 1.25rem",
  fontSize: "1.25rem",
  color: "var(--slg-blue-deep)",
  fontWeight: 700,
};

const boton: React.CSSProperties = {
  display: "inline-block",
  background: "var(--slg-red)",
  color: "var(--slg-paper)",
  padding: "0.8125rem 1.25rem",
  borderRadius: "var(--slg-radius-sm)",
  textDecoration: "none",
  fontSize: "0.9375rem",
  fontWeight: 600,
};

const aviso: React.CSSProperties = {
  margin: "0.75rem 0 0",
  fontSize: "0.8125rem",
  color: "var(--slg-ink-2)",
};
