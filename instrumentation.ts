/**
 * instrumentation.ts — Arranque de los barrenderos de colas.
 *
 * `architecture` §6.2 (decisión A-01): el ejecutor de colas vive DENTRO del
 * propio proceso de `slg-web`, arrancado con él — nada de orquestador externo
 * ni servicio aparte. Next.js llama a `register()` una vez al levantar el
 * servidor; es el único sitio donde esto debe pasar.
 *
 * Solo en el runtime de Node (el SMTP de `lib/email` necesita sockets TCP
 * reales, que el runtime Edge no ofrece — ver el aviso de la sesión sobre
 * Fluid Compute/Node: esto no es una limitación de plataforma, es que el
 * puerto de correo habla SMTP de verdad).
 *
 * Si falta configuración de correo (`MAIL_SMTP_*`, aún sin valor mientras
 * P-3/P-4 no se confirmen — ver `docs/decision_log.md` D-54), el barrendero
 * simplemente no arranca y se avisa por log: la web pública no depende de que
 * el correo esté configurado (`architecture` "la capa pública puede seguir
 * sirviendo aunque el correo esté caído").
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { leerMailConfig } = await import("./lib/email/config.ts");
  const { crearTransporteSmtp } = await import("./lib/email/smtp-transport.ts");
  const { iniciarBarrendero } = await import("./lib/email/queue.ts");

  try {
    const cfg = leerMailConfig();
    const transporte = crearTransporteSmtp(cfg);
    iniciarBarrendero(cfg, transporte);
    console.log("[instrumentation] barrendero de correo (FU-08) arrancado.");
  } catch (error) {
    console.warn(
      "[instrumentation] barrendero de correo NO arrancado — falta configuración " +
        `(MAIL_SMTP_*, ver .env.example): ${error instanceof Error ? error.message : error}`,
    );
  }
}
