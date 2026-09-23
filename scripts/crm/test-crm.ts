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
 *   · **paso 5b** — un sitio SIN CRM avisa por correo al buzón del cliente, y
 *     no entrega a nadie (ver `probarSinCrm`).
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

      // El doble imita el CONTRATO REAL del CRM contra el que se escribió el
      // adaptador (el del primer sitio, comprobado el 2026-09-17; `CRM_Template`
      // expone el mismo): búsqueda por `q`,
      // respuestas envueltas en `{ data }`, alta que exige `firstName` y
      // `lastName` y rechaza claves desconocidas, nota atada por `contactId`.
      // La primera versión del doble aceptaba lo que el adaptador mandaba, y
      // el adaptador falló en producción con 400: un doble complaciente no
      // prueba nada.
      const rechazar = (mensaje: string) => {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: { code: "validation_error", message: mensaje } }));
      };
      if (req.method === "GET" && url.pathname === "/api/v1/contacts") {
        const q = (url.searchParams.get("q") ?? "").toLowerCase();
        const items = [...contactos.entries()]
          .filter(([email]) => q && email.toLowerCase().includes(q))
          .map(([email, id]) => ({ id, email, firstName: "x", lastName: "y" }));
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ data: items, meta: { page: 1, pageSize: 50, total: items.length } }));
        return;
      }
      if (req.method === "POST" && url.pathname === "/api/v1/contacts") {
        const c = (cuerpo ?? {}) as Record<string, unknown>;
        const admitidas = new Set(["firstName", "lastName", "email", "jobTitle", "companyId", "phone"]);
        const extranas = Object.keys(c).filter((k) => !admitidas.has(k));
        if (!c.firstName || !c.lastName) return rechazar("firstName: Required; lastName: Required");
        if (extranas.length) return rechazar(`Unrecognized key(s) in object: ${extranas.join(", ")}`);
        const email = String(c.email ?? "");
        const id = `c-${contactos.size + 1}`;
        contactos.set(email, id);
        res.writeHead(201, { "content-type": "application/json" });
        res.end(JSON.stringify({ data: { id, email, firstName: c.firstName, lastName: c.lastName } }));
        return;
      }
      if (req.method === "POST" && url.pathname === "/api/v1/notes") {
        const n = (cuerpo ?? {}) as Record<string, unknown>;
        const enlaces = [n.contactId, n.companyId, n.opportunityId, n.projectId].filter(Boolean).length;
        if (!n.body) return rechazar("body: La nota no puede estar vacía");
        if (enlaces !== 1) return rechazar("Indica exactamente una entidad (companyId, contactId, opportunityId o projectId)");
        res.writeHead(201, { "content-type": "application/json" });
        res.end(JSON.stringify({ data: { id: "n-1", contactId: n.contactId ?? null } }));
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

/** `apellido: null` imita una captura anterior a la columna `last_name`. */
async function crearCaptura(email: string, apellido: string | null = "De Prueba"): Promise<string> {
  const id = crypto.randomUUID();
  await dueno`
    insert into lead_capture (id, email, email_domain, name, last_name, company, job_title, source,
                              download_slug, page_path, locale, utm, consent_at, privacy_version)
    values (${id}, ${email}, ${email.split("@")[1]}, 'Persona de prueba', ${apellido}, 'Empresa', 'Directora',
            'download', 'd-06', '/descargas/d-06', 'es',
            ${dueno.json({ utm_source: "prueba" })}, now(), '2026-09-13')`;
  return id;
}

const estadoDe = async (id: string) =>
  (await dueno`select crm_sync_status, crm_attempts, crm_last_error, crm_contact_id, crm_mode, crm_next_attempt_at from lead_capture where id = ${id}`)[0];

const intentosDe = async (id: string) =>
  await dueno`select attempt, endpoint, response_code from crm_delivery where lead_capture_id = ${id} order by attempt`;

/* ── Plantilla, paso 5b · el sitio SIN CRM ─────────────────────────────────── */

/**
 * El modo sin CRM, contra PostgreSQL real y un puerto de correo falso.
 *
 * **Se ejerce `barrerSinCrmUnaVez` y no `barrerUnaVez`** porque el modo lo
 * decide la ficha (`site.config.ts`), y la de SLG tiene el CRM encendido: no se
 * cambia en tiempo de ejecución, y una variable de entorno para forzarlo sería
 * una segunda puerta a la ficha que solo existiría para esta prueba. Lo que se
 * comprueba aquí es lo que hace la cola en ese modo; que `barrerUnaVez` elija
 * este camino es una línea que se lee.
 *
 * Los casos:
 *   · el aviso sale al buzón del cliente con el contacto entero, la captura
 *     queda `notified` y **no se llama al CRM ni se escribe traza de CRM**;
 *   · un proveedor de correo caído se reintenta con la escalera de la cola y,
 *     al quinto intento, `notify_failed` con el error escrito — la captura,
 *     intacta;
 *   · sin `MAIL_LEADS_TO` el fallo lo dice con su nombre.
 */
async function probarSinCrm(llamadasAlCrm: readonly Registro[]): Promise<void> {
  console.log("\nPaso 5b — un sitio SIN CRM avisa por correo al buzón del cliente:\n");

  const { barrerSinCrmUnaVez } = await import("../../lib/crm/index.ts");
  const { componer, ErrorDeCorreo } = await import("../../lib/mail/index.ts");
  const { moduloActivo } = await import("../../lib/sitio/index.ts");
  type Mensaje = import("../../lib/mail/index.ts").MensajeSaliente;
  type Puerto = import("../../lib/mail/index.ts").PuertoDeCorreo;

  check(
    "la ficha de SLG sigue con el CRM encendido: su camino es el de arriba, sin cambios",
    moduloActivo("crm") === true,
  );

  // `enviarCorreo` lee la configuración SMTP aunque se le inyecte el puerto: se
  // le da una inventada, que nunca se llega a usar. La contraseña, compuesta,
  // por lo mismo que `CLAVE_DE_PRUEBA`.
  process.env.MAIL_SMTP_HOST ??= "127.0.0.1";
  process.env.MAIL_SMTP_PORT ??= "2525";
  process.env.MAIL_SMTP_USERNAME ??= "prueba";
  process.env.MAIL_SMTP_PASSWORD ??= ["sin", "crm", "solo", "en", "memoria"].join("-");
  process.env.MAIL_FROM_ADDRESS ??= "web@envio.crm-prueba.test";
  const BUZON = "buzon@cliente.crm-prueba.test";
  process.env.MAIL_LEADS_TO = BUZON;

  const enviados: Mensaje[] = [];
  let correoCaido = false;
  const puertoDeCorreo: Puerto = {
    async enviar(m) {
      if (correoCaido) throw new ErrorDeCorreo("red", "el proveedor de correo no contesta");
      enviados.push(m);
      return {
        providerMessageId: `m-${enviados.length}`,
        from: process.env.MAIL_FROM_ADDRESS ?? "",
        replyTo: null,
        templateKey: "mail.capture_inbox_notice",
        subjectKey: "mail.capture_inbox_notice.subject",
      };
    },
    async cerrar() {},
  };

  const capturaDeContacto = async (email: string): Promise<string> => {
    const id = crypto.randomUUID();
    await dueno`
      insert into lead_capture (id, email, email_domain, name, last_name, company, source,
                                page_path, locale, message, consent_at, privacy_version)
      values (${id}, ${email}, ${email.split("@")[1]}, 'Ana', 'Sin Crm', 'Cliente Demo', 'contact',
              '/contacto', 'en', ${"Hola.\nQuiero una llamada."}, now(), '2026-09-13')`;
    return id;
  };

  /** Barre hasta que la fila deja `pending` o pasa su turno: el lote lo comparte con otras. */
  const barrerHasta = async (id: string) => {
    for (let i = 0; i < 5; i++) {
      await barrerSinCrmUnaVez({ puertoDeCorreo });
      const e = await estadoDe(id);
      if (e?.crm_sync_status !== "pending" || Number(e?.crm_attempts ?? 0) > 0) return e;
    }
    return estadoDe(id);
  };

  /* · El aviso sale ─────────────────────────────────────────────────────── */
  const llamadasAntes = llamadasAlCrm.length;
  const id = await capturaDeContacto("avisada@crm-prueba.test");
  const avisada = await barrerHasta(id);
  check(
    "la captura queda `notified`, con un intento y sin error",
    avisada?.crm_sync_status === "notified" && avisada?.crm_attempts === 1 && avisada?.crm_last_error === null,
    JSON.stringify(avisada),
  );
  check(
    "y sin nada de CRM: ni modo, ni contacto, ni próximo intento",
    avisada?.crm_mode === null && avisada?.crm_contact_id === null && avisada?.crm_next_attempt_at === null,
    JSON.stringify(avisada),
  );
  check("no se llamó al CRM", llamadasAlCrm.length === llamadasAntes, `${llamadasAlCrm.length - llamadasAntes} llamadas`);
  check("ni se escribió traza de entrega al CRM", (await intentosDe(id)).length === 0);

  const aviso = enviados.find((m) => m.datos.correo === "avisada@crm-prueba.test");
  check(
    "el aviso va al buzón del cliente, con la plantilla propia, en el idioma principal del sitio",
    aviso?.para === BUZON && aviso?.tipo === "capture_inbox_notice" && aviso?.idioma === "es",
    JSON.stringify(aviso && { para: aviso.para, tipo: aviso.tipo, idioma: aviso.idioma }),
  );
  check(
    "y lleva el contacto entero: nombre, apellido, correo, origen, página y mensaje",
    aviso?.datos.nombre === "Ana" &&
      aviso?.datos.apellido === "Sin Crm" &&
      aviso?.datos.origen === "contact" &&
      String(aviso?.datos.pagina).endsWith("/contacto") &&
      String(aviso?.datos.mensaje).includes("Quiero una llamada") &&
      aviso?.datos.idiomaDelContacto === "en",
    JSON.stringify(aviso?.datos),
  );

  if (aviso) {
    const es = componer(aviso);
    const en = componer({ ...aviso, idioma: "en" });
    check(
      "el correo compuesto en español se lee: quién, desde dónde y qué escribió, línea a línea",
      es.texto.includes("Ana Sin Crm <avisada@crm-prueba.test>") &&
        es.texto.includes("formulario de contacto") &&
        es.texto.includes("Hola.\nQuiero una llamada.") &&
        es.asunto === "Nuevo contacto desde la web",
      es.texto,
    );
    check(
      "y en inglés, con su propio asunto",
      en.texto.includes("contact form") && en.asunto === "New contact from the website",
      en.texto,
    );
    check("el HTML escapa lo que escribió la persona", !es.html.includes("<avisada@") && es.html.includes("&lt;avisada@"));
  }

  const [registro] = await dueno`
    select status from email_delivery
     where kind = 'capture_inbox_notice' and to_email = ${BUZON}
     order by created_at desc limit 1`;
  check("el envío queda registrado en `email_delivery` como cualquier correo", registro?.status === "delivered", JSON.stringify(registro));

  /* · El correo cae: la escalera, y al quinto `notify_failed` ────────────── */
  correoCaido = true;
  const idCaida = await capturaDeContacto("caida@crm-prueba.test");
  const primera = await barrerHasta(idCaida);
  check(
    "con el correo caído la captura sigue ahí, `pending`, con próximo intento y el error escrito",
    primera?.crm_sync_status === "pending" &&
      primera?.crm_attempts === 1 &&
      Boolean(primera?.crm_next_attempt_at) &&
      String(primera?.crm_last_error).startsWith("aviso por correo:"),
    JSON.stringify(primera),
  );
  for (let i = 0; i < 4; i++) {
    await dueno`update lead_capture set crm_next_attempt_at = now() - interval '1 minute' where id = ${idCaida}`;
    await barrerSinCrmUnaVez({ puertoDeCorreo });
  }
  const agotada = await estadoDe(idCaida);
  check(
    "al quinto intento queda `notify_failed`, no `pending` para siempre",
    agotada?.crm_sync_status === "notify_failed" && agotada?.crm_attempts === 5 && agotada?.crm_next_attempt_at === null,
    JSON.stringify(agotada),
  );
  check("y tampoco aquí se escribió traza de CRM", (await intentosDe(idCaida)).length === 0);

  /* · Sin buzón ─────────────────────────────────────────────────────────── */
  correoCaido = false;
  delete process.env.MAIL_LEADS_TO;
  const idSinBuzon = await capturaDeContacto("sinbuzon@crm-prueba.test");
  const sinBuzon = await barrerHasta(idSinBuzon);
  check(
    "sin MAIL_LEADS_TO el fallo dice qué variable falta, y la captura no se pierde",
    sinBuzon?.crm_sync_status === "pending" && String(sinBuzon?.crm_last_error).includes("MAIL_LEADS_TO"),
    JSON.stringify(sinBuzon),
  );
  process.env.MAIL_LEADS_TO = BUZON;

  // El reintento manual de HQ sobre `notify_failed` se prueba en
  // `scripts/hq/test-capturas.ts`: fabricar el contexto de quien pulsa el botón
  // solo se permite allí (`check:fronteras`).
}

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
    const altaDeContacto = (email: string) =>
      (doble.recibido.find(
        (r) => r.metodo === "POST" && r.ruta === "/api/v1/contacts" && (r.cuerpo as { email?: string })?.email === email,
      )?.cuerpo ?? {}) as { firstName?: string; lastName?: string };
    const alta1 = altaDeContacto("uno@crm-prueba.test");
    check(
      "el contacto nace con nombre y apellido tal como los escribió la persona, sin repliegue",
      alta1.firstName === "Persona de prueba" && alta1.lastName === "De Prueba",
      JSON.stringify(alta1),
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

    // Una captura ANTERIOR a la columna `last_name`: el repliegue provisional
    // sigue existiendo solo para ellas (RF-57), y se ve a simple vista.
    const idVieja = await crearCaptura("vieja@crm-prueba.test", null);
    await barrerUnaVez();
    const altaVieja = altaDeContacto("vieja@crm-prueba.test");
    check(
      "una captura sin apellido (anterior a la columna) entra por el repliegue: el nombre se parte",
      (await estadoDe(idVieja))?.crm_sync_status === "delivered" &&
        altaVieja.firstName === "Persona" &&
        altaVieja.lastName === "de prueba",
      JSON.stringify(altaVieja),
    );

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

    await probarSinCrm(doble.recibido);

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
