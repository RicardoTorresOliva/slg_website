import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { PantallaDeApp } from "@/components/app/PantallaDeApp";
import { ErrorDeAutorizacion, exigirSuperficie, SinSesion } from "@/lib/auth";

/**
 * Armazón del portal de clientes — verificación autoritativa (§2.4, paso 6).
 *
 * Un paso más que HQ: además del rol, exige **pertenencia activa a una empresa
 * de tipo `client`**. Un usuario cliente sin empresa activa no tiene portal que
 * ver, y la respuesta es 404, no un portal vacío.
 *
 * HOY DEVUELVE 404 A TODO EL MUNDO (RF-87): M4 sigue abierto. Se abre
 * cambiando `SUPERFICIES_ABIERTAS.portal` en `lib/auth/roles.ts`.
 */
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  let sesion;
  try {
    sesion = await exigirSuperficie("portal");
  } catch (e) {
    if (e instanceof SinSesion) redirect("/acceder");
    if (e instanceof ErrorDeAutorizacion) notFound();
    throw e;
  }

  const ruta = (await headers()).get("x-slg-ruta") ?? "/portal";

  return (
    <PantallaDeApp
      superficie="portal"
      ruta={ruta}
      sesion={{ ctx: sesion.ctx, locale: sesion.locale, nombre: sesion.nombre }}
    >
      {children}
    </PantallaDeApp>
  );
}
