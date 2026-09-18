/**
 * `lib/academy` — La **única puerta** a `news_item`, `milestone` y `action_item`
 * (M6 · FU-15 · DU-30 · RF-150 · RF-151 · RF-156).
 *
 * HQ (DU-29), el portal (DU-26, DU-27) y `/api/v1` (DU-30) entran por aquí y no
 * tocan las tres tablas por su cuenta. Lo que se garantiza en esta puerta, y en
 * ningún otro sitio:
 *
 *   · toda lectura y toda escritura pasan por `withScope`: la política de fila
 *     acota, y aquí no hay ningún `WHERE organization_id` que la sustituya;
 *   · la empresa de un hito o un pendiente sale de su proyecto, nunca de un
 *     parámetro; el autor y quien cierra, del contexto (RF-111);
 *   · «asignados» de `slg_operator` se resuelve contra la base antes de
 *     preguntar a la matriz (`lib/hq/proyectos.ts`);
 *   · cada escritura de una persona queda en `audit_log`, también rechazada; la
 *     de una clave la apunta el manejador de la API, una sola vez (D-140).
 *
 * Lo que NO hay, y no es un hueco: progreso por persona, lecciones, cohortes,
 * certificados. Frontera (b) de `scope.md`; `check:alcance` la vigila.
 */
export {
  crearNoticia,
  noticias,
  type DatosDeNoticia,
  type Importancia,
  type Noticia,
} from "./noticias.ts";

export {
  actualizarHito,
  crearHito,
  ESTADOS_DE_HITO,
  hitosDeProyecto,
  proximosHitos,
  type CambiosDeHito,
  type DatosDeHito,
  type EstadoDeHito,
  type Hito,
} from "./hitos.ts";

export {
  cerrarPendiente,
  crearPendiente,
  ESTADOS_DE_PENDIENTE,
  pendientesAbiertos,
  pendientesDeProyecto,
  QUIEN_CIERRA,
  reabrirPendiente,
  type DatosDePendiente,
  type EstadoDePendiente,
  type Pendiente,
  type QuienCierra,
} from "./pendientes.ts";
