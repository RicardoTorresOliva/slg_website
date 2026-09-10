/**
 * org.ts — Resolución de empresa y compuertas de superficie, sin Next.
 *
 * Separado de `session.ts` a propósito: `session.ts` importa `next/headers`,
 * que solo resuelve dentro del runtime de Next. Todo lo de aquí es Postgres y
 * funciones puras, así que `scripts/db/test-auth.ts` lo prueba directamente
 * contra la base real sin levantar un servidor (`test-staging-auth.ts` sí lo
 * necesita, porque lo que prueba es HTTP; esto no).
 */
import { eq } from "drizzle-orm";

import { esActorDeSLG, type AuthContext } from "../db/context.ts";
import { withSystemScope } from "../db/scope.ts";
import { membership } from "../db/schema.ts";

/**
 * Un usuario cliente pertenece, como mucho, a una empresa (D-52 lo asume; el
 * `uq_membership_user_org` de FU-04 no lo impone por sí solo, pero ninguna
 * unidad crea una segunda fila). Si alguna vez apareciera más de una, se toma
 * la primera y se registra — no se mezclan dos empresas en un solo contexto.
 *
 * Corre con `withSystemScope`, no con una conexión sin contexto: `membership`
 * está en `ORG_SCOPED_TABLES` (0001), y la política de 0001 exige
 * `organization_id` para leer — que es precisamente lo que esta función
 * resuelve. Sin la política adicional de 0006 (`pol_membership_resolucion_sistema`,
 * solo lectura), ningún `client_*` habría resuelto nunca su propia empresa:
 * hueco real, encontrado por `scripts/db/test-auth.ts` sección E.
 */
export async function organizacionDelUsuario(userId: string): Promise<string | null> {
  return withSystemScope("resolver la empresa del usuario autenticado", async (db) => {
    const filas = await db
      .select({ organizationId: membership.organizationId })
      .from(membership)
      .where(eq(membership.userId, userId))
      .limit(1);
    return filas[0]?.organizationId ?? null;
  });
}

export type Superficie = "hq" | "portal";

export type ResultadoDeGate =
  | { tipo: "ok"; ctx: AuthContext }
  | { tipo: "sin_sesion" }
  | { tipo: "no_encontrado" };

/**
 * Las comprobaciones ordenadas de `architecture.md` §2 para `hq`/`portal`,
 * ya con el contexto resuelto. Función pura — sin ella, probar el orden de
 * las comprobaciones exigiría una sesión de Better Auth real por caso.
 */
export function evaluarSuperficie(ctx: AuthContext | null, superficie: Superficie): ResultadoDeGate {
  if (!ctx) return { tipo: "sin_sesion" };

  const esSLG = esActorDeSLG(ctx);
  if (superficie === "hq" && !esSLG) return { tipo: "no_encontrado" }; // D-38: 404, no 403
  if (superficie === "portal" && esSLG) return { tipo: "no_encontrado" };
  // `portal`: además de no ser SLG, necesita pertenencia activa a una
  // empresa `client` — sin eso no hay nada que mostrarle (RF-71).
  if (superficie === "portal" && !ctx.organizationId) return { tipo: "no_encontrado" };

  return { tipo: "ok", ctx };
}

/** `/hq/claves` y `/hq/auditoria`: exclusivas de `slg_admin` (B.3, filas 4 y 9). */
export function exigirSlgAdmin(ctx: AuthContext): boolean {
  return ctx.actorRole === "slg_admin";
}
