import { randomUUID } from "node:crypto";

import { esDominioDeCorreoGratuito } from "../anti-abuse/free-email-domains.ts";
import { esHoneypotRelleno } from "../anti-abuse/honeypot.ts";
import { verificarLimiteDePeticiones } from "../anti-abuse/rate-limit.ts";
import { withSystemScope } from "../db/scope.ts";
import { downloadEvent, leadCapture } from "../db/schema.ts";
import { crearClienteS3, emitirUrlFirmadaDeDescarga, leerFilesConfig } from "../files/index.ts";

/**
 * Captura de un lead y entrega del documento (DU-08).
 *
 * El orden de los pasos **es** el requisito, no un detalle de implementación:
 * la captura se persiste ANTES de responder al visitante (RF-37, criterio 5).
 * Si el proceso muriera justo después de responder, el lead ya está guardado;
 * al revés, un lead que se pierde no se recupera de ninguna parte. Y la
 * entrega al CRM **no ocurre aquí**: es asíncrona, en segundo plano (RF-39).
 * El visitante nunca espera al CRM.
 */

export type DatosDeCaptura = {
  nombre: string;
  correo: string;
  empresa: string;
  cargo: string;
  mensaje?: string;
  consentAt: string;
  honeypot: string;
};

export type ContextoDeCaptura = {
  /** `download` · `contact` · `doctrine-request` (RF-43, RF-44). */
  origen: string;
  /** Slug del documento pedido; `null` en contacto y solicitud de Doctrina. */
  slugDeDescarga: string | null;
  /** Clave del archivo en el bucket privado; `null` si todavía no existe (RF-40). */
  claveDeArchivo: string | null;
  rutaDePagina: string;
  locale: string;
  utm: Record<string, string> | null;
  /** Para el límite de peticiones: no se persiste. */
  ip: string;
};

export type ResultadoDeCaptura =
  | { estado: "exito"; hayArchivo: true; url: string; expiraEn: Date; eventoId: string }
  | { estado: "exito"; hayArchivo: false }
  | { estado: "limite" }
  | { estado: "dominio_gratuito" }
  | { estado: "error_servidor" };

/** Ventana del límite de peticiones del formulario público (RF-34). */
const LIMITE = { peticiones: 5, ventanaSegundos: 600 };

/**
 * Versión de la política de privacidad vigente en el momento del consentimiento.
 *
 * Se guarda con cada captura porque un consentimiento sin saber **a qué** se
 * consintió no sirve como prueba: la política cambia y el registro tiene que
 * decir cuál estaba publicada ese día (RF-36).
 *
 * Vive en variable de entorno, no como constante, para que actualizar la
 * política no exija desplegar código. Mientras F.2-1 no entregue el texto
 * legal real, el valor por defecto deja la marca explícita de que el texto
 * todavía no existe — es preferible a escribir "v1" y aparentar una versión
 * que nadie ha redactado.
 */
function versionDePrivacidad(): string {
  return process.env.PRIVACY_POLICY_VERSION?.trim() || "sin-publicar";
}

export async function capturar(
  datos: DatosDeCaptura,
  contexto: ContextoDeCaptura,
): Promise<ResultadoDeCaptura> {
  // ─── 1. Honeypot: se descarta EN SILENCIO ────────────────────────────────
  // Responder "éxito" a un bot es deliberado: un mensaje de error le dice qué
  // corregir. El visitante humano nunca ve esta rama porque nunca rellena un
  // campo que no puede ver (FU-11).
  // Se responde SIEMPRE `hayArchivo: false`, aunque el documento exista: un bot
  // no se lleva la URL firmada, y tampoco se entera de que fue detectado.
  if (esHoneypotRelleno(datos.honeypot)) return { estado: "exito", hayArchivo: false };

  const correo = datos.correo.trim().toLowerCase();
  const dominio = correo.split("@")[1] ?? "";

  try {
    // ─── 2. Límite de peticiones, por IP y por correo ──────────────────────
    // Dos claves, no una: por IP frena a quien prueba muchos correos desde un
    // sitio; por correo frena a quien rota de IP con el mismo correo.
    for (const [tipoDeClave, valorDeClave] of [
      ["ip", contexto.ip],
      ["email", correo],
    ] as const) {
      const { permitido } = await verificarLimiteDePeticiones({
        accion: `captura:${contexto.origen}`,
        tipoDeClave,
        valorDeClave,
        limite: LIMITE.peticiones,
        ventanaSegundos: LIMITE.ventanaSegundos,
      });
      if (!permitido) return { estado: "limite" };
    }

    // ─── 3. Dominio de correo gratuito ─────────────────────────────────────
    // El servidor es la autoridad (RNF-33): el formulario ya avisa en cliente,
    // pero esa comprobación se salta con una petición directa.
    if (await esDominioDeCorreoGratuito(correo)) return { estado: "dominio_gratuito" };

    // ─── 4. Persistir la captura ANTES de responder (RF-37) ────────────────
    const capturaId = await withSystemScope(
      "captura pública de lead desde el sitio web (RF-37); no pertenece a ninguna empresa cliente",
      async (db) => {
        const [fila] = await db
          .insert(leadCapture)
          .values({
            id: randomUUID(),
            email: correo,
            emailDomain: dominio,
            name: datos.nombre.trim() || null,
            company: datos.empresa.trim() || null,
            jobTitle: datos.cargo.trim() || null,
            source: contexto.origen,
            downloadSlug: contexto.slugDeDescarga,
            pagePath: contexto.rutaDePagina,
            locale: contexto.locale,
            utm: contexto.utm ?? undefined,
            consentAt: new Date(datos.consentAt),
            privacyVersion: versionDePrivacidad(),
          })
          .returning({ id: leadCapture.id });
        return fila.id;
      },
    );

    // ─── 5. Sin archivo: se captura igual y NO se emite firma (RF-40) ──────
    // Criterio 7: tampoco se registra `download_event`, porque no ha habido
    // descarga que registrar — inventar el evento falsearía la métrica.
    if (!contexto.claveDeArchivo) return { estado: "exito", hayArchivo: false };

    // ─── 6. Entrega SOLO por URL firmada con caducidad (RF-38) ─────────────
    const cfg = leerFilesConfig();
    const { url, expiresAt } = await emitirUrlFirmadaDeDescarga(crearClienteS3(cfg), cfg, {
      bucket: "downloads",
      key: contexto.claveDeArchivo,
    });

    const eventoId = await withSystemScope(
      "registro de emisión de URL firmada de descarga (RF-41)",
      async (db) => {
        const [fila] = await db
          .insert(downloadEvent)
          .values({
            id: randomUUID(),
            leadCaptureId: capturaId,
            downloadSlug: contexto.slugDeDescarga!,
            signedUrlIssuedAt: new Date(),
            signedUrlExpiresAt: expiresAt,
          })
          .returning({ id: downloadEvent.id });
        return fila.id;
      },
    );

    return { estado: "exito", hayArchivo: true, url, expiraEn: expiresAt, eventoId };
  } catch {
    // No se filtra el detalle al visitante: el mensaje de error de un formulario
    // público es una superficie de información gratuita para quien sondea.
    return { estado: "error_servidor" };
  }
}
