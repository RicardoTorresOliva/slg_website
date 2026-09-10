/**
 * permissions.ts — La matriz B.3, en código, no en prosa.
 *
 * RF-68: la matriz se aplica EN EL SERVIDOR para cada acción. Ocultar un botón
 * en la interfaz no autoriza nada — por eso esto es una función pura, sin
 * ninguna dependencia de la interfaz, que cualquier endpoint puede invocar.
 *
 * `puedeHacer` responde a nivel de ROL/ALCANCE. Las filas de la matriz marcadas
 * "(asignados)" —un `slg_operator` solo sobre sus proyectos— necesitan además
 * un filtro por fila que ya existe: `withScope` + la columna `owner_user_id` de
 * `project` (FU-04). Esta función no sustituye ese filtro, lo precede: primero
 * se pregunta "¿puede este rol alguna vez hacer esto?", y si la respuesta es
 * sí, la consulta escogida por `withScope` decide sobre qué filas en concreto.
 */

import type { AuthContext } from "../db/context.ts";
import type { ApiScope, UserRole } from "../db/schema.ts";

/**
 * Las nueve filas de la matriz B.3 (START_PROJECT.md, Anexo B.3), una por
 * acción reconocida. El nombre es `<recurso>.<verbo>`, igual que `agent_event.kind`
 * (RF-146), para que la disciplina de nombres sea una sola en todo el proyecto.
 */
export const ACCIONES = [
  "hq.ver_tablero",
  "captures.reintentar",
  "orgs.escribir",
  "identidad.invitar_slg",
  "identidad.crear_clave_api",
  "deliverables.publicar",
  "deliverables.ver_propios",
  "identidad.invitar_miembro_empresa",
  "events.registrar",
  "audit.ver",
] as const;

export type Accion = (typeof ACCIONES)[number];

/**
 * Roles con permiso a nivel de fila. `"asignados"` marca las acciones donde el
 * permiso de rol no basta: `slg_operator` necesita además superar el filtro de
 * asignación (ver cabecera del archivo).
 */
const ROLES_POR_ACCION: Record<Accion, readonly UserRole[]> = {
  "hq.ver_tablero": ["slg_admin", "slg_operator"],
  "captures.reintentar": ["slg_admin", "slg_operator"],
  "orgs.escribir": ["slg_admin", "slg_operator"], // slg_operator: asignados
  "identidad.invitar_slg": ["slg_admin"],
  "identidad.crear_clave_api": ["slg_admin"],
  "deliverables.publicar": ["slg_admin", "slg_operator"], // slg_operator: asignados
  "deliverables.ver_propios": ["slg_admin", "slg_operator", "client_admin", "client_member"],
  "identidad.invitar_miembro_empresa": ["slg_admin", "slg_operator", "client_admin"],
  "events.registrar": ["slg_admin", "slg_operator"],
  "audit.ver": ["slg_admin"],
};

/** Las acciones donde `slg_operator` necesita además el filtro de asignación. */
export const ACCIONES_CON_FILTRO_DE_ASIGNACION: readonly Accion[] = [
  "orgs.escribir",
  "deliverables.publicar",
];

/** El alcance de clave de API que cubre cada acción — `null` si ninguna clave puede. */
const ALCANCE_POR_ACCION: Record<Accion, ApiScope | null> = {
  "hq.ver_tablero": "captures:read",
  "captures.reintentar": null,
  "orgs.escribir": "orgs:read", // de solo lectura: una clave NUNCA escribe orgs/proyectos
  "identidad.invitar_slg": null,
  "identidad.crear_clave_api": null,
  "deliverables.publicar": "deliverables:write",
  "deliverables.ver_propios": "deliverables:read",
  "identidad.invitar_miembro_empresa": null,
  "events.registrar": "events:write",
  "audit.ver": null,
};

/**
 * ¿Puede este actor —persona o clave de API, ya autenticado en `ctx`— realizar
 * esta acción? Responde a nivel de rol/alcance; ver cabecera sobre el filtro de
 * asignación que falta para `ACCIONES_CON_FILTRO_DE_ASIGNACION`.
 */
export function puedeHacer(ctx: AuthContext, accion: Accion): boolean {
  if (ctx.actorType === "api_key") {
    const alcanceNecesario = ALCANCE_POR_ACCION[accion];
    // Ninguna clave hace lo que ningún alcance cubre (RF-147: sin implicación
    // entre alcances, así que tampoco hay un alcance "de administrador").
    if (!alcanceNecesario) return false;
    return ctx.scopes.includes(alcanceNecesario);
  }
  return ROLES_POR_ACCION[accion].includes(ctx.actorRole as UserRole);
}

/**
 * Igual que `puedeHacer`, pero lanza un 403 sin decir qué alcance o rol
 * faltaba (RNF-32): el mensaje es el mismo tanto si el recurso no existe como
 * si el actor no tiene permiso, para no regalar información de forma.
 */
export function exigir(ctx: AuthContext, accion: Accion): void {
  if (puedeHacer(ctx, accion)) return;
  const e = new Error("No autorizado");
  (e as Error & { status?: number }).status = 403;
  throw e;
}
