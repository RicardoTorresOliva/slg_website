/**
 * templates.ts — Las cuatro plantillas, en los dos idiomas.
 *
 * DOS REGLAS QUE SE DEFIENDEN EN CADA REVISIÓN:
 *
 * 1. **Cero seguimiento.** Ni píxel de apertura, ni enlaces reescritos, ni
 *    parámetros de campaña. El seguimiento está desactivado por dominio en el
 *    panel del proveedor (D-22), y aquí no hay nada que activarlo pudiera
 *    aprovechar. `data_model` §5.19 remata la garantía: el esquema **no tiene
 *    dónde** guardar una apertura.
 * 2. **Texto plano primero.** Cada correo lleva su versión de texto, no como
 *    cortesía sino porque los tres de la v1 —invitación, recuperación y avisos—
 *    son funcionales: si el HTML no carga, el enlace tiene que seguir estando.
 *
 * El cuerpo compuesto **no se guarda**: a `email_delivery` van `template_key` y
 * `subject_key`, no el texto (§8.2). Un token de recuperación que viaje en
 * `datos` no acaba en ninguna tabla.
 */

import type { Idioma, MensajeSaliente, TipoDeCorreo } from "./port.ts";

export type CorreoCompuesto = {
  readonly asunto: string;
  readonly texto: string;
  readonly html: string;
  readonly templateKey: string;
  readonly subjectKey: string;
};

/** Escapa antes de interpolar en HTML. Los datos vienen de fuera. */
function escapar(valor: string): string {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function exigir(datos: Readonly<Record<string, string>>, clave: string): string {
  const v = datos[clave];
  if (typeof v !== "string" || v.length === 0) {
    throw new Error(
      `La plantilla exige el dato «${clave}» y no llegó. Un correo con un hueco ` +
        `sin rellenar es peor que un correo que no sale: el destinatario lo ve.`,
    );
  }
  return v;
}

type Definicion = {
  readonly subjectKey: string;
  readonly asunto: Readonly<Record<Idioma, string>>;
  readonly componer: (
    datos: Readonly<Record<string, string>>,
    idioma: Idioma,
  ) => { texto: string; parrafos: string[]; enlace?: { url: string; etiqueta: string } };
};

const DEFINICIONES: Readonly<Record<TipoDeCorreo, Definicion>> = {
  invitation: {
    subjectKey: "mail.invitation.subject",
    asunto: {
      es: "Te han invitado a SLG Agency",
      en: "You have been invited to SLG Agency",
    },
    componer: (datos, idioma) => {
      const quien = exigir(datos, "invitadoPor");
      const url = exigir(datos, "url");
      const empresa = datos.empresa ?? "";
      const es = idioma === "es";
      const parrafos = es
        ? [
            `${quien} te ha invitado a acceder${empresa ? ` al espacio de ${empresa}` : ""} en SLG Agency.`,
            "El enlace caduca; si expira, pide una invitación nueva.",
          ]
        : [
            `${quien} has invited you to access${empresa ? ` the ${empresa} space` : ""} at SLG Agency.`,
            "The link expires; if it does, ask for a new invitation.",
          ];
      return {
        texto: `${parrafos.join("\n\n")}\n\n${url}\n`,
        parrafos,
        enlace: { url, etiqueta: es ? "Aceptar la invitación" : "Accept the invitation" },
      };
    },
  },

  password_reset: {
    subjectKey: "mail.password_reset.subject",
    asunto: {
      es: "Restablecer tu contraseña",
      en: "Reset your password",
    },
    componer: (datos, idioma) => {
      const url = exigir(datos, "url");
      const es = idioma === "es";
      const parrafos = es
        ? [
            "Hemos recibido una solicitud para restablecer tu contraseña.",
            "El enlace sirve una sola vez y caduca. **Si no lo pediste, ignora este correo**: sin abrirlo, no cambia nada.",
          ]
        : [
            "We received a request to reset your password.",
            "The link works once and expires. **If you did not request it, ignore this email**: nothing changes unless you open it.",
          ];
      return {
        texto: `${parrafos.join("\n\n")}\n\n${url}\n`,
        parrafos,
        enlace: { url, etiqueta: es ? "Restablecer la contraseña" : "Reset password" },
      };
    },
  },

  /**
   * Avisos internos. Van a `MAIL_ALERTS_TO` y los lee una persona de SLG, así
   * que el idioma es siempre el del equipo y el cuerpo prioriza el dato sobre
   * la cortesía.
   */
  capture_notice: {
    subjectKey: "mail.capture_notice.subject",
    asunto: {
      es: "Nueva captura web entregada al CRM",
      en: "New web capture delivered to the CRM",
    },
    componer: (datos) => {
      const correo = exigir(datos, "correo");
      const origen = exigir(datos, "origen");
      const url = exigir(datos, "urlCrm");
      const parrafos = [
        `Captura de ${correo} desde ${origen}.`,
        datos.documento ? `Documento: ${datos.documento}.` : "",
        datos.utm ? `UTM: ${datos.utm}.` : "",
      ].filter(Boolean);
      return {
        texto: `${parrafos.join("\n")}\n\n${url}\n`,
        parrafos,
        enlace: { url, etiqueta: "Abrir la ficha en el CRM" },
      };
    },
  },

  capture_failed_alert: {
    subjectKey: "mail.capture_failed_alert.subject",
    asunto: {
      es: "Captura web SIN entregar al CRM tras cinco intentos",
      en: "Web capture NOT delivered to the CRM after five attempts",
    },
    componer: (datos) => {
      const correo = exigir(datos, "correo");
      const url = exigir(datos, "urlHq");
      const parrafos = [
        `La captura de ${correo} agotó los cinco intentos y quedó en «failed».`,
        datos.ultimoError ? `Último error: ${datos.ultimoError}.` : "",
        "El lead NO está perdido: la captura y el documento entregado siguen registrados. Se reintenta a mano desde HQ.",
      ].filter(Boolean);
      return {
        texto: `${parrafos.join("\n")}\n\n${url}\n`,
        parrafos,
        enlace: { url, etiqueta: "Ver la captura en HQ" },
      };
    },
  },
};

/**
 * HTML deliberadamente pobre: una tabla, texto y un enlace.
 *
 * Sin imágenes remotas —cada una sería un píxel de seguimiento en potencia—,
 * sin fuentes externas y sin CSS que los clientes de correo van a recortar de
 * todas formas. Un correo transaccional se lee, no se admira.
 */
function envolver(parrafos: string[], enlace?: { url: string; etiqueta: string }): string {
  const cuerpo = parrafos.map((p) => `<p style="margin:0 0 16px">${escapar(p)}</p>`).join("");
  const boton = enlace
    ? `<p style="margin:24px 0"><a href="${escapar(enlace.url)}" style="color:#2878B4">${escapar(
        enlace.etiqueta,
      )}</a></p><p style="margin:0;font-size:12px;color:#5A6672">${escapar(enlace.url)}</p>`
    : "";
  return (
    `<!doctype html><html><body style="margin:0;padding:24px;` +
    `font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;` +
    `font-size:15px;line-height:1.6;color:#1A2430">` +
    `<div style="max-width:560px">${cuerpo}${boton}</div></body></html>`
  );
}

export function componer(mensaje: MensajeSaliente): CorreoCompuesto {
  const def = DEFINICIONES[mensaje.tipo];
  if (!def) throw new Error(`Tipo de correo desconocido: ${mensaje.tipo}`);

  const { texto, parrafos, enlace } = def.componer(mensaje.datos, mensaje.idioma);

  return {
    asunto: def.asunto[mensaje.idioma],
    texto,
    html: envolver(parrafos, enlace),
    templateKey: `mail.${mensaje.tipo}`,
    subjectKey: def.subjectKey,
  };
}
