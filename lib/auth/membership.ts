/**
 * membership.ts — «¿A qué empresa pertenece quien acaba de entrar?»
 *
 * EL PROBLEMA QUE RESUELVE. `membership` está bajo row level security FORZADA:
 * sin `app.organization_id` fijado devuelve CERO filas. Eso es justo lo que
 * queremos en toda petición... salvo en una, el inicio de sesión, donde todavía
 * no sabemos la empresa porque **esa es la pregunta**.
 *
 * LA SALIDA. Una función `SECURITY DEFINER` en la base de datos
 * (`app_memberships_de_usuario`, migración 0004) que contesta esa única
 * pregunta y no sirve para nada más: no acepta filtros, no devuelve datos de
 * proyecto ni de entregable, y lleva `search_path` fijado. Este archivo es su
 * único llamante, y hay un gate que lo comprueba.
 *
 * Las alternativas descartadas están escritas en la migración: añadir 'system'
 * a la política abriría las ocho tablas de golpe, y conectar con el rol dueño
 * apagaría el aislamiento entero.
 */

import { conexionDeAuth } from "./db.ts";
import type { Superficie } from "./roles.ts";

export type Pertenencia = {
  readonly organizationId: string;
  readonly orgRole: string;
  /** `slg` o `client`: decide la superficie, no el rol de la pertenencia. */
  readonly orgType: string;
  readonly orgStatus: string;
};

/**
 * Pertenencias ACTIVAS del usuario. Una empresa `archived` no aparece: sus
 * miembros dejan de entrar al portal sin que se borre nada (`data_model` §3.3).
 */
export async function pertenenciasDe(userId: string): Promise<Pertenencia[]> {
  const filas = await conexionDeAuth<
    { organization_id: string; org_role: string; org_type: string; org_status: string }[]
  >`select * from app_memberships_de_usuario(${userId})`;

  return filas.map((f) => ({
    organizationId: f.organization_id,
    orgRole: f.org_role,
    orgType: f.org_type,
    orgStatus: f.org_status,
  }));
}

/**
 * La empresa con la que opera esta sesión.
 *
 * Para `slg_*` es `null` a propósito: operan por encima de una sola empresa y
 * su alcance lo da la política de fila (`app_actor_role`), no un identificador.
 * Para `client_*` es la empresa de tipo `client` a la que pertenecen; **sin
 * ella no hay portal que ver** y el paso 4 de `architecture` §2.4 devuelve 404.
 */
export function empresaDeLaSesion(
  superficie: Superficie,
  pertenencias: readonly Pertenencia[],
): string | null {
  if (superficie === "hq") return null;
  return pertenencias.find((p) => p.orgType === "client")?.organizationId ?? null;
}
