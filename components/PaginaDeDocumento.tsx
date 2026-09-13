import Link from "next/link";

import { NOMBRE_DEL_CAMPO_TRAMPA } from "@/lib/antiabuso";
import { loadCollection, loadUiStrings } from "@/lib/content/loader";

import { BloqueQueIncluye, HeroTipografico } from "./piezas";

/**
 * La página de un documento, con **su formulario de captura** (DU-08).
 *
 * **El formulario es HTML nativo y se envía con POST**, sin JavaScript de por
 * medio: funciona con el JS desactivado, funciona mientras la página hidrata, y
 * no cuesta un byte del presupuesto del gate D1. Es la misma decisión que
 * DU-01 tomó para el acceso.
 *
 * **El campo trampa va aquí dentro**, oculto con tres cosas a la vez —fuera de
 * la vista, fuera del tabulador y sin autocompletado—: `display:none` a secas
 * lo saltan algunos rellenadores automáticos, y entonces la trampa la pisa una
 * persona real.
 *
 * **El enlace a la política de privacidad es obligatorio** (RF-36, criterio 3
 * de DU-06): el consentimiento se guarda con su versión, y el visitante tiene
 * que poder leer a qué está consintiendo antes de enviarlo.
 */
export function PaginaDeDocumento({ slug, lang }: { slug: string; lang: "es" | "en" }) {
  const t = loadUiStrings()[lang];
  const doc = loadCollection<{
    title: string;
    audience: string;
    learns: readonly string[];
    status: string;
  }>("download", lang).find((d) => d.slug === slug);

  if (!doc) return <p style={{ padding: "4rem 1.25rem" }}>{t["downloads.notFound"]}</p>;

  const privacidad = lang === "en" ? "/en/legal/privacy" : "/legal/privacidad";
  const disponible = doc.data.status === "available";

  return (
    <div style={{ maxWidth: "44rem", margin: "0 auto", padding: "0 1.25rem 4rem" }} lang={lang}>
      <HeroTipografico titular={doc.data.title} apoyo={doc.data.audience} />

      <section style={{ padding: "1rem 0 2rem" }}>
        <h2 style={titulo}>{t["downloads.learn"]}</h2>
        <BloqueQueIncluye elementos={doc.data.learns ?? []} />
      </section>

      <form method="post" action="/api/descargas" style={caja}>
        <input type="hidden" name="documento" value={slug} />
        <input type="hidden" name="idioma" value={lang} />

        {/* El campo trampa. Invisible para una persona, irresistible para un bot. */}
        <div aria-hidden="true" style={trampa}>
          <label htmlFor={NOMBRE_DEL_CAMPO_TRAMPA}>{NOMBRE_DEL_CAMPO_TRAMPA}</label>
          <input
            id={NOMBRE_DEL_CAMPO_TRAMPA}
            name={NOMBRE_DEL_CAMPO_TRAMPA}
            type="text"
            tabIndex={-1}
            autoComplete="off"
            defaultValue=""
          />
        </div>

        <label htmlFor="email" style={etiqueta}>
          {t["download.emailLabel"]}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          style={campo}
        />

        <button type="submit" style={boton}>
          {disponible ? t["download.cta"] : t["download.comingSoon"]}
        </button>

        <p style={aviso}>
          {t["downloads.privacy"]}{" "}
          <Link href={privacidad} style={{ color: "var(--slg-link)" }}>
            {t["downloads.privacyLink"]}
          </Link>
        </p>
      </form>
    </div>
  );
}

const titulo: React.CSSProperties = {
  margin: "0 0 0.5rem",
  fontSize: "1.25rem",
  color: "var(--slg-blue-deep)",
  fontWeight: 700,
};

const caja: React.CSSProperties = {
  background: "var(--slg-paper-2)",
  border: "1px solid var(--slg-line)",
  borderRadius: "var(--slg-radius-lg)",
  padding: "1.75rem",
  display: "grid",
  gap: "0.5rem",
};

/**
 * Fuera de la vista sin salir del documento. `display:none` lo saltan algunos
 * rellenadores; así el bot lo ve y la persona no.
 */
const trampa: React.CSSProperties = {
  position: "absolute",
  left: "-9999px",
  width: "1px",
  height: "1px",
  overflow: "hidden",
};

const etiqueta: React.CSSProperties = {
  fontSize: "0.9375rem",
  fontWeight: 600,
  color: "var(--slg-ink)",
};

const campo: React.CSSProperties = {
  padding: "0.75rem",
  border: "1px solid var(--slg-line)",
  borderRadius: "var(--slg-radius-sm)",
  font: "inherit",
  fontSize: "1rem",
  background: "var(--slg-paper)",
  color: "var(--slg-ink)",
};

const boton: React.CSSProperties = {
  marginTop: "0.5rem",
  background: "var(--slg-red)",
  color: "var(--slg-paper)",
  padding: "0.8125rem 1.25rem",
  border: "none",
  borderRadius: "var(--slg-radius-sm)",
  font: "inherit",
  fontSize: "0.9375rem",
  fontWeight: 600,
  cursor: "pointer",
};

const aviso: React.CSSProperties = {
  margin: "0.25rem 0 0",
  fontSize: "0.8125rem",
  color: "var(--slg-ink-2)",
};
