/**
 * `lib/descargas` — la máquina que paga el proyecto (DU-08).
 *
 * **EL ORDEN DE LAS OPERACIONES ES EL REQUISITO**, no un detalle de
 * implementación:
 *
 *   1. Se verifica el envío (trampa, límite, dominio) — FU-11.
 *   2. **Se persiste el `lead_capture` ANTES de responder al visitante**
 *      (RF-37). Si se emitiera la URL primero y la escritura fallara después,
 *      se habría entregado el documento sin registrar el lead: el proyecto
 *      existe para lo contrario.
 *   3. Solo entonces se emite la URL firmada, y se registra el
 *      `download_event` con el instante de emisión y el de caducidad (RF-41).
 *
 * **El documento sin archivo captura igual** (RF-40, R-18): se guarda el lead,
 * no se emite firma y no se dispara `download.completed`. Es el caso que más se
 * rompe al implementarlo «cuando haya PDFs», y por eso está desde el principio.
 */
import { verificarEnvio, type Veredicto } from "../antiabuso/index.ts";
import { downloadEvent, leadCapture } from "../db/schema.ts";
import { withSystemScope } from "../db/scope.ts";
import { adaptadorS3 } from "../files/index.ts";
import { emitir } from "../webhooks/index.ts";

export type Documento = {
  slug: string;
  titulo: string;
  audiencia: string;
  aprende: readonly string[];
  estado: string;
  claveDeArchivo?: string;
};

export type ResultadoDeDescarga =
  | { ok: true; leadId: string; url: string | null; caducaEn: string | null; proximamente: boolean }
  | { ok: false; veredicto: Exclude<Veredicto, { ok: true }> }
  | { ok: false; veredicto: { ok: false; motivo: "error_de_firma" } };

/**
 * La versión de la política de privacidad que el visitante aceptó.
 *
 * Se guarda con la captura (RF-36) porque el consentimiento es **a un texto
 * concreto**: si mañana cambia la política, lo que esta persona aceptó sigue
 * siendo lo de hoy, y hay que poder demostrar cuál era.
 */
export function versionDePrivacidad(): string {
  return process.env.PRIVACY_POLICY_VERSION ?? "2026-09-13";
}

/**
 * Las tres puertas de entrada a la MISMA máquina (DU-10).
 *
 * Una descarga, el formulario de contacto y la solicitud del documento de
 * Doctrina recorren exactamente el mismo camino: verificación de FU-11,
 * captura antes de responder, y la misma cola de entrega al CRM. Lo único que
 * cambia es el `source` y si hay archivo que firmar.
 *
 * Tres caminos paralelos habrían sido tres sitios donde olvidarse del honeypot.
 */
export const ORIGENES = ["download", "contact", "doctrine-request"] as const;
export type Origen = (typeof ORIGENES)[number];

export async function registrarCaptura(entrada: {
  /** Sin documento —contacto, solicitud de doctrina— no hay nada que firmar. */
  documento?: Documento;
  origen: Origen;
  datos: FormData;
  email: string;
  nombre?: string;
  empresa?: string;
  cargo?: string;
  /**
   * Lo que la persona escribió en `/contacto`. Va al CRM dentro de la nota, no
   * a una columna propia: `lead_capture` no es un buzón (RF-57), y un mensaje
   * en la base de la web es un mensaje que nadie lee.
   */
  mensaje?: string;
  pagina: string;
  locale: string;
  utm?: Record<string, string>;
  ip?: string;
}): Promise<ResultadoDeDescarga> {
  const veredicto = await verificarEnvio({
    datos: entrada.datos,
    email: entrada.email,
    ip: entrada.ip,
  });
  if (!veredicto.ok) return { ok: false, veredicto };

  // ── 2 · El lead, ANTES de cualquier cosa que se le entregue al visitante ──
  const leadId = await withSystemScope(
    "DU-08 · la captura de la capa pública no pertenece a ninguna empresa cliente: " +
      "es un visitante anónimo, y todavía no hay sesión que acotar.",
    /**
     * Se inserta con el CONSTRUCTOR de Drizzle y no con SQL a mano, y no es
     * estilo: la columna `utm` es `jsonb`, y pasar un objeto por una plantilla
     * de SQL lo codifica **dos veces** —el conductor ya serializa—, así que la
     * fila acaba guardando la CADENA `"{\"utm\":…}"` en vez del objeto. Es un
     * fallo que no rompe nada el día que se escribe y aparece meses después,
     * al intentar consultar por una UTM.
     */
    async (db) => {
      const [fila] = await db
        .insert(leadCapture)
        .values({
          id: crypto.randomUUID(),
          email: veredicto.email,
          emailDomain: veredicto.dominio,
          name: entrada.nombre ?? null,
          company: entrada.empresa ?? null,
          jobTitle: entrada.cargo ?? null,
          message: entrada.mensaje ?? null,
          source: entrada.origen,
          downloadSlug: entrada.documento?.slug ?? null,
          pagePath: entrada.pagina,
          locale: entrada.locale,
          utm: entrada.utm ?? null,
          consentAt: new Date(),
          privacyVersion: versionDePrivacidad(),
        })
        .returning({ id: leadCapture.id });
      return fila?.id ?? "";
    },
  );

  // ── 2bis · Los eventos salientes (DU-12) ─────────────────────────────────
  // DESPUÉS de la escritura y NUNCA antes: un evento que anuncia un lead que no
  // llegó a guardarse es peor que no anunciar nada. `emitir` no lanza (RF-115),
  // así que esto no puede llevarse por delante la captura que ya está a salvo.
  //
  // `lead.captured` sale SIEMPRE, y además el evento propio del origen: quien
  // escucha todo no tiene que deducir de qué tipo era, y quien solo escucha
  // contactos no tiene que filtrar el resto.
  await emitir("lead.captured", {
    leadId,
    source: entrada.origen,
    emailDomain: veredicto.dominio,
    locale: entrada.locale,
    page: entrada.pagina,
  });
  if (entrada.origen === "contact") {
    await emitir("contact.submitted", {
      leadId,
      emailDomain: veredicto.dominio,
      locale: entrada.locale,
    });
  }
  if (entrada.origen === "doctrine-request") {
    await emitir("doctrine.requested", {
      leadId,
      emailDomain: veredicto.dominio,
      locale: entrada.locale,
    });
  }

  // ── 3 · La entrega. Solo si hay archivo ──────────────────────────────────
  // Contacto y solicitud de doctrina no traen documento: se quedan aquí, con
  // su captura guardada, que es todo lo que tenían que hacer.
  // Se atan ANTES del `if` para que la comprobación las estreche a las dos, y
  // sigan estrechadas dentro del `try` y del callback.
  const documento = entrada.documento;
  const claveDeArchivo = documento?.claveDeArchivo;

  if (!documento || !claveDeArchivo || documento.estado !== "available") {
    // «Disponible próximamente»: se capturó el correo y NO se emite firma ni se
    // dispara `download.completed` (RF-40).
    return { ok: true, leadId, url: null, caducaEn: null, proximamente: true };
  }

  try {
    // `adaptadorS3()` DENTRO del try: si faltan sus variables lanza, y esto
    // tiene que contarlo, no romperse.
    const firmada = await adaptadorS3().firmarDescarga({
      bucket: "downloads",
      clave: claveDeArchivo,
      uso: "download",
      nombreDeDescarga: `${documento.slug}.pdf`,
    });
    // La caducidad la dice el propio puerto: es el instante que firmó, no uno
    // recalculado aquí, que se desviaría por los milisegundos de la llamada.
    const caduca = firmada.caducaEn;

    await withSystemScope(
      "DU-08 · el evento de descarga acompaña a una captura anónima de la capa pública.",
      async (db) => {
        await db.insert(downloadEvent).values({
          id: crypto.randomUUID(),
          leadCaptureId: leadId,
          downloadSlug: documento.slug,
          signedUrlIssuedAt: new Date(),
          signedUrlExpiresAt: caduca,
        });
      },
    );

    // `download.completed` solo aquí: el documento «próximamente» NO lo dispara
    // (RF-40), y el fallo de firma tampoco, porque sale antes por el `catch`.
    await emitir("download.completed", {
      leadId,
      downloadSlug: documento.slug,
      locale: entrada.locale,
    });

    return { ok: true, leadId, url: firmada.url, caducaEn: caduca.toISOString(), proximamente: false };
  } catch {
    // El lead YA está guardado: el fallo de la firma no se lo lleva por delante.
    // Es exactamente por eso que el orden de las operaciones es el que es.
    return { ok: false, veredicto: { ok: false, motivo: "error_de_firma" } };
  }
}
