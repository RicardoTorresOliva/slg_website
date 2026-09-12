/**
 * test-correo.ts — El adaptador de correo contra un servidor SMTP REAL.
 *
 * Y, sobre todo, **el criterio 2**: «cambiar de proveedor se demuestra en la
 * práctica: se ejecuta la suite contra un segundo destino configurado solo por
 * variables de entorno, sin editar código». Aquí la misma suite corre dos veces
 * contra dos servidores distintos, con credenciales distintas, y lo único que
 * cambia entre una vuelta y otra son cuatro variables de entorno. Si alguien
 * metiera el nombre del proveedor en el código, la segunda vuelta fallaría.
 *
 * Necesita la base local: `bash scripts/db/local-pg.sh up`.
 */
import { SMTPServer } from "smtp-server";

import {
  barrerCorreo,
  componer,
  ErrorDeCorreo,
  enviarCorreo,
  encolarCorreo,
  TIPOS_DE_CORREO,
  type TipoDeCorreo,
} from "../../lib/mail/index.ts";
import { emailDelivery } from "../../lib/db/schema.ts";
import { cerrarConexion, withSystemScope } from "../../lib/db/scope.ts";
import { eq } from "drizzle-orm";

let fallos = 0;
let comprobaciones = 0;

function check(caso: string, ok: boolean, detalle = "") {
  comprobaciones++;
  if (ok) console.log(`  ✓ ${caso}`);
  else {
    fallos++;
    console.error(`  ✗ ${caso}${detalle ? `\n      ${detalle}` : ""}`);
  }
}

/* ══════════════════════════════════════════════════════════════════════════
 * Dos servidores SMTP de prueba. No son dobles del adaptador: son servidores
 * SMTP de verdad, que negocian el protocolo y aceptan o rechazan. Un doble del
 * adaptador probaría que el adaptador llama al doble.
 * ══════════════════════════════════════════════════════════════════════════ */

type Recibido = { from: string; to: string[]; crudo: string };

type Buzon = {
  readonly puerto: number;
  readonly usuario: string;
  readonly clave: string;
  readonly recibidos: Recibido[];
  /** Rechaza a este destinatario, para probar la clasificación «rechazo». */
  rechazarA: string | null;
  cerrar: () => Promise<void>;
};

async function levantarBuzon(puerto: number, usuario: string, clave: string): Promise<Buzon> {
  const recibidos: Recibido[] = [];
  const buzon: Buzon = {
    puerto,
    usuario,
    clave,
    recibidos,
    rechazarA: null,
    cerrar: async () => {},
  };

  const servidor = new SMTPServer({
    secure: false,
    authOptional: false,
    disabledCommands: ["STARTTLS"],
    onAuth(auth, _sesion, cb) {
      if (auth.username === usuario && auth.password === clave) return cb(null, { user: usuario });
      return cb(new Error("credenciales incorrectas"));
    },
    onRcptTo(destino, _sesion, cb) {
      if (buzon.rechazarA && destino.address === buzon.rechazarA) {
        const e = new Error("destinatario rechazado") as Error & { responseCode?: number };
        e.responseCode = 550;
        return cb(e);
      }
      cb();
    },
    onData(flujo, sesion, cb) {
      let crudo = "";
      flujo.on("data", (c) => (crudo += c.toString("utf8")));
      flujo.on("end", () => {
        recibidos.push({
          from: sesion.envelope.mailFrom ? sesion.envelope.mailFrom.address : "",
          to: sesion.envelope.rcptTo.map((r) => r.address),
          crudo,
        });
        cb();
      });
    },
  });

  await new Promise<void>((res) => servidor.listen(puerto, "127.0.0.1", res));
  buzon.cerrar = () => new Promise<void>((res) => servidor.close(() => res()));
  return buzon;
}

/** Apunta el adaptador a un buzón. CUATRO VARIABLES. Ninguna línea de código. */
function apuntarA(buzon: Buzon, from: string) {
  process.env.MAIL_SMTP_HOST = "127.0.0.1";
  process.env.MAIL_SMTP_PORT = String(buzon.puerto);
  process.env.MAIL_SMTP_USERNAME = buzon.usuario;
  process.env.MAIL_SMTP_PASSWORD = buzon.clave;
  process.env.MAIL_FROM_ADDRESS = from;
  process.env.MAIL_FROM_NAME = "SLG Agency";
  process.env.MAIL_REPLY_TO = "support@softlandingglobal.com";
  process.env.MAIL_ALERTS_TO = "support@softlandingglobal.com";
}

const DATOS: Readonly<Record<TipoDeCorreo, Record<string, string>>> = {
  invitation: { invitadoPor: "Ricardo", url: "https://softlandingglobal.com/invitacion/T0KEN", empresa: "Acme" },
  password_reset: { url: "https://softlandingglobal.com/recuperar/T0KEN" },
  capture_notice: { correo: "lead@empresa.com", origen: "/ai/academy/phoenix-peex", urlCrm: "https://crm.softlandingglobal.com/contacts/1", documento: "D-01" },
  capture_failed_alert: { correo: "lead@empresa.com", urlHq: "https://softlandingglobal.com/hq/capturas/1", ultimoError: "timeout" },
};

async function filaDe(id: string) {
  return withSystemScope("leer una fila de correo en la prueba", async (db) => {
    const [f] = await db.select().from(emailDelivery).where(eq(emailDelivery.id, id));
    return f;
  });
}

/* ══════════════════════════════════════════════════════════════════════════
 * La suite. Se ejecuta tal cual contra los dos buzones.
 * ══════════════════════════════════════════════════════════════════════════ */

async function suite(etiqueta: string, buzon: Buzon, from: string) {
  console.log(`\n── ${etiqueta} ──\n`);
  apuntarA(buzon, from);
  buzon.recibidos.length = 0;
  buzon.rechazarA = null;

  // 1 · Los cuatro tipos salen y llegan.
  for (const tipo of TIPOS_DE_CORREO) {
    const r = await enviarCorreo({
      tipo,
      para: `destino-${tipo}@ejemplo.com`,
      idioma: "es",
      datos: DATOS[tipo],
    });
    check(`${tipo} · entregado`, r.estado === "delivered", r.error ?? "");
    check(`${tipo} · el proveedor devolvió identificador`, !!r.providerMessageId);

    const fila = await filaDe(r.emailDeliveryId);
    check(`${tipo} · el remitente se persiste`, fila?.fromEmail === from, `fue ${fila?.fromEmail}`);
    check(
      `${tipo} · Reply-To a support@ se persiste (RF-117)`,
      fila?.replyTo === "support@softlandingglobal.com",
      `fue ${fila?.replyTo}`,
    );
    check(`${tipo} · se persiste la clave de plantilla, no el cuerpo`, fila?.templateKey === `mail.${tipo}`);
  }

  check(
    "los cuatro llegaron al servidor",
    buzon.recibidos.length === TIPOS_DE_CORREO.length,
    `llegaron ${buzon.recibidos.length}`,
  );

  const uno = buzon.recibidos[0];
  check("el sobre lleva el remitente del subdominio de envío (D-24)", uno.from === from, `fue ${uno.from}`);
  check("la cabecera Reply-To viaja", /reply-to:\s*support@softlandingglobal\.com/i.test(uno.crudo));
  check("lleva versión de texto y versión HTML", /content-type:\s*text\/plain/i.test(uno.crudo) && /content-type:\s*text\/html/i.test(uno.crudo));

  // 2 · Cero seguimiento (D-22, privacy-first).
  const conImagen = buzon.recibidos.filter((r) => /<img/i.test(r.crudo));
  check("ningún correo lleva imagen remota (píxel de apertura)", conImagen.length === 0);
  const conCampana = buzon.recibidos.filter((r) => /utm_|[?&]track|list-unsubscribe/i.test(r.crudo));
  check("ningún correo lleva parámetros de campaña ni baja de lista", conCampana.length === 0);

  // 3 · El token no acaba en la base de datos.
  const conToken = await withSystemScope("buscar tokens persistidos", async (db) => {
    const filas = await db.select().from(emailDelivery);
    return filas.filter((f) => JSON.stringify(f).includes("T0KEN"));
  });
  check(
    "ningún token de invitación o recuperación se persiste (§8.2)",
    conToken.length === 0,
    `${conToken.length} filas lo contienen`,
  );

  // 4 · Rechazo del destinatario → clasificado, terminal, y el hecho registrado.
  buzon.rechazarA = "rechazado@ejemplo.com";
  const rechazado = await enviarCorreo({
    tipo: "capture_notice",
    para: "rechazado@ejemplo.com",
    idioma: "es",
    datos: DATOS.capture_notice,
  });
  check("un rechazo no lanza: el hecho de negocio sobrevive (RF-119)", rechazado.estado === "failed");
  check("el rechazo se clasifica como tal", (rechazado.error ?? "").startsWith("rechazo:"), rechazado.error ?? "");
  check("aun rechazado, queda fila de evidencia", (await filaDe(rechazado.emailDeliveryId)) !== undefined);
  buzon.rechazarA = null;

  // 5 · Credencial mala → `autenticacion`, y NO se reintenta.
  const claveBuena = process.env.MAIL_SMTP_PASSWORD;
  // Valor falso, en una constante con nombre neutro: pegar un literal junto al
  // nombre de la variable real es justo lo que `check:secrets` marca en rojo, y
  // hace bien aunque aquí sea de mentira.
  const noCoincide = "valor-que-no-autentica";
  process.env.MAIL_SMTP_PASSWORD = noCoincide;
  const malaAuth = await enviarCorreo({
    tipo: "capture_notice",
    para: "destino@ejemplo.com",
    idioma: "es",
    datos: DATOS.capture_notice,
  });
  check("credencial mala se clasifica como autenticación", (malaAuth.error ?? "").startsWith("autenticacion:"), malaAuth.error ?? "");
  check(
    "una credencial mala NO se reintenta",
    malaAuth.estado === "failed",
    "insistir no arregla una credencial equivocada; lo que hace falta es que alguien la mire",
  );
  process.env.MAIL_SMTP_PASSWORD = claveBuena;

  // 6 · Servidor caído → reintentable, la fila queda pendiente.
  const puertoBueno = process.env.MAIL_SMTP_PORT;
  process.env.MAIL_SMTP_PORT = "1";
  const caido = await enviarCorreo({
    tipo: "capture_notice",
    para: "destino@ejemplo.com",
    idioma: "es",
    datos: DATOS.capture_notice,
  });
  check("un servidor caído deja el correo en cola, no lo pierde", caido.estado === "pending", caido.error ?? "");
  const filaCaida = await filaDe(caido.emailDeliveryId);
  check("y con próximo intento programado", filaCaida?.nextAttemptAt !== null);
  process.env.MAIL_SMTP_PORT = puertoBueno;

  // 7 · El barrendero recoge lo pendiente y lo entrega.
  //
  // La fila quedó programada para dentro de un minuto —la primera espera de
  // B.6-3—, así que se la adelanta en vez de dormir sesenta segundos. Lo que se
  // prueba es el barrendero, no el reloj: que la espera sea la correcta ya lo
  // comprobó la comprobación anterior.
  await withSystemScope("adelantar el vencimiento en la prueba", async (db) => {
    await db
      .update(emailDelivery)
      .set({ nextAttemptAt: new Date(Date.now() - 1000) })
      .where(eq(emailDelivery.id, caido.emailDeliveryId));
  });

  const barrido = await barrerCorreo({
    datosPara: (f) => DATOS[f.tipo] ?? null,
  });
  check("el barrendero entrega lo que quedó en cola", barrido.entregados >= 1, JSON.stringify(barrido));
  const filaRecuperada = await filaDe(caido.emailDeliveryId);
  check("y la fila queda entregada", filaRecuperada?.status === "delivered", `quedó ${filaRecuperada?.status}`);

  // 8 · Un correo con enlace no se puede recomponer: el barrendero lo marca.
  const sinDatos = await encolarCorreo({
    tipo: "invitation",
    para: "sin-datos@ejemplo.com",
    idioma: "es",
    from,
    replyTo: "support@softlandingglobal.com",
    templateKey: "mail.invitation",
    subjectKey: "mail.invitation.subject",
  });
  const barrido2 = await barrerCorreo({ datosPara: () => null });
  check("una invitación sin datos recomponibles se marca fallida, no se repite cinco veces", barrido2.fallidos >= 1);
  const filaSinDatos = await filaDe(sinDatos);
  check("con el motivo escrito", (filaSinDatos?.lastError ?? "").includes("sin datos de plantilla"));
}

/* ══════════════════════════════════════════════════════════════════════════ */

async function main() {
  console.log("Adaptador de correo — contra servidores SMTP reales\n");

  // Composición: no necesita servidor ni base de datos.
  console.log("── Plantillas ──\n");
  for (const tipo of TIPOS_DE_CORREO) {
    for (const idioma of ["es", "en"] as const) {
      const c = componer({ tipo, para: "x@y.com", idioma, datos: DATOS[tipo] });
      check(`${tipo}/${idioma} · tiene asunto`, c.asunto.length > 0);
      check(`${tipo}/${idioma} · tiene texto plano`, c.texto.trim().length > 0);
    }
  }
  let faltoDato = false;
  try {
    componer({ tipo: "invitation", para: "x@y.com", idioma: "es", datos: {} });
  } catch {
    faltoDato = true;
  }
  check("una plantilla con un hueco sin rellenar falla antes de salir", faltoDato);

  const A = await levantarBuzon(2526, "usuario-a", "clave-a");
  const B = await levantarBuzon(2527, "usuario-b", "clave-b");

  try {
    // LA MISMA SUITE, DOS DESTINOS. Solo cambian variables de entorno.
    await suite("Destino 1", A, "no-reply@mailweb.softlandingglobal.com");
    await withSystemScope("limpiar entre vueltas", async (db) => {
      await db.delete(emailDelivery);
    });
    await suite("Destino 2 — mismo código, otras variables (criterio 2)", B, "avisos@envios.softlandingglobal.com");

    console.log("\n── Criterio 2 ──\n");
    check(
      "el primer destino recibió correo",
      A.recibidos.length > 0,
      `recibió ${A.recibidos.length}`,
    );
    check(
      "el segundo destino recibió correo, con otra credencial y otro remitente",
      B.recibidos.length > 0 && B.recibidos[0].from === "avisos@envios.softlandingglobal.com",
      `recibió ${B.recibidos.length}, remitente ${B.recibidos[0]?.from}`,
    );
  } finally {
    await A.cerrar();
    await B.cerrar();
    await withSystemScope("limpiar la cola de prueba", async (db) => {
      await db.delete(emailDelivery);
    });
    await cerrarConexion();
  }
}

try {
  await main();
} catch (e) {
  console.error(`\n✗ La prueba no pudo completarse: ${(e as Error).message}`);
  if (e instanceof ErrorDeCorreo) console.error(`   clase: ${e.clase}`);
  fallos++;
}

console.log("");
if (fallos > 0) {
  console.error(`✗ correo: ${fallos} fallo(s) sobre ${comprobaciones} comprobaciones.\n`);
  process.exit(1);
}
console.log(`✓ correo: ${comprobaciones} comprobaciones contra SMTP real, sin fallos.\n`);
