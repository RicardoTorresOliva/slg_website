/**
 * session.ts — De una petición a un `AuthContext` verificado, o a nada.
 *
 * Es la puerta que aplica los pasos 1–5 de `architecture` §2.4, **contra la
 * base de datos**, no contra la cookie. El middleware ya hizo una versión
 * barata de lo mismo en el borde; esta es la autoritativa, y si discrepan manda
 * esta (paso 6).
 *
 * LA REGLA QUE GOBIERNA LAS RESPUESTAS: **404, nunca 403**, al cruzar de
 * superficie o de empresa (D-38, RF-95, RF-71). Un 403 confirma que la ruta o
 * el recurso existen, y el mapa de HQ no es información pública.
 */

import { contextoDeSesion, type AuthContext } from "../db/context.ts";
import type { UserRole } from "../db/schema.ts";
import { auth } from "./better-auth.ts";
import { empresaDeLaSesion, pertenenciasDe, type Pertenencia } from "./membership.ts";
import { ErrorDeAutorizacion } from "./permissions.ts";
import {
  ROLES_DE_PERSONA,
  RUTAS_SOLO_ADMIN,
  SUPERFICIES_ABIERTAS,
  superficieDelRol,
  type Superficie,
} from "./roles.ts";

export type SesionResuelta = {
  readonly ctx: AuthContext;
  readonly userId: string;
  /**
   * El identificador de ESTA sesión, no del usuario. Lo necesita «cerrar
   * sesión» (FU-12): salir de aquí no puede cerrar las de los otros
   * dispositivos, que es lo que hace `cerrarTodasLasSesiones`.
   */
  readonly sessionId: string;
  readonly role: UserRole;
  /** El nombre para mostrar. La interfaz nunca enseña el correo en la barra. */
  readonly nombre: string;
  readonly locale: string;
  readonly superficie: Superficie;
  readonly pertenencias: readonly Pertenencia[];
};

/** Se lanza cuando no hay sesión: la respuesta es una redirección a `/acceder`. */
export class SinSesion extends Error {
  constructor() {
    super("Sin sesión");
    this.name = "SinSesion";
  }
}

function esRolDePersona(valor: unknown): valor is UserRole {
  return typeof valor === "string" && (ROLES_DE_PERSONA as readonly string[]).includes(valor);
}

/**
 * Resuelve la sesión actual, o `null`. No lanza: sirve para decidir qué pintar,
 * no para autorizar. Para autorizar está `exigirSesion`.
 */
export async function sesionActual(): Promise<SesionResuelta | null> {
  /**
   * `next/headers` se importa AQUÍ DENTRO, no arriba.
   *
   * Arriba convertía todo `@/lib/auth` en código que solo carga dentro del
   * runtime de Next, y con él todo lo que lo importe: `lib/invitations/` usa
   * `exigir()` para aplicar B.3 y tiene que poder correr también desde un
   * trabajo en segundo plano —el barrido de invitaciones caducadas— y desde una
   * prueba. Una dependencia de framework en la raíz de un módulo de dominio se
   * propaga a todo lo que lo toca.
   */
  const { headers } = await import("next/headers");
  const resultado = await auth.api.getSession({ headers: await headers() });
  if (!resultado?.user) return null;

  const { user } = resultado;

  /**
   * Un rol que no está en el vocabulario NO se trata como `client_member`: se
   * trata como si no hubiera sesión. Degradar en silencio convierte un dato
   * corrupto en un acceso, y el paso siguiente sería preguntarse por qué.
   */
  if (!esRolDePersona(user.role)) return null;

  // RF-66 y plugin `admin`: una cuenta suspendida no tiene sesión válida.
  const suspendido =
    user.banned === true &&
    (user.banExpires == null || new Date(user.banExpires).getTime() > Date.now());
  if (suspendido) return null;

  const superficie = superficieDelRol(user.role);
  if (superficie === null) return null;

  const pertenencias = await pertenenciasDe(user.id);
  const organizationId = empresaDeLaSesion(superficie, pertenencias);

  return {
    ctx: contextoDeSesion({
      userId: user.id,
      userName: user.name,
      role: user.role,
      organizationId,
    }),
    userId: user.id,
    sessionId: resultado.session.id,
    role: user.role,
    nombre: user.name,
    locale: typeof user.locale === "string" ? user.locale : "es",
    superficie,
    pertenencias,
  };
}

/** Exige sesión. Sin ella, `SinSesion`: quien llama redirige a `/acceder`. */
export async function exigirSesion(): Promise<SesionResuelta> {
  const s = await sesionActual();
  if (!s) throw new SinSesion();
  return s;
}

/**
 * Los pasos 3, 4 y 5 de `architecture` §2.4, más RF-87.
 *
 * Todos los fallos son 404. Ninguno dice por qué: ni que la superficie exista,
 * ni que el rol no corresponda, ni que falte pertenencia (RNF-32, criterio 7).
 */
export async function exigirSuperficie(
  superficie: Superficie,
  ruta?: string,
): Promise<SesionResuelta> {
  const s = await exigirSesion();

  // RF-87 — Mientras su milestone siga abierto, la superficie no existe para
  // nadie, ni con sesión válida. Se apaga cambiando SUPERFICIES_ABIERTAS, no
  // borrando esta comprobación.
  if (!SUPERFICIES_ABIERTAS[superficie]) {
    throw new ErrorDeAutorizacion(
      404,
      `superficie «${superficie}» cerrada por RF-87: su milestone sigue abierto`,
    );
  }

  // Paso 3 — el rol corresponde a esta superficie.
  if (s.superficie !== superficie) {
    throw new ErrorDeAutorizacion(
      404,
      `rol ${s.role} pidió «${superficie}»; le corresponde «${s.superficie}»`,
    );
  }

  // Paso 4 — solo portal: pertenencia activa a una empresa cliente.
  if (superficie === "portal" && s.ctx.organizationId === null) {
    throw new ErrorDeAutorizacion(
      404,
      `usuario ${s.userId} sin pertenencia activa a empresa cliente`,
    );
  }

  // Paso 5 — rutas reservadas a `slg_admin`. Para `slg_operator`, 404 (RF-86).
  if (ruta && RUTAS_SOLO_ADMIN.some((r) => ruta === r || ruta.startsWith(`${r}/`))) {
    if (s.role !== "slg_admin") {
      throw new ErrorDeAutorizacion(404, `«${ruta}» es de slg_admin; el rol es ${s.role}`);
    }
  }

  return s;
}
