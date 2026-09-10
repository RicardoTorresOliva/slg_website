/**
 * test-email.ts — Pruebas de FU-08: puerto de correo, cola y reintento.
 *
 * Corre contra SMTP real (un captador en proceso, `fake-smtp-server.ts` — no
 * un supuesto: el mensaje se parsea de verdad desde el socket) y contra
 * PostgreSQL real. `email_delivery` SÍ tiene RLS, forzada (0007, tras el
 * hallazgo de la comprobación 8 de `test-isolation.ts`): toda lectura o
 * escritura de esta prueba pasa por `withSystemScope`, igual que el código
 * real (`send.ts`, `queue.ts`) — probar con una conexión sin contexto habría
 * dado cero filas siempre, un falso negativo, no un fallo de la lógica.
 *
 * A. Los cuatro tipos de correo (criterio 3, adaptado): se envían y llegan al
 *    captador A, con from/reply-to persistidos en `email_delivery` tal y
 *    como se usaron.
 * B. Reintento: un transporte falso que falla dos veces y luego entrega deja
 *    `attempts=2` y `status=delivered` tras el barrido — sin perder el hecho
 *    de negocio (criterio 5).
 * C. Agotamiento: cinco fallos seguidos dejan `status=failed`, sin próximo
 *    intento.
 * D. Cambio de proveedor SOLO por variables de entorno (criterio 2): la misma
 *    función `enviarCorreo`, sin tocar una línea de código, entrega en el
 *    captador B cuando `MAIL_SMTP_HOST/PORT` apuntan a él.
 *
 * NO cubre (ver docs/decision_log.md D-54 y docs/work_log.md): entrega a tres
 * BUZONES DE PROVEEDOR reales (criterio 3 literal) ni seguimiento desactivado
 * verificado en el panel de Resend (criterio 6) — ambos exigen el dominio de
 * envío verificado (F.2-4) y P-3/P-4 confirmados por Ricardo, que no existen
 * todavía. Este script prueba el MECANISMO; la entregabilidad real se prueba
 * cuando F.2-4 se resuelva.
 */
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";

import { emailDelivery } from "../../lib/db/schema.ts";
import { leerMailConfig, type MailConfig } from "../../lib/email/config.ts";
import { crearTransporteSmtp } from "../../lib/email/smtp-transport.ts";
import { enviarCorreo } from "../../lib/email/send.ts";
import { barrerColaDeCorreo, INTENTOS_MAXIMOS } from "../../lib/email/queue.ts";
import {
  registrarReconstructorDeReintento,
  limpiarRegistroDeReintentos,
} from "../../lib/email/retry-registry.ts";
import { withSystemScope, cerrarConexion } from "../../lib/db/scope.ts";
import { EMAIL_KINDS, type EmailKind, type EmailTransport } from "../../lib/email/types.ts";
import { renderizarEmail } from "../../lib/email/templates.ts";
import { iniciarServidorSmtpFalso, type ServidorFalso } from "./fake-smtp-server.ts";

let fallos = 0;
function ok(nombre: string, condicion: boolean, detalle = "") {
  if (condicion) console.log(`  ✓ ${nombre}`);
  else {
    fallos++;
    console.error(`  ✗ ${nombre}${detalle ? ` — ${detalle}` : ""}`);
  }
}

async function leerFila(id: string) {
  return withSystemScope("prueba: leer resultado (FU-08 test)", async (tx) => {
    const [fila] = await tx.select().from(emailDelivery).where(eq(emailDelivery.id, id));
    return fila;
  });
}

async function forzarVencimiento(id: string) {
  await withSystemScope("prueba: forzar vencimiento (FU-08 test)", (tx) =>
    tx
      .update(emailDelivery)
      .set({ nextAttemptAt: new Date(Date.now() - 1000) })
      .where(eq(emailDelivery.id, id)),
  );
}

/** Lee `leerMailConfig()` con el host/puerto de un captador concreto, sin tocar el resto de variables. */
function configPara(captador: ServidorFalso): MailConfig {
  process.env.MAIL_SMTP_HOST = "127.0.0.1";
  process.env.MAIL_SMTP_PORT = String(captador.puerto);
  return leerMailConfig();
}

const DATA_DE_PRUEBA: Record<EmailKind, Record<string, string>> = {
  invitation: {
    organizationName: "Empresa de prueba",
    inviteUrl: "https://staging.softlandingglobal.com/invitacion/abc123",
    expiresAt: "2026-09-17",
  },
  password_reset: {
    resetUrl: "https://staging.softlandingglobal.com/reset/xyz789",
    expiresAt: "2026-09-10T18:00:00Z",
  },
  capture_notice: {
    leadName: "Persona de prueba",
    leadEmail: "lead@empresa-prueba.test",
    downloadTitle: "Documento de prueba",
    crmContactUrl: "https://crm.softlandingglobal.com/contactos/1",
  },
  capture_failed_alert: {
    leadEmail: "lead@empresa-prueba.test",
    leadCaptureId: "lc_prueba_1",
  },
};

async function main() {
  console.log("FU-08 — puerto de correo, cola y reintento\n");

  // Registra reconstructores triviales: en FU-08 no hay todavía llamador real
  // (FU-07/DU-01/DU-09 no están construidas), así que la propia suite hace de
  // llamador para poder probar el mecanismo completo (retry-registry.ts).
  for (const kind of EMAIL_KINDS) {
    registrarReconstructorDeReintento(kind, (fila) =>
      renderizarEmail(kind, fila.locale as "es" | "en", DATA_DE_PRUEBA[kind]),
    );
  }

  const captadorA = await iniciarServidorSmtpFalso();
  const cfgA = configPara(captadorA);
  const transporteA = crearTransporteSmtp(cfgA);

  // ── A. Los cuatro tipos de correo, entregados y con evidencia persistida ──
  console.log("A. Los cuatro tipos de correo (criterio 3, mecanismo)");
  for (const kind of EMAIL_KINDS) {
    const to = `destinatario-${kind}-${randomUUID().slice(0, 8)}@empresa-prueba.test`;
    const locale = "es" as const;
    const { id, entregado } = await enviarCorreo(
      { kind, to, locale, data: DATA_DE_PRUEBA[kind] },
      cfgA,
      transporteA,
    );
    const fila = await leerFila(id);
    ok(`${kind} → entregado en el primer intento`, entregado && fila?.status === "delivered");
    ok(
      `${kind} → from_email/reply_to persistidos`,
      fila?.fromEmail === cfgA.fromAddress && fila?.replyTo === cfgA.replyTo,
    );
    ok(
      `${kind} → template_key/subject_key/locale persistidos`,
      !!fila?.templateKey && !!fila?.subjectKey && fila?.locale === locale,
    );
    ok(`${kind} → provider_message_id y sent_at presentes`, !!fila?.providerMessageId && !!fila?.sentAt);

    const recibidos = captadorA.mensajesPara(to);
    ok(`${kind} → llegó de verdad al captador SMTP (no solo a la base)`, recibidos.length === 1);
    ok(
      `${kind} → remitente correcto en el sobre SMTP`,
      recibidos[0]?.from === cfgA.fromAddress,
    );
  }

  // ── B. Reintento: falla dos veces, entrega a la tercera ────────────────────
  console.log("\nB. Reintento tras fallo transitorio (criterio 5)");
  {
    let llamadas = 0;
    const transporteInestable: EmailTransport = {
      async enviar(msg) {
        llamadas++;
        if (llamadas <= 2) throw new Error("fallo simulado de red");
        return transporteA.enviar(msg);
      },
    };
    const to = `reintento-${randomUUID().slice(0, 8)}@empresa-prueba.test`;
    const { id, entregado } = await enviarCorreo(
      { kind: "invitation", to, locale: "es", data: DATA_DE_PRUEBA.invitation },
      cfgA,
      transporteInestable,
    );
    ok("intento 1 falla, la operación no lanza", !entregado);
    let fila = await leerFila(id);
    ok(
      "attempts=1, status=pending, next_attempt_at fijado",
      fila?.attempts === 1 && fila?.status === "pending" && !!fila?.nextAttemptAt,
    );
    ok("el error queda saneado y guardado", !!fila?.lastError);

    // Fuerza el vencimiento del plazo para no esperar 1 minuto real en la suite.
    await forzarVencimiento(id);
    await barrerColaDeCorreo(cfgA, transporteInestable);
    fila = await leerFila(id);
    ok("intento 2 falla también, attempts=2", fila?.attempts === 2 && fila?.status === "pending");

    await forzarVencimiento(id);
    await barrerColaDeCorreo(cfgA, transporteInestable);
    fila = await leerFila(id);
    ok("intento 3 entrega: status=delivered, sent_at presente", fila?.status === "delivered" && !!fila?.sentAt);
  }

  // ── C. Agotamiento: cinco fallos → failed ──────────────────────────────────
  console.log("\nC. Agotamiento de intentos (data_model §3.9)");
  {
    const transporteRoto: EmailTransport = {
      async enviar() {
        throw new Error("fallo simulado permanente");
      },
    };
    const to = `agotamiento-${randomUUID().slice(0, 8)}@empresa-prueba.test`;
    const { id } = await enviarCorreo(
      { kind: "password_reset", to, locale: "es", data: DATA_DE_PRUEBA.password_reset },
      cfgA,
      transporteRoto,
    );
    for (let i = 1; i < INTENTOS_MAXIMOS; i++) {
      await forzarVencimiento(id);
      await barrerColaDeCorreo(cfgA, transporteRoto);
    }
    const fila = await leerFila(id);
    ok(
      `tras ${INTENTOS_MAXIMOS} intentos → status=failed, sin próximo intento`,
      fila?.attempts === INTENTOS_MAXIMOS && fila?.status === "failed" && fila?.nextAttemptAt === null,
    );
  }

  // ── D. Cambio de destino SOLO por variables de entorno (criterio 2) ────────
  console.log("\nD. Cambio de destino por variables de entorno, sin editar código (criterio 2)");
  {
    const captadorB = await iniciarServidorSmtpFalso();
    const cfgB = configPara(captadorB); // misma función leerMailConfig(), cero cambios de código
    const transporteB = crearTransporteSmtp(cfgB); // misma función crearTransporteSmtp(), cero cambios de código
    const to = `destino-b-${randomUUID().slice(0, 8)}@empresa-prueba.test`;

    const { entregado } = await enviarCorreo(
      { kind: "invitation", to, locale: "es", data: DATA_DE_PRUEBA.invitation },
      cfgB,
      transporteB,
    );
    ok("entrega en el destino B con la misma función enviarCorreo", entregado);
    ok("el mensaje llegó al captador B", captadorB.mensajesPara(to).length === 1);
    ok("el mensaje NO llegó al captador A (destinos realmente distintos)", captadorA.mensajesPara(to).length === 0);

    await captadorB.detener();
  }

  await captadorA.detener();
  limpiarRegistroDeReintentos();
  await cerrarConexion();

  console.log(fallos ? `\n✗ ${fallos} comprobación(es) fallida(s).\n` : "\n✓ Todo correcto.\n");
  process.exit(fallos ? 1 : 0);
}

main().catch((error) => {
  console.error("Error inesperado en test-email.ts:", error);
  process.exit(1);
});
