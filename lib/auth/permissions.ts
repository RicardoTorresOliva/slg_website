/**
 * permissions.ts — La matriz B.3, aplicada en el SERVIDOR.
 *
 * Criterio 2 de FU-06: ocultar un botón no autoriza nada. Toda acción pasa por
 * `exigir()` antes de tocar datos, y una prueba la invoca sin pasar por la
 * interfaz y exige 403.
 *
 * Criterio 7 (RNF-32): el error que sale hacia fuera **no dice qué faltaba**.
 * Ni el alcance, ni el rol, ni si el recurso existe. El motivo detallado se
 * devuelve aparte, para el registro interno, y nunca se serializa en la
 * respuesta.
 */

import type { AuthContext } from "../db/context.ts";
import { MATRIZ_B3, type Accion } from "./roles.ts";

export type Veredicto =
  | { readonly permitido: true }
  | {
      readonly permitido: false;
      /** 403 salvo cuando revelar la existencia ya sería una fuga: entonces 404. */
      readonly estado: 403 | 404;
      /** SOLO para el registro interno. Nunca sale en una respuesta HTTP. */
      readonly motivoInterno: string;
    };

/**
 * Contexto adicional que algunas filas de B.3 exigen.
 *
 * `asignado` es la prueba de la columna «(asignados)»: quien llama debe haberla
 * resuelto contra la base de datos —`project.owner_user_id`— antes de preguntar.
 * Si no se pasa, vale `false`: el silencio es «no», nunca «sí».
 */
export type Circunstancias = {
  readonly asignado?: boolean;
};

export function puede(
  ctx: AuthContext,
  accion: Accion,
  circunstancias: Circunstancias = {},
): Veredicto {
  const regla = MATRIZ_B3[accion];

  if (ctx.actorType === "api_key") {
    const alcance = regla.alcanceDeAgente;
    if (alcance === null) {
      return {
        permitido: false,
        estado: 403,
        motivoInterno: `ninguna clave puede «${accion}»: B.3 no le asigna alcance`,
      };
    }
    // Pertenencia EXACTA al conjunto de alcances de la clave. No hay jerarquía,
    // no hay prefijos, no hay «write implica read» (RF-147, criterio 4).
    if (!ctx.scopes.includes(alcance)) {
      return {
        permitido: false,
        estado: 403,
        motivoInterno: `la clave no lleva el alcance requerido por «${accion}»`,
      };
    }
    return { permitido: true };
  }

  // Actor de persona. `agent` nunca llega aquí: no inicia sesión.
  if (ctx.actorRole === "agent") {
    return {
      permitido: false,
      estado: 403,
      motivoInterno: "actorRole 'agent' sin actorType 'api_key': contexto incoherente",
    };
  }

  const regla_del_rol = regla.porRol[ctx.actorRole];

  if (regla_del_rol === "no") {
    return {
      permitido: false,
      estado: 403,
      motivoInterno: `B.3 no concede «${accion}» al rol ${ctx.actorRole}`,
    };
  }

  if (regla_del_rol === "asignados" && circunstancias.asignado !== true) {
    return {
      permitido: false,
      estado: 403,
      motivoInterno:
        `«${accion}» exige asignación y quien llama no la demostró ` +
        `(rol ${ctx.actorRole}, fila B.3 «${regla.filaB3}»)`,
    };
  }

  return { permitido: true };
}

/** Error de autorización. Su mensaje público es deliberadamente inútil. */
export class ErrorDeAutorizacion extends Error {
  readonly status: 403 | 404;
  /** No se serializa: existe para el `audit_log` y para los registros. */
  readonly motivoInterno: string;

  constructor(status: 403 | 404, motivoInterno: string) {
    // RNF-32: ni el alcance que faltaba, ni el rol, ni el recurso.
    super(status === 404 ? "No encontrado" : "No autorizado");
    this.name = "ErrorDeAutorizacion";
    this.status = status;
    this.motivoInterno = motivoInterno;
  }

  /** Lo único que puede salir por HTTP. */
  aRespuesta(): Response {
    return Response.json(
      { error: { code: this.status === 404 ? "not_found" : "forbidden", message: this.message } },
      { status: this.status },
    );
  }
}

/**
 * Aplica la matriz o corta. Es la función que toda acción llama; `puede()`
 * existe para la interfaz, que necesita preguntar sin lanzar.
 */
export function exigir(
  ctx: AuthContext,
  accion: Accion,
  circunstancias: Circunstancias = {},
): void {
  const v = puede(ctx, accion, circunstancias);
  if (!v.permitido) throw new ErrorDeAutorizacion(v.estado, v.motivoInterno);
}
