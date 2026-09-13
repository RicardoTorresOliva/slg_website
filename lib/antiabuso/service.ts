/**
 * El veredicto sobre un envío de formulario público (FU-11).
 *
 * Las tres capas, en el orden en que salen más baratas: **trampa → límite →
 * dominio**. La trampa no toca la base de datos; el límite hace una escritura;
 * el dominio hace una lectura. Y es también el orden correcto por otra razón:
 * el dominio es el **único** de los tres que le habla al visitante, porque es el
 * único que una persona real puede provocar sin querer.
 */
import { sql } from "drizzle-orm";

import { withSystemScope } from "../db/scope.ts";

import { limitar } from "./limite.ts";
import { campoTrampaRelleno } from "./trampa.ts";

export type Veredicto =
  | { ok: true; email: string; dominio: string }
  /** Trampa: se responde como si todo fuera bien, y no se guarda nada (RF-33). */
  | { ok: false; motivo: "trampa" }
  | { ok: false; motivo: "limite"; esperaSegundos: number }
  | { ok: false; motivo: "correo_invalido" }
  | { ok: false; motivo: "dominio_gratuito"; dominio: string };

export const RESULTADO_TRAMPA = { ok: false, motivo: "trampa" } as const;

/** Sintaxis mínima y suficiente. Validar correo con una regex exhaustiva es un mito. */
const FORMA_DE_CORREO = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

export function esCorreoCorporativo(email: string): boolean {
  return FORMA_DE_CORREO.test(email.trim());
}

/** Caché en proceso: la lista cambia poco y se lee en cada envío. */
let cache: { dominios: Set<string>; hasta: number } | null = null;
const CACHE_MS = 60_000;

export async function dominioDeCorreoGratuito(dominio: string): Promise<boolean> {
  if (!cache || cache.hasta < Date.now()) {
    const filas = await withSystemScope(
      "FU-11 · la lista de dominios de correo gratuito es global, no de una empresa.",
      async (db) => db.execute(sql`SELECT domain FROM free_email_domain`),
    );
    cache = {
      dominios: new Set((filas as unknown as { domain: string }[]).map((f) => f.domain)),
      // Un minuto: lo bastante corto para que añadir un dominio surta efecto
      // enseguida —RF-32 dice «sin desplegar», no «sin esperar un día»— y lo
      // bastante largo para no consultar en cada envío.
      hasta: Date.now() + CACHE_MS,
    };
  }
  return cache.dominios.has(dominio.toLowerCase());
}

/** Solo para las pruebas: obliga a releer la lista en la siguiente llamada. */
export function olvidarCacheDeDominios(): void {
  cache = null;
}

export async function verificarEnvio(entrada: {
  datos: FormData | Record<string, unknown>;
  email: string;
  /** IP del cliente, si el despliegue la expone. Vacía no rompe nada. */
  ip?: string;
}): Promise<Veredicto> {
  // 1 · Trampa. Gratis, y antes de tocar la base.
  if (campoTrampaRelleno(entrada.datos)) return RESULTADO_TRAMPA;

  const email = entrada.email.trim().toLowerCase();

  // 2 · Límite, por IP **y** por correo. Se cuenta antes de validar el correo:
  // si solo se contaran los envíos válidos, probar mil direcciones inválidas
  // saldría gratis.
  const limite = await limitar([entrada.ip ? `ip:${entrada.ip}` : "", `email:${email}`]);
  if (!limite.permitido) {
    return { ok: false, motivo: "limite", esperaSegundos: limite.esperaSegundos };
  }

  if (!esCorreoCorporativo(email)) return { ok: false, motivo: "correo_invalido" };

  // 3 · Dominio. El único que se le explica al visitante.
  const dominio = email.slice(email.indexOf("@") + 1);
  if (await dominioDeCorreoGratuito(dominio)) {
    return { ok: false, motivo: "dominio_gratuito", dominio };
  }

  return { ok: true, email, dominio };
}
