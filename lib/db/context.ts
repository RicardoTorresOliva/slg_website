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
 * Quién puede **cruzar empresas** (DU-22).
 *
 * Los dos roles de SLG, y además la **clave de API sin empresa**: que
 * `api_key.organization_id` sea nulo es, por definición, «esta clave es de SLG y
 * su universo son todas las empresas» (`api_contracts` §2.3). Sin esto,
 * `GET /organizations` —que es una consulta que cruza— devolvía cero.
 *
 * Es la MISMA lista que la política de fila de la migración 0015 (`slg_admin`,
 * `slg_operator`, `agent_slg`), escrita dos veces a propósito: la de la base
 * decide qué filas salen y esta decide si la petición sigue. Si divergieran, la
 * que manda es la de la base — y `test:api` comprueba las dos.
 */
export function cruzaEmpresas(ctx: AuthContext): boolean {
  if (esActorDeSLG(ctx)) return true;
  return ctx.actorType === "api_key" && ctx.organizationId === null;
}

/** La marca de rol que `withScope` fija en la transacción. Ver migración 0015. */
export function marcaDeRol(ctx: AuthContext): string {
  return ctx.actorType === "api_key" && ctx.organizationId === null ? "agent_slg" : ctx.actorRole;
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
