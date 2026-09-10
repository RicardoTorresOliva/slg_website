/**
 * api-keys.ts — Emisión y verificación de claves, contra la tabla real.
 *
 * Sin el plugin `apiKey` de Better Auth (D-52): esa clave no pertenece a un
 * `user`, pertenece —como mucho— a una `organization`, o a ninguna (clave de
 * SLG que lo ve todo, D-31). Es la única puerta hacia `contextoDeClaveApi`.
 *
 * `api_key` está en `ORG_SCOPED_TABLES` (0001): toda operación pasa por
 * `withScope`/`withSystemScope`, nunca por una conexión propia — un hueco
 * real encontrado escribiendo esta unidad (ver D-53 y la migración 0005):
 * sin esto, ninguna clave habría verificado nunca, ni siquiera las de SLG.
 */
import { randomBytes, timingSafeEqual, createHash } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";

import { contextoDeClaveApi, type AuthContext } from "../db/context.ts";
import { withScope, withSystemScope } from "../db/scope.ts";
import { apiKey, type ApiScope } from "../db/schema.ts";

const PREFIJO = "slg_key_";

function hash(claveCruda: string): string {
  return createHash("sha256").update(claveCruda).digest("hex");
}

/**
 * Crea una clave nueva. Devuelve el valor **crudo** una sola vez —quien llama
 * lo muestra y lo descarta; solo el hash queda en la base de datos. Exige
 * `expiresAt`: ninguna clave nace sin caducidad (R-14).
 *
 * `ctx` es el `slg_admin` que la crea (B.3, fila 4: solo `slg_admin`) — la
 * política de 0001 exige ese rol en la sesión para poder insertar.
 */
export async function crearClaveApi(
  ctx: AuthContext,
  input: {
    name: string;
    organizationId: string | null;
    scopes: readonly ApiScope[];
    expiresAt: Date;
    rateLimitMax?: number;
    rateLimitWindowSeconds?: number;
  },
): Promise<{ id: string; claveCruda: string }> {
  const secreto = randomBytes(32).toString("base64url");
  const claveCruda = `${PREFIJO}${secreto}`;
  return withScope(ctx, async (db) => {
    const [fila] = await db
      .insert(apiKey)
      .values({
        id: crypto.randomUUID(),
        name: input.name,
        keyHash: hash(claveCruda),
        organizationId: input.organizationId,
        scopes: [...input.scopes],
        expiresAt: input.expiresAt,
        ...(input.rateLimitMax !== undefined ? { rateLimitMax: input.rateLimitMax } : {}),
        ...(input.rateLimitWindowSeconds !== undefined
          ? { rateLimitWindowSeconds: input.rateLimitWindowSeconds }
          : {}),
      })
      .returning({ id: apiKey.id });
    return { id: fila.id, claveCruda };
  });
}

export type ResultadoDeVerificacion =
  | { ok: true; ctx: AuthContext }
  | { ok: false; razon: "invalida" | "revocada" | "caducada" | "limite_excedido" };

/**
 * Contador en memoria del proceso, misma razón que la caché de métricas del
 * CRM (D-40): un reinicio cuesta, como mucho, una ventana de más permisiva —
 * no un dato de cliente mal filtrado. El VPS corre una sola instancia
 * (`architecture.md` §7); si algún día corre más de una, esto deja de bastar
 * y hace falta una tabla o un almacén compartido.
 */
const contadores = new Map<string, { ventanaDesde: number; conteo: number }>();

function dentroDelLimite(apiKeyId: string, maximo: number, ventanaSegundos: number): boolean {
  const ahora = Date.now();
  const actual = contadores.get(apiKeyId);
  if (!actual || ahora - actual.ventanaDesde >= ventanaSegundos * 1000) {
    contadores.set(apiKeyId, { ventanaDesde: ahora, conteo: 1 });
    return true;
  }
  actual.conteo += 1;
  return actual.conteo <= maximo;
}

/**
 * Verifica una clave cruda (del encabezado `Authorization: Bearer <clave>`).
 * Corre con `withSystemScope`, no con el contexto de nadie: verificar una
 * clave es, por definición, anterior a saber de quién es (migración 0005).
 */
export async function verificarClaveApi(claveCruda: string): Promise<ResultadoDeVerificacion> {
  if (!claveCruda.startsWith(PREFIJO)) return { ok: false, razon: "invalida" };

  return withSystemScope("verificar una clave de API entrante", async (db) => {
    const [fila] = await db
      .select()
      .from(apiKey)
      .where(eq(apiKey.keyHash, hash(claveCruda)))
      .limit(1);

    if (!fila) return { ok: false, razon: "invalida" };
    if (fila.revokedAt) return { ok: false, razon: "revocada" };
    if (fila.expiresAt && fila.expiresAt.getTime() <= Date.now()) {
      return { ok: false, razon: "caducada" };
    }
    if (!dentroDelLimite(fila.id, fila.rateLimitMax, fila.rateLimitWindowSeconds)) {
      return { ok: false, razon: "limite_excedido" };
    }

    await db.update(apiKey).set({ lastUsedAt: new Date() }).where(eq(apiKey.id, fila.id));

    return {
      ok: true,
      ctx: contextoDeClaveApi({
        apiKeyId: fila.id,
        name: fila.name,
        organizationId: fila.organizationId,
        scopes: fila.scopes,
      }),
    };
  });
}

/** Revoca una clave. Irreversible: no hay "des-revocar", se crea una nueva. */
export async function revocarClaveApi(ctx: AuthContext, id: string): Promise<void> {
  await withScope(ctx, (db) =>
    db.update(apiKey).set({ revokedAt: new Date() }).where(and(eq(apiKey.id, id), isNull(apiKey.revokedAt))),
  );
}

// Comparación en tiempo constante disponible para quien necesite comparar dos
// valores derivados de una clave sin depender de `===` (mismo motivo que
// `proxy.ts`: el tiempo de fallo no debe filtrar información).
export function igualdadConstante(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}
