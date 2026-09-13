/**
 * Límite de peticiones por IP y por correo (RF-34).
 *
 * **El contador vive en la base de datos, no en memoria del proceso.** Con dos
 * instancias del servidor, un contador en memoria permite el doble de
 * peticiones y nadie se entera; con tres, el triple. Es el fallo clásico de los
 * límites caseros, y solo aparece cuando el sitio ya tiene tráfico.
 *
 * **La clave se guarda HASHEADA.** Una IP es un dato personal y una dirección de
 * correo lo es más. La tabla no necesita saber cuáles son: solo necesita
 * contarlas, y un hash cuenta igual de bien.
 *
 * **La respuesta no revela el umbral** (RF-34). Ni en el cuerpo, ni en una
 * cabecera `X-RateLimit-Limit`: quien sabe el umbral sabe justo cuánto pedir.
 */
import { createHash } from "node:crypto";

import { sql } from "drizzle-orm";

import { withSystemScope } from "../db/scope.ts";

export type ResultadoDeLimite = { permitido: boolean; esperaSegundos: number };

function umbral(): number {
  const v = Number(process.env.PUBLIC_FORM_RATE_LIMIT_MAX);
  return Number.isFinite(v) && v > 0 ? v : 5;
}

function ventanaMs(): number {
  const v = Number(process.env.PUBLIC_FORM_RATE_LIMIT_WINDOW_MS);
  return Number.isFinite(v) && v > 0 ? v : 10 * 60 * 1000;
}

const hash = (valor: string) =>
  createHash("sha256").update(`slg:antiabuso:${valor.toLowerCase().trim()}`).digest("hex");

/**
 * Suma uno a cada clave y dice si alguna se pasó.
 *
 * Se comprueban TODAS las claves aunque la primera ya haya fallado: si se
 * cortara en la primera, la segunda no contaría, y quien rota de IP con el
 * mismo correo tendría contador nuevo en cada intento.
 */
export async function limitar(claves: readonly string[]): Promise<ResultadoDeLimite> {
  const max = umbral();
  const ventana = ventanaMs();
  const inicio = new Date(Math.floor(Date.now() / ventana) * ventana);

  let excedido = false;

  await withSystemScope(
    "FU-11 · el contador del límite no pertenece a ninguna empresa: es de la " +
      "capa pública, donde todavía no hay sesión ni empresa que acotar.",
    async (db) => {
    for (const clave of claves) {
      if (!clave) continue;
      const filas = await db.execute(sql`
        INSERT INTO rate_limit_hit (key_hash, window_start, hits)
        VALUES (${hash(clave)}, ${inicio.toISOString()}, 1)
        ON CONFLICT (key_hash, window_start)
          DO UPDATE SET hits = rate_limit_hit.hits + 1
        RETURNING hits
      `);
      const hits = Number((filas as unknown as { hits: number }[])[0]?.hits ?? 0);
      if (hits > max) excedido = true;
    }

    // Limpieza barata: se borra lo de ventanas viejas mientras se está dentro.
    // Sin esto la tabla crece para siempre por algo que caduca en minutos.
    await db.execute(sql`
      DELETE FROM rate_limit_hit
      WHERE window_start < ${new Date(inicio.getTime() - ventana * 4).toISOString()}
      `);
    },
  );

  const esperaSegundos = Math.ceil((inicio.getTime() + ventana - Date.now()) / 1000);
  return { permitido: !excedido, esperaSegundos: Math.max(1, esperaSegundos) };
}
