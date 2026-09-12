import { NextResponse, type NextRequest } from "next/server";

import {
  auth,
  esperaPendienteEnSegundos,
  registrarFallo,
} from "@/lib/auth";

/**
 * Solicitud de recuperación. **Responde lo mismo siempre** (RF-59).
 *
 * Exista la cuenta o no, la pantalla dice «si ese correo corresponde a una
 * cuenta, el enlace ya va en camino». Y la misma cerradura progresiva que
 * protege el acceso protege esto (RNF-24): si no, la recuperación sería la
 * puerta sin vigilar por la que se enumeran correos cómodamente.
 */
export async function POST(request: NextRequest) {
  const formulario = await request.formData();
  const email = String(formulario.get("email") ?? "").trim().toLowerCase();
  const lang = formulario.get("lang") === "en" ? "en" : "es";
  const base = lang === "en" ? "/en/recover" : "/recuperar";

  const espera = esperaPendienteEnSegundos("recuperacion", email);
  if (espera > 0) {
    return NextResponse.redirect(new URL(`${base}?estado=bloqueado`, request.url), 303);
  }

  // Cada solicitud cuenta, acierte o no: lo que se limita es el ritmo, no el
  // éxito. Un atacante no sabe cuáles «aciertan», que es el objetivo.
  registrarFallo("recuperacion", email);

  if (email) {
    try {
      await auth.api.requestPasswordReset({
        body: { email, redirectTo: lang === "en" ? "/en/sign-in" : "/acceder" },
        headers: request.headers,
      });
    } catch {
      /**
       * Se traga a propósito. Un fallo aquí —correo inexistente, proveedor de
       * correo caído— NO puede cambiar la respuesta: en cuanto una rama
       * responde distinto, el formulario vuelve a ser un verificador de correos.
       * El fallo de envío queda registrado en `email_delivery` (FU-08).
       */
    }
  }

  return NextResponse.redirect(new URL(`${base}?estado=enviado`, request.url), 303);
}
