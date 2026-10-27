/**
 * templates.ts — Las plantillas de correo, en los dos idiomas.
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
import { sitio } from "../sitio/index.ts";

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
      es: `Te han invitado a ${sitio.marca.nombre}`,
      en: `You have been invited to ${sitio.marca.nombre}`,
    },
    componer: (datos, idioma) => {
      const quien = exigir(datos, "invitadoPor");
      const url = exigir(datos, "url");
      const empresa = datos.empresa ?? "";
      const es = idioma === "es";
      const parrafos = es
        ? [
            `${quien} te ha invitado a acceder${empresa ? ` al espacio de ${empresa}` : ""} en ${sitio.marca.nombre}.`,
            "El enlace caduca; si expira, pide una invitación nueva.",
          ]
        : [
            `${quien} has invited you to access${empresa ? ` the ${empresa} space` : ""} at ${sitio.marca.nombre}.`,
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

  /**
   * El aviso de un sitio SIN CRM (plantilla, paso 5b). A diferencia de los dos
   * avisos de arriba, **lo lee el cliente**, no el equipo que opera el sitio:
   * por eso va en el idioma principal de la ficha y no en el del equipo, y por
   * eso cuenta el contacto entero —nombre, correo, de dónde vino, qué pidió y
   * qué escribió—. Con CRM, el aviso enlaza a la ficha y basta; aquí no hay
   * ficha: el correo es todo lo que el cliente va a ver de ese contacto.
   *
   * El mensaje de la persona va **partido en párrafos**: el HTML de `envolver`
   * no respeta los saltos de línea, y un mensaje de cinco líneas leído como una
   * sola es un mensaje que se lee mal.
   */
  capture_inbox_notice: {
    subjectKey: "mail.capture_inbox_notice.subject",
    asunto: {
      es: "Nuevo contacto desde la web",
      en: "New contact from the website",
    },
    componer: (datos, idioma) => {
      // Nombre y apellido son obligatorios en todo formulario público, pero una
      // captura anterior a la columna `last_name` que se reintente no los trae:
      // sin ellos el aviso tiene que salir igual, con el correo por delante.
      const correo = exigir(datos, "correo");
      const quien = [datos.nombre, datos.apellido].filter(Boolean).join(" ");
      const origen = exigir(datos, "origen");
      const pagina = exigir(datos, "pagina");
      const es = idioma === "es";
      const origenes: Readonly<Record<string, string>> = es
        ? {
            download: "descarga de un documento",
            contact: "formulario de contacto",
            "doctrine-request": "solicitud del documento de Doctrina",
          }
        : {
            download: "document download",
            contact: "contact form",
            "doctrine-request": "Doctrine document request",
          };
      const deDonde = origenes[origen] ?? origen;
      const mensaje = (datos.mensaje ?? "")
        .split(/\n+/)
        .map((l) => l.trim())
        .filter(Boolean);

      const parrafos = es
        ? [
            `${quien ? `${quien} <${correo}>` : correo} ha dejado sus datos en la web.`,
            `Origen: ${deDonde}.`,
            `Página: ${pagina}`,
            datos.documento ? `Documento que pidió: ${datos.documento}.` : "",
            datos.empresa ? `Empresa: ${datos.empresa}.` : "",
            datos.cargo ? `Cargo: ${datos.cargo}.` : "",
            datos.idiomaDelContacto ? `Idioma en el que navegaba: ${datos.idiomaDelContacto}.` : "",
            mensaje.length ? "Su mensaje:" : "",
            ...mensaje,
            `Para contestarle, escribe directamente a ${correo}.`,
            "Este sitio no está conectado a ningún CRM: este correo es el aviso, y la captura queda guardada en la web.",
          ]
        : [
            `${quien ? `${quien} <${correo}>` : correo} left their details on the website.`,
            `Source: ${deDonde}.`,
            `Page: ${pagina}`,
            datos.documento ? `Document requested: ${datos.documento}.` : "",
            datos.empresa ? `Company: ${datos.empresa}.` : "",
            datos.cargo ? `Job title: ${datos.cargo}.` : "",
            datos.idiomaDelContacto ? `Language they were browsing in: ${datos.idiomaDelContacto}.` : "",
            mensaje.length ? "Their message:" : "",
            ...mensaje,
            `To answer, write directly to ${correo}.`,
            "This site is not connected to any CRM: this email is the notice, and the capture stays stored on the website.",
          ];
      const limpios = parrafos.filter(Boolean);
      const url = datos.urlHq;
      return {
        texto: `${limpios.join("\n")}\n${url ? `\n${url}\n` : ""}`,
        parrafos: limpios,
        ...(url ? { enlace: { url, etiqueta: es ? "Ver la captura en HQ" : "View the capture in HQ" } } : {}),
      };
    },
  },

  backup_failed_alert: {
    subjectKey: "mail.backup_failed_alert.subject",
    asunto: {
      es: "La copia de seguridad de hoy NO se ha completado",
      en: "Today's backup did NOT complete",
    },
    componer: (datos) => {
      const fecha = exigir(datos, "fecha");
      const parrafos = [
        `La copia de seguridad de ${fecha} no terminó.`,
        datos.motivo ? `Motivo: ${datos.motivo}` : "",
        // Lo que hay que saber para decidir, no para diagnosticar: el detalle
        // completo está en el registro del cron, que no sale de la máquina.
        "Las copias anteriores siguen donde estaban: esto no ha destruido nada. " +
          "Lo que falta es la de hoy, así que revísalo antes de la próxima ventana.",
      ].filter(Boolean);
      return { texto: `${parrafos.join("\n")}\n`, parrafos };
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
