/**
 * navegacion.ts — El mapa de HQ y del portal, **como datos y con su acción de
 * B.3 al lado** (FU-12, criterios 2 y 5).
 *
 * POR QUÉ CADA SECCIÓN DECLARA SU ACCIÓN. El criterio 5 dice dos cosas, y solo
 * una es de interfaz: «el shell **no expone acciones que el rol no puede
 * ejecutar**, y la comprobación real está **en el servidor**». Escondiendo el
 * enlace con un `if` dentro del componente, la primera mitad se cumple y la
 * segunda queda a merced de que alguien se acuerde. Declarando la acción aquí,
 * la MISMA fila alimenta las dos: la barra lateral filtra con `puede()` y la
 * página llama a `exigir()` con la acción de su sección.
 *
 * ESCONDER NO ES PROTEGER. Un enlace que no se pinta sigue siendo una URL que se
 * puede escribir a mano. Por eso `exigirSeccion()` existe y por eso `test:shell`
 * comprueba las dos cosas por separado: que no se vea **y** que no se pueda.
 *
 * `seccion` es también la respuesta a «dónde estoy» (RNF-43): el título de la
 * pantalla sale de aquí, no de una cadena escrita en la página, para que no
 * puedan discrepar.
 */
import {
  ErrorDeAutorizacion,
  puede,
  superficieDelRol,
  type Accion,
  type Superficie,
} from "../auth/matriz.ts";
import type { AuthContext } from "../db/context.ts";

export type Seccion = {
  /** Identificador estable. Es la clave de las cadenas de interfaz: `app.nav.<clave>`. */
  readonly clave: string;
  readonly href: string;
  readonly superficie: Superficie;
  /**
   * La acción de B.3 que gobierna la sección. **Ninguna sección puede no tener
   * una**: una pantalla sin acción declarada es una pantalla que nadie sabe
   * quién puede ver, y `check:shell` pone el CI en rojo si aparece.
   */
  readonly accion: Accion;
};

/**
 * Las secciones de HQ (M3) y del portal (M4).
 *
 * Están las dos superficies en la misma tabla a propósito: el reparto entre HQ
 * y portal es una **columna**, no dos archivos. Dos tablas separadas es el sitio
 * exacto donde una sección de cliente acaba apareciendo en HQ al copiar y pegar.
 */
export const SECCIONES: readonly Seccion[] = [
  // ── HQ ──────────────────────────────────────────────────────────────────
  { clave: "dashboard", href: "/hq/tablero", superficie: "hq", accion: "hq.dashboard.read" },
  { clave: "captures", href: "/hq/capturas", superficie: "hq", accion: "capture.read" },
  { clave: "orgs", href: "/hq/empresas", superficie: "hq", accion: "org.read" },
  { clave: "apikeys", href: "/hq/claves", superficie: "hq", accion: "apikey.manage" },
  { clave: "audit", href: "/hq/auditoria", superficie: "hq", accion: "audit.read" },
  // ── Portal ──────────────────────────────────────────────────────────────
  { clave: "announcements", href: "/portal", superficie: "portal", accion: "announcement.read" },
  { clave: "deliverables", href: "/portal/entregables", superficie: "portal", accion: "deliverable.read" },
  { clave: "members", href: "/portal/miembros", superficie: "portal", accion: "member.invite" },
];

/**
 * Las secciones de una superficie que ESTE actor puede ver. Nunca las otras.
 *
 * **DOS FILTROS, Y EL PRIMERO NO ES REDUNDANTE.** Lo encontró esta prueba: B.3
 * le concede a `slg_admin` las acciones de lectura de avisos y entregables —las
 * puede leer, y debe—, así que solo con `puede()` la barra lateral **le pintaba
 * el portal de cliente entero**. Un administrador de SLG no navega el portal:
 * su superficie es HQ (`superficieDelRol`), y el portal lo ve como lo ve el
 * cliente, desde HQ y a través de la empresa. Tener permiso sobre un dato y
 * tener una **superficie** donde vivir son cosas distintas, y confundirlas
 * ofrece una navegación que después el layout rechaza — un enlace a un 404.
 */
export function seccionesVisibles(ctx: AuthContext, superficie: Superficie): readonly Seccion[] {
  if (superficieDelRol(ctx.actorRole) !== superficie) return [];
  return SECCIONES.filter((s) => s.superficie === superficie && puede(ctx, s.accion).permitido);
}

/** La sección a la que pertenece una ruta. La más larga que encaje: `/hq` no gana a `/hq/capturas`. */
export function seccionDeLaRuta(ruta: string): Seccion | null {
  const candidatas = SECCIONES.filter((s) => ruta === s.href || ruta.startsWith(`${s.href}/`));
  return candidatas.sort((a, b) => b.href.length - a.href.length)[0] ?? null;
}

/**
 * La comprobación **del servidor**, la que de verdad protege (criterio 5).
 *
 * Lanza con 404 y no con 403 cuando el veredicto dice 404: el mapa de HQ no es
 * información pública, y un 403 confirmaría que la sección existe (D-38, RF-95).
 */
export function exigirSeccion(ctx: AuthContext, clave: string): Seccion {
  const seccion = SECCIONES.find((s) => s.clave === clave);
  if (!seccion) throw new ErrorDeAutorizacion(404, `sección desconocida: ${clave}`);
  // La superficie PRIMERO, por lo mismo que arriba y con la misma consecuencia
  // al revés: sin esto, un rol de SLG con permiso de lectura entraría por una
  // ruta del portal, que no es suya. El layout ya lo rechazaría, pero entonces
  // habría dos sitios decidiendo lo mismo y solo uno probado.
  if (superficieDelRol(ctx.actorRole) !== seccion.superficie) {
    throw new ErrorDeAutorizacion(404, `«${clave}» no pertenece a la superficie de ${ctx.actorRole}`);
  }
  const v = puede(ctx, seccion.accion);
  if (!v.permitido) throw new ErrorDeAutorizacion(v.estado, v.motivoInterno);
  return seccion;
}
