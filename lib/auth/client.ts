/**
 * client.ts — Cliente de Better Auth para Client Components.
 *
 * Primera unidad que necesita llamar a Better Auth desde el navegador
 * (`/invitacion/[token]`, FU-07): antes de esto, todo pasaba por
 * `lib/auth/session.ts` en el servidor. Sigue siendo el único módulo que
 * sabe de Better Auth (R-19) — este archivo, no el componente, es quien
 * importa `better-auth/react`.
 */
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_SITE_URL,
});
