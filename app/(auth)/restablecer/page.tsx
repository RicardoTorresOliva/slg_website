import { loadUiStrings } from "@/lib/content/loader";

/**
 * `/restablecer?token=…` — la pantalla donde aterriza el enlace de recuperación.
 *
 * Existe porque el enlace que trae la librería apunta a una ruta que este
 * proyecto no tiene: sin esta página, el destinatario llega a un 404 **con el
 * testigo en la barra de direcciones**, que es la peor forma de gastar un
 * enlace de un solo uso.
 *
 * El testigo NO se valida aquí. Se valida al enviar, en el manejador: una
 * página que dice «este enlace ya no vale» antes de que nadie escriba nada
 * convierte la pantalla en un comprobador de testigos.
 */
export const metadata = {
  title: "Restablecer · SLG Agency",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function Restablecer({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  const t = loadUiStrings().es;

  if (!token) {
    return (
      <>
        <h1 style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>{t["auth.reset.title"]}</h1>
        <p role="alert" style={{ fontSize: "0.9375rem" }}>
          {t["auth.recover.expired"]}
        </p>
      </>
    );
  }

  return (
    <>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>{t["auth.reset.title"]}</h1>
      {error ? (
        <p role="alert" style={{ fontSize: "0.9375rem", marginBottom: "1rem" }}>
          {t["auth.recover.expired"]}
        </p>
      ) : null}
      <form
        method="post"
        action="/api/acceso/restablecer"
        style={{ display: "grid", gap: "1rem" }}
      >
        <input type="hidden" name="token" value={token} />
        <label style={{ display: "grid", gap: "0.375rem" }}>
          <span style={{ fontSize: "0.875rem" }}>{t["auth.reset.newPassword"]}</span>
          <input
            type="password"
            name="password"
            required
            minLength={12}
            autoComplete="new-password"
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
          {t["auth.reset.submit"]}
        </button>
      </form>
    </>
  );
}
