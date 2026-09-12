/**
 * better-auth.ts — La instancia de Better Auth. El ÚNICO archivo del proyecto
 * que importa la librería.
 *
 * MITIGACIÓN DE R-19. Todo lo que el resto del código necesita de la identidad
 * sale de `lib/auth/index.ts`, no de aquí. Si mañana hay que sustituir Better
 * Auth, se reescriben este archivo y `session.ts`, y ni una página ni un
 * endpoint se enteran. Hay un gate que lo comprueba:
 * `npm run check:auth-boundary`.
 *
 * VERSIÓN FIJADA SIN RANGO (criterio 6): `better-auth` 1.7.4 en
 * `package.json`, con `--save-exact`. No se actualiza dentro de un milestone.
 *
 * QUÉ NO USA ESTE MÓDULO, Y POR QUÉ (decisión D-52): el plugin `apiKey`. Su
 * esquema exige `referenceId` obligatorio y guarda los permisos como cadena
 * opaca; `data_model` §3.6 fija seis alcances en una columna `jsonb` con un
 * CHECK de contención que impide guardar un alcance inventado, y admite claves
 * de SLG **sin** empresa. Adoptar el plugin perdería esa garantía en base de
 * datos y rompería las claves sin empresa. La verificación de claves vive en
 * `lib/auth/api-key.ts`, dentro de este mismo módulo.
 */

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins/admin";
import { adminAc, defaultStatements, userAc } from "better-auth/plugins/admin/access";
import { createAccessControl } from "better-auth/plugins/access";
import { organization } from "better-auth/plugins/organization";
import * as schema from "../db/schema.ts";
import { dbDeAuth } from "./db.ts";

/**
 * Proveedores sociales, solo si sus credenciales están presentes.
 *
 * F.2-2 (consentimiento de Google) y F.2-3 (registro en Entra ID) siguen
 * abiertas. Declararlos sin credenciales haría fallar el arranque; omitirlos
 * cuando faltan deja el acceso por contraseña funcionando y DU-01 los enciende
 * poniendo las variables. El ancla de identidad de Microsoft es `oid`, no el
 * correo (RF-62, F.1): Entra puede no emitir correo para cuentas gestionadas.
 */
const proveedoresSociales = {
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
        },
      }
    : {}),
};

/**
 * Control de acceso de los endpoints PROPIOS del plugin `admin` (suspender una
 * cuenta, listar o revocar sesiones). El plugin no acepta nombres de rol que no
 * conozca, así que hay que declararle los cuatro de B.3.
 *
 * Nada de esto autoriza acciones de la aplicación: eso es `permissions.ts`.
 */
const controlDeAcceso = createAccessControl(defaultStatements);

const rolesDelPlugin = {
  // Ricardo: el único que administra cuentas (B.3, «Invitar usuarios SLG»).
  slg_admin: controlDeAcceso.newRole(adminAc.statements),
  // Los otros tres no administran cuentas ajenas: solo lo suyo.
  slg_operator: controlDeAcceso.newRole(userAc.statements),
  client_admin: controlDeAcceso.newRole(userAc.statements),
  client_member: controlDeAcceso.newRole(userAc.statements),
};

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_SITE_URL,

  database: drizzleAdapter(dbDeAuth, {
    provider: "pg",
    /**
     * Mapeo de nombres. D-27 renombró dos tablas del vocabulario de Better Auth
     * a nombres que el brief usa: `member` → `membership` y `apikey` →
     * `api_key`. El adaptador acepta el mapeo, así que el renombre no cuesta
     * nada en tiempo de ejecución.
     */
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
      organization: schema.organization,
      /**
       * La clave es el `modelName` FINAL, el que el plugin declara abajo
       * (`membership`), no el nombre del vocabulario de Better Auth (`member`).
       * Con la clave equivocada el adaptador anuncia «missing tables» y las
       * escrituras de pertenencia fallan en tiempo de ejecución, no de compilación.
       */
      membership: schema.membership,
      invitation: schema.invitation,
    },
  }),

  emailAndPassword: {
    enabled: true,
    // El envío del correo de recuperación es de DU-01, sobre el adaptador de
    // FU-08. Aquí solo queda habilitado el método.
    autoSignIn: false,
  },

  socialProviders: proveedoresSociales,

  user: {
    additionalFields: {
      /** Rol global de B.3. La autorización SIEMPRE se evalúa sobre este campo. */
      role: { type: "string", required: false, defaultValue: "client_member", input: false },
      locale: { type: "string", required: false, defaultValue: "es", input: false },
    },
  },

  session: {
    // RF-66: una sesión revocada deja de valer. La comprobación autoritativa la
    // hace `session.ts` contra la base en cada petición, no una caché.
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },

  advanced: {
    // Las cookies de sesión llevan `httpOnly`, `sameSite` y `secure` por
    // defecto en producción; `architecture` §11.2 lo exige y se verifica en
    // DU-01, cuando existe una pantalla de acceso que las emita.
    useSecureCookies: process.env.NODE_ENV === "production",
  },

  plugins: [
    organization({
      /**
       * `membership.org_role` se llama `role` en el vocabulario del plugin.
       * El mapeo evita renombrar una columna ya migrada.
       */
      schema: {
        member: { modelName: "membership", fields: { role: "orgRole" } },
      },
      // El envío del correo de invitación es de FU-07.
      allowUserToCreateOrganization: false,
    }),
    admin({
      /**
       * El plugin exige declarar sus propios roles porque gobierna SUS
       * endpoints (suspender una cuenta, listar sesiones). Se le declaran los
       * cuatro roles de B.3 con el control de acceso de arriba para que sus
       * endpoints no queden abiertos, no para delegarle la autorización.
       *
       * LA AUTORIZACIÓN DE LA APLICACIÓN NO PASA POR AQUÍ: pasa por
       * `permissions.ts`, que evalúa la matriz B.3 sobre `user.role` en cada
       * acción (criterio 2). Si mañana este plugin desaparece, la matriz sigue
       * aplicándose igual.
       */
      ac: controlDeAcceso,
      roles: rolesDelPlugin,
      adminRoles: ["slg_admin"],
      defaultRole: "client_member",
    }),
  ],
});

export type Auth = typeof auth;
