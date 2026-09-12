/**
 * db.ts — La conexión propia del módulo de identidad.
 *
 * POR QUÉ UNA SEGUNDA CONEXIÓN. `lib/db/scope.ts` no exporta su cliente crudo a
 * propósito: si alguien pudiera importarlo, podría consultar sin alcance de
 * empresa sin darse cuenta. El módulo de identidad necesita un cliente Drizzle
 * —Better Auth lo exige— y tres consultas que ocurren ANTES de que exista
 * contexto de empresa. Vive aquí, dentro del módulo, y no se exporta fuera de
 * él.
 *
 * CON EL ROL DE APLICACIÓN, NUNCA CON EL DUEÑO. El dueño lleva `BYPASSRLS` y
 * con él el aislamiento entre empresas deja de aplicarse (D-47). Esto se
 * comprueba al arrancar, no se confía.
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "../db/schema.ts";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "Falta DATABASE_URL. Ver `.env.example` para los nombres; los valores viven " +
      "en `.env` (ignorado por git) o en las variables de entorno de Easypanel.",
  );
}

export const conexionDeAuth = postgres(process.env.DATABASE_URL, { max: 5, prepare: true });

export const dbDeAuth = drizzle(conexionDeAuth, { schema });

/**
 * Comprueba que la conexión NO es la del dueño.
 *
 * Se llama una vez al arrancar. Es la misma vigilancia que hace la primera
 * comprobación de `test:isolation`, aquí en tiempo de ejecución: si alguien
 * apunta `DATABASE_URL` al rol dueño, el proceso se niega a servir en vez de
 * servir sin aislamiento.
 */
export async function exigirRolSinBypassRls(): Promise<void> {
  const [fila] = await conexionDeAuth<{ rolbypassrls: boolean; rolname: string }[]>`
    select rolname, rolbypassrls from pg_roles where rolname = current_user
  `;
  if (fila?.rolbypassrls) {
    throw new Error(
      `DATABASE_URL conecta como «${fila.rolname}», que lleva BYPASSRLS. Con ese rol ` +
        `las políticas de fila NO se aplican y el aislamiento entre empresas es ` +
        `decorativo. Usa el rol de aplicación slg_app, no el dueño. Ver D-47.`,
    );
  }
}

export async function cerrarConexionDeAuth(): Promise<void> {
  await conexionDeAuth.end({ timeout: 5 });
}
