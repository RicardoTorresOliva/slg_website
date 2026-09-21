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
  "member.read",
  "profile.self",
  "event.write",
  "audit.read",
  // FU-15 · Academy (spec-delta 2026-09-18). Leer es de todos los de la
  // empresa; escribir es de SLG o de un agente con el alcance exacto; cerrar un
  // pendiente lo puede hacer el cliente, y `closes_by` decide en el servidor.
  "news.read",
  "news.write",
  "milestone.read",
  "milestone.write",
  "action_item.write",
  "action_item.close",
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
    /**
     * Era `null` hasta D-163: D-162 dejó que el CRM creara aquí la carpeta del
     * cliente, pero el CRM no sabía qué `{id}` de empresa usar, porque las
     * empresas de aquí y las del CRM no estaban relacionadas. Ahora el CRM crea
     * o encuentra la empresa por su `crm_company_id` con `POST /organizations`.
     * Es UN alcance propio, no `projects:write` ampliado: crear proyectos no
     * implica crear empresas (RF-147). Una clave acotada a una empresa sigue
     * sin poder crear otras.
     */
    alcanceDeAgente: "orgs:write",
  },
  "project.write": {
    filaB3: "Crear/editar empresas, proyectos",
    porRol: { slg_admin: "si", slg_operator: "asignados", client_admin: "no", client_member: "no" },
    /**
     * Era `null` hasta D-162: el CRM es donde nace un proyecto y este sitio lo
     * recibe, así que una clave de agente tiene que poder crear aquí la carpeta
     * del cliente y cerrarla o reabrirla. Es UN alcance propio, no `orgs:read`
     * ampliado: leer empresas no implica escribir proyectos (RF-147). Sigue sin
     * habilitar `org.write`: las empresas se dan de alta en HQ.
     */
    alcanceDeAgente: "projects:write",
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
  /**
   * **DOS FILAS QUE B.3 NO TIENE, y se declaran como derivadas** (DU-21).
   *
   * B.3 es una matriz de **privilegio sobre lo ajeno**: quién puede publicar,
   * invitar, auditar. Dos cosas de DU-21 no caben ahí y aun así necesitan una
   * acción, porque FU-12 exige que **toda sección declare la suya** y una
   * pantalla sin acción es una pantalla que nadie sabe quién puede ver:
   *
   *   · `member.read` — ver **quién más está** en tu propia empresa. El criterio
   *     2 de DU-21 dice que `client_member` **ve la lista y no puede invitar**,
   *     así que gatear la sección con `member.invite` la escondería justo a
   *     quien el criterio dice que debe verla. Ver y poder son dos cosas.
   *   · `profile.self` — editar **tu propio** nombre e idioma. No es un
   *     privilegio: no hay rol que no lo tenga, y por eso las cuatro celdas son
   *     «sí». Está aquí para que la sección pueda declararla, no para decidir.
   *
   * Ninguna de las dos la puede ejercer una clave de API: un agente no tiene
   * compañeros ni perfil.
   */
  "member.read": {
    filaB3: "(derivada de «Invitar miembros de su empresa»): ver los miembros de la propia empresa",
    porRol: { slg_admin: "si", slg_operator: "si", client_admin: "si", client_member: "si" },
    alcanceDeAgente: null,
  },
  "profile.self": {
    filaB3: "(derivada): editar el propio nombre, idioma y contraseña",
    porRol: { slg_admin: "si", slg_operator: "si", client_admin: "si", client_member: "si" },
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
  "news.read": {
    filaB3: "(Academy, RF-149/RF-150): ver las noticias de su empresa",
    porRol: { slg_admin: "si", slg_operator: "si", client_admin: "si", client_member: "si" },
    alcanceDeAgente: null,
  },
  "news.write": {
    filaB3: "(Academy, RF-150/RF-152): escribir una noticia para una empresa",
    porRol: { slg_admin: "si", slg_operator: "asignados", client_admin: "no", client_member: "no" },
    alcanceDeAgente: "news:write",
  },
  "milestone.read": {
    filaB3: "(Academy, RF-151): ver hitos y pendientes de su empresa",
    porRol: { slg_admin: "si", slg_operator: "si", client_admin: "si", client_member: "si" },
    alcanceDeAgente: null,
  },
  "milestone.write": {
    filaB3: "(Academy, RF-151/RF-152): crear, editar y cerrar hitos",
    porRol: { slg_admin: "si", slg_operator: "asignados", client_admin: "no", client_member: "no" },
    alcanceDeAgente: "milestones:write",
  },
  "action_item.write": {
    filaB3: "(Academy, RF-151/RF-152): crear y editar pendientes, y cerrar los de SLG",
    porRol: { slg_admin: "si", slg_operator: "asignados", client_admin: "no", client_member: "no" },
    alcanceDeAgente: "milestones:write",
  },
  "action_item.close": {
    filaB3: "(Academy, RF-151): el cliente cierra un pendiente SUYO (closes_by = client)",
    porRol: { slg_admin: "si", slg_operator: "si", client_admin: "si", client_member: "si" },
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

/**
 * ══════════════════════════════════════════════════════════════════════════
 * EL PUNTO MUERTO QUE ESTO DESHACE
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Cinco unidades de M3 y M4 —DU-15, DU-16, DU-17, DU-18 y DU-20— tenían **todo
 * verificado menos la revisión visual**, y la revisión visual esperaba a que la
 * superficie se abriera. La superficie se abre «al cerrar el milestone». El
 * milestone no cierra hasta que sus unidades cierren. Y el criterio 1 de DU-14
 * pide literalmente HQ abierta. Cada pieza era razonable y juntas no dejaban
 * salir a nadie: nadie podía ver una sola pantalla de las intranets, **nunca**.
 *
 * DÓNDE ESTABA EL ERROR. No en el mecanismo, sino en leer RF-87 como si hablara
 * de *el sitio*. Habla de **producción**: «M0 → M1 → M2 salen a producción antes
 * de empezar M3; la web ya vende mientras se construyen las intranets». Lo que
 * protege es que un cliente que entra a comprar no tropiece con media intranet.
 * En **staging** no hay nadie a quien proteger: está detrás de autenticación
 * básica, marcado `noindex`, y es justo donde una revisión visual debe hacerse.
 *
 * CÓMO SE ABRE, Y POR QUÉ ASÍ. `SUPERFICIES_EN_REVISION=hq,portal` abre una
 * superficie **solo si delante hay compuerta de staging**, es decir solo si
 * `STAGING_BASIC_AUTH_USER` y `STAGING_BASIC_AUTH_PASSWORD` están puestas. Esa
 * condición no es adorno: si alguien copiara la variable a producción —que es el
 * accidente que de verdad pasa al clonar entornos— **no haría nada**, porque
 * producción no lleva compuerta y `check:runtime` lo comprueba sobre el servidor
 * real. La apertura por variable es, por construcción, inalcanzable en producción.
 *
 * Y no sustituye a nada: dentro sigue haciendo falta sesión válida y el rol que
 * la matriz B.3 exige. Lo único que esta variable retira es el 404 de «tu
 * milestone sigue abierto».
 *
 * CUANDO M3 Y M4 CIERREN de verdad, se pone `true` arriba y se retira la
 * variable del entorno. Esto es un andamio con fecha, y está escrito para que se
 * note si se queda puesto.
 */
function hayCompuertaDeStaging(): boolean {
  return Boolean(process.env.STAGING_BASIC_AUTH_USER && process.env.STAGING_BASIC_AUTH_PASSWORD);
}

export function superficieAbierta(superficie: Superficie): boolean {
  if (SUPERFICIES_ABIERTAS[superficie]) return true;
  if (!hayCompuertaDeStaging()) return false;
  return (process.env.SUPERFICIES_EN_REVISION ?? "")
    .split(",")
    .map((s) => s.trim())
    .includes(superficie);
}
