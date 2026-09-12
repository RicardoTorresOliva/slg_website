/**
 * service.ts — Lo que llaman los casos de uso. Una función.
 *
 * `enviarCorreo()` hace tres cosas, en este orden y no en otro:
 *   1. escribe la fila de `email_delivery` —el hecho queda registrado antes de
 *      intentar nada—;
 *   2. intenta el envío ya, porque una invitación que tarda un minuto en salir
 *      es una invitación que el destinatario cree perdida;
 *   3. clasifica el resultado y deja la fila lista para el barrendero si toca.
 *
 * **NUNCA LANZA.** Es el criterio 5 y RF-119: un fallo de correo no puede
 * revertir la operación de negocio que lo originó. Quien invita, invita; quien
 * captura, captura. El correo es una consecuencia, no una condición.
 *
 * SOBRE EL REINTENTO DE LOS CORREOS CON ENLACE. `invitation` y `password_reset`
 * llevan un token de un solo uso que **no se guarda** (§8.2): sin él no se puede
 * recomponer el cuerpo, así que el barrendero no puede reintentarlos y los marca
 * `failed` con el motivo escrito. Eso no es una laguna: reintentar significa
 * **volver a emitir**, con un token nuevo y una caducidad nueva, y eso lo hace
 * quien invita (FU-07) o quien recupera (DU-01). Guardar el token para poder
 * reenviarlo convertiría la tabla de correo en un almacén de credenciales
 * activas. Los dos avisos internos sí se recomponen desde `lead_capture`, y de
 * eso se encarga DU-09.
 */

import { eq } from "drizzle-orm";

import { emailDelivery } from "../db/schema.ts";
import { withSystemScope } from "../db/scope.ts";
import { adaptadorSmtp, configuracionDelEntorno } from "./smtp.ts";
import { componer } from "./templates.ts";
import { encolarCorreo, MAXIMO_DE_INTENTOS } from "./queue.ts";
import {
  ErrorDeCorreo,
  type Idioma,
  type PuertoDeCorreo,
  type TipoDeCorreo,
} from "./port.ts";

export type ResultadoDeEnvio = {
  /** Siempre hay fila: el hecho se registra aunque el envío falle. */
  readonly emailDeliveryId: string;
  readonly estado: "delivered" | "pending" | "failed";
  readonly providerMessageId: string | null;
  /** Clasificado, saneado y apto para una pantalla de HQ. Nunca para el usuario final. */
  readonly error: string | null;
};

/** Destinatario de los avisos internos (RF-53, RF-50). */
export function destinatarioDeAvisos(): string {
  const v = process.env.MAIL_ALERTS_TO;
  if (!v) {
    throw new Error(
      "Falta MAIL_ALERTS_TO: es el buzón que recibe los avisos de captura y de fallo. " +
        "Sin él, un fallo de entrega al CRM no avisaría a nadie.",
    );
  }
  return v;
}

export async function enviarCorreo(entrada: {
  tipo: TipoDeCorreo;
  para: string;
  idioma: Idioma;
  datos: Readonly<Record<string, string>>;
  /** Inyectable para las pruebas; en producción sale del entorno. */
  puerto?: PuertoDeCorreo;
}): Promise<ResultadoDeEnvio> {
  const config = configuracionDelEntorno();
  const compuesto = componer({
    tipo: entrada.tipo,
    para: entrada.para,
    idioma: entrada.idioma,
    datos: entrada.datos,
  });

  const id = await encolarCorreo({
    tipo: entrada.tipo,
    para: entrada.para,
    idioma: entrada.idioma,
    from: config.fromAddress,
    replyTo: config.replyTo,
    templateKey: compuesto.templateKey,
    subjectKey: compuesto.subjectKey,
  });

  const puerto = entrada.puerto ?? adaptadorSmtp(config);

  try {
    const aceptado = await puerto.enviar({
      tipo: entrada.tipo,
      para: entrada.para,
      idioma: entrada.idioma,
      datos: entrada.datos,
    });

    await withSystemScope("marcar correo entregado en el primer intento (FU-08)", async (db) => {
      await db
        .update(emailDelivery)
        .set({
          status: "delivered",
          attempts: 1,
          providerMessageId: aceptado.providerMessageId,
          nextAttemptAt: null,
        })
        .where(eq(emailDelivery.id, id));
    });

    return {
      emailDeliveryId: id,
      estado: "delivered",
      providerMessageId: aceptado.providerMessageId,
      error: null,
    };
  } catch (error) {
    const e = error instanceof ErrorDeCorreo ? error : new ErrorDeCorreo("red", String(error));
    const texto = `${e.clase}: ${e.message}`.slice(0, 500);

    /**
     * Los dos correos con enlace no son reintentables por el barrendero —su
     * token no se guarda—, así que quedan `failed` desde el primer fallo, con el
     * motivo escrito. Que aparezcan en HQ como fallidos es el comportamiento
     * correcto: alguien tiene que volver a emitir.
     */
    const barrendero =
      entrada.tipo === "capture_notice" || entrada.tipo === "capture_failed_alert";
    const terminal = !e.reintentable || !barrendero;

    await withSystemScope("registrar fallo de correo (FU-08)", async (db) => {
      await db
        .update(emailDelivery)
        .set({
          status: terminal ? "failed" : "pending",
          attempts: 1,
          lastError: texto,
          nextAttemptAt: terminal ? null : new Date(Date.now() + 60_000),
        })
        .where(eq(emailDelivery.id, id));
    });

    return {
      emailDeliveryId: id,
      estado: terminal ? "failed" : "pending",
      providerMessageId: null,
      error: texto,
    };
  }
}

export { MAXIMO_DE_INTENTOS };
