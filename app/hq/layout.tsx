import { notFound, redirect } from "next/navigation";

import { exigirSuperficie } from "@/lib/auth/session";

/**
 * Compuerta de HQ (FU-06, criterios 3 y 5).
 *
 * `HABILITADO = false` hasta que M3 (HQ) cierre — DU-13 lo pone en `true` al
 * construir el tablero real. Hasta entonces, `/hq` no existe para nadie, ni
 * siquiera con sesión válida de `slg_admin` (RF-87): "no enlazado en ninguna
 * superficie" no basta si la ruta responde igual al que la adivina.
 */
const HABILITADO = false;

export default async function HqLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  if (!HABILITADO) notFound();

  const resultado = await exigirSuperficie("hq");
  if (resultado.tipo === "sin_sesion") redirect("/acceder");
  if (resultado.tipo === "no_encontrado") notFound(); // D-38: nunca 403

  return <>{children}</>;
}
