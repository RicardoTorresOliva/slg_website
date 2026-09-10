/**
 * config.ts — La instancia de Better Auth, y nada más que eso.
 *
 * Versión fijada sin rango (R-19, gate D9). Actualizarla dentro de un
 * milestone es una decisión de Ricardo, no un `npm update` de rutina — el
 * campo `dependencies` de `package.json` ya la fija en exacto.
 *
 * NADIE fuera de `lib/auth/` importa `better-auth` directamente. Si mañana
 * hay que sustituirlo (R-19), este es el único archivo que sabe que existe.
 */
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "../db/schema.ts";

if (!process.env.DATABASE_URL) {
  throw new Error("Falta DATABASE_URL. Ver .env.example.");
}
if (!process.env.BETTER_AUTH_SECRET) {
  throw new Error("Falta BETTER_AUTH_SECRET. Ver .env.example.");
}

/**
 * Conexión propia, separada de `lib/db/scope.ts` a propósito: Better Auth
 * necesita escribir en `user`/`account`/`session`/`verification` fuera de
 * cualquier contexto de aislamiento (antes de que exista un actor verificado
 * que fijar como `app.actor_role`). Mezclar las dos conexiones habría atado
 * el arranque de sesión a las políticas de fila que protegen datos de cliente,
 * que es exactamente lo que esas políticas no deben proteger.
 */
const conexionAuth = postgres(process.env.DATABASE_URL, { max: 5, prepare: true });

/**
 * Sin plugins `organization`, `admin` ni `apiKey` — desviación deliberada del
 * enunciado de la unidad, registrada en D-52 (`docs/decision_log.md`):
 *
 *   · `organization`: el modelo real (`membership`, FU-04) es un cliente con,
 *     como mucho, UNA empresa — no el multi-org con cambio de organización
 *     activa que asume el plugin. `lib/auth/session.ts` resuelve la
 *     pertenencia con una consulta propia, más simple que el plugin.
 *   · `admin`: sus columnas (`banned`, `ban_reason`, `ban_expires`,
 *     `impersonated_by`) no existen en el esquema de FU-04 y ninguna de ellas
 *     la exige un criterio de esta unidad. `user.role` —ya presente— basta:
 *     data_model.md es explícito en que B.3 se evalúa siempre sobre
 *     `user.role`, nunca sobre el rol que gestionaría el plugin.
 *   · `apiKey`: el plugin ata cada clave a un `user_id` propietario; el
 *     esquema real (`api_key`, FU-04) no tiene esa columna a propósito — una
 *     clave de agente no es una cuenta de usuario (RF-146: el rol `agent`
 *     "no es un `user`"). `lib/auth/api-keys.ts` verifica contra la tabla
 *     real sin pasar por el plugin.
 *
 * Lo que SÍ cumple la unidad: un módulo propio (este archivo y sus vecinos)
 * es el único que sabe de sesión, rol, `organization_id` y verificación de
 * clave — la garantía real detrás de R-19, no el nombre de tres plugins.
 */
export const auth = betterAuth({
  database: drizzleAdapter(drizzle(conexionAuth, { schema }), {
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
  // F.1: sin alta pública. Un correo no invitado no crea cuenta con contraseña.
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 12,
  },
  // F.1: sesión de 7 días con expiración deslizante.
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  // F.2-2/F.2-3 siguen [PENDIENTE]: sin credenciales reales, el proveedor
  // social no se registra — Better Auth simplemente no ofrece ese botón, no
  // falla al arrancar. Se activa solo con las variables cargadas.
  socialProviders: {
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        }
      : {}),
    ...(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET
      ? {
          microsoft: {
            clientId: process.env.MICROSOFT_CLIENT_ID,
            clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
            tenantId: process.env.MICROSOFT_TENANT_ID ?? "common",
            // Entra puede no emitir `email` en cuentas gestionadas (F.1): el
            // ancla es `oid` (== accountId aquí), nunca el email.
            requireSelectAccount: true,
          },
        }
      : {}),
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
  // Debe ir último: reescribe la respuesta para fijar cookies desde Route
  // Handlers y Server Actions de Next — así lo exige better-auth/next-js.
  plugins: [nextCookies()],
});
