import Link from "next/link";

import { NOMBRE_DEL_CAMPO_TRAMPA } from "@/lib/antiabuso";
import { loadUiStrings } from "@/lib/content/loader";

/**
 * El formulario público — **uno solo**, para contacto y para la solicitud de
 * Doctrina (DU-10).
 *
 * Es el mismo componente porque es la misma máquina: `POST` nativo, campo
 * trampa oculto, correo corporativo obligatorio y enlace a la política de
 * privacidad. Dos componentes habrían sido dos sitios donde olvidarse de la
 * trampa, y el que se olvida **no da ningún error**: simplemente deja pasar.
 */
export function FormularioPublico({
  lang,
  origen,
  conMensaje = false,
  titulo,
}: {
  lang: "es" | "en";
  origen: "contact" | "doctrine-request";
  /** `/contacto` pide un mensaje; la solicitud de Doctrina, no. */
  conMensaje?: boolean;
  titulo: string;
}) {
  const t = loadUiStrings()[lang];
  const privacidad = lang === "en" ? "/en/legal/privacy" : "/legal/privacidad";

  return (
    <form method="post" action="/api/contacto" style={caja} aria-label={titulo}>
      <input type="hidden" name="origen" value={origen} />
      <input type="hidden" name="idioma" value={lang} />

      {/* Campo trampa: invisible para una persona, irresistible para un bot. */}
      <div aria-hidden="true" style={trampa}>
        <label htmlFor={`${origen}-${NOMBRE_DEL_CAMPO_TRAMPA}`}>{NOMBRE_DEL_CAMPO_TRAMPA}</label>
        <input
          id={`${origen}-${NOMBRE_DEL_CAMPO_TRAMPA}`}
          name={NOMBRE_DEL_CAMPO_TRAMPA}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>

      <label htmlFor={`${origen}-nombre`} style={etiqueta}>
        {t["form.name"]}
      </label>
      <input id={`${origen}-nombre`} name="nombre" type="text" autoComplete="name" style={campo} />

      <label htmlFor={`${origen}-email`} style={etiqueta}>
        {t["download.emailLabel"]}
      </label>
      <input
        id={`${origen}-email`}
        name="email"
        type="email"
        required
        autoComplete="email"
        inputMode="email"
        style={campo}
      />

      {conMensaje ? (
        <>
          <label htmlFor={`${origen}-mensaje`} style={etiqueta}>
            {t["form.message"]}
          </label>
          <textarea id={`${origen}-mensaje`} name="mensaje" rows={5} style={{ ...campo, resize: "vertical" }} />
        </>
      ) : null}

      <button type="submit" style={boton}>
        {origen === "contact" ? t["form.send"] : t["doctrine.requestCta"]}
      </button>

      <p style={aviso}>
        {t["downloads.privacy"]}{" "}
        <Link href={privacidad} style={{ color: "var(--slg-link)" }}>
          {t["downloads.privacyLink"]}
        </Link>
      </p>
    </form>
  );
}

const caja: React.CSSProperties = {
  background: "var(--slg-paper-2)",
  border: "1px solid var(--slg-line)",
  borderRadius: "var(--slg-radius-lg)",
  padding: "1.75rem",
  display: "grid",
  gap: "0.5rem",
};

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
