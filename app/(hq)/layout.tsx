import { notFound, redirect } from "next/navigation";

import { ErrorDeAutorizacion, exigirSuperficie, SinSesion } from "@/lib/auth";

/**
 * Armazón de HQ — la verificación AUTORITATIVA (architecture §2.4, paso 6).
 *
 * El middleware ya miró si la cookie está y tiene forma. Esto es lo otro: la
 * sesión existe, no expiró, no fue revocada, el rol corresponde a esta
 * superficie y la ruta no es de `slg_admin` estando el rol en `slg_operator`.
 * **Si el middleware y esto discrepan, manda esto.**
 *
 * La duplicación es intencionada: una ruta que escape al emparejado del
 * middleware sigue protegida por aquí.
 *
 * HOY DEVUELVE 404 A TODO EL MUNDO (RF-87, criterio 5): M3 sigue abierto, así
 * que HQ no existe ni con sesión válida y no se enlaza desde ninguna
 * superficie. Se abre cambiando `SUPERFICIES_ABIERTAS.hq` en
 * `lib/auth/roles.ts`, no borrando esta comprobación.
 *
 * Las pantallas de HQ son de M3 (FU-12 en adelante). Aquí no hay interfaz
 * todavía, y eso es correcto: la compuerta se construye antes que lo que
 * protege.
 */
export default async function HqLayout({ children }: { children: React.ReactNode }) {
  try {
    await exigirSuperficie("hq");
  } catch (e) {
    // Sin sesión no es una fuga: cualquiera sabe que existe un login.
    if (e instanceof SinSesion) redirect("/acceder");
    // Todo lo demás es 404, nunca 403 (D-38, RF-95): un 403 confirmaría que la
    // ruta existe, y el mapa de HQ no es información pública.
    if (e instanceof ErrorDeAutorizacion) notFound();
    throw e;
  }

  return <>{children}</>;
}
