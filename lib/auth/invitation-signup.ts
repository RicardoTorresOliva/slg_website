/**
 * invitation-signup.ts — La única puerta para crear una cuenta con contraseña.
 *
 * `lib/auth/config.ts` fija `emailAndPassword.disableSignUp: true` (F.1: sin
 * alta pública). Esa comprobación vive DENTRO del propio manejador de
 * Better Auth (`ctx.context.options.emailAndPassword.disableSignUp`), así
 * que llamarlo por `auth.api.signUpEmail(...)` lo rechaza igual que la ruta
 * HTTP pública — no es un candado solo de transporte.
 *
 * Por eso este archivo instancia una SEGUNDA vez Better Auth, idéntica salvo
 * `disableSignUp: false`, sobre la MISMA base de datos. No sustituye a
 * `lib/auth/config.ts` ni se expone en `app/api/auth/[...all]/route.ts` —
 * esa ruta sigue usando `auth`, nunca esto. Solo `lib/auth/invitations.ts` lo
 * llama, y solo después de validar un token de invitación real y vigente
 * (FU-07): es la única forma de que un correo invitado se convierta en
 * cuenta con contraseña.
 *
 * Reutilizar el hash/validación de contraseña de la librería en vez de
 * reimplementarlo es la razón de este archivo entero: `auth.api.signUpEmail`
 * ya sabe hashear con scrypt, validar longitud mínima y crear `user` +
 * `account` en una operación coherente. Reinventarlo a mano para esquivar
 * `disableSignUp` sería el error que este archivo evita.
 */
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "../db/schema.ts";

if (!process.env.DATABASE_URL) {
  throw new Error("Falta DATABASE_URL. Ver .env.example.");
}
if (!process.env.BETTER_AUTH_SECRET) {
  throw new Error("Falta BETTER_AUTH_SECRET. Ver .env.example.");
}

const conexion = postgres(process.env.DATABASE_URL, { max: 2, prepare: true });

export const authParaAceptarInvitacion = betterAuth({
  database: drizzleAdapter(drizzle(conexion, { schema }), {
    provider: "pg",
    schema: {
      user: schema.user,
      account: schema.account,
      session: schema.session,
      verification: schema.verification,
    },
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    disableSignUp: false,
    minPasswordLength: 12,
  },
  user: {
    additionalFields: {
      role: { type: "string", required: true, defaultValue: "client_member", input: false },
      locale: { type: "string", required: true, defaultValue: "es" },
    },
  },
  advanced: {
    database: { generateId: () => crypto.randomUUID() },
  },
});
