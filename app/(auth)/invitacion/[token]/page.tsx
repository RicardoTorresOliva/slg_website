import { consultarTestigo } from "@/lib/invitations";
import { loadUiStrings } from "@/lib/content/loader";

import { PantallaDeAcceso } from "../../acceso";

/**
 * `/invitacion/[token]` — se sirve SIEMPRE, con o sin sesión.
 *
 * `architecture` §2.3 lo declara excepción del grupo `(auth)`: aceptar una
 * invitación puede exigir cambiar de identidad, así que redirigir a quien ya
 * tiene sesión le impediría aceptar una invitación dirigida a otra cuenta
 * (RF-61, RF-63).
 *
 * Un testigo inválido —inexistente, caducado, usado o revocado— da **el mismo
 * texto en los cuatro casos**. Distinguirlos le diría a quien prueba enlaces
 * cuáles existieron.
 */
export const metadata = {
  title: "Invitación · SLG Agency",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function AceptarInvitacion({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const t = loadUiStrings().es;
  const estado = await consultarTestigo(token);

  if (!estado.valido) {
    return (
      <>
        <h1 style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>
          {t["auth.invitation.title"]}
        </h1>
        <p role="alert" style={{ fontSize: "0.9375rem" }}>
          {t["auth.invitation.invalid"]}
        </p>
      </>
    );
  }

  const campo: React.CSSProperties = {
    padding: "0.625rem 0.75rem",
    border: "1px solid var(--slg-line)",
    font: "inherit",
    color: "inherit",
    background: "var(--slg-paper)",
  };

  return (
    <>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>{t["auth.invitation.title"]}</h1>
      <p style={{ color: "var(--slg-ink-2)", fontSize: "0.9375rem", marginBottom: "1.5rem" }}>
        {t["auth.invitation.intro"]}
      </p>

      <form
        method="post"
        action="/api/acceso/invitacion"
        style={{ display: "grid", gap: "1rem", marginBottom: "2rem" }}
      >
        <input type="hidden" name="token" value={token} />
        <p style={{ fontSize: "0.9375rem" }}>
          {t["auth.signin.email"]}: <strong>{estado.invitacion.email}</strong>
        </p>
        <label style={{ display: "grid", gap: "0.375rem" }}>
          <span style={{ fontSize: "0.875rem" }}>{t["auth.invitation.name"]}</span>
          <input type="text" name="nombre" required autoComplete="name" style={campo} />
        </label>
        <label style={{ display: "grid", gap: "0.375rem" }}>
          <span style={{ fontSize: "0.875rem" }}>{t["auth.signin.password"]}</span>
          <input
            type="password"
            name="password"
            required
            minLength={12}
            autoComplete="new-password"
            style={campo}
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
          {t["auth.invitation.submit"]}
        </button>
      </form>

      <p style={{ fontSize: "0.875rem", color: "var(--slg-ink-2)", marginBottom: "1rem" }}>
        {t["auth.invitation.orSignIn"]}
      </p>
      <PantallaDeAcceso lang="es" volver={`/invitacion/${token}`} />
    </>
  );
}
