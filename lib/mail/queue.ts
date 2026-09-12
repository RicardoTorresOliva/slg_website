/**
 * queue.ts — La cola de correo: la tabla, no la memoria.
 *
 * MISMA FORMA QUE LAS OTRAS DOS COLAS (`architecture` §6.1). No hay tres
 * mecanismos que mantener: hay uno aplicado tres veces, con el mismo vocabulario
 * de estado (`pending`/`delivered`/`failed`), la misma espera creciente y el
 * mismo índice parcial.
 *
 * CRITERIO 5 DE FU-08 — un fallo de envío **no pierde el hecho de negocio**. Por
 * eso el orden es: primero la fila, después el intento. Si el proceso muere
 * entre las dos cosas, al arrancar hay una fila `pending` esperando; si muriera
 * al revés, el correo se habría intentado sin que nadie pudiera saberlo.
 *
 * LO QUE NO ENTRA EN LA TABLA (§8.2, prohibiciones): el cuerpo del correo, el
 * token de invitación, el de recuperación, y cualquier apertura o clic. Van
 * `template_key` y `subject_key`; el texto se compone en el momento del envío y
 * se olvida.
 */

import { and, asc, eq, lte, or, isNull, sql } from "drizzle-orm";

import { emailDelivery } from "../db/schema.ts";
import { withSystemScope } from "../db/scope.ts";
import { adaptadorSmtp } from "./smtp.ts";
import {
  ErrorDeCorreo,
  type Idioma,
  type MensajeSaliente,
  type PuertoDeCorreo,
  type TipoDeCorreo,
} from "./port.ts";

/**
 * Las cinco esperas, en minutos, y el tope de cinco intentos.
 *
 * Son las de B.6-3, que el brief escribe para la cola del CRM; `architecture`
 * §6.1 declara que las tres colas comparten forma, así que compartir la
 * escalera evita que el correo tenga su propia curva que nadie recuerde.
 * **Cada espera PRECEDE a su intento** (D-30): con cinco esperas y cinco
 * intentos, no encajan de otra manera.
 */
const ESPERAS_EN_MINUTOS = [1, 10, 60, 360, 1440] as const;
export const MAXIMO_DE_INTENTOS = ESPERAS_EN_MINUTOS.length;

function proximoIntento(intentosHechos: number): Date | null {
  const espera = ESPERAS_EN_MINUTOS[intentosHechos];
  if (espera === undefined) return null; // agotado
  return new Date(Date.now() + espera * 60_000);
}

export type CorreoEnCola = {
  readonly id: string;
  readonly tipo: TipoDeCorreo;
  readonly para: string;
};

/**
 * Encola un correo y devuelve su identificador.
 *
 * **No envía.** Quien llama termina su operación de negocio sin esperar al
 * proveedor: el barrendero se encarga. Es lo que hace que un proveedor de correo
 * caído no tumbe una invitación ni una captura (RF-119).
 */
export async function encolarCorreo(entrada: {
  tipo: TipoDeCorreo;
  para: string;
  idioma: Idioma;
  from: string;
  replyTo: string | null;
  templateKey: string;
  subjectKey: string;
}): Promise<string> {
  return withSystemScope("encolar un correo transaccional (FU-08)", async (db) => {
    const [fila] = await db
      .insert(emailDelivery)
      .values({
        id: crypto.randomUUID(),
        kind: entrada.tipo,
        toEmail: entrada.para,
        fromEmail: entrada.from,
        replyTo: entrada.replyTo,
        templateKey: entrada.templateKey,
        subjectKey: entrada.subjectKey,
        locale: entrada.idioma,
        status: "pending",
        attempts: 0,
        // Vencida desde ya: el primer intento no espera.
        nextAttemptAt: new Date(),
      })
      .returning({ id: emailDelivery.id });
    return fila.id;
  });
}

export type ResultadoDelBarrido = {
  readonly reclamados: number;
  readonly entregados: number;
  readonly reintentables: number;
  readonly fallidos: number;
};

/**
 * Una vuelta del barrendero.
 *
 * RESERVA CON PLAZO (§6.3): reclamar y procesar son dos cosas distintas, y entre
 * ellas puede morir el proceso. La reclamación es una transacción corta que
 * **empuja `next_attempt_at` hacia delante**; si el proceso muere después, la
 * fila vuelve a estar disponible cuando ese plazo venza, en vez de quedarse
 * reservada para siempre por un trabajador que ya no existe.
 *
 * ACOTADO POR LOTE, y ordenado por vencimiento: un barrido sin tope convierte
 * una caída larga del proveedor en una avalancha el minuto en que vuelve.
 */
export async function barrerCorreo(opciones?: {
  lote?: number;
  puerto?: PuertoDeCorreo;
  /** Los datos de plantilla no se persisten: quien reintenta los vuelve a dar. */
  datosPara?: (fila: CorreoEnCola) => Readonly<Record<string, string>> | null;
}): Promise<ResultadoDelBarrido> {
  const lote = opciones?.lote ?? 20;
  const puerto = opciones?.puerto ?? adaptadorSmtp();

  const reclamadas = await withSystemScope("reclamar correos vencidos (FU-08)", async (db) => {
    const candidatas = await db
      .select({
        id: emailDelivery.id,
        kind: emailDelivery.kind,
        toEmail: emailDelivery.toEmail,
        locale: emailDelivery.locale,
        attempts: emailDelivery.attempts,
      })
      .from(emailDelivery)
      .where(
        and(
          eq(emailDelivery.status, "pending"),
          or(isNull(emailDelivery.nextAttemptAt), lte(emailDelivery.nextAttemptAt, new Date())),
        ),
      )
      .orderBy(asc(emailDelivery.nextAttemptAt))
      .limit(lote)
      .for("update", { skipLocked: true });

    for (const c of candidatas) {
      // Plazo de reserva: si este trabajador muere, la fila se libera sola.
      await db
        .update(emailDelivery)
        .set({ nextAttemptAt: new Date(Date.now() + 5 * 60_000) })
        .where(eq(emailDelivery.id, c.id));
    }
    return candidatas;
  });

  let entregados = 0;
  let reintentables = 0;
  let fallidos = 0;

  for (const fila of reclamadas) {
    const datos =
      opciones?.datosPara?.({
        id: fila.id,
        tipo: fila.kind as TipoDeCorreo,
        para: fila.toEmail,
      }) ?? null;

    if (datos === null) {
      // Sin datos de plantilla no hay correo que componer. No es un fallo del
      // proveedor: es una fila que nadie puede completar, y fingir un reintento
      // solo la haría reaparecer cinco veces.
      await marcarFallida(fila.id, fila.attempts, "sin datos de plantilla para recomponer el correo");
      fallidos++;
      continue;
    }

    const mensaje: MensajeSaliente = {
      tipo: fila.kind as TipoDeCorreo,
      para: fila.toEmail,
      idioma: fila.locale as Idioma,
      datos,
    };

    try {
      const aceptado = await puerto.enviar(mensaje);
      await withSystemScope("marcar correo entregado (FU-08)", async (db) => {
        await db
          .update(emailDelivery)
          .set({
            status: "delivered",
            attempts: fila.attempts + 1,
            providerMessageId: aceptado.providerMessageId,
            nextAttemptAt: null,
            lastError: null,
          })
          .where(eq(emailDelivery.id, fila.id));
      });
      entregados++;
    } catch (error) {
      const e = error instanceof ErrorDeCorreo ? error : new ErrorDeCorreo("red", String(error));
      const intentos = fila.attempts + 1;
      const siguiente = e.reintentable ? proximoIntento(intentos) : null;

      if (siguiente === null) {
        await marcarFallida(fila.id, fila.attempts, `${e.clase}: ${sanear(e.message)}`);
        fallidos++;
      } else {
        await withSystemScope("reprogramar correo (FU-08)", async (db) => {
          await db
            .update(emailDelivery)
            .set({
              attempts: intentos,
              nextAttemptAt: siguiente,
              lastError: `${e.clase}: ${sanear(e.message)}`,
            })
            .where(eq(emailDelivery.id, fila.id));
        });
        reintentables++;
      }
    }
  }

  return { reclamados: reclamadas.length, entregados, reintentables, fallidos };
}

async function marcarFallida(id: string, intentosPrevios: number, error: string): Promise<void> {
  await withSystemScope("marcar correo fallido (FU-08)", async (db) => {
    await db
      .update(emailDelivery)
      .set({
        status: "failed",
        attempts: intentosPrevios + 1,
        nextAttemptAt: null,
        lastError: error,
      })
      .where(eq(emailDelivery.id, id));
  });
}

/**
 * El error del proveedor va a la base de datos y de ahí a una pantalla de HQ.
 * Puede traer la dirección, un identificador o parte de la cabecera: se recorta
 * y se le quita cualquier cosa con forma de credencial.
 */
function sanear(mensaje: string): string {
  return mensaje
    .replace(/\b(?:AKIA|re_|sk-|xox[abprs]-)[A-Za-z0-9_-]+/g, "[credencial]")
    .replace(/\s+/g, " ")
    .slice(0, 500);
}

/** Cuenta por estado. La usa HQ y la usan las pruebas. */
export async function recuentoDeCola(): Promise<Record<string, number>> {
  return withSystemScope("contar la cola de correo (FU-08)", async (db) => {
    const filas = await db
      .select({ status: emailDelivery.status, n: sql<number>`count(*)::int` })
      .from(emailDelivery)
      .groupBy(emailDelivery.status);
    return Object.fromEntries(filas.map((f) => [f.status, f.n]));
  });
}
