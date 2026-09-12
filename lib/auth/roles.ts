/**
 * roles.ts — Los roles, las superficies y la matriz B.3, como DATOS.
 *
 * La matriz está aquí escrita una sola vez y en forma de tabla porque así se
 * puede recorrer entera en una prueba. Una matriz repartida por `if` dentro de
 * las páginas no se puede auditar: hay que leerla acción por acción y confiar en
 * que nadie olvidó una.
 *
 * SOBRE «LOS CINCO ROLES» DE FU-06. RF-67 y B.3 nombran cinco —`slg_admin`,
 * `slg_operator`, `client_admin`, `client_member` y `agent`— pero `agent` NO es
 * un valor de `user.role`: `data_model` §3.1 lo excluye explícitamente («no está
 * y no estará»). Un agente no inicia sesión: presenta una clave de API. Los
 * cinco existen como ACTORES; cuatro son roles de persona y el quinto es el
 * actor de clave. `AuthContext.actorRole` ya modelaba exactamente eso en FU-04.
 */

import type { ApiScope, UserRole } from "../db/schema.ts";

export const ROLES_DE_PERSONA = [
  "slg_admin",
  "slg_operator",
  "client_admin",
  "client_member",
] as const satisfies readonly UserRole[];

/** Los cinco actores de B.3: los cuatro roles de persona más el de clave. */
export type ActorRole = UserRole | "agent";

/** Roles que operan por encima de una sola empresa. */
export const ROLES_DE_SLG = ["slg_admin", "slg_operator"] as const;

export type Superficie = "hq" | "portal";

/** Qué superficie le corresponde a cada rol (architecture §2.4, paso 3). */
export function superficieDelRol(rol: ActorRole): Superficie | null {
  if (rol === "slg_admin" || rol === "slg_operator") return "hq";
  if (rol === "client_admin" || rol === "client_member") return "portal";
  return null; // `agent` no tiene superficie: solo API.
}

/* ══════════════════════════════════════════════════════════════════════════
 * La matriz B.3
 * ══════════════════════════════════════════════════════════════════════════ */

export const ACCIONES = [
  "hq.dashboard.read",
  "capture.read",
  "capture.retry",
  "org.read",
  "org.write",
  "project.write",
  "user.invite.slg",
  "apikey.manage",
  "deliverable.publish",
  "announcement.publish",
  "deliverable.read",
  "announcement.read",
  "member.invite",
  "event.write",
  "audit.read",
] as const;

export type Accion = (typeof ACCIONES)[number];

type ReglaDeRol =
  /** Puede, sin condiciones. */
  | "si"
  /** No puede. */
  | "no"
  /**
   * Puede **solo sobre lo que tiene asignado** (las filas «(asignados)» de B.3).
   * Quien llama debe demostrar la asignación; sin prueba, es «no».
   */
  | "asignados";

export type ReglaB3 = {
  /** La fila de B.3, literal, para poder cotejar la tabla con el brief. */
  readonly filaB3: string;
  readonly porRol: Readonly<Record<UserRole, ReglaDeRol>>;
  /**
   * Alcance que habilita esta acción a una clave de API. `null` = **ninguna
   * clave puede hacerlo**, por muchos alcances que tenga.
   *
   * Es UN alcance, no una lista, y no hay herencia entre ellos: que una clave
   * con `events:write` consiguiera crear un entregable es un defecto de
   * seguridad, no una comodidad (RF-147, criterio 4 de FU-06).
   */
  readonly alcanceDeAgente: ApiScope | null;
};

export const MATRIZ_B3: Readonly<Record<Accion, ReglaB3>> = {
  "hq.dashboard.read": {
    filaB3: "Ver tablero HQ, capturas web, métricas del CRM",
    porRol: { slg_admin: "si", slg_operator: "si", client_admin: "no", client_member: "no" },
    alcanceDeAgente: "captures:read",
  },
  "capture.read": {
    filaB3: "Ver tablero HQ, capturas web, métricas del CRM",
    porRol: { slg_admin: "si", slg_operator: "si", client_admin: "no", client_member: "no" },
    alcanceDeAgente: "captures:read",
  },
  "capture.retry": {
    filaB3: "Reintentar entrega de una captura al CRM",
    porRol: { slg_admin: "si", slg_operator: "si", client_admin: "no", client_member: "no" },
    alcanceDeAgente: null,
  },
  "org.read": {
    filaB3: "Crear/editar empresas, proyectos",
    porRol: { slg_admin: "si", slg_operator: "si", client_admin: "no", client_member: "no" },
    alcanceDeAgente: "orgs:read",
  },
  "org.write": {
    filaB3: "Crear/editar empresas, proyectos",
    porRol: { slg_admin: "si", slg_operator: "asignados", client_admin: "no", client_member: "no" },
    alcanceDeAgente: null,
  },
  "project.write": {
    filaB3: "Crear/editar empresas, proyectos",
    porRol: { slg_admin: "si", slg_operator: "asignados", client_admin: "no", client_member: "no" },
    alcanceDeAgente: null,
  },
  "user.invite.slg": {
    filaB3: "Invitar usuarios SLG / crear claves de API",
    porRol: { slg_admin: "si", slg_operator: "no", client_admin: "no", client_member: "no" },
    alcanceDeAgente: null,
  },
  "apikey.manage": {
    filaB3: "Invitar usuarios SLG / crear claves de API",
    porRol: { slg_admin: "si", slg_operator: "no", client_admin: "no", client_member: "no" },
    alcanceDeAgente: null,
  },
  "deliverable.publish": {
    filaB3: "Publicar entregables y avisos",
    porRol: { slg_admin: "si", slg_operator: "asignados", client_admin: "no", client_member: "no" },
    alcanceDeAgente: "deliverables:write",
  },
  "announcement.publish": {
    filaB3: "Publicar entregables y avisos",
    porRol: { slg_admin: "si", slg_operator: "asignados", client_admin: "no", client_member: "no" },
    alcanceDeAgente: "announcements:write",
  },
  "deliverable.read": {
    filaB3: "Ver entregables/avisos de su empresa",
    porRol: { slg_admin: "si", slg_operator: "si", client_admin: "si", client_member: "si" },
    alcanceDeAgente: "deliverables:read",
  },
  "announcement.read": {
    filaB3: "Ver entregables/avisos de su empresa",
    porRol: { slg_admin: "si", slg_operator: "si", client_admin: "si", client_member: "si" },
    alcanceDeAgente: null,
  },
  "member.invite": {
    filaB3: "Invitar miembros de su empresa",
    porRol: { slg_admin: "si", slg_operator: "si", client_admin: "si", client_member: "no" },
    alcanceDeAgente: null,
  },
  "event.write": {
    filaB3: "Registrar actividad",
    porRol: { slg_admin: "si", slg_operator: "si", client_admin: "no", client_member: "no" },
    alcanceDeAgente: "events:write",
  },
  "audit.read": {
    filaB3: "Ver auditoría",
    porRol: { slg_admin: "si", slg_operator: "no", client_admin: "no", client_member: "no" },
    alcanceDeAgente: null,
  },
};

/**
 * Rutas de HQ reservadas a `slg_admin` (architecture §2.4, paso 5; RF-86).
 * Para `slg_operator` devuelven **404**, no 403: un 403 confirmaría que existen.
 */
export const RUTAS_SOLO_ADMIN = ["/hq/claves", "/hq/auditoria"] as const;

/**
 * RF-87 — Mientras M3 y M4 sigan abiertos, `/hq` y `/portal` no se enlazan en
 * ninguna superficie y **devuelven denegación por rol aunque la sesión sea
 * válida**. Se apaga cambiando estas dos constantes cuando su milestone cierre,
 * no borrando la comprobación.
 */
export const SUPERFICIES_ABIERTAS: Readonly<Record<Superficie, boolean>> = {
  hq: false, // se abre al cerrar M3
  portal: false, // se abre al cerrar M4
};
