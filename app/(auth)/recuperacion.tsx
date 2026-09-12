import { loadUiStrings } from "@/lib/content/loader";

/**
 * Recuperación de contraseña, compartida por `/recuperar` y `/en/recover`.
 *
 * **La respuesta es siempre la misma** (RF-59): «si ese correo corresponde a una
 * cuenta, el enlace ya va en camino». Decir «no existe» convierte esta pantalla
 * en el mismo verificador de correos que evitamos en `/acceder`, y encima uno
 * que nadie vigila porque «solo es la recuperación».
 */
export function PantallaDeRecuperacion({
  lang,
  estado,
}: {
  lang: "es" | "en";
  estado?: string;
}) {
  const t = loadUiStrings()[lang];

  return (
    <>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>{t["auth.recover.title"]}</h1>

      {estado === "enviado" ? (
        <p role="status" style={{ fontSize: "0.9375rem" }}>
          {t["auth.recover.sent"]}
        </p>
      ) : (
        <>
          <p style={{ color: "var(--slg-ink-2)", fontSize: "0.9375rem", marginBottom: "1.5rem" }}>
            {t["auth.recover.intro"]}
          </p>
          {estado === "bloqueado" ? (
            <p role="alert" style={{ fontSize: "0.9375rem", marginBottom: "1rem" }}>
              {t["auth.signin.locked"]}
            </p>
          ) : null}
          <form
            method="post"
            action="/api/acceso/recuperar"
            style={{ display: "grid", gap: "1rem" }}
          >
            <input type="hidden" name="lang" value={lang} />
            <label style={{ display: "grid", gap: "0.375rem" }}>
              <span style={{ fontSize: "0.875rem" }}>{t["auth.signin.email"]}</span>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                style={{
                  padding: "0.625rem 0.75rem",
                  border: "1px solid var(--slg-line)",
                  font: "inherit",
                  color: "inherit",
                  background: "var(--slg-paper)",
                }}
              />
            </label>
            <button
              type="submit"
              style={{
                padding: "0.625rem 1rem",
                border: "1px solid var(--slg-line)",
                background: "var(--slg-paper)",
                font: "inherit",
                color: "inherit",
                cursor: "pointer",
              }}
            >
              {t["auth.recover.submit"]}
            </button>
          </form>
        </>
      )}
    </>
  );
}
