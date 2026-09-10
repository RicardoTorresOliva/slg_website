/**
 * smtp-transport.ts — Implementación del puerto de correo sobre SMTP estándar.
 *
 * ÚNICO archivo del repositorio que puede importar `nodemailer` — o cualquier
 * otro cliente de proveedor. `scripts/email/check-email-encapsulado.ts` lo
 * vigila en CI (criterio 1 de FU-08). Nadie más habla con el transporte
 * directamente: todo pasa por `send.ts`.
 */

import nodemailer from "nodemailer";

import type { EmailSendResult, EmailTransport } from "./types.ts";
import { EmailSendError } from "./types.ts";
import type { MailConfig } from "./config.ts";

function clasificar(error: unknown): EmailSendError["clase"] {
  const codigo = (error as { code?: string } | undefined)?.code;
  if (codigo === "EAUTH") return "autenticacion";
  if (codigo === "ETIMEDOUT" || codigo === "ESOCKET") return "tiempo_agotado";
  if (codigo === "ECONNECTION" || codigo === "EDNS") return "red";
  if (codigo === "EENVELOPE" || codigo === "EMESSAGE") return "rechazo";
  return "desconocido";
}

/** Construye el transporte a partir de configuración, nunca de constantes. */
export function crearTransporteSmtp(cfg: MailConfig): EmailTransport {
  const transportador = nodemailer.createTransport({
    host: cfg.smtpHost,
    port: cfg.smtpPort,
    // 465 es TLS implícito; el resto (587, 25, catchers locales) usa STARTTLS
    // oportunista si el servidor lo anuncia. Convención SMTP estándar, no
    // configuración adicional: evita una cuarta variable no documentada en
    // `api_contracts` §11.3.
    secure: cfg.smtpPort === 465,
    auth: { user: cfg.smtpUsername, pass: cfg.smtpPassword },
  });

  return {
    async enviar(msg): Promise<EmailSendResult> {
      try {
        const info = await transportador.sendMail({
          to: msg.to,
          from: { address: msg.from, name: msg.fromName },
          replyTo: msg.replyTo,
          subject: msg.subject,
          text: msg.text,
        });
        // SMTP no da un identificador de proveedor separado del Message-ID
        // que el propio transporte genera; es el único puente estable que
        // ofrece el protocolo estándar (a diferencia de un SDK propietario).
        return { providerMessageId: info.messageId };
      } catch (error) {
        throw new EmailSendError(
          error instanceof Error ? error.message : "fallo de envío desconocido",
          clasificar(error),
        );
      }
    },
  };
}
