/**
 * edge.ts — La segunda superficie pública del módulo, para el runtime EDGE.
 *
 * POR QUÉ DOS PUERTAS Y NO UNA. `index.ts` arrastra la instancia de Better
 * Auth, la conexión a PostgreSQL y `node:crypto`: nada de eso existe en el
 * runtime del middleware. Importar `index.ts` desde `middleware.ts` no da un
 * error de tipos, da un fallo en despliegue.
 *
 * QUÉ PUEDE VIVIR AQUÍ. Solo comprobaciones de **presencia y forma**, que es
 * exactamente lo que `architecture` §2.1 permite en el borde. Nada que consulte
 * la base de datos, nada que decida permisos. Si una función necesita saber si
 * la sesión es VÁLIDA, no pertenece a este archivo.
 */

import { getSessionCookie } from "better-auth/cookies";
import type { NextRequest } from "next/server";

/**
 * ¿Viene una cookie de sesión con forma de cookie de sesión?
 *
 * NO dice que la sesión exista, ni que no haya expirado, ni que no esté
 * revocada: eso lo comprueba el layout contra la base de datos (§2.4, paso 6).
 * Sirve para no renderizar de balde una superficie privada.
 */
export function tieneCookieDeSesion(request: NextRequest): boolean {
  return getSessionCookie(request) !== null;
}
