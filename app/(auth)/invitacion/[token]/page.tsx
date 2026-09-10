import { buscarInvitacionVigente } from "../../../../lib/auth/invitations.ts";
import { loadUiStrings } from "../../../../lib/content/loader.ts";
import { FormularioAceptacion } from "./formulario-aceptacion.tsx";

/**
 * `/invitacion/[token]` — FU-07, criterios 1 y 2.
 *
 * Página mínima a propósito (FU es fundacional; DU-14/DU-21 son la emisión
 * real desde HQ/portal). Mensaje NEUTRO si el token no es válido: no dice si
 * caducó, se usó o nunca existió (criterio 1, RNF-32).
 */
export default async function PaginaInvitacion({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invitacion = await buscarInvitacionVigente(token);
  const t = loadUiStrings().es;

  if (!invitacion) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-3 px-6">
        <h1 className="text-xl font-semibold text-ink">{t["invitation.invalid.title"]}</h1>
        <p className="text-ink-2">{t["invitation.invalid.body"]}</p>
      </main>
    );
  }

  const hayGoogle = !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;
  const hayMicrosoft = !!process.env.MICROSOFT_CLIENT_ID && !!process.env.MICROSOFT_CLIENT_SECRET;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">
          {t["invitation.title"].replace("{{organizationName}}", invitacion.organizationName)}
        </h1>
        <p className="mt-1 text-ink-2">
          {t["invitation.subtitle"].replace("{{email}}", invitacion.email)}
        </p>
      </div>
      <FormularioAceptacion
        token={token}
        strings={t}
        hayGoogle={hayGoogle}
        hayMicrosoft={hayMicrosoft}
      />
    </main>
  );
}
