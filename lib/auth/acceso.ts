/**
 * acceso.ts — El acceso: mensajes neutros, bloqueo progresivo y cierre global.
 *
 * LA REGLA QUE GOBIERNA ESTE ARCHIVO (RF-59, criterio 2 de DU-01): **no existe
 * registro público**, así que toda respuesta de `/acceder` tiene que ser la
 * misma. Un correo que no existe, un correo que existe con la contraseña
 * equivocada, una cuenta suspendida y una empresa archivada reciben
 * EXACTAMENTE el mismo texto. Distinguirlos convierte el formulario de acceso
 * en un verificador de correos: alguien con una lista puede averiguar quién es
 * cliente de SLG sin entrar.
 *
 * El motivo real se devuelve aparte, para el registro interno, y nunca se
 * serializa hacia el cliente.
 */

import { eq } from "drizzle-orm";

import { session as sessionTable } from "../db/schema.ts";
import { conexionDeAuth, dbDeAuth } from "./db.ts";

/** El único texto que ve quien no entra. Da salida, no información. */
export const MENSAJE_NEUTRO =
  "No hemos podido iniciar sesión con esos datos. Si tu empresa trabaja con SLG, " +
  "solicita acceso a tu contacto en SLG.";

/* ══════════════════════════════════════════════════════════════════════════
 * Bloqueo progresivo (RNF-24, criterio 5)
 * ══════════════════════════════════════════════════════════════════════════ */

/**
 * La escalera: a partir del tercer fallo, cada intento cuesta más esperar.
 * Progresivo y no un corte seco a propósito — un corte seco a los N intentos
 * es, además de una molestia para quien se equivoca de verdad, una forma de
 * dejar a alguien fuera de su cuenta a voluntad.
 */
const ESPERA_POR_FALLOS_EN_SEGUNDOS = [0, 0, 0, 5, 15, 60, 300, 900] as const;
const ESPERA_MAXIMA = ESPERA_POR_FALLOS_EN_SEGUNDOS.at(-1)!;

/** Los fallos caducan: quien se equivocó ayer no arrastra el castigo hoy. */
const VENTANA_DE_FALLOS_EN_MS = 60 * 60 * 1000;

type Registro = { fallos: number; ultimo: number; bloqueadoHasta: number };

/**
 * En memoria del proceso, como el límite por clave de API y por la misma razón
 * (D-40, `architecture` §6.7: una sola réplica). Está aislado en estas cuatro
 * funciones para que moverlo a tabla, el día que haya dos réplicas, sea un
 * cambio local y no una cacería.
 *
 * Contrapartida asumida y escrita: un reinicio borra los contadores. Contra un
 * ataque sostenido eso importa poco —reiniciar el contenedor no está al alcance
 * de quien prueba contraseñas— y contra el caso normal, mejor.
 */
const intentos = new Map<string, Registro>();

/** La misma cerradura protege el acceso y la recuperación (RNF-24). */
export type Puerta = "acceso" | "recuperacion";

function llave(puerta: Puerta, identificador: string): string {
  return `${puerta}:${identificador.trim().toLowerCase()}`;
}

export function esperaPendienteEnSegundos(puerta: Puerta, identificador: string): number {
  const r = intentos.get(llave(puerta, identificador));
  if (!r) return 0;
  if (Date.now() - r.ultimo > VENTANA_DE_FALLOS_EN_MS) {
    intentos.delete(llave(puerta, identificador));
    return 0;
  }
  const restante = r.bloqueadoHasta - Date.now();
  return restante > 0 ? Math.ceil(restante / 1000) : 0;
}

export function registrarFallo(puerta: Puerta, identificador: string): number {
  const k = llave(puerta, identificador);
  const ahora = Date.now();
  const previo = intentos.get(k);
  const dentroDeVentana = previo && ahora - previo.ultimo <= VENTANA_DE_FALLOS_EN_MS;
  const fallos = (dentroDeVentana ? previo.fallos : 0) + 1;

  const espera = ESPERA_POR_FALLOS_EN_SEGUNDOS[fallos] ?? ESPERA_MAXIMA;
  intentos.set(k, { fallos, ultimo: ahora, bloqueadoHasta: ahora + espera * 1000 });
  return espera;
}

/** Un acceso correcto limpia la cuenta: el castigo no sobrevive al acierto. */
export function registrarAcierto(puerta: Puerta, identificador: string): void {
  intentos.delete(llave(puerta, identificador));
}

/** Solo para pruebas. */
export function reiniciarBloqueos(): void {
  intentos.clear();
}

/* ══════════════════════════════════════════════════════════════════════════
 * Proveedores disponibles (criterio 8: «proveedor no disponible»)
 * ══════════════════════════════════════════════════════════════════════════ */

/**
 * Qué métodos se pueden ofrecer AHORA MISMO.
 *
 * Google y Microsoft dependen de F.2-2 y F.2-3, que son registros en consolas
 * ajenas. Mientras falten, el botón se pinta **deshabilitado y explicado**, no
 * se esconde: un botón que desaparece hace pensar que el método no existe; uno
 * deshabilitado dice que hoy no está disponible, que es la verdad.
 */
export function proveedoresDisponibles(): { google: boolean; microsoft: boolean } {
  return {
    google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    microsoft: Boolean(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET),
  };
}

/* ══════════════════════════════════════════════════════════════════════════
 * Cierre de sesión en todos los dispositivos (RF-66, criterio 7)
 * ══════════════════════════════════════════════════════════════════════════ */

/**
 * Borra TODAS las sesiones del usuario. No las marca revocadas: las borra.
 *
 * Por qué de inmediato y no «al caducar»: quien pulsa esto acaba de perder el
 * portátil o sospecha que alguien entró. Una sesión que sigue valiendo diez
 * minutos más es exactamente el margen que no puede haber. La comprobación
 * autoritativa de `session.ts` va contra la base en cada petición, así que
 * borrar aquí surte efecto en la siguiente.
 */
export async function cerrarTodasLasSesiones(userId: string): Promise<number> {
  const filas = await dbDeAuth
    .delete(sessionTable)
    .where(eq(sessionTable.userId, userId))
    .returning({ id: sessionTable.id });
  return filas.length;
}

/**
 * Cierra **solo esta** sesión (FU-12: la respuesta a «cómo salgo»).
 *
 * Es lo contrario de `cerrarTodasLasSesiones`, y las dos tienen que existir por
 * separado: salir del portátil del trabajo no puede desconectarte del móvil, y
 * sospechar que alguien entró no se arregla cerrando solo la pestaña que tienes
 * delante. Confundirlas hace que una de las dos cosas no se pueda hacer.
 *
 * Borra la fila, no la marca: `session.ts` comprueba contra la base en cada
 * petición, así que surte efecto en la siguiente.
 */
export async function cerrarSesion(sessionId: string): Promise<boolean> {
  const filas = await dbDeAuth
    .delete(sessionTable)
    .where(eq(sessionTable.id, sessionId))
    .returning({ id: sessionTable.id });
  return filas.length > 0;
}

/**
 * Da el correo por verificado.
 *
 * Solo lo llama el canje de una invitación, y por un motivo concreto: **la
 * invitación se envió A ESA dirección**, así que llegar con su testigo ya prueba
 * que la persona la controla. Mandar además un correo de verificación sería
 * pedir dos veces la misma prueba, y el segundo correo es el que la gente no
 * encuentra.
 *
 * El alta por contraseña fuera de una invitación no existe (§10-10), así que no
 * hay otra ruta que pueda usar esto.
 */
export async function marcarCorreoVerificado(userId: string): Promise<void> {
  await conexionDeAuth`
    update "user" set email_verified = true, updated_at = now() where id = ${userId}
  `;
}

/** Sesiones vivas de un usuario. La usa la pantalla de perfil y las pruebas. */
export async function sesionesVivas(userId: string): Promise<number> {
  const [fila] = await conexionDeAuth<{ n: string }[]>`
    select count(*)::text as n from "session"
    where user_id = ${userId} and expires_at > now()
  `;
  return Number(fila?.n ?? 0);
}
