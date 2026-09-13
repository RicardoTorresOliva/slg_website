/**
 * test-descargas.ts — El camino completo del visitante (DU-08, criterio 11).
 *
 * Contra **PostgreSQL real** y el **servidor real**: el orden de las
 * operaciones es el requisito —el lead se guarda ANTES de responder— y eso solo
 * se comprueba mirando la base después de cada envío.
 *
 * Los casos, y por qué cada uno está:
 *
 *   · **Trampa rellena** ⇒ responde como un éxito y **no crea lead** (RF-33).
 *     Si creara uno, el bot habría conseguido lo que venía a buscar.
 *   · **Dominio gratuito** ⇒ mensaje explícito, y **tampoco crea lead**.
 *   · **Documento sin archivo** ⇒ **sí crea lead**, no emite firma y no crea
 *     `download_event` (RF-40). Es el caso que más se rompe al implementarlo
 *     «cuando haya PDFs».
 *   · **Límite superado** ⇒ el sexto envío se corta, y la respuesta **no dice
 *     cuál era el umbral** (RF-34).
 *   · **La lista se amplía sin desplegar** (RF-32): se inserta un dominio y el
 *     rechazo ocurre sin reconstruir nada.
 *
 * Necesita `bash scripts/db/local-pg.sh up` y `npm run build:standalone`.
 */
import { spawn, type ChildProcess } from "node:child_process";
import net from "node:net";
import path from "node:path";

import postgres from "postgres";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const SERVER = path.join(REPO_ROOT, ".next", "standalone", "server.js");

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

const URL_DUENO = process.env.DATABASE_URL_MIGRATIONS;
if (!URL_DUENO) throw new Error("Falta DATABASE_URL_MIGRATIONS para inspeccionar la base.");
const dueno = postgres(URL_DUENO, { max: 2 });

async function puertoLibre(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const dir = srv.address();
      if (typeof dir === "object" && dir) {
        const p = dir.port;
        srv.close(() => resolve(p));
      } else reject(new Error("sin puerto"));
    });
  });
}

async function arrancar(env: Record<string, string>) {
  const port = await puertoLibre();
  const base = `http://127.0.0.1:${port}`;
  const proc: ChildProcess = spawn(process.execPath, [SERVER], {
    cwd: path.dirname(SERVER),
    env: {
      ...process.env,
      ...env,
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
      NODE_ENV: "production",
      BETTER_AUTH_URL: base,
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? "solo-para-probar-descargas",
      NEXT_PUBLIC_SITE_URL: base,
      STAGING_BASIC_AUTH_USER: "",
      STAGING_BASIC_AUTH_PASSWORD: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const limite = Date.now() + 30_000;
  while (Date.now() < limite) {
    if (proc.exitCode !== null) throw new Error(`el servidor murió con código ${proc.exitCode}`);
    try {
      if ((await fetch(`${base}/api/health`)).ok) return { base, parar: () => proc.kill("SIGTERM") };
    } catch {
      /* aún no escucha */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  proc.kill("SIGTERM");
  throw new Error("el servidor no respondió en 30 s");
}

/** Envía el formulario como lo haría un navegador, sin seguir la redirección. */
async function enviar(
  base: string,
  campos: Record<string, string>,
): Promise<{ status: number; destino: string }> {
  const cuerpo = new URLSearchParams(campos);
  const r = await fetch(`${base}/api/descargas`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: cuerpo,
    redirect: "manual",
  });
  return { status: r.status, destino: r.headers.get("location") ?? "" };
}

const leadsDe = async (email: string) =>
  dueno`select id, email_domain, download_slug, privacy_version, consent_at from lead_capture where email = ${email}`;

const eventosDe = async (leadId: string) =>
  dueno`select id from download_event where lead_capture_id = ${leadId}`;

async function main() {
  // El umbral se baja a 3 para que la prueba no tenga que hacer cientos de
  // peticiones. Lo que se comprueba es el MECANISMO, no el número.
  const { base, parar } = await arrancar({
    PUBLIC_FORM_RATE_LIMIT_MAX: "3",
    PUBLIC_FORM_RATE_LIMIT_WINDOW_MS: "60000",
  });

  try {
    await dueno`delete from download_event where lead_capture_id in (select id from lead_capture where email like '%@prueba-slg.com' or email like '%@gmail.com')`;
    await dueno`delete from lead_capture where email like '%@prueba-slg.com' or email like '%@gmail.com'`;

    /**
     * El contador del límite se vacía antes de CADA bloque.
     *
     * El umbral está en 3 para que el bloque del límite no tenga que hacer
     * cientos de peticiones, y la IP es la misma en todo lo que envía esta
     * prueba: sin vaciarlo, el segundo bloque se choca con el límite que dejó
     * el primero y parece roto lo que funciona.
     */
    const reiniciarLimite = () => dueno`delete from rate_limit_hit`;

    await reiniciarLimite();
    console.log("\nCampo trampa — se descarta EN SILENCIO y no deja rastro (RF-33):\n");
    const conTrampa = await enviar(base, {
      documento: "d-06",
      idioma: "es",
      email: "bot@prueba-slg.com",
      empresa_web: "soy un bot",
    });
    check(
      "el envío con la trampa rellena responde como un éxito",
      conTrampa.status === 303 && conTrampa.destino.includes("/gracias"),
      `status ${conTrampa.status} → ${conTrampa.destino}`,
    );
    check(
      "y NO crea ninguna captura",
      (await leadsDe("bot@prueba-slg.com")).length === 0,
      "un bot que consigue su fila ha conseguido lo que venía a buscar",
    );

    await reiniciarLimite();
    console.log("\nDominio de correo gratuito — mensaje explícito, y sin captura (RF-31):\n");
    const gratuito = await enviar(base, {
      documento: "d-06",
      idioma: "es",
      email: "persona@gmail.com",
    });
    check(
      "el correo de dominio gratuito se rechaza con motivo explícito",
      gratuito.destino.includes("error=dominio_gratuito"),
      `destino: ${gratuito.destino}`,
    );
    check(
      "y NO crea captura",
      (await leadsDe("persona@gmail.com")).length === 0,
      "un rechazo no es una captura",
    );

    await reiniciarLimite();
    console.log("\nAmpliar la lista NO requiere desplegar (RF-32):\n");
    await dueno`insert into free_email_domain (domain, added_by, note) values ('prueba-slg.com','test','ampliación en caliente') on conflict do nothing`;
    // La caché en proceso dura un minuto: se espera a que caduque para
    // comprobar que el cambio surte efecto SIN reconstruir ni reiniciar.
    await new Promise((r) => setTimeout(r, 61_000));
    const ampliado = await enviar(base, {
      documento: "d-06",
      idioma: "es",
      email: "alguien@prueba-slg.com",
    });
    check(
      "un dominio añadido por INSERT se rechaza sin reconstruir ni reiniciar",
      ampliado.destino.includes("error=dominio_gratuito"),
      `destino: ${ampliado.destino}`,
    );
    await dueno`delete from free_email_domain where domain = 'prueba-slg.com'`;

    await reiniciarLimite();
    console.log("\nDocumento SIN archivo — captura igual, y no emite firma (RF-40):\n");
    const sinArchivo = await enviar(base, {
      documento: "d-06",
      idioma: "es",
      email: "director@empresa-real-slg.test",
    });
    check(
      "el envío redirige a gracias con «próximamente»",
      sinArchivo.destino.includes("estado=proximamente"),
      `destino: ${sinArchivo.destino}`,
    );
    const leads = await leadsDe("director@empresa-real-slg.test");
    check("SÍ crea la captura", leads.length === 1, `${leads.length} filas`);
    check(
      "la captura guarda el dominio, el documento y la versión de la política",
      leads[0]?.email_domain === "empresa-real-slg.test" &&
        leads[0]?.download_slug === "d-06" &&
        Boolean(leads[0]?.privacy_version),
      JSON.stringify(leads[0] ?? {}),
    );
    check(
      "el consentimiento queda con marca de tiempo (RF-36)",
      Boolean(leads[0]?.consent_at),
      "sin consent_at no se puede demostrar a qué consintió",
    );
    check(
      "y NO se emite URL firmada: cero download_event",
      (await eventosDe(String(leads[0]?.id))).length === 0,
      "un documento sin archivo no puede haber entregado nada",
    );

    await reiniciarLimite();
    console.log("\nLímite de peticiones — 429 sin revelar el umbral (RF-34):\n");
    let cortado = "";
    for (let i = 0; i < 6; i++) {
      const r = await enviar(base, {
        documento: "d-06",
        idioma: "es",
        email: `tope${i}@empresa-real-slg.test`,
        // La misma IP en los seis: es lo que el límite por IP tiene que ver.
      });
      if (r.destino.includes("error=limite")) {
        cortado = r.destino;
        break;
      }
    }
    check("el límite corta antes del sexto envío", cortado !== "", "seis envíos seguidos pasaron");
    check(
      "la respuesta NO revela el umbral",
      !/\b3\b/.test(cortado.replace(/[^0-9]/g, " ").trim()) || !cortado.includes("max"),
      `destino: ${cortado}`,
    );

    /* ── DU-10 · las otras dos puertas, la MISMA máquina ─────────────────── */
    console.log("\nDU-10 — contacto y solicitud de doctrina, por el mismo camino:\n");

    await reiniciarLimite();

    const enviarA = async (ruta: string, campos: Record<string, string>) => {
      const r = await fetch(`${base}${ruta}`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(campos),
        redirect: "manual",
      });
      return { status: r.status, destino: r.headers.get("location") ?? "" };
    };

    const contacto = await enviarA("/api/contacto", {
      origen: "contact",
      idioma: "es",
      email: "contacto@empresa-real-slg.test",
      nombre: "Persona",
      mensaje: "Queremos hablar de SLG_Readiness.",
    });
    check(
      "el envío de contacto redirige a gracias con su variante",
      contacto.destino.includes("estado=contact"),
      `destino: ${contacto.destino}`,
    );
    const leadContacto = await dueno`select source, message from lead_capture where email = 'contacto@empresa-real-slg.test'`;
    check(
      "crea una captura con source `contact` y guarda el mensaje",
      leadContacto[0]?.source === "contact" && String(leadContacto[0]?.message).includes("SLG_Readiness"),
      JSON.stringify(leadContacto[0] ?? {}),
    );

    const doctrina = await enviarA("/api/contacto", {
      origen: "doctrine-request",
      idioma: "es",
      email: "doctrina@empresa-real-slg.test",
    });
    check(
      "la solicitud de doctrina redirige con SU variante, no con la de contacto",
      doctrina.destino.includes("estado=doctrine-request"),
      `destino: ${doctrina.destino}`,
    );
    const leadDoctrina = await dueno`select source from lead_capture where email = 'doctrina@empresa-real-slg.test'`;
    check(
      "crea una captura con source `doctrine-request`",
      leadDoctrina[0]?.source === "doctrine-request",
      JSON.stringify(leadDoctrina[0] ?? {}),
    );

    // Criterio 3: las tres puertas aplican FU-11 entero.
    const trampaContacto = await enviarA("/api/contacto", {
      origen: "contact",
      idioma: "es",
      email: "bot-contacto@empresa-real-slg.test",
      empresa_web: "soy un bot",
    });
    check(
      "el contacto también tiene campo trampa, y descarta en silencio",
      trampaContacto.destino.includes("/gracias") &&
        (await dueno`select id from lead_capture where email = 'bot-contacto@empresa-real-slg.test'`).length === 0,
      `destino: ${trampaContacto.destino}`,
    );
    const gratuitoContacto = await enviarA("/api/contacto", {
      origen: "contact",
      idioma: "es",
      email: "alguien@gmail.com",
    });
    check(
      "y rechaza los dominios de correo gratuito igual que la descarga",
      gratuitoContacto.destino.includes("error=dominio_gratuito"),
      `destino: ${gratuitoContacto.destino}`,
    );

    await dueno`delete from download_event where lead_capture_id in (select id from lead_capture where email like '%empresa-real-slg.test')`;
    await dueno`delete from lead_capture where email like '%empresa-real-slg.test' or email = 'alguien@gmail.com'`;
  } finally {
    parar();
    await dueno.end({ timeout: 5 });
  }

  if (fallos > 0) {
    console.error(`\n✗ descargas: ${fallos} de ${comprobaciones} comprobaciones fallaron.\n`);
    process.exit(1);
  }
  console.log(
    `\n✓ descargas: ${comprobaciones} comprobaciones contra PostgreSQL y el servidor reales, sin fallos.`,
  );
}

await main();
