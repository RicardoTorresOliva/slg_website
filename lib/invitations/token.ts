/**
 * token.ts — El testigo del enlace.
 *
 * SE GUARDA EL HASH, NUNCA EL VALOR (`data_model` §5.7). El repositorio es
 * público y los backups salen a un proveedor externo (R-12): un testigo de
 * acceso en claro convierte cualquier lectura de la base —o de una copia— en
 * acceso a la aplicación. El valor en claro **solo viaja en el correo**.
 *
 * SHA-256 y no bcrypt, por lo mismo que las claves de API: esto es un secreto de
 * 256 bits generado por nosotros, no una contraseña elegida por una persona. No
 * hay diccionario contra el que defenderse y sí un coste por canje que evitar.
 */

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** 72 horas exactas (RF-60). */
export const VIGENCIA_EN_HORAS = 72;

export function generarTestigo(): { enClaro: string; hash: string } {
  // 32 bytes = 256 bits. `base64url` para que quepa en una URL sin escapar.
  const enClaro = randomBytes(32).toString("base64url");
  return { enClaro, hash: hashDeTestigo(enClaro) };
}

export function hashDeTestigo(enClaro: string): string {
  return createHash("sha256").update(enClaro, "utf8").digest("hex");
}

/** Comparación en tiempo constante, por si alguna vez se compara fuera del índice. */
export function mismoHash(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function caducidadDesdeAhora(): Date {
  return new Date(Date.now() + VIGENCIA_EN_HORAS * 60 * 60 * 1000);
}

/**
 * El enlace absoluto que viaja en el correo.
 *
 * `NEXT_PUBLIC_SITE_URL` es la URL pública canónica de la instancia. `api_contracts`
 * §11.1 la llama `APP_BASE_URL`; es la misma variable con el nombre que el
 * proyecto ya usa desde FU-02, y tener dos nombres para una cosa es cómo
 * aparecen los enlaces de staging en un correo de producción (D-58).
 */
export function enlaceDeInvitacion(enClaro: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL;
  if (!base) {
    throw new Error(
      "Falta NEXT_PUBLIC_SITE_URL: sin ella el enlace de invitación sería relativo " +
        "y el correo llegaría con un enlace roto.",
    );
  }
  return `${base.replace(/\/$/, "")}/invitacion/${enClaro}`;
}
