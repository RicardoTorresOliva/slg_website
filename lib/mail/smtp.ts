/**
 * smtp.ts — El adaptador. El ÚNICO archivo que sabe cómo se transporta un
 * correo, y el único que importa la librería de transporte.
 *
 * HABLA SMTP ESTÁNDAR, NO EL SDK DEL PROVEEDOR (D-22, D-36). Esa elección es la
 * que hace que cambiar de servicio cueste cuatro variables de entorno y ninguna
 * línea de código. Por eso **no existe ninguna variable con el nombre de un
 * producto**: el proveedor se configura poniendo su servidor en
 * `MAIL_SMTP_HOST` y su clave de API en `MAIL_SMTP_PASSWORD`, y la ausencia de
 * `<PRODUCTO>_API_KEY` es la decisión, no un olvido (`api_contracts` §11.3).
 *
 * Lo comprueba una prueba, no una promesa: la suite corre entera contra un
 * segundo destino configurado **solo por variables de entorno** (criterio 2).
 */

import nodemailer, { type Transporter } from "nodemailer";

import { ErrorDeCorreo, type EnvioAceptado, type MensajeSaliente, type PuertoDeCorreo } from "./port.ts";
import { componer } from "./templates.ts";

export type ConfiguracionSmtp = {
  readonly host: string;
  readonly port: number;
  readonly username: string;
  readonly password: string;
  readonly fromAddress: string;
  readonly fromName: string;
  readonly replyTo: string | null;
};

/** Falta una variable: se dice CUÁL y para qué sirve. */
function exigirVariable(nombre: string): string {
  const v = process.env[nombre];
  if (!v) {
    throw new ErrorDeCorreo(
      "autenticacion",
      `Falta la variable de entorno ${nombre}. Los nombres están en .env.example; ` +
        `los valores viven en Easypanel, nunca en el repositorio.`,
    );
  }
  return v;
}

/**
 * Lee la configuración del entorno. **Cada llamada la relee**: es lo que permite
 * que la prueba del criterio 2 apunte a un segundo destino cambiando variables,
 * sin reiniciar nada y sin tocar código.
 */
export function configuracionDelEntorno(): ConfiguracionSmtp {
  return {
    host: exigirVariable("MAIL_SMTP_HOST"),
    port: Number(exigirVariable("MAIL_SMTP_PORT")),
    username: exigirVariable("MAIL_SMTP_USERNAME"),
    password: exigirVariable("MAIL_SMTP_PASSWORD"),
    /**
     * D-24: vive en el subdominio de envío dedicado, no en la raíz. El brief
     * §5.1 y RF-117 dicen que el remitente es `support@softlandingglobal.com` y
     * quedan desactualizados desde D-24: `support@` es el Reply-To.
     */
    fromAddress: exigirVariable("MAIL_FROM_ADDRESS"),
    fromName: process.env.MAIL_FROM_NAME ?? "SLG Agency",
    replyTo: process.env.MAIL_REPLY_TO ?? null,
  };
}

/** Traduce el fallo del transporte a la clasificación del puerto. */
function clasificar(error: unknown): ErrorDeCorreo {
  const e = error as { code?: string; responseCode?: number; message?: string };
  const mensaje = e.message ?? String(error);

  if (e.code === "ETIMEDOUT" || e.code === "ESOCKET" || e.code === "ECONNECTION") {
    return new ErrorDeCorreo("tiempo_agotado", mensaje);
  }
  if (e.code === "EAUTH" || e.responseCode === 535 || e.responseCode === 530) {
    return new ErrorDeCorreo("autenticacion", mensaje);
  }
  // 5xx del servidor de correo: dijo que no. Repetirlo repite el mismo «no».
  if (typeof e.responseCode === "number" && e.responseCode >= 500) {
    return new ErrorDeCorreo("rechazo", mensaje);
  }
  if (e.code === "EENVELOPE" || e.code === "EMESSAGE") {
    return new ErrorDeCorreo("rechazo", mensaje);
  }
  return new ErrorDeCorreo("red", mensaje);
}

export function adaptadorSmtp(config: ConfiguracionSmtp = configuracionDelEntorno()): PuertoDeCorreo {
  let transporte: Transporter | null = null;

  const obtener = (): Transporter => {
    transporte ??= nodemailer.createTransport({
      host: config.host,
      port: config.port,
      // 465 es TLS implícito; el resto negocia STARTTLS. No se desactiva la
      // verificación de certificado en ningún caso: un correo con invitación
      // viaja con un enlace de acceso dentro.
      secure: config.port === 465,
      auth: { user: config.username, pass: config.password },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
    return transporte;
  };

  return {
    async enviar(mensaje: MensajeSaliente): Promise<EnvioAceptado> {
      const compuesto = componer(mensaje);

      try {
        const resultado = await obtener().sendMail({
          from: { name: config.fromName, address: config.fromAddress },
          to: mensaje.para,
          ...(config.replyTo ? { replyTo: config.replyTo } : {}),
          subject: compuesto.asunto,
          text: compuesto.texto,
          html: compuesto.html,
          /**
           * Sin cabeceras de campaña ni de seguimiento. `List-Unsubscribe` NO
           * se pone a propósito: estos cuatro correos son transaccionales —una
           * invitación que pediste, una contraseña que pediste, un aviso
           * interno—, no una lista de la que uno pueda darse de baja.
           */
        });

        return {
          providerMessageId: resultado.messageId,
          from: config.fromAddress,
          replyTo: config.replyTo,
          templateKey: compuesto.templateKey,
          subjectKey: compuesto.subjectKey,
        };
      } catch (error) {
        throw clasificar(error);
      }
    },

    async cerrar() {
      transporte?.close();
      transporte = null;
    },
  };
}
