import { notFound, redirect } from "next/navigation";

import { exigirSuperficie } from "@/lib/auth/session";

/**
 * Compuerta del portal (FU-06, criterios 3 y 5). Ver `app/hq/layout.tsx`: mismo
 * patrón. `HABILITADO` lo pone en `true` DU-18 al construir el inicio real.
 */
const HABILITADO = false;

export default async function PortalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  if (!HABILITADO) notFound();

  const resultado = await exigirSuperficie("portal");
  if (resultado.tipo === "sin_sesion") redirect("/acceder");
  if (resultado.tipo === "no_encontrado") notFound();

  return <>{children}</>;
}
