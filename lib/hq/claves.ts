/**
 * claves.ts — Claves de API: crear, listar y revocar (DU-17 · RF-82 · RF-147).
 *
 * **LOS TRES CAMPOS SON OBLIGATORIOS AL CREARLA, Y NO HAY DEFECTOS** (criterio
 * 1, R-14): alcances, límite de peticiones y caducidad. El esquema tiene
 * valores por defecto para el límite —60 por minuto— porque una columna sin
 * defecto obliga a migrar; aquí **no se usan**. Una clave creada «para probar»
 * sin caducidad es una clave que sigue viva dos años después, y el defecto
 * silencioso es exactamente cómo se crea.
 *
 * **LA CLAVE EN CLARO SE DEVUELVE UNA VEZ Y NO SE GUARDA** (criterio 2). En la
 * base vive solo su hash; no hay función que la recupere, y no la hay a
 * propósito: si existiera, bastaría entrar una vez a HQ para llevarse todas las
 * claves vivas. «Se perdió» se resuelve creando otra y revocando la anterior,
 * que además deja rastro de que pasó.
 *
 * **LOS ALCANCES SON GRANULARES Y NINGUNO IMPLICA A OTRO** (criterio 4,
 * RF-147). `deliverables:write` **no** concede `deliverables:read`: la
 * comprobación de `lib/auth` es pertenencia exacta al conjunto. Aquí no se
 * expande ni se normaliza nada — expandirlos al guardarlos sería inventar una
 * jerarquía en la base de datos que después nadie encuentra.
 */
import { and, desc, eq, isNull, sql } from "drizzle-orm";

import { exigir, hashDeClave } from "../auth/index.ts";
import { conAuditoria } from "../auditoria/index.ts";
import type { AuthContext } from "../db/context.ts";
import { API_SCOPES, apiKey, type ApiScope } from "../db/schema.ts";
import { withScope } from "../db/scope.ts";

import { DatoInvalido } from "./empresas.ts";

export type ClaveDeApi = {
  readonly id: string;
  readonly nombre: string;
  readonly organizationId: string | null;
  readonly alcances: readonly string[];
  readonly limite: number;
  readonly ventanaSegundos: number;
  readonly caducaEn: string | null;
  readonly usadaEn: string | null;
  readonly revocadaEn: string | null;
  /** `true` cuando ya no sirve, por revocación o por caducidad (criterio 7). */
  readonly muerta: boolean;
};

export type DatosDeClave = {
  readonly nombre: string;
  readonly organizationId: string | null;
  readonly alcances: readonly string[];
  readonly limite: number;
  readonly ventanaSegundos: number;
  /** `YYYY-MM-DD`. **Obligatoria**: sin caducidad no se crea (R-14). */
  readonly caducaEn: string;
};

/** Cuántos bytes de azar lleva una clave. 32 bytes = 256 bits. */
const BYTES = 32;

/**
 * Genera la clave en claro. El prefijo `slg_` es para poder reconocerla de un
 * vistazo en un registro —y para que el escáner de secretos la encuentre si
 * alguien la pega donde no debe—, no para nada funcional.
 */
function generarClave(): string {
  const bytes = new Uint8Array(BYTES);
  crypto.getRandomValues(bytes);
  const cuerpo = Buffer.from(bytes).toString("base64url");
  return `slg_${cuerpo}`;
}

function estaMuerta(fila: { revokedAt: Date | null; expiresAt: Date | null }): boolean {
  if (fila.revokedAt) return true;
  return Boolean(fila.expiresAt && fila.expiresAt.getTime() <= Date.now());
}

function validar(datos: DatosDeClave): string | null {
  if (!datos.nombre.trim()) return "nombre";
  // Alcances: al menos uno, y TODOS del vocabulario. Uno inventado no se ignora
  // en silencio: una clave con un alcance que nadie comprueba es una clave que
  // parece acotada y no lo está.
  if (datos.alcances.length === 0) return "alcances";
  if (datos.alcances.some((a) => !(API_SCOPES as readonly string[]).includes(a))) return "alcances";
  if (!Number.isInteger(datos.limite) || datos.limite < 1 || datos.limite > 10_000) return "limite";
  if (!Number.isInteger(datos.ventanaSegundos) || datos.ventanaSegundos < 1) return "ventana";
  if (!datos.caducaEn) return "caduca";
  const caduca = new Date(`${datos.caducaEn}T23:59:59.999Z`);
  if (Number.isNaN(caduca.getTime())) return "caduca";
  // Una caducidad en el pasado crea una clave muerta: es un error de quien la
  // escribe, no una clave válida que resulta que no sirve.
  if (caduca.getTime() <= Date.now()) return "caduca";
  return null;
}

export async function claves(ctx: AuthContext): Promise<ClaveDeApi[]> {
  exigir(ctx, "apikey.manage");
  const filas = await withScope(ctx, (db) =>
    db.select().from(apiKey).orderBy(desc(apiKey.createdAt)),
  );
  return filas.map((f) => ({
    id: f.id,
    nombre: f.name,
    organizationId: f.organizationId,
    alcances: f.scopes ?? [],
    limite: f.rateLimitMax,
    ventanaSegundos: f.rateLimitWindowSeconds,
    caducaEn: f.expiresAt?.toISOString() ?? null,
    usadaEn: f.lastUsedAt?.toISOString() ?? null,
    revocadaEn: f.revokedAt?.toISOString() ?? null,
    muerta: estaMuerta(f),
  }));
}

/**
 * Crea la clave y **devuelve el secreto en claro UNA sola vez**.
 *
 * El valor sale de aquí y de ningún otro sitio: no se registra, no se audita y
 * no se guarda. El apunte de auditoría dice **que se creó una clave y cuál**,
 * nunca su valor.
 */
export async function crearClave(
  ctx: AuthContext,
  datos: DatosDeClave,
): Promise<{ id: string; enClaro: string }> {
  const id = crypto.randomUUID();
  return conAuditoria(ctx, { accion: "apikey.create", entidad: "api_key", entidadId: id }, async () => {
    exigir(ctx, "apikey.manage");

    const malo = validar(datos);
    if (malo) throw new DatoInvalido(malo);

    const enClaro = generarClave();
    await withScope(ctx, (db) =>
      db.insert(apiKey).values({
        id,
        name: datos.nombre.trim(),
        keyHash: hashDeClave(enClaro),
        organizationId: datos.organizationId,
        scopes: datos.alcances as ApiScope[],
        rateLimitMax: datos.limite,
        rateLimitWindowSeconds: datos.ventanaSegundos,
        expiresAt: new Date(`${datos.caducaEn}T23:59:59.999Z`),
      }),
    );
    return { id, enClaro };
  });
}

/**
 * Revoca. **Inmediato** (criterio 3, RF-97): `verificarClave` mira `revoked_at`
 * contra la base en cada petición, así que la siguiente llamada con esa clave
 * ya recibe 401. No hay caché que invalidar porque no hay caché.
 *
 * Se marca y no se borra: una clave borrada deja el registro de auditoría
 * apuntando a algo que no existe, y la pregunta «¿qué hacía esta clave antes de
 * que la quitáramos?» deja de tener respuesta.
 */
export async function revocarClave(ctx: AuthContext, id: string): Promise<boolean> {
  return conAuditoria(ctx, { accion: "apikey.revoke", entidad: "api_key", entidadId: id }, async () => {
    exigir(ctx, "apikey.manage");
    const filas = await withScope(ctx, (db) =>
      db
        .update(apiKey)
        .set({ revokedAt: new Date() })
        .where(and(eq(apiKey.id, id), isNull(apiKey.revokedAt)))
        .returning({ id: apiKey.id }),
    );
    return filas.length > 0;
  });
}

/* ══════════════════════════════════════════════════════════════════════════
 * Enseñar la clave UNA vez, sin que pase por la URL
 * ══════════════════════════════════════════════════════════════════════════ */

/**
 * El secreto recién creado, esperando a que la pantalla lo enseñe **una vez**.
 *
 * POR QUÉ NO VIAJA EN LA URL. La forma cómoda sería `?clave=slg_…` después de
 * crearla. Esa URL acaba en el historial del navegador, en el registro del
 * proxy, en el `Referer` de la petición siguiente y en la captura de pantalla
 * que alguien manda preguntando algo. Un secreto en una barra de direcciones es
 * un secreto publicado.
 *
 * Aquí viaja un **identificador opaco de un solo uso** y el valor se queda en
 * memoria del servidor hasta que la pantalla lo recoge —y al recogerlo se
 * borra—, o hasta que caduca al minuto.
 *
 * MEMORIA DEL PROCESO, como la caché de métricas (D-103), y con la misma
 * consecuencia asumida: con dos instancias el redirect podría caer en la otra y
 * la clave no se enseñaría. El despliegue es una sola instancia de `slg-web`, y
 * el remedio de «se perdió» ya está escrito y es el mismo de siempre: crear otra
 * y revocar esta, que además deja rastro.
 */
const VIDA_MS = 60_000;
const pendientes = new Map<string, { valor: string; caduca: number }>();

export function guardarParaMostrar(enClaro: string): string {
  const vale = crypto.randomUUID();
  pendientes.set(vale, { valor: enClaro, caduca: Date.now() + VIDA_MS });
  // Barrido perezoso: sin temporizador que mantenga vivo el proceso.
  for (const [k, v] of pendientes) if (v.caduca <= Date.now()) pendientes.delete(k);
  return vale;
}

/** Devuelve el secreto **y lo borra**. Una segunda visita no enseña nada. */
export function recogerParaMostrar(vale: string | null | undefined): string | null {
  if (!vale) return null;
  const guardado = pendientes.get(vale);
  pendientes.delete(vale);
  if (!guardado || guardado.caduca <= Date.now()) return null;
  return guardado.valor;
}

/* ══════════════════════════════════════════════════════════════════════════
 * El registro de auditoría (RF-83 · RNF-29)
 * ══════════════════════════════════════════════════════════════════════════ */

export type ApunteDeAuditoria = {
  readonly id: string;
  readonly actor: string;
  readonly actorTipo: string;
  readonly accion: string;
  readonly entidad: string;
  readonly entidadId: string | null;
  readonly organizationId: string | null;
  readonly creadoEn: string;
  /** `true` en los apuntes de intento rechazado, que llevan sufijo `.denied`. */
  readonly rechazo: boolean;
};

export type FiltroDeAuditoria = {
  readonly accion?: string | null;
  readonly entidad?: string | null;
  readonly actor?: string | null;
  /** Solo los intentos rechazados: la consulta que avisa antes. */
  readonly soloRechazos?: boolean;
  readonly limite?: number;
};

/**
 * **Solo `slg_admin`** (criterio 5, RF-83, RF-86). El rechazo de un
 * `slg_operator` **queda auditado** por `conAuditoria`: quien mira la auditoría
 * puede ver quién intentó mirarla.
 *
 * **NO HAY función de editar ni de borrar, y no la habrá** (criterio 6,
 * RNF-29). Tampoco haría falta que la hubiera para que fallara: un disparador
 * de la migración 0003 rechaza `UPDATE` y `DELETE` sobre `audit_log` **incluso
 * al usuario dueño de la base**. Lo comprobó `test:gestion` chocando contra él.
 */
export async function auditoria(
  ctx: AuthContext,
  filtro: FiltroDeAuditoria = {},
): Promise<ApunteDeAuditoria[]> {
  return conAuditoria(ctx, { accion: "audit.read", entidad: "audit_log" }, async () => {
    exigir(ctx, "audit.read");

    const filas = (await withScope(ctx, (db) =>
      db.execute(sql`
        SELECT id, actor_type, actor_label, action, entity, entity_id, organization_id, created_at
          FROM audit_log
         WHERE (${filtro.accion ?? null}::text IS NULL OR action = ${filtro.accion ?? null})
           AND (${filtro.entidad ?? null}::text IS NULL OR entity = ${filtro.entidad ?? null})
           AND (${filtro.actor ?? null}::text IS NULL OR actor_label ILIKE ${`%${filtro.actor ?? ""}%`})
           AND (${filtro.soloRechazos ?? false} = false OR action LIKE '%.denied')
         ORDER BY created_at DESC
         LIMIT ${Math.min(filtro.limite ?? 100, 500)}
      `),
    )) as unknown as {
      id: string;
      actor_type: string;
      actor_label: string | null;
      action: string;
      entity: string;
      entity_id: string | null;
      organization_id: string | null;
      created_at: Date;
    }[];

    return filas.map((f) => ({
      id: f.id,
      actor: f.actor_label ?? "—",
      actorTipo: f.actor_type,
      accion: f.action,
      entidad: f.entity,
      entidadId: f.entity_id,
      organizationId: f.organization_id,
      creadoEn: new Date(f.created_at).toISOString(),
      rechazo: f.action.endsWith(".denied"),
    }));
  });
}
