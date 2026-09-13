import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { PantallaDeApp } from "@/components/app/PantallaDeApp";
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
 * DESDE FU-12 ESTE LAYOUT TAMBIÉN PONE EL ARMAZÓN. La compuerta sigue siendo lo
 * primero —el armazón se monta con la sesión ya verificada, nunca antes—, y por
 * eso el `try` envuelve solo a `exigirSuperficie`: si esto fallara, no habría
 * llegado a pintarse ni la barra lateral.
 *
 * Las pantallas siguen siendo de DU-13 en adelante. Lo que hay aquí es el marco
 * por el que se navegarán, con las tres preguntas de RNF-43 ya respondidas.
 */
export default async function HqLayout({ children }: { children: React.ReactNode }) {
  let sesion;
  try {
    sesion = await exigirSuperficie("hq");
  } catch (e) {
    // Sin sesión no es una fuga: cualquiera sabe que existe un login.
    if (e instanceof SinSesion) redirect("/acceder");
    // Todo lo demás es 404, nunca 403 (D-38, RF-95): un 403 confirmaría que la
    // ruta existe, y el mapa de HQ no es información pública.
    if (e instanceof ErrorDeAutorizacion) notFound();
    throw e;
  }

  // La ruta sale de la cabecera que pone el middleware en cada petición: el
  // layout no la recibe como prop, y sin ella la barra lateral no sabría cuál
  // de sus enlaces está activo — la respuesta a «dónde estoy» se quedaría
  // muda justo en la pantalla que la necesita.
  const ruta = (await headers()).get("x-slg-ruta") ?? "/hq";

  return (
    <PantallaDeApp
      superficie="hq"
      ruta={ruta}
      sesion={{ ctx: sesion.ctx, locale: sesion.locale, nombre: sesion.nombre }}
    >
      {children}
    </PantallaDeApp>
  );
}
