/**
 * La cola de entrega al CRM — **la cola ES la tabla** (R-23, criterio 5).
 *
 * Nada vive en memoria del contenedor salvo el temporizador. Un reinicio no
 * pierde una sola captura: al arrancar, las filas vencidas siguen ahí y se
 * entregan. Es la diferencia entre una cola y una lista en RAM, y la razón por
 * la que R-23 existe.
 *
 * **La reserva y la ejecución son dos cosas distintas.** Se reclama un lote en
 * una transacción corta con `FOR UPDATE SKIP LOCKED` —dos barridos nunca toman
 * la misma fila— y se empuja su `crm_next_attempt_at` al plazo de reserva. Si el
 * proceso muere a mitad, la fila vuelve a estar disponible cuando ese plazo
 * vence: no se queda bloqueada para siempre.
 *
 * **La escalera de espera es la de RF-50**: 1 min → 10 min → 1 h → 6 h → 24 h, y
 * al quinto fallo la captura pasa a `failed`, avisa por correo y queda visible
 * en HQ.
 */
import { sql } from "drizzle-orm";

import { destinatarioDeAvisos, enviarCorreo } from "../mail/index.ts";
import { withSystemScope } from "../db/scope.ts";

import { adaptadorContactNote } from "./contact-note.ts";
import { adaptadorLeadAdmission } from "./lead-admission.ts";
import { enlaceAlContacto, MODOS_DE_CRM, type CapturaParaCrm, type ModoDeCrm, type PuertoDeCrm } from "./port.ts";

/** Los cinco escalones de RF-50, en minutos. El sexto no existe: es `failed`. */
export const ESCALERA_MINUTOS = [1, 10, 60, 6 * 60, 24 * 60] as const;
export const MAX_INTENTOS = ESCALERA_MINUTOS.length;

/**
 * Cada cuánto barre.
 *
 * **Tiene que ser MENOR que el escalón más corto** (1 minuto), o la espera real
 * no sería la especificada y el gate D7 mediría otra cosa. 20 segundos deja
 * margen de sobra y no compite con el tráfico: el volumen de la v1 son unas
 * pocas capturas al día.
 */
export const INTERVALO_MS = Number(process.env.CRM_QUEUE_INTERVAL_MS ?? 20_000);

/** Cuántas filas por vuelta. Sin tope, una caída larga del CRM vuelve como avalancha. */
const LOTE = Number(process.env.CRM_QUEUE_BATCH ?? 10);

/** Cuánto se reserva una fila mientras se procesa. */
const RESERVA_MINUTOS = 5;

export function modoActivo(): ModoDeCrm {
  const v = process.env.CRM_MODE;
  return (MODOS_DE_CRM as readonly string[]).includes(v ?? "")
    ? (v as ModoDeCrm)
    : "contact_note";
}

export function adaptadorDelModo(modo: ModoDeCrm = modoActivo()): PuertoDeCrm {
  return modo === "lead_admission" ? adaptadorLeadAdmission() : adaptadorContactNote();
}

type Fila = {
  id: string;
  email: string;
  email_domain: string;
  name: string | null;
  company: string | null;
  job_title: string | null;
  message: string | null;
  source: string;
  download_slug: string | null;
  page_path: string;
  locale: string;
  utm: Record<string, string> | null;
  crm_attempts: number;
  crm_cycle: number;
};

/** Reclama un lote y lo deja reservado. Transacción corta: reserva, no ejecuta. */
async function reclamar(limite: number): Promise<Fila[]> {
  return withSystemScope(
    "DU-09 · el barrido de la cola de CRM no atiende a ningún usuario: recorre " +
      "capturas anónimas de la capa pública.",
    async (db) => {
      const filas = await db.execute(sql`
        WITH reclamadas AS (
          SELECT id FROM lead_capture
           WHERE crm_sync_status = 'pending'
             AND (crm_next_attempt_at IS NULL OR crm_next_attempt_at <= now())
           ORDER BY crm_next_attempt_at NULLS FIRST
           LIMIT ${limite}
           FOR UPDATE SKIP LOCKED
        )
        UPDATE lead_capture l
           SET crm_next_attempt_at = now() + ${`${RESERVA_MINUTOS} minutes`}::interval
          FROM reclamadas r
         WHERE l.id = r.id
        RETURNING l.id, l.email, l.email_domain, l.name, l.company, l.job_title, l.message,
                  l.source, l.download_slug, l.page_path, l.locale, l.utm,
                  l.crm_attempts, l.crm_cycle
      `);
      return filas as unknown as Fila[];
    },
  );
}

const comoCaptura = (f: Fila): CapturaParaCrm => ({
  email: f.email,
  dominio: f.email_domain,
  nombre: f.name,
  empresa: f.company,
  cargo: f.job_title,
  mensaje: f.message,
  origen: f.source,
  documento: f.download_slug,
  pagina: f.page_path,
  idioma: f.locale,
  utm: f.utm,
});

/**
 * Procesa una fila reclamada. **Nunca lanza**: un fallo de una captura no puede
 * llevarse por delante el resto del lote.
 */
async function entregarUna(fila: Fila, puerto: PuertoDeCrm): Promise<void> {
  const intento = fila.crm_attempts + 1;
  let resultado;
  try {
    resultado = await puerto.entregar(comoCaptura(fila));
  } catch (e) {
    resultado = {
      ok: false,
      contactId: null,
      companyId: null,
      opportunityId: null,
      endpoint: "(excepción)",
      codigo: null,
      cuerpoEnviado: null,
      cuerpoRecibido: null,
      error: (e as Error).message.slice(0, 300),
    };
  }

  await withSystemScope("DU-09 · traza y estado de una entrega al CRM.", async (db) => {
    // La traza por intento (RF-51): qué se llamó, qué contestó y en qué intento.
    await db.execute(sql`
      INSERT INTO crm_delivery (id, lead_capture_id, cycle, attempt, endpoint, request_body, response_code, response_body)
      VALUES (${crypto.randomUUID()}, ${fila.id}, ${fila.crm_cycle}, ${intento}, ${resultado.endpoint},
              ${resultado.cuerpoEnviado ? JSON.stringify(resultado.cuerpoEnviado) : null}::jsonb,
              ${resultado.codigo}, ${resultado.cuerpoRecibido})
      ON CONFLICT DO NOTHING
    `);

    if (resultado.ok) {
      await db.execute(sql`
        UPDATE lead_capture
           SET crm_sync_status = 'delivered',
               crm_mode = ${puerto.modo},
               crm_contact_id = ${resultado.contactId},
               crm_company_id = ${resultado.companyId},
               crm_opportunity_id = ${resultado.opportunityId},
               crm_attempts = ${intento},
               crm_last_error = NULL,
               crm_next_attempt_at = NULL,
               crm_delivered_at = now()
         WHERE id = ${fila.id}
      `);
      return;
    }

    const agotado = intento >= MAX_INTENTOS;
    const espera = ESCALERA_MINUTOS[Math.min(intento, MAX_INTENTOS - 1)];
    await db.execute(sql`
      UPDATE lead_capture
         SET crm_sync_status = ${agotado ? "failed" : "pending"},
             crm_attempts = ${intento},
             crm_last_error = ${resultado.error},
             crm_next_attempt_at = ${agotado ? null : sql`now() + ${`${espera} minutes`}::interval`}
       WHERE id = ${fila.id}
    `);
  });

  if (!resultado.ok && intento >= MAX_INTENTOS) await avisarDelFallo(fila, resultado.error);
}

/**
 * El aviso del quinto fallo (RF-50, RF-53).
 *
 * **Su fallo no revierte nada** (RF-119): la entrega al CRM y la del documento
 * ya ocurrieron o ya se dieron por perdidas; que además no salga el correo es
 * un problema menor que no puede propagarse hacia atrás.
 */
async function avisarDelFallo(fila: Fila, error: string | null): Promise<void> {
  try {
    await enviarCorreo({
      tipo: "capture_failed_alert",
      para: destinatarioDeAvisos(),
      idioma: "es",
      datos: {
        correo: fila.email,
        origen: fila.source,
        error: error ?? "sin detalle",
        urlCrm: enlaceAlContacto(null) ?? (process.env.CRM_BASE_URL ?? ""),
      },
    });
  } catch {
    // Deliberado: nada que hacer aquí, y nada que revertir.
  }
}

/** Una vuelta del barrido. Devuelve cuántas filas procesó. */
export async function barrerUnaVez(limite = LOTE): Promise<number> {
  const filas = await reclamar(limite);
  if (filas.length === 0) return 0;
  const puerto = adaptadorDelModo();
  for (const fila of filas) await entregarUna(fila, puerto);
  return filas.length;
}

let temporizador: ReturnType<typeof setInterval> | null = null;

/**
 * Arranca el barrendero **dentro del propio servicio** (A-01): sin orquestador
 * externo, sin servicio aparte y sin una URL disparable desde fuera.
 */
export function arrancarBarrendero(): void {
  if (temporizador) return;
  temporizador = setInterval(() => {
    void barrerUnaVez().catch(() => {
      // Un barrido que falla entero no puede tumbar el proceso que sirve la web.
    });
  }, INTERVALO_MS);
  // No mantiene vivo el proceso por sí mismo.
  temporizador.unref?.();
}

export function pararBarrendero(): void {
  if (!temporizador) return;
  clearInterval(temporizador);
  temporizador = null;
}
