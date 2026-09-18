/**
 * scope.ts — La ÚNICA puerta de acceso a datos de cliente.
 *
 * El cliente crudo de Drizzle no se exporta desde este módulo ni desde ningún
 * otro. Todo acceso pasa por `withScope`, que abre una transacción, fija
 * `app.organization_id` y `app.actor_role` dentro de ella, y deja que las
 * políticas de fila de PostgreSQL hagan el resto.
 *
 * POR QUÉ ASÍ (R-10, DoD #5, gate D9). Un filtro que hay que acordarse de
 * escribir se olvida alguna vez, y la consulta que lo olvida devuelve **todas**
 * las filas. Aquí el olvido devuelve **cero**: la política compara contra una
 * variable de sesión que, sin fijar, es NULL, y NULL no coincide con nada.
 *
 * Verificado contra PostgreSQL real en FU-04:
 *   · sin contexto            → 0 filas
 *   · contexto de otra empresa → 0 filas
 *   · escritura en otra empresa → rechazada por la política
 */

import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import postgres from "postgres";

import { type AuthContext, cruzaEmpresas, marcaDeRol } from "./context.ts";
import * as schema from "./schema.ts";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "Falta DATABASE_URL. Los valores viven en `.env` (ignorado por git) o en las " +
      "variables de entorno de Easypanel. Ver `.env.example` para los nombres.",
  );
}

/**
 * Conexión. Deliberadamente NO exportada: si alguien puede importarla, puede
 * saltarse el aislamiento sin darse cuenta.
 */
const conexion = postgres(process.env.DATABASE_URL, {
  /**
   * TRES, NO DIEZ. La base está detrás del *pooler* de Supabase, y el tramo
   * gratuito limita a **15 clientes en total** — no por instancia: en total,
   * sumando producción, las vistas previas y cada instancia que la plataforma
   * levante. Con 10 aquí y 5 en `lib/auth/db.ts`, **una sola instancia** agotaba
   * el cupo y la segunda petición concurrente moría con `EMAXCONNSESSION` y un
   * 500 (visto el 2026-09-18 en `/hq/capturas`). Tres y dos dejan sitio a tres
   * instancias; el *pooler* en modo transacción (puerto 6543) quita el límite.
   */
  max: 3,
  // Las consultas van siempre parametrizadas (RNF-30). `postgres` lo hace por
  // defecto con plantillas etiquetadas; no se construye SQL por concatenación.
  //
  // `prepare: false` porque el *pooler* en modo transacción no admite sentencias
  // preparadas con nombre: cada transacción puede caer en una conexión distinta
  // y la sentencia preparada en una no existe en la otra. La parametrización no
  // depende de esto: sigue yendo por el protocolo extendido, sin concatenar.
  prepare: false,
});

const db = drizzle(conexion, { schema });

/** El cliente que recibe el callback: transaccional y ya con contexto fijado. */
export type ScopedDb = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Ejecuta trabajo dentro del alcance de un contexto autenticado.
 *
 * La firma NO admite un `organizationId` suelto: sale de `ctx`, y `ctx` solo se
 * construye desde una sesión o una clave verificadas (`lib/db/context.ts`).
 * Esa es la garantía de RF-71 y el criterio 5 de FU-04.
 */
export async function withScope<T>(
  ctx: AuthContext,
  trabajo: (db: ScopedDb) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    // `set_config(..., true)` es local a la transacción: al terminar, el
    // contexto desaparece y la siguiente petición no hereda nada.
    await tx.execute(
      sql`select set_config('app.organization_id', ${ctx.organizationId ?? ""}, true)`,
    );
    /**
     * `marcaDeRol`, no `ctx.actorRole`: una clave de API **sin empresa** entra
     * como `agent_slg`, que es el actor que la política de la migración 0015
     * deja cruzar empresas. Una clave **con** empresa sigue entrando como
     * `agent`, que no cruza nada.
     */
    await tx.execute(
      sql`select set_config('app.actor_role', ${marcaDeRol(ctx)}, true)`,
    );
    return trabajo(tx);
  });
}

/**
 * Acceso sin filtro de empresa, para trabajo del sistema: colas de entrega al
 * CRM, reintentos de webhooks, envío de correo.
 *
 * NO es una puerta trasera al aislamiento: solo debe usarse desde trabajos en
 * segundo plano que no atienden a un usuario. Cada uso lleva un motivo escrito,
 * y la revisión rechaza uno sin él.
 */
export async function withSystemScope<T>(
  motivo: string,
  trabajo: (db: ScopedDb) => Promise<T>,
): Promise<T> {
  if (!motivo.trim()) {
    throw new Error(
      "withSystemScope exige un motivo por escrito: es la única forma de que la " +
        "revisión distinga trabajo de sistema legítimo de un atajo al aislamiento.",
    );
  }
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.actor_role', 'system', true)`);
    return trabajo(tx);
  });
}

/**
 * Comprueba que un id de empresa que llega por la ruta coincide con el del
 * contexto. Devuelve 404, no 403: un 403 confirmaría que esa empresa existe.
 *
 * El id verificado NUNCA entra en un `WHERE`. Solo sirve para decidir si la
 * petición sigue o se corta; el filtrado lo hace la política de fila.
 */
export function assertMismaEmpresa(ctx: AuthContext, idDeLaRuta: string): void {
  if (cruzaEmpresas(ctx)) return;
  if (ctx.organizationId !== idDeLaRuta) {
    const e = new Error("No encontrado");
    (e as Error & { status?: number }).status = 404;
    throw e;
  }
}

/** Cierra la conexión. Solo para scripts y pruebas. */
export async function cerrarConexion(): Promise<void> {
  await conexion.end({ timeout: 5 });
}
