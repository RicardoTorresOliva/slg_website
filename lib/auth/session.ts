/**
 * session.ts — De una sesión de Better Auth a un `AuthContext` verificado.
 *
 * Única puerta de entrada para HQ y portal (R-19). La resolución de empresa y
 * las compuertas de superficie viven en `org.ts` (sin dependencia de Next);
 * este archivo es la fachada que sí depende de `next/headers`.
 */
import { headers as nextHeaders } from "next/headers";

import { auth } from "./config.ts";
import { organizacionDelUsuario, evaluarSuperficie, type Superficie, type ResultadoDeGate } from "./org.ts";
import { contextoDeSesion, esActorDeSLG, type AuthContext } from "../db/context.ts";
import type { UserRole } from "../db/schema.ts";

export { organizacionDelUsuario, evaluarSuperficie, exigirSlgAdmin } from "./org.ts";
export type { Superficie, ResultadoDeGate } from "./org.ts";

/**
 * Resuelve el `AuthContext` de la petición actual, o `null` si no hay sesión
 * válida. No lanza: quien llama decide qué hacer con `null` (redirigir,
 * devolver 401, lo que corresponda a su superficie).
 */
export async function contextoActual(cabecerasExplicitas?: Headers): Promise<AuthContext | null> {
  const cabeceras = cabecerasExplicitas ?? (await nextHeaders());
  const sesion = await auth.api.getSession({ headers: cabeceras });
  if (!sesion?.user) return null;

  const rol = sesion.user.role as UserRole;
  const organizationId = esActorDeSLG({ actorRole: rol } as AuthContext)
    ? null
    : await organizacionDelUsuario(sesion.user.id);

  return contextoDeSesion({
    userId: sesion.user.id,
    userName: sesion.user.name,
    role: rol,
    organizationId,
  });
}

/** Envoltorio de `evaluarSuperficie` (`org.ts`) que resuelve el contexto desde la petición actual. */
export async function exigirSuperficie(superficie: Superficie): Promise<ResultadoDeGate> {
  return evaluarSuperficie(await contextoActual(), superficie);
}
