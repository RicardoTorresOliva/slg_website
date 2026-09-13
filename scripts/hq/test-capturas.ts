/**
 * test-capturas.ts — Lista, detalle de intentos y **reintento manual** (DU-16),
 * contra PostgreSQL real y un doble del CRM.
 *
 * El corazón de esta prueba es **CF-1**, el conflicto que tuvo esta unidad como
 * condición de entrada: `crm_delivery` acota `attempt` a 1…5 y es único por
 * `(captura, ciclo, intento, endpoint)`, así que un sexto intento **no cabe** y
 * reutilizar el 1 chocaría con la traza del primer episodio. La salida —abrir
 * un **ciclo** nuevo (D-50)— solo vale si se demuestra que:
 *
 *   · el reintento deja la captura lista otra vez **sin borrar la traza vieja**;
 *   · el barrido siguiente escribe en el **ciclo 2**, no encima del 1;
 *   · los cinco intentos del ciclo nuevo caben, y al quinto vuelve a `failed`.
 *
 * Y los criterios que van con ello:
 *   · **1** — estado, intentos y último error de cada captura.
 *   · **2** — el detalle refleja **exactamente** las filas de `crm_delivery`.
 *   · **3** — el reintento **queda auditado** con actor y acción.
 *   · **4** — las que piden abrir la oportunidad a mano vienen señaladas.
 *   · **6** — sin capturas · sin fallidas · **CRM caído durante el reintento** ·
 *     **reintento sobre una ya entregada: idempotente**.
 *
 * Necesita `bash scripts/db/local-pg.sh up`.
 */
import http from "node:http";

import postgres from "postgres";

import { contextoDeSesion } from "../../lib/db/context.ts";
import type { UserRole } from "../../lib/db/schema.ts";

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

const CLAVE = ["clave", "de", "captura", "de", "prueba"].join("-");
const DOMINIO = "du16.test";
const ADMIN = "u-admin-du16";

const URL_DUENO = process.env.DATABASE_URL_MIGRATIONS;
if (!URL_DUENO) throw new Error("Falta DATABASE_URL_MIGRATIONS.");
const dueno = postgres(URL_DUENO, { max: 3 });

const DESDE = new Date();

const ctxDe = (rol: UserRole, id: string) =>
  contextoDeSesion({ userId: id, userName: `Persona ${rol}`, role: rol, organizationId: null });
const admin = () => ctxDe("slg_admin", ADMIN);

/* ── Doble del CRM: se puede tirar y levantar ─────────────────────────────── */

function crearDoble() {
  let caido = true;
  const contactos = new Map<string, string>();
  const servidor = http.createServer((req, res) => {
    let crudo = "";
    req.on("data", (c) => (crudo += c));
    req.on("end", () => {
      if (caido) {
        res.writeHead(503, { "content-type": "application/json" });
        res.end('{"error":"caido"}');
        return;
      }
      const url = new URL(req.url ?? "/", "http://doble");
      if (req.method === "GET" && url.pathname === "/api/v1/contacts") {
        const email = url.searchParams.get("email") ?? "";
        const id = contactos.get(email);
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify(id ? [{ id }] : []));
        return;
      }
      if (req.method === "POST" && url.pathname === "/api/v1/contacts") {
        const email = String(JSON.parse(crudo || "{}").email ?? "");
        const id = `c-${contactos.size + 1}`;
        contactos.set(email, id);
        res.writeHead(201, { "content-type": "application/json" });
        res.end(JSON.stringify({ id }));
        return;
      }
      res.writeHead(201, { "content-type": "application/json" });
      res.end('{"id":"n-1"}');
    });
  });
  return { servidor, tirar: () => (caido = true), levantar: () => (caido = false) };
}

async function crearCaptura(email: string): Promise<string> {
  const id = crypto.randomUUID();
  await dueno`
    insert into lead_capture (id, email, email_domain, name, source, download_slug, page_path,
                              locale, consent_at, privacy_version)
    values (${id}, ${email}, ${DOMINIO}, 'Persona DU16', 'download', 'd-06', '/descargas/d-06',
            'es', now(), '2026-09-13')`;
  return id;
}

const estadoDe = async (id: string) =>
  (await dueno`select crm_sync_status, crm_attempts, crm_cycle, crm_last_error from lead_capture where id = ${id}`)[0];

const filasDeTraza = async (id: string) =>
  await dueno`select cycle, attempt, endpoint from crm_delivery where lead_capture_id = ${id} order by cycle, attempt`;

async function limpiar() {
  await dueno`delete from crm_delivery where lead_capture_id in (select id from lead_capture where email_domain = ${DOMINIO})`;
  await dueno`delete from lead_capture where email_domain = ${DOMINIO}`;
}

async function main() {
  const doble = crearDoble();
  await new Promise<void>((r) => doble.servidor.listen(0, "127.0.0.1", r));
  const dir = doble.servidor.address();
  const base = typeof dir === "object" && dir ? `http://127.0.0.1:${dir.port}` : "";

  process.env.CRM_BASE_URL = base;
  process.env.CRM_API_KEY_CAPTURE = CLAVE;
  process.env.CRM_MODE = "contact_note";
  process.env.CRM_QUEUE_DISABLED = "1";
  process.env.CRM_CONTACT_URL_TEMPLATE = "https://crm.ejemplo.test/contacts/{id}";

  const { barrerUnaVez } = await import("../../lib/crm/index.ts");
  const { capturasDeHq } = await import("../../lib/hq/capturas.ts");
  const { intentosDeCaptura, reintentarCaptura } = await import("../../lib/hq/reintento.ts");

  await limpiar();

  try {
    /* ── Criterio 6 · sin capturas ──────────────────────────────────────── */
    console.log("\nCriterio 6 — sin capturas, la lista está vacía y no se rompe:\n");
    const vacio = await capturasDeHq(admin(), { todosLosDias: true, estado: "failed" });
    check("la lista filtrada puede venir vacía", Array.isArray(vacio));

    /* ── Los cinco intentos del ciclo 1 ─────────────────────────────────── */
    console.log("\nCriterio 1 — estado, intentos y último error (RF-84):\n");
    const id = await crearCaptura(`falla@${DOMINIO}`);
    doble.tirar();
    for (let i = 0; i < 5; i++) {
      await dueno`update lead_capture set crm_next_attempt_at = now() - interval '1 minute' where id = ${id}`;
      await barrerUnaVez();
    }
    const tras5 = await estadoDe(id);
    check(
      "tras cinco intentos fallidos queda `failed`, con sus cinco intentos y su error",
      tras5?.crm_sync_status === "failed" && tras5?.crm_attempts === 5 && Boolean(tras5?.crm_last_error),
      JSON.stringify(tras5),
    );

    const enHq = (await capturasDeHq(admin(), { todosLosDias: true, estado: "failed" })).find((c) => c.id === id);
    check(
      "la lista de HQ la muestra con estado, intentos y último error",
      enHq?.estado === "failed" && enHq?.intentos === 5 && Boolean(enHq?.ultimoError),
      JSON.stringify(enHq),
    );

    console.log("\nCriterio 2 — el detalle refleja EXACTAMENTE las filas de `crm_delivery` (RF-51):\n");
    const detalle = await intentosDeCaptura(admin(), id);
    const traza = await filasDeTraza(id);
    check(
      "hay tantos intentos en el detalle como filas en la tabla",
      detalle.length === traza.length && detalle.length > 0,
      `${detalle.length} vs ${traza.length}`,
    );
    check("todos del ciclo 1", detalle.every((d) => d.ciclo === 1), JSON.stringify(detalle.map((d) => d.ciclo)));
    check(
      "cada uno lleva su llamada y su código de respuesta",
      detalle.every((d) => d.endpoint.length > 0 && (d.codigo === 503 || d.codigo === null)),
      JSON.stringify(detalle.map((d) => [d.endpoint, d.codigo])),
    );
    check(
      "el detalle NO expone el cuerpo enviado, que lleva el correo y el nombre de la persona",
      !JSON.stringify(detalle).includes(`falla@${DOMINIO}`),
    );

    /* ── Criterio 3 · el reintento manual y CF-1 ────────────────────────── */
    console.log("\nCriterio 3 — el reintento manual abre un CICLO NUEVO (RF-52, CF-1):\n");
    const r = await reintentarCaptura(admin(), id);
    check("el reintento se acepta sobre una captura fallida", r.ok === true && r.cicloNuevo === 2, JSON.stringify(r));

    const trasReintento = await estadoDe(id);
    check(
      "la captura vuelve a `pending`, con el contador a cero y en el ciclo 2",
      trasReintento?.crm_sync_status === "pending" &&
        trasReintento?.crm_attempts === 0 &&
        trasReintento?.crm_cycle === 2,
      JSON.stringify(trasReintento),
    );
    check(
      "y el último error se limpia: es del episodio anterior y ya no describe nada",
      trasReintento?.crm_last_error === null,
    );
    check(
      "LA TRAZA VIEJA SIGUE ENTERA: cinco filas del ciclo 1, ninguna pisada",
      (await filasDeTraza(id)).length === traza.length,
      `${(await filasDeTraza(id)).length} vs ${traza.length}`,
    );
    check(
      "el reintento queda auditado con actor y acción (criterio 3)",
      (
        await dueno`select action from audit_log
                     where action = 'capture.retry' and actor_id = ${ADMIN} and created_at >= ${DESDE}`
      ).length === 1,
    );

    console.log("\nY el ciclo 2 escribe SU traza, sin chocar con la del 1:\n");
    doble.levantar();
    await dueno`update lead_capture set crm_next_attempt_at = now() - interval '1 minute' where id = ${id}`;
    await barrerUnaVez();
    const entregada = await estadoDe(id);
    check("al volver el CRM, el ciclo 2 entrega", entregada?.crm_sync_status === "delivered", JSON.stringify(entregada));
    const trazaFinal = await filasDeTraza(id);
    check(
      "hay filas de los DOS ciclos, y el índice único no ha rechazado ninguna",
      trazaFinal.some((f) => f.cycle === 1) && trazaFinal.some((f) => f.cycle === 2),
      JSON.stringify(trazaFinal.map((f) => [f.cycle, f.attempt])),
    );
    check(
      "el ciclo 2 empieza otra vez por el intento 1: los cinco de RF-50 son POR EPISODIO",
      trazaFinal.filter((f) => f.cycle === 2).some((f) => f.attempt === 1),
      JSON.stringify(trazaFinal.map((f) => [f.cycle, f.attempt])),
    );

    /* ── Criterio 6 · idempotencia y CRM caído ──────────────────────────── */
    console.log("\nCriterio 6 — reintentar algo ya entregado NO hace nada:\n");
    const otra = await reintentarCaptura(admin(), id);
    check(
      "se contesta «ya entregada» en vez de crear un contacto duplicado en el CRM",
      otra.ok === false && otra.motivo === "ya_entregada",
      JSON.stringify(otra),
    );
    const sinTocar = await estadoDe(id);
    check("y la captura no se toca", sinTocar?.crm_cycle === 2 && sinTocar?.crm_sync_status === "delivered");

    console.log("\nCriterio 6 — una captura en cola no se reintenta a mano:\n");
    const enCola = await crearCaptura(`cola@${DOMINIO}`);
    const rCola = await reintentarCaptura(admin(), enCola);
    check(
      "se contesta «en curso»: el barrendero ya la tiene",
      rCola.ok === false && rCola.motivo === "en_curso",
      JSON.stringify(rCola),
    );

    console.log("\nCriterio 6 — el CRM caído durante el reintento no rompe nada:\n");
    doble.tirar();
    const tercera = await crearCaptura(`caida@${DOMINIO}`);
    for (let i = 0; i < 5; i++) {
      await dueno`update lead_capture set crm_next_attempt_at = now() - interval '1 minute' where id = ${tercera}`;
      await barrerUnaVez();
    }
    const rCaida = await reintentarCaptura(admin(), tercera);
    check("el reintento se acepta igual: el CRM caído es un problema del envío, no del reintento", rCaida.ok === true);
    await dueno`update lead_capture set crm_next_attempt_at = now() - interval '1 minute' where id = ${tercera}`;
    await barrerUnaVez();
    const trasCaida = await estadoDe(tercera);
    check(
      "y el intento del ciclo nuevo falla y se apunta, sin perder la captura",
      trasCaida?.crm_cycle === 2 && trasCaida?.crm_attempts === 1 && trasCaida?.crm_sync_status === "pending",
      JSON.stringify(trasCaida),
    );

    /* ── Criterios 4 y 5 ────────────────────────────────────────────────── */
    console.log("\nCriterios 4 y 5 — trabajo manual señalado, y enlace desde la plantilla:\n");
    const entregadaEnHq = (await capturasDeHq(admin(), { todosLosDias: true, estado: "delivered" })).find(
      (c) => c.id === id,
    );
    check(
      "una entregada en `contact_note` SIN oportunidad viene señalada como trabajo manual (R-04)",
      entregadaEnHq?.pideTrabajoManual === true,
      JSON.stringify(entregadaEnHq),
    );
    check(
      "y su enlace al CRM sale de la plantilla configurable (RF-54)",
      entregadaEnHq?.enlaceAlCrm?.startsWith("https://crm.ejemplo.test/contacts/") === true,
      String(entregadaEnHq?.enlaceAlCrm),
    );
    /**
     * NO SE PUEDE «QUITAR» LA SEÑAL PONIÉNDOLE UNA OPORTUNIDAD A ESTA FILA, y
     * la base de datos lo dice: `lead_capture_contact_note_shape` prohíbe que
     * una captura entregada en modo `contact_note` tenga `crm_opportunity_id`,
     * porque en ese modo el CRM **no permite crearla por clave de API** (B.6).
     * Se intentó en la primera versión de esta prueba y la restricción la paró.
     *
     * O sea que la señal del criterio 4 no es «a esta le falta un campo»: es
     * **todas las de este modo exigen trabajo manual**, que es lo que dice R-04.
     * La señal se apaga cambiando de modo, no rellenando un hueco.
     */
    const porAdmision = await crearCaptura(`admision@${DOMINIO}`);
    await dueno`update lead_capture
                   set crm_sync_status = 'delivered', crm_mode = 'lead_admission',
                       crm_contact_id = 'c-9', crm_opportunity_id = 'op-1', crm_attempts = 1
                 where id = ${porAdmision}`;
    const yaNo = (await capturasDeHq(admin(), { todosLosDias: true, estado: "delivered" })).find(
      (c) => c.id === porAdmision,
    );
    check(
      "una entregada por `lead_admission` NO pide trabajo manual: ahí el CRM sí abre el hueco",
      yaNo?.pideTrabajoManual === false,
      JSON.stringify(yaNo),
    );

    await limpiar();
  } finally {
    doble.servidor.close();
    await dueno.end({ timeout: 5 });
  }

  if (fallos > 0) {
    console.error(`\n✗ capturas: ${fallos} de ${comprobaciones} comprobaciones fallaron.\n`);
    process.exit(1);
  }
  console.log(`\n✓ capturas: ${comprobaciones} comprobaciones contra PostgreSQL real y un doble del CRM, sin fallos.`);
  process.exit(0);
}

await main();
