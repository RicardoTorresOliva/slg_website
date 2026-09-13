/**
 * test-tablero.ts — El tablero de HQ, contra PostgreSQL real y un doble del CRM
 * (DU-13).
 *
 * Los criterios que solo se comprueban así:
 *
 *   · **criterio 1** — las capturas **del día** se listan con su estado de
 *     entrega y sus intentos; las de ayer no aparecen.
 *   · **criterio 2** — el enlace profundo sale de la **plantilla de la variable
 *     de entorno**. Sin plantilla, **no hay enlace** — y eso es lo correcto, no
 *     un fallo: la ruta del frontend del CRM está sin confirmar (RF-54) y un
 *     enlace inventado lleva a un 404 que parece culpa del CRM.
 *   · **criterio 3** — las métricas vienen marcadas como **dato del CRM**, con
 *     la marca de tiempo de la caché, y la **segunda lectura no vuelve a llamar
 *     al CRM**: eso es lo que significa una caché de cinco minutos.
 *   · **criterio 5** — los artículos traen sus tres extractos sociales, y los
 *     **borradores salen marcados** (RF-22, RF-25).
 *   · **criterio 7** — el modo del adaptador se ve, y con `contact_note` el
 *     tablero dice **cuántas capturas esperan trabajo manual**.
 *   · **criterio 8** — **con el CRM caído el tablero NO se queda en blanco**:
 *     el bloque de métricas señala el fallo y **todos los demás siguen trayendo
 *     sus datos**. Es la comprobación que más importa de este archivo.
 *   · **criterio 9** — `client_*` no llega al tablero.
 *
 * Necesita `bash scripts/db/local-pg.sh up`.
 */
import http from "node:http";

import postgres from "postgres";

import { ErrorDeAutorizacion } from "../../lib/auth/matriz.ts";
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

const CLAVE_DE_LECTURA = ["clave", "de", "solo", "lectura", "de", "prueba"].join("-");
const MARCA = "tablero-prueba.test";

const URL_DUENO = process.env.DATABASE_URL_MIGRATIONS;
if (!URL_DUENO) throw new Error("Falta DATABASE_URL_MIGRATIONS.");
const dueno = postgres(URL_DUENO, { max: 3 });

/* ── El doble del CRM: solo los tres informes de B.6 ──────────────────────── */

function crearDoble() {
  const pedidos: { ruta: string; autorizacion: string | null }[] = [];
  let caido = false;

  const servidor = http.createServer((req, res) => {
    pedidos.push({ ruta: req.url ?? "", autorizacion: req.headers.authorization ?? null });
    if (caido) {
      res.writeHead(503, { "content-type": "application/json" });
      res.end('{"error":"el CRM está caído"}');
      return;
    }
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ruta: req.url, leads: 14 }));
  });

  return { servidor, pedidos, tirar: () => (caido = true), levantar: () => (caido = false) };
}

const ctxDe = (rol: UserRole) =>
  contextoDeSesion({
    userId: `u-${rol}`,
    userName: `Persona ${rol}`,
    role: rol,
    organizationId: rol.startsWith("client") ? "org-cliente" : null,
  });

async function sembrar() {
  await limpiar();
  // Una captura de HOY, entregada en `contact_note` y SIN oportunidad: es la
  // que el criterio 7 tiene que contar.
  await dueno`
    insert into lead_capture (id, email, email_domain, name, company, source, download_slug,
                              page_path, locale, consent_at, privacy_version,
                              crm_sync_status, crm_mode, crm_contact_id, crm_attempts, crm_delivered_at)
    values (${crypto.randomUUID()}, ${`hoy@${MARCA}`}, ${MARCA}, 'Persona de hoy', 'Empresa',
            'download', 'd-06', '/descargas/d-06', 'es', now(), '2026-09-13',
            'delivered', 'contact_note', 'c-123', 1, now())`;
  // Una de HOY todavía en cola, sin contacto: no tiene enlace al CRM.
  await dueno`
    insert into lead_capture (id, email, email_domain, source, page_path, locale,
                              consent_at, privacy_version, crm_sync_status, crm_attempts)
    values (${crypto.randomUUID()}, ${`cola@${MARCA}`}, ${MARCA}, 'contact', '/contacto', 'es',
            now(), '2026-09-13', 'pending', 0)`;
  // Una de AYER: no puede salir en «las capturas del día».
  await dueno`
    insert into lead_capture (id, email, email_domain, source, page_path, locale,
                              consent_at, privacy_version, created_at)
    values (${crypto.randomUUID()}, ${`ayer@${MARCA}`}, ${MARCA}, 'contact', '/contacto', 'es',
            now(), '2026-09-13', now() - interval '2 days')`;
}

async function limpiar() {
  await dueno`delete from lead_capture where email_domain = ${MARCA}`;
}

async function main() {
  const doble = crearDoble();
  await new Promise<void>((r) => doble.servidor.listen(0, "127.0.0.1", r));
  const dir = doble.servidor.address();
  const base = typeof dir === "object" && dir ? `http://127.0.0.1:${dir.port}` : "";

  process.env.CRM_BASE_URL = base;
  process.env.CRM_API_KEY_READ = CLAVE_DE_LECTURA;
  process.env.CRM_MODE = "contact_note";
  process.env.CRM_QUEUE_DISABLED = "1";
  delete process.env.CRM_CONTACT_URL_TEMPLATE;

  const { tableroDeHq } = await import("../../lib/hq/tablero.ts");
  const { olvidarCache, metricasDelCrm } = await import("../../lib/hq/metricas.ts");
  const { exigirSeccion } = await import("../../lib/app/navegacion.ts");

  await sembrar();

  try {
    /* ── Criterios 1 y 7 ────────────────────────────────────────────────── */
    console.log("\nCriterio 1 — las capturas DEL DÍA, con su estado de entrega:\n");
    olvidarCache();
    const t1 = await tableroDeHq(ctxDe("slg_admin"));
    const capturas = t1.capturas.ok ? t1.capturas.datos.filter((c) => c.email.endsWith(MARCA)) : [];

    check("el bloque de capturas trae datos", t1.capturas.ok, JSON.stringify(t1.capturas).slice(0, 160));
    check("solo las de hoy: la de hace dos días no aparece", capturas.length === 2, `${capturas.length}`);
    const entregada = capturas.find((c) => c.email.startsWith("hoy@"));
    check(
      "cada una lleva estado, intentos y modo con el que se entregó",
      entregada?.estado === "delivered" && entregada?.intentos === 1 && entregada?.modoDeEntrega === "contact_note",
      JSON.stringify(entregada),
    );

    console.log("\nCriterio 2 — el enlace profundo sale de la PLANTILLA, nunca codificado:\n");
    check(
      "SIN plantilla configurada no se pinta enlace, en vez de inventar uno",
      entregada?.enlaceAlCrm === null,
      String(entregada?.enlaceAlCrm),
    );
    process.env.CRM_CONTACT_URL_TEMPLATE = "https://crm.ejemplo.test/contacts/{id}";
    const t2 = await tableroDeHq(ctxDe("slg_admin"));
    const conEnlace = t2.capturas.ok
      ? t2.capturas.datos.find((c) => c.email.startsWith("hoy@"))
      : undefined;
    check(
      "con plantilla, el enlace se construye con el id del contacto",
      conEnlace?.enlaceAlCrm === "https://crm.ejemplo.test/contacts/c-123",
      String(conEnlace?.enlaceAlCrm),
    );
    const sinContacto = t2.capturas.ok
      ? t2.capturas.datos.find((c) => c.email.startsWith("cola@"))
      : undefined;
    check(
      "una captura todavía en cola no tiene contacto, y por tanto no tiene enlace",
      sinContacto?.enlaceAlCrm === null,
      String(sinContacto?.enlaceAlCrm),
    );

    console.log("\nCriterio 7 — el modo del adaptador y el trabajo manual pendiente:\n");
    check(
      "el modo activo se ve sin abrir el panel de despliegue",
      t2.captura.ok && t2.captura.datos.modo === "contact_note",
      JSON.stringify(t2.captura),
    );
    check(
      "y dice cuántas capturas esperan que alguien abra el hueco a mano en el CRM",
      t2.captura.ok && t2.captura.datos.pidenOportunidad >= 1,
      JSON.stringify(t2.captura),
    );

    /* ── Criterio 3 ─────────────────────────────────────────────────────── */
    console.log("\nCriterio 3 — métricas marcadas como dato del CRM, con caché de 5 minutos:\n");
    olvidarCache();
    const llamadasAntes = doble.pedidos.length;
    const m1 = await metricasDelCrm();
    check("vienen marcadas como dato del CRM", m1.origen === "crm");
    check("llevan la marca de tiempo de cuándo se leyeron", !Number.isNaN(Date.parse(m1.obtenidoEn)));
    check(
      "la primera lectura llama a los TRES informes de B.6",
      doble.pedidos.length - llamadasAntes === 3,
      `${doble.pedidos.length - llamadasAntes} llamadas`,
    );
    check(
      "y llama con la clave de SOLO LECTURA, no con la de captura",
      doble.pedidos.slice(-3).every((p) => p.autorizacion === `Bearer ${CLAVE_DE_LECTURA}`),
    );
    const llamadasTrasPrimera = doble.pedidos.length;
    const m2 = await metricasDelCrm();
    check(
      "la SEGUNDA lectura no vuelve a llamar al CRM: sale de la caché",
      doble.pedidos.length === llamadasTrasPrimera && m2.deLaCache === true,
      `${doble.pedidos.length - llamadasTrasPrimera} llamadas nuevas · deLaCache=${m2.deLaCache}`,
    );
    check("y conserva la marca de tiempo de la lectura de verdad", m2.obtenidoEn === m1.obtenidoEn);

    /* ── Criterio 5 ─────────────────────────────────────────────────────── */
    console.log("\nCriterio 5 — artículos con sus extractos, y los borradores marcados:\n");
    const arts = t2.articulos.ok ? t2.articulos.datos : [];
    check("el bloque de artículos trae datos", arts.length > 0, `${arts.length}`);
    const publicado = arts.find((a) => !a.borrador);
    check(
      "un publicado trae los TRES extractos listos para copiar",
      Boolean(publicado?.social.hook && publicado?.social.linkedin && publicado?.social.x),
      JSON.stringify(publicado?.social),
    );
    const borrador = arts.find((a) => a.borrador);
    check("el borrador aparece en HQ y viene marcado (RF-22)", Boolean(borrador), "ninguno");
    check(
      "y NO trae URL pública: un borrador no se sirve en ninguna ruta",
      borrador?.url === null,
      String(borrador?.url),
    );
    check("el publicado sí trae su URL", typeof publicado?.url === "string" && publicado.url.includes("/blog/"));

    /* ── Criterio 8 · EL CRM CAÍDO ──────────────────────────────────────── */
    console.log("\nCriterio 8 — con el CRM caído el tablero se DEGRADA, no se queda en blanco:\n");
    doble.tirar();
    olvidarCache();
    const t3 = await tableroDeHq(ctxDe("slg_admin"));
    check(
      "el bloque de métricas señala el fallo en vez de romper la página",
      t3.metricas.ok && t3.metricas.datos.fallos.length === 3,
      JSON.stringify(t3.metricas).slice(0, 200),
    );
    check(
      "y el motivo NO lleva la clave: un error del tablero se comparte en capturas de pantalla",
      !JSON.stringify(t3.metricas).includes(CLAVE_DE_LECTURA),
    );
    check(
      "TODOS los demás bloques siguen trayendo sus datos",
      t3.capturas.ok && t3.empresas.ok && t3.proyectos.ok && t3.entregables.ok &&
        t3.articulos.ok && t3.agentes.ok && t3.auditoria.ok && t3.captura.ok,
      Object.entries(t3)
        .filter(([, v]) => v && typeof v === "object" && "ok" in v && !v.ok)
        .map(([k]) => k)
        .join(" · "),
    );
    check(
      "un fallo total NO se cachea: el tropiezo de cinco segundos no dura cinco minutos",
      (await metricasDelCrm()).deLaCache === false,
    );

    doble.levantar();
    olvidarCache();
    const t4 = await tableroDeHq(ctxDe("slg_admin"));
    check(
      "al volver el CRM, las métricas vuelven solas",
      t4.metricas.ok && t4.metricas.datos.fallos.length === 0,
      JSON.stringify(t4.metricas.ok ? t4.metricas.datos.fallos : t4).slice(0, 160),
    );

    /* ── Criterio 9 ─────────────────────────────────────────────────────── */
    console.log("\nCriterio 9 — HQ es de `slg_*`; `client_*` recibe denegación:\n");
    for (const rol of ["slg_admin", "slg_operator"] as const) {
      let pasa = true;
      try {
        exigirSeccion(ctxDe(rol), "dashboard");
      } catch {
        pasa = false;
      }
      check(`\`${rol}\` ve el tablero`, pasa);
    }
    for (const rol of ["client_admin", "client_member"] as const) {
      let estado = 0;
      try {
        exigirSeccion(ctxDe(rol), "dashboard");
      } catch (e) {
        estado = e instanceof ErrorDeAutorizacion ? e.status : -1;
      }
      check(`\`${rol}\` recibe 404, que no confirma que el tablero exista`, estado === 404, `estado ${estado}`);
    }

    await limpiar();
  } finally {
    doble.servidor.close();
    await dueno.end({ timeout: 5 });
  }

  if (fallos > 0) {
    console.error(`\n✗ tablero: ${fallos} de ${comprobaciones} comprobaciones fallaron.\n`);
    process.exit(1);
  }
  console.log(`\n✓ tablero: ${comprobaciones} comprobaciones contra PostgreSQL real y un doble del CRM, sin fallos.`);
  // Como en las demás: importar `lib/hq` abre el pool de la aplicación.
  process.exit(0);
}

await main();
