import { headers as nextHeaders } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "../../../../../lib/auth/config.ts";
import { completarAceptacionInvitacion } from "../../../../../lib/auth/invitations.ts";
import { superficieDeRol } from "../../../../../lib/auth/permissions.ts";
import { loadUiStrings } from "../../../../../lib/content/loader.ts";
import { ConfirmarCorreo } from "./confirmar-correo.tsx";

/**
 * Destino de `callbackURL` tras Google/Microsoft (FU-07, criterio 2). Better
 * Auth ya dejó la sesión puesta (cookie real, vía `nextCookies()` en `auth`)
 * antes de traer al usuario aquí — esta página solo liga esa sesión, ya
 * autenticada, a la invitación.
 */
export default async function CompletarInvitacion({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const t = loadUiStrings().es;

  const sesion = await auth.api.getSession({ headers: await nextHeaders() });
  if (!sesion?.user) redirect(`/invitacion/${token}`);

  const resultado = await completarAceptacionInvitacion(token, {
    userId: sesion.user.id,
    email: sesion.user.email,
    emailVerified: sesion.user.emailVerified,
  });

  if (resultado.ok) {
    redirect(superficieDeRol(resultado.role));
  }

  if (resultado.razon === "correo_no_coincide") {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6">
        <p className="text-ink-2">{t["invitation.confirmEmail.label"]}</p>
        <ConfirmarCorreo token={token} strings={t} />
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-3 px-6">
      <h1 className="text-xl font-semibold text-ink">{t["invitation.invalid.title"]}</h1>
      <p className="text-ink-2">{t["invitation.invalid.body"]}</p>
    </main>
  );
}
