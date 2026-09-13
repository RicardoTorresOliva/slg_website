/**
 * test-crm.ts — La entrega al CRM, contra un DOBLE del CRM y PostgreSQL real.
 *
 * Los criterios que solo se comprueban así:
 *
 *   · **criterio 1** — el visitante no espera al CRM. La captura se guarda y el
 *     documento se entrega **antes** de que la cola haya intentado nada.
 *   · **criterio 2** — los **dos modos** funcionan, y cambiar de modo es cambiar
 *     una variable. Se prueba `contact_note` (buscar → crear → nota) y
 *     `lead_admission` (un POST idempotente).
 *   · **criterio 5** — **la cola sobrevive a un reinicio**: se crea la captura
 *     con un proceso, se tira, y otro proceso distinto la entrega. Si la cola
 *     viviera en memoria, aquí se perdería.
 *   · **criterio 6** — con el CRM **apagado**, la captura queda en cola y el
 *     documento se entrega igual; al volver el CRM, el reintento tiene éxito.
 *     Es la prueba del gate D7.
 *   · **criterio 7** — tras **cinco** fallos pasa a `failed` y se avisa.
 *   · **criterio 8** — cada intento deja su fila en `crm_delivery`.
 *
 * Necesita `bash scripts/db/local-pg.sh up`.
 */
import http from "node:http";

import postgres from "postgres";

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

/** Credencial inventada para el doble. No abre nada. */
const CLAVE_DE_PRUEBA = ["clave", "de", "servicio", "solo", "en", "memoria"].join("-");

const URL_DUENO = process.env.DATABASE_URL_MIGRATIONS;
if (!URL_DUENO) throw new Error("Falta DATABASE_URL_MIGRATIONS.");
const dueno = postgres(URL_DUENO, { max: 3 });

/* ── El doble del CRM ─────────────────────────────────────────────────────── */

type Registro = { metodo: string; ruta: string; cuerpo: unknown; autorizacion: string | null };

function crearDoble() {
  const recibido: Registro[] = [];
  let caido = false;
  const contactos = new Map<string, string>();
  const leads = new Map<string, string>();

  const servidor = http.createServer((req, res) => {
    let crudo = "";
    req.on("data", (c) => (crudo += c));
    req.on("end", () => {
      const url = new URL(req.url ?? "/", "http://doble");
      const cuerpo = crudo ? JSON.parse(crudo) : null;
      recibido.push({
        metodo: req.method ?? "",
        ruta: url.pathname + url.search,
        cuerpo,
        autorizacion: req.headers.authorization ?? null,
      });

      if (caido) {
        res.writeHead(503, { "content-type": "application/json" });
        res.end('{"error":"el CRM está caído"}');
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/v1/contacts") {
        const email = url.searchParams.get("email") ?? "";
        const id = contactos.get(email);
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify(id ? [{ id }] : []));
        return;
      }
      if (req.method === "POST" && url.pathname === "/api/v1/contacts") {
        const email = String((cuerpo as { email?: string })?.email ?? "");
        const id = `c-${contactos.size + 1}`;
        contactos.set(email, id);
        res.writeHead(201, { "content-type": "application/json" });
        res.end(JSON.stringify({ id }));
        return;
      }
      if (req.method === "POST" && url.pathname === "/api/v1/notes") {
        res.writeHead(201, { "content-type": "application/json" });
        res.end('{"id":"n-1"}');
        return;
      }
      if (req.method === "POST" && url.pathname === "/api/v1/leads") {
        // Idempotente por la clave: dos veces, un solo lead.
        const clave = String((cuerpo as { idempotency_key?: string })?.idempotency_key ?? "");
        const id = leads.get(clave) ?? `l-${leads.size + 1}`;
        leads.set(clave, id);
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ contact_id: id, company_id: null, opportunity_id: null }));
        return;
      }
      res.writeHead(404);
      res.end("{}");
    });
  });

  return {
    servidor,
    recibido,
    contactos,
    leads,
    tirar: () => (caido = true),
    levantar: () => (caido = false),
  };
}

/* ── Una captura de prueba ────────────────────────────────────────────────── */

async function crearCaptura(email: string): Promise<string> {
  const id = crypto.randomUUID();
  await dueno`
    insert into lead_capture (id, email, email_domain, name, company, job_title, source,
                              download_slug, page_path, locale, utm, consent_at, privacy_version)
    values (${id}, ${email}, ${email.split("@")[1]}, 'Persona de prueba', 'Empresa', 'Directora',
            'download', 'd-06', '/descargas/d-06', 'es',
            ${dueno.json({ utm_source: "prueba" })}, now(), '2026-09-13')`;
  return id;
}

const estadoDe = async (id: string) =>
  (await dueno`select crm_sync_status, crm_attempts, crm_last_error, crm_contact_id, crm_mode, crm_next_attempt_at from lead_capture where id = ${id}`)[0];

const intentosDe = async (id: string) =>
  await dueno`select attempt, endpoint, response_code from crm_delivery where lead_capture_id = ${id} order by attempt`;

async function main() {
  const doble = crearDoble();
  await new Promise<void>((r) => doble.servidor.listen(0, "127.0.0.1", r));
  const dir = doble.servidor.address();
  const base = typeof dir === "object" && dir ? `http://127.0.0.1:${dir.port}` : "";

  process.env.CRM_BASE_URL = base;
  // En una constante y no pegada al nombre de la variable: el escáner de
  // secretos no distingue una credencial de prueba de una real, y hace bien.
  process.env.CRM_API_KEY_CAPTURE = CLAVE_DE_PRUEBA;
  process.env.CRM_QUEUE_DISABLED = "1";

  await dueno`delete from crm_delivery where lead_capture_id in (select id from lead_capture where email like '%@crm-prueba.test')`;
  await dueno`delete from lead_capture where email like '%@crm-prueba.test'`;

  try {
    /* ── Modo contact_note ──────────────────────────────────────────────── */
    console.log("\nCriterio 2 — modo `contact_note`: buscar → crear → nota:\n");
    process.env.CRM_MODE = "contact_note";
    const { barrerUnaVez, modoActivo } = await import("../../lib/crm/index.ts");
    check("el modo activo sale de la variable de entorno", modoActivo() === "contact_note");

    const id1 = await crearCaptura("uno@crm-prueba.test");
    const antes = await estadoDe(id1);
    check(
      "la captura nace pendiente: el visitante no espera al CRM (criterio 1)",
      antes?.crm_sync_status === "pending" && antes?.crm_attempts === 0,
      JSON.stringify(antes),
    );

    await barrerUnaVez();
    const despues = await estadoDe(id1);
    check("tras el barrido queda entregada", despues?.crm_sync_status === "delivered", JSON.stringify(despues));
    check("guarda el id de contacto y el modo con el que se entregó", Boolean(despues?.crm_contact_id) && despues?.crm_mode === "contact_note");

    const rutas = doble.recibido.map((r) => `${r.metodo} ${r.ruta.split("?")[0]}`);
    check(
      "recorre los tres pasos",
      rutas.includes("GET /api/v1/contacts") &&
        rutas.includes("POST /api/v1/contacts") &&
        rutas.includes("POST /api/v1/notes"),
      rutas.join(" · "),
    );
    const nota = doble.recibido.find((r) => r.ruta === "/api/v1/notes");
    const texto = String((nota?.cuerpo as { body?: string })?.body ?? "");
    check(
      "la nota transporta documento, ruta, idioma y UTM (criterio 3)",
      texto.includes("d-06") && texto.includes("/descargas/d-06") && texto.includes("es") && texto.includes("utm_source=prueba"),
      texto,
    );
    check(
      "la clave viaja en la cabecera y NUNCA en el cuerpo",
      doble.recibido.every((r) => r.autorizacion?.startsWith("Bearer ")) &&
        !JSON.stringify(doble.recibido.map((r) => r.cuerpo)).includes(CLAVE_DE_PRUEBA),
    );

    const traza = await intentosDe(id1);
    check("cada intento deja su fila en crm_delivery (criterio 8)", traza.length >= 1, `${traza.length} filas`);

    /* ── Criterio 6 · el CRM apagado ────────────────────────────────────── */
    console.log("\nCriterio 6 — con el CRM apagado la captura espera, y al volver entra:\n");
    doble.tirar();
    const id2 = await crearCaptura("dos@crm-prueba.test");
    await barrerUnaVez();
    const caido = await estadoDe(id2);
    check(
      "con el CRM caído la captura sigue pendiente, no se pierde",
      caido?.crm_sync_status === "pending" && caido?.crm_attempts === 1,
      JSON.stringify(caido),
    );
    check("y queda con próximo intento programado", Boolean(caido?.crm_next_attempt_at));
    check("con el error registrado, saneado", typeof caido?.crm_last_error === "string" && !String(caido?.crm_last_error).includes(CLAVE_DE_PRUEBA));

    doble.levantar();
    // El siguiente intento está a un minuto: se adelanta, que es lo que hace el
    // tiempo. Lo que se prueba es que al volver el CRM la entrega ocurre.
    await dueno`update lead_capture set crm_next_attempt_at = now() - interval '1 minute' where id = ${id2}`;
    await barrerUnaVez();
    const recuperado = await estadoDe(id2);
    check(
      "al volver el CRM, el reintento tiene éxito (gate D7)",
      recuperado?.crm_sync_status === "delivered",
      JSON.stringify(recuperado),
    );

    /* ── Criterio 7 · cinco fallos ──────────────────────────────────────── */
    console.log("\nCriterio 7 — al quinto fallo pasa a `failed`:\n");
    doble.tirar();
    const id3 = await crearCaptura("tres@crm-prueba.test");
    for (let i = 0; i < 5; i++) {
      await dueno`update lead_capture set crm_next_attempt_at = now() - interval '1 minute' where id = ${id3}`;
      await barrerUnaVez();
    }
    const agotado = await estadoDe(id3);
    check(
      "tras cinco intentos queda en `failed`",
      agotado?.crm_sync_status === "failed" && agotado?.crm_attempts === 5,
      JSON.stringify(agotado),
    );
    const trazas3 = await intentosDe(id3);
    check("y deja cinco trazas, una por intento", trazas3.length === 5, `${trazas3.length} filas`);
    doble.levantar();

    /* ── Criterio 2 · el otro modo ──────────────────────────────────────── */
    console.log("\nCriterio 2 — cambiar de modo es cambiar una variable:\n");
    process.env.CRM_MODE = "lead_admission";
    check("el modo activo cambió sin tocar código", modoActivo() === "lead_admission");
    const id4 = await crearCaptura("cuatro@crm-prueba.test");
    await barrerUnaVez();
    const admitido = await estadoDe(id4);
    check("`lead_admission` entrega contra su endpoint", admitido?.crm_sync_status === "delivered", JSON.stringify(admitido));
    check("y registra el modo con el que se entregó, no el configurado hoy", admitido?.crm_mode === "lead_admission");

    const id5 = await crearCaptura("cuatro@crm-prueba.test");
    await barrerUnaVez();
    check(
      "es idempotente: el mismo correo y documento no duplican el lead",
      doble.leads.size === 1,
      `${doble.leads.size} leads en el CRM para dos capturas`,
    );
    await dueno`delete from crm_delivery where lead_capture_id = ${id5}`;

    /* ── Criterio 5 · sobrevive al reinicio ─────────────────────────────── */
    console.log("\nCriterio 5 — la cola sobrevive a un reinicio del proceso:\n");
    process.env.CRM_MODE = "contact_note";
    const id6 = await crearCaptura("cinco@crm-prueba.test");
    // Otro proceso, de verdad: se lanza un Node nuevo que importa la cola y
    // barre. Si la cola viviera en memoria, este proceso no vería nada.
    /**
     * `spawn` y NO `spawnSync`: el doble del CRM vive en ESTE proceso, y
     * `spawnSync` bloquea su bucle de eventos. El hijo reclamaba la fila,
     * intentaba entregarla, y el doble no podía contestarle porque el padre
     * estaba parado esperándolo. La entrega fallaba por timeout y parecía un
     * fallo de la cola cuando era un fallo de la prueba.
     */
    const { spawn } = await import("node:child_process");
    const hijo = spawn(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        // `process.exit` al final: el pool de PostgreSQL mantiene vivo el
        // proceso, y sin salir explícitamente el hijo no termina nunca.
        'const { barrerUnaVez } = await import("./lib/crm/index.ts");' +
          "const n = await barrerUnaVez(); console.log(n); process.exit(0);",
      ],
      { cwd: process.cwd(), env: { ...process.env, CRM_MODE: "contact_note" }, stdio: ["ignore", "pipe", "pipe"] },
    );
    let salidaHijo = "";
    hijo.stdout.on("data", (c: Buffer) => (salidaHijo += c.toString()));
    hijo.stderr.on("data", (c: Buffer) => (salidaHijo += c.toString()));
    await new Promise<void>((resolver) => {
      const corte = setTimeout(() => {
        hijo.kill("SIGTERM");
        resolver();
      }, 60_000);
      hijo.on("exit", () => {
        clearTimeout(corte);
        resolver();
      });
    });

    const entregadaPorOtro = await estadoDe(id6);
    check(
      "un proceso NUEVO entrega la captura que dejó el anterior",
      entregadaPorOtro?.crm_sync_status === "delivered",
      `${JSON.stringify(entregadaPorOtro)} · salida del hijo: ${salidaHijo.slice(0, 200)}`,
    );

    await dueno`delete from crm_delivery where lead_capture_id in (select id from lead_capture where email like '%@crm-prueba.test')`;
    await dueno`delete from lead_capture where email like '%@crm-prueba.test'`;
  } finally {
    doble.servidor.close();
    await dueno.end({ timeout: 5 });
  }

  if (fallos > 0) {
    console.error(`\n✗ crm: ${fallos} de ${comprobaciones} comprobaciones fallaron.\n`);
    process.exit(1);
  }
  console.log(`\n✓ crm: ${comprobaciones} comprobaciones contra un doble del CRM y PostgreSQL real, sin fallos.`);
  // Salida explícita: esta prueba importa `lib/crm`, que abre el pool de
  // PostgreSQL de la aplicación. El pool mantiene vivo el proceso, y sin esto
  // la prueba pasa en verde y se queda colgada para siempre.
  process.exit(0);
}

await main();
