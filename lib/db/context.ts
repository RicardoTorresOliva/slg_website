/**
 * context.ts — El contexto autenticado de una petición.
 *
 * REGLA CENTRAL DEL AISLAMIENTO (RF-71, R-10, DoD #5):
 * `organizationId` sale SIEMPRE de aquí y NUNCA de un parámetro de la petición.
 * El id que llega por la ruta o el cuerpo es entrada del usuario; usarlo como
 * filtro es confiar en el atacante.
 *
 * Este objeto solo se construye desde una sesión verificada o una clave de API
 * verificada. Las dos funciones constructoras son las únicas puertas, y ambas
 * están en este archivo para que la revisión tenga un solo sitio que mirar.
 */

import type { ApiScope, UserRole } from "./schema.ts";

/**
 * Marca de tipo. Impide fabricar un contexto con un objeto literal desde el
 * código de una ruta: `withScope({ organizationId: req.params.id, ... })` no
 * compila, porque falta esta propiedad y no se puede escribir a mano.
 */
/**
 * Símbolo REAL, privado del módulo. No se exporta, así que fuera de este
 * archivo no hay forma de escribir la propiedad: `withScope({ organizationId:
 * req.params.id, ... })` no compila, porque falta una clave que no se puede
 * nombrar.
 *
 * Fue `declare const` hasta FU-06, y eso era un error: `declare` solo existe en
 * el espacio de tipos, así que en tiempo de EJECUCIÓN la constante no existía y
 * las dos constructoras reventaban con `ReferenceError` en su primera línea.
 * No se notó porque hasta FU-06 nadie las llamaba: la prueba de FU-04
 * comprobaba que el caso hostil no COMPILA, que es otra cosa. Con `const` +
 * `Symbol()` TypeScript sigue infiriendo `unique symbol` y la garantía de tipos
 * es idéntica, pero además la función funciona.
 */
const verificado: unique symbol = Symbol("AuthContext verificado");

export type AuthContext = {
  readonly [verificado]: true;
  /** De la sesión o de la clave. Jamás de la petición. */
  readonly organizationId: string | null;
  readonly actorType: "user" | "api_key";
  readonly actorId: string;
  readonly actorLabel: string;
  readonly actorRole: UserRole | "agent";
  readonly scopes: readonly ApiScope[];
};

/** Roles que operan por encima de una sola empresa (B.3). */
export function esActorDeSLG(ctx: AuthContext): boolean {
  return ctx.actorRole === "slg_admin" || ctx.actorRole === "slg_operator";
}

/**
 * Construye el contexto a partir de una sesión ya verificada.
 * Lo llama la capa de autenticación (FU-06), nunca una ruta.
 */
export function contextoDeSesion(input: {
  userId: string;
  userName: string;
  role: UserRole;
  /** Pertenencia resuelta en base de datos, no enviada por el cliente. */
  organizationId: string | null;
}): AuthContext {
  return {
    [verificado]: true,
    organizationId: input.organizationId,
    actorType: "user",
    actorId: input.userId,
    actorLabel: input.userName,
    actorRole: input.role,
    scopes: [],
  } as AuthContext;
}

/**
 * Construye el contexto a partir de una clave de API ya verificada.
 * La empresa es la que la clave tiene asignada: una clave no puede pedir otra.
 */
export function contextoDeClaveApi(input: {
  apiKeyId: string;
  name: string;
  organizationId: string | null;
  scopes: readonly ApiScope[];
}): AuthContext {
  return {
    [verificado]: true,
    organizationId: input.organizationId,
    actorType: "api_key",
    actorId: input.apiKeyId,
    actorLabel: input.name,
    actorRole: "agent",
    scopes: input.scopes,
  } as AuthContext;
}
