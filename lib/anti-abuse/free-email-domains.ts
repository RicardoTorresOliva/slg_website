/**
 * free-email-domains.ts — La autoridad real de RF-31/RF-32.
 *
 * La lista vive en `blocked_email_domain` (Postgres), no en código: RF-32
 * exige que se pueda ampliar **sin desplegar**, y una constante de TypeScript
 * exige justo lo contrario. `components/download-form/free-email-domains.ts`
 * sigue existiendo como primera señal del lado del cliente (RNF-33: el
 * cliente nunca es la autoridad), pero deja de ser la única fuente.
 *
 * Sin sesión de por medio (un visitante público no es un actor autenticado):
 * toda lectura pasa por `withSystemScope`, nunca por `withScope`.
 */

import { withSystemScope } from "../db/scope.ts";
import { blockedEmailDomain } from "../db/schema.ts";
import { eq } from "drizzle-orm";

function extraerDominio(correo: string): string | null {
  const dominio = correo.split("@")[1]?.toLowerCase().trim();
  return dominio || null;
}

/**
 * `true` si el dominio del correo está bloqueado — RF-31: el llamador
 * responde con el mensaje explícito de `content/ui` (`download.freeEmailRejected`),
 * nunca con un error genérico.
 */
export async function esDominioDeCorreoGratuito(correo: string): Promise<boolean> {
  const dominio = extraerDominio(correo);
  if (!dominio) return false;

  return withSystemScope(
    "verificar dominio de correo gratuito en un formulario público (RF-31)",
    async (db) => {
      const fila = await db
        .select({ domain: blockedEmailDomain.domain })
        .from(blockedEmailDomain)
        .where(eq(blockedEmailDomain.domain, dominio))
        .limit(1);
      return fila.length > 0;
    },
  );
}
