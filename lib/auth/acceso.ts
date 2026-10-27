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

/**
 * El único texto que ve quien no entra: da salida, no información.
 *
 * **AQUÍ VIAJA LA CLAVE, NO EL TEXTO** (RF-16). El texto vivía escrito en este
 * archivo, y eso lo rompía por dos sitios a la vez: existía **en un solo
 * idioma**, así que quien tuviera el inglés por preferencia recibía castellano
 * en el peor momento —cuando ya no entiende por qué no entra—; y metía el
 * nombre de la casa **dentro del motor**, donde `content/` no alcanza y ningún
 * sitio que reutilice este código puede cambiarlo sin editar `lib/`.
 *
 * Era además una **segunda copia**: `auth.signin.error` ya decía exactamente lo
 * mismo, y la pantalla de acceso ya pintaba esa, no ésta. Dos copias del mismo
 * párrafo no se mantienen sincronizadas; se descubre que divergieron el día que
 * alguien suaviza una de las dos.
 */
export const CLAVE_DEL_MENSAJE_NEUTRO = "auth.signin.error";

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
 * **LOS NOMBRES DE LA COOKIE DE SESIÓN VIVEN AQUÍ, no en las rutas.**
 *
 * Estaban escritos a mano en `/api/acceso/salir` y en `/api/acceso/cerrar-todo`,
 * y eso es exactamente lo que el criterio 1 de FU-06 prohíbe: lógica de sesión
 * dentro de un endpoint. Importa porque el fallo sería **silencioso**: el día
 * que Better Auth renombre su cookie —o que se sustituya el proveedor, que es la
 * mitigación de R-19— `cerrarSesion()` seguiría borrando la fila de la base y las
 * dos rutas seguirían borrando una cookie que ya no existe. El usuario vería
 * «sesión cerrada», el navegador conservaría la cookie, y la única señal sería
 * que nadie consigue salir del todo. Lo encontró la revisión final, al hacer que
 * `check:fronteras` comprobara de verdad el criterio que citaba.
 *
 * Son dos porque en HTTPS la cookie lleva el prefijo `__Secure-` y en local no.
 * Borrar una sola deja la otra viva en el entorno equivocado.
 */
export const COOKIES_DE_SESION: readonly string[] = [
  "better-auth.session_token",
  "__Secure-better-auth.session_token",
];

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

/* ══════════════════════════════════════════════════════════════════════════
 * El perfil: qué método de acceso usa esta cuenta, y cambiar la contraseña
 * (DU-21, criterio 3 · RF-93)
 * ══════════════════════════════════════════════════════════════════════════ */

/**
 * ¿Esta cuenta entra con contraseña?
 *
 * El criterio 3 dice que cada usuario cambia su contraseña **solo si usa ese
 * método**, y la razón no es de interfaz: a quien entra con Microsoft 365 no le
 * existe ninguna contraseña que cambiar. Enseñarle el formulario sería ofrecerle
 * una operación que no puede terminar, y peor: haría creer que **aquí** se
 * cambia la contraseña de su organización, que es de su departamento de
 * sistemas y no nuestra.
 *
 * Vive en este módulo y no en `lib/portal/` porque mira `account`, que es una
 * tabla de identidad: `check:fronteras` frena a cualquiera que la consulte desde
 * fuera, y con razón — quien lee `account` está a un `select` de leer tokens.
 */
export async function usaMetodoDeContrasena(userId: string): Promise<boolean> {
  const filas = await conexionDeAuth<{ n: string }[]>`
    select count(*)::text as n
      from "account"
     where user_id = ${userId} and provider_id = 'credential' and password is not null
  `;
  return Number(filas[0]?.n ?? 0) > 0;
}

/**
 * Cambia la contraseña de la sesión en curso. **Exige la actual** (RF-93).
 *
 * Exigirla no es burocracia: sin ella, una sesión robada o una pestaña abierta
 * en un portátil prestado se convierten en el secuestro de la cuenta —quien la
 * tenga delante se pone la contraseña que quiera y ya no hace falta la sesión—.
 *
 * **Y cierra las demás sesiones**, por lo mismo que el restablecimiento
 * (`/api/acceso/restablecer`): quien cambia su contraseña suele hacerlo porque
 * sospecha; dejar vivas las sesiones anteriores deja dentro a quien motivó el
 * cambio. La de quien la cambia sobrevive, que es lo que hace usable la
 * operación.
 *
 * Devuelve `false` sin distinguir causas: la actual no coincide, la nueva es
 * corta, la cuenta no usa contraseña. Quien llama enseña un texto único.
 */
export async function cambiarContrasenaDeLaSesion(
  cabeceras: Headers,
  actual: string,
  nueva: string,
): Promise<boolean> {
  if (nueva.length < 12 || actual.length === 0) return false;
  try {
    const { auth } = await import("./better-auth.ts");
    const r = await auth.api.changePassword({
      body: { currentPassword: actual, newPassword: nueva, revokeOtherSessions: true },
      headers: cabeceras,
      asResponse: true,
    });
    return r.ok;
  } catch {
    return false;
  }
}
