/**
 * capturas.ts — Las capturas web del tablero (RF-73, DoD #4).
 *
 * LO QUE HQ HACE CON UNA CAPTURA: **verla**. Su estado de entrega al CRM, sus
 * intentos, y un **enlace directo al contacto** para seguir el trabajo donde
 * ese trabajo vive. Lo que NO hace, y no es una omisión: no le pone etapa, ni
 * propietario, ni importe, ni próximo paso (RF-85, RF-57). La tabla ni siquiera
 * tiene esas columnas — la ausencia está en `data_model`, no en esta consulta.
 *
 * LOS FILTROS SON TRES Y SON LOS DE RF-73: documento, página y fecha. No hay
 * un buscador por texto libre sobre el correo: una caja que busca correos en
 * una pantalla que se comparte en capturas de pantalla es una fuga esperando.
 */
import { and, desc, eq, gte, lt, sql } from "drizzle-orm";

import { enlaceAlContacto } from "../crm/port.ts";
import { leadCapture } from "../db/schema.ts";
import { withScope } from "../db/scope.ts";
import type { AuthContext } from "../db/context.ts";

export type Filtro = {
  /** Slug del documento, o `null` para todos. */
  readonly documento?: string | null;
  /** Ruta exacta de la página de origen, o `null`. */
  readonly pagina?: string | null;
  /** Día concreto en `YYYY-MM-DD`. Sin él, el día de hoy (DU-13, criterio 1). */
  readonly dia?: string | null;
  /**
   * `pending` · `delivered` · `failed`, o `null` para todos (DU-16, criterio 1).
   */
  readonly estado?: string | null;
  /**
   * **Quita el filtro de día.** El tablero pregunta «qué ha pasado hoy» y
   * `/hq/capturas` pregunta «qué hay pendiente», que no es lo mismo: una
   * captura fallida de hace tres días es exactamente la que hay que ver, y con
   * el día puesto no saldría nunca.
   */
  readonly todosLosDias?: boolean;
  readonly limite?: number;
};

export type CapturaDeHq = {
  readonly id: string;
  readonly email: string;
  readonly nombre: string | null;
  readonly empresa: string | null;
  readonly origen: string;
  readonly documento: string | null;
  readonly pagina: string;
  readonly idioma: string;
  readonly creadaEn: string;
  readonly estado: string;
  readonly intentos: number;
  readonly ultimoError: string | null;
  readonly modoDeEntrega: string | null;
  /**
   * El enlace profundo al contacto en el CRM. **`null` cuando no hay plantilla
   * configurada o la captura todavía no tiene contacto**, y eso se pinta como
   * ausencia de enlace, no como un enlace roto: la ruta del frontend del CRM
   * está sin confirmar (RF-54) y un enlace inventado lleva a un 404 que parece
   * culpa del CRM.
   */
  readonly enlaceAlCrm: string | null;
  /**
   * `true` cuando la captura llegó al CRM en modo `contact_note` y **no tiene
   * oportunidad**: alguien tiene que abrirla a mano (DU-16 criterio 4, R-04).
   * Va por fila y no como un total, porque el trabajo es por captura.
   */
  readonly pideTrabajoManual: boolean;
};

const LIMITE_POR_DEFECTO = 50;

function rangoDelDia(dia: string | null | undefined): { desde: Date; hasta: Date } {
  // Sin día, HOY. El criterio 1 habla de «las capturas del día»: abrir el
  // tablero y ver el histórico entero es no responder la pregunta que se hace
  // al abrirlo.
  const base = dia ? new Date(`${dia}T00:00:00.000Z`) : new Date();
  const desde = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
  const hasta = new Date(desde.getTime() + 24 * 60 * 60 * 1_000);
  return { desde, hasta };
}

export async function capturasDeHq(ctx: AuthContext, filtro: Filtro = {}): Promise<CapturaDeHq[]> {
  const { desde, hasta } = rangoDelDia(filtro.dia);

  /**
   * `withScope` y no `withSystemScope`: la consulta corre **con el contexto de
   * quien mira**. `lead_capture` no lleva `organization_id` —una captura de la
   * web pública no pertenece a ninguna empresa— así que la política de fila no
   * la acota; lo que sí hace es dejar la traza del actor en la sesión de base
   * de datos, que es lo que el registro de auditoría necesita.
   */
  const filas = await withScope(ctx, async (db) => {
    const condiciones = [
      ...(filtro.todosLosDias ? [] : [gte(leadCapture.createdAt, desde), lt(leadCapture.createdAt, hasta)]),
      ...(filtro.documento ? [eq(leadCapture.downloadSlug, filtro.documento)] : []),
      ...(filtro.pagina ? [eq(leadCapture.pagePath, filtro.pagina)] : []),
      ...(filtro.estado ? [eq(leadCapture.crmSyncStatus, filtro.estado)] : []),
    ];
    return db
      .select()
      .from(leadCapture)
      .where(and(...condiciones))
      .orderBy(desc(leadCapture.createdAt))
      .limit(Math.min(filtro.limite ?? LIMITE_POR_DEFECTO, 200));
  });

  return filas.map((f) => ({
    id: f.id,
    email: f.email,
    nombre: f.name,
    empresa: f.company,
    origen: f.source,
    documento: f.downloadSlug,
    pagina: f.pagePath,
    idioma: f.locale,
    creadaEn: f.createdAt.toISOString(),
    estado: f.crmSyncStatus,
    intentos: f.crmAttempts,
    ultimoError: f.crmLastError,
    modoDeEntrega: f.crmMode,
    enlaceAlCrm: enlaceAlContacto(f.crmContactId),
    pideTrabajoManual:
      f.crmSyncStatus === "delivered" && f.crmMode === "contact_note" && !f.crmOpportunityId,
  }));
}

/**
 * Cuántas capturas **exigen abrir la oportunidad a mano** (criterio 7, R-04).
 *
 * Es la cifra que convierte un detalle de configuración en una tarea. En modo
 * `contact_note` el CRM no permite crear empresa ni oportunidad por clave de
 * API (B.6): cada captura entregada deja un contacto y una nota, y **alguien
 * tiene que abrir la oportunidad**. Sin este número, ese trabajo pendiente es
 * invisible hasta que se pierde un lead; con él, el tablero lo dice al abrirlo.
 *
 * Se cuenta por `crm_mode` de la FILA —cómo se entregó— y no por la variable de
 * entorno: activar `lead_admission` mañana no borra el trabajo que dejaron las
 * capturas de ayer.
 */
export async function capturasQuePidenOportunidad(ctx: AuthContext): Promise<number> {
  const filas = await withScope(ctx, async (db) =>
    db.execute(sql`
      SELECT count(*)::int AS n
        FROM lead_capture
       WHERE crm_sync_status = 'delivered'
         AND crm_mode = 'contact_note'
         AND crm_opportunity_id IS NULL
    `),
  );
  return (filas as unknown as { n: number }[])[0]?.n ?? 0;
}
