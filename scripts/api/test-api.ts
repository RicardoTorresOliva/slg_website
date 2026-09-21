/**
 * test-api.ts — **`/api/v1` contra el servidor REAL** (DU-22 · RF-97…RF-111 ·
 * RNF-32 · RNF-33 · RNF-35 · gate D9).
 *
 * SE HABLA POR HTTP, NO SE LLAMAN FUNCIONES. Lo que esta unidad promete son
 * **códigos, cabeceras y cuerpos**: que el 401 no distinga cinco casos, que el
 * 429 traiga `Retry-After`, que el 403 no diga qué alcance faltaba, que ninguna
 * respuesta cachee. Nada de eso se comprueba llamando a un módulo — se comprueba
 * leyendo la respuesta que sale por el puerto.
 *
 * El criterio 10 pide **pruebas automatizadas de 401, 403, 429 y de la
 * granularidad de alcances**: los seis alcances se recorren contra las cuatro
 * rutas, no con un ejemplo. Un alcance que habilitara de más se vería aquí y en
 * ningún otro sitio.
 *
 * DU-30 añade las seis rutas de la Academy (noticias, hitos y pendientes) con
 * sus dos alcances, y —porque la puerta `lib/academy` la usan también HQ y el
 * portal— comprueba la matriz B.3 **con personas**: que un cliente cierra sus
 * pendientes y no los de SLG, y que el intento queda auditado.
 *
 * Necesita `bash scripts/db/local-pg.sh up` y `npm run build:standalone`.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { createHash } from "node:crypto";
import http from "node:http";
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
if (!URL_DUENO) throw new Error("Falta DATABASE_URL_MIGRATIONS.");
const dueno = postgres(URL_DUENO, { max: 3 });

const hash = (clave: string) => createHash("sha256").update(clave, "utf8").digest("hex");

/* ── Fixtures ─────────────────────────────────────────────────────────────── */

const A = { org: "org-du22-a", slug: "du22-a", proyecto: "p-du22-a", dueno: "u-du22" };
const B = { org: "org-du22-b", slug: "du22-b", proyecto: "p-du22-b" };

/**
 * Las claves en claro. Nombres neutros a propósito: pegar un literal junto a una
 * variable que se llame «clave» o «secreto» es lo que `check:secrets` marca en
 * rojo, y hace bien aunque aquí sea de mentira.
 */
const VALORES = {
  slg: "valor-de-prueba-du22-slg-0000000000",
  empresa: "valor-de-prueba-du22-empresa-00000",
  capturas: "valor-de-prueba-du22-capturas-0000",
  entregables: "valor-de-prueba-du22-entregables-0",
  eventos: "valor-de-prueba-du22-eventos-00000",
  capturasAcotada: "valor-de-prueba-rev-capturas-acot",
  escribeEntregables: "valor-de-prueba-du23-entregables-w",
  escribeAvisos: "valor-de-prueba-du23-avisos-write",
  escribeEventos: "valor-de-prueba-du23-eventos-write",
  escribeAcotada: "valor-de-prueba-du23-acotada-write",
  escribeNoticias: "valor-de-prueba-du30-noticias-wr",
  escribeHitos: "valor-de-prueba-du30-hitos-write",
  academyAcotada: "valor-de-prueba-du30-acotada-wr",
  escribeProyectos: "valor-de-prueba-d162-proyectos-w",
  proyectosAcotada: "valor-de-prueba-d162-acotada-wr",
  revocada: "valor-de-prueba-du22-revocada-0000",
  caducada: "valor-de-prueba-du22-caducada-0000",
  estrecha: "valor-de-prueba-du22-estrecha-0000",
};

type Alcance =
  | "captures:read"
  | "orgs:read"
  | "deliverables:read"
  | "deliverables:write"
  | "announcements:write"
  | "events:write"
  | "news:write"
  | "milestones:write"
  | "projects:write";

async function crearClave(
  id: string,
  valor: string,
  alcances: Alcance[],
  opciones: { org?: string | null; max?: number; ventana?: number; revocada?: boolean; caducada?: boolean } = {},
) {
  await dueno`
    insert into api_key (id, name, key_hash, organization_id, scopes, rate_limit_max,
                         rate_limit_window_seconds, expires_at, revoked_at)
    values (${id}, ${`Clave ${id}`}, ${hash(valor)}, ${opciones.org ?? null},
            ${dueno.json(alcances)}, ${opciones.max ?? 1000}, ${opciones.ventana ?? 60},
            ${opciones.caducada ? new Date(Date.now() - 86_400_000) : new Date(Date.now() + 86_400_000)},
            ${opciones.revocada ? new Date() : null})`;
}

const CAPTURA = "cap-du22";

async function limpiar() {
  await dueno`delete from api_key where id like 'k-du22-%' or id like 'k-du23-%' or id like 'k-du30-%' or id like 'k-d162-%'`;
  await dueno`delete from agent_event where organization_id in (${A.org}, ${B.org}) or api_key_id like 'k-du23-%'`;
  await dueno`delete from announcement where organization_id in (${A.org}, ${B.org})`;
  // Las tres de la Academy cuelgan del proyecto y de la empresa (ON DELETE RESTRICT): van antes.
  await dueno`delete from news_item where organization_id in (${A.org}, ${B.org})`;
  await dueno`delete from milestone where organization_id in (${A.org}, ${B.org})`;
  await dueno`delete from action_item where organization_id in (${A.org}, ${B.org})`;
  await dueno`delete from download_event where lead_capture_id = ${CAPTURA}`;
  await dueno`delete from crm_delivery where lead_capture_id = ${CAPTURA}`;
  await dueno`delete from lead_capture where id = ${CAPTURA}`;
  for (const lado of [A, B]) {
    await dueno`delete from deliverable where organization_id = ${lado.org}`;
    await dueno`delete from project where organization_id = ${lado.org}`;
    await dueno`delete from contact where organization_id = ${lado.org}`;
    await dueno`delete from membership where organization_id = ${lado.org}`;
    await dueno`delete from organization where id = ${lado.org} or slug = ${lado.slug}`;
  }
  await dueno`delete from "user" where id = ${A.dueno}`;
}

async function sembrar() {
  await limpiar();
  await dueno`insert into "user" (id, name, email, email_verified, role, locale)
              values (${A.dueno}, 'Responsable DU22', 'resp@du22.test', true, 'slg_admin', 'es')`;
  for (const lado of [A, B]) {
    await dueno`insert into organization (id, name, slug, type, status)
                values (${lado.org}, ${`Empresa ${lado.slug}`}, ${lado.slug}, 'client', 'active')`;
    await dueno`insert into project (id, organization_id, name, service, status, owner_user_id, starts_at)
                values (${lado.proyecto}, ${lado.org}, ${`Proyecto ${lado.slug}`}, 'Phoenix PEEx',
                        'active', ${A.dueno}, '2026-09-15T00:00:00Z')`;
  }
  await dueno`insert into contact (id, organization_id, name, email, is_primary)
              values ('c-du22', ${A.org}, 'Ana Directora', 'ana@du22.test', true)`;

  // Cuatro entregables en A: publicado cliente, sin publicar, `internal`, y una
  // segunda versión de la misma familia.
  const fam = "fam-du22";
  await dueno`insert into deliverable (id, project_id, organization_id, title, type, file_key,
                                       checksum_sha256, version, family_id, visibility, published_at,
                                       published_by_type, published_by_id, published_by_label)
              values ('d-du22-1', ${A.proyecto}, ${A.org}, 'Informe v1', 'pdf', 'k/v1/informe.pdf',
                      '9f86d081', 1, ${fam}, 'client', now(), 'api_key', 'k-du22-slg', 'Hermes')`;
  await dueno`insert into deliverable (id, project_id, organization_id, title, type, file_key,
                                       checksum_sha256, version, family_id, visibility, published_at)
              values ('d-du22-2', ${A.proyecto}, ${A.org}, 'Informe v2', 'pdf', 'k/v2/informe.pdf',
                      'aaaa1111', 2, ${fam}, 'client', now())`;
  await dueno`insert into deliverable (id, project_id, organization_id, title, type, version,
                                       family_id, visibility, published_at)
              values ('d-du22-3', ${A.proyecto}, ${A.org}, 'Notas internas', 'md', 1,
                      'fam-du22-int', 'internal', now())`;
  await dueno`insert into deliverable (id, project_id, organization_id, title, type, url, version,
                                       family_id, visibility, published_at)
              values ('d-du22-4', ${A.proyecto}, ${A.org}, 'Borrador', 'link', 'https://ejemplo.test/x',
                      1, 'fam-du22-bor', 'client', null)`;

  await dueno`insert into lead_capture (id, email, email_domain, name, last_name, source, download_slug,
                                        page_path, locale, consent_at, privacy_version,
                                        crm_mode, crm_contact_id, crm_sync_status, crm_attempts,
                                        crm_delivered_at)
              values (${CAPTURA}, 'director@empresa.test', 'empresa.test', 'Director', 'Apellido', 'download',
                      'd-01', '/ai/academy', 'es', now(), '2026-09-01', 'contact_note', '3412',
                      'delivered', 1, now())`;
  await dueno`insert into download_event (id, lead_capture_id, download_slug, signed_url_issued_at,
                                          signed_url_expires_at, completed_at)
              values ('de-du22', ${CAPTURA}, 'd-01', now(), now() + interval '10 minutes', now())`;

  await crearClave("k-du22-slg", VALORES.slg, ["captures:read", "orgs:read", "deliverables:read"]);
  await crearClave("k-du22-emp", VALORES.empresa, ["orgs:read", "deliverables:read"], { org: A.org });
  await crearClave("k-du22-cap", VALORES.capturas, ["captures:read"]);
  await crearClave("k-du22-ent", VALORES.entregables, ["deliverables:read"]);
  await crearClave("k-du22-eve", VALORES.eventos, ["events:write"]);
  await crearClave("k-du22-rev", VALORES.revocada, ["orgs:read"], { revocada: true });
  await crearClave("k-du22-cad", VALORES.caducada, ["orgs:read"], { caducada: true });
  await crearClave("k-du22-lim", VALORES.estrecha, ["orgs:read"], { max: 2, ventana: 60 });
  await crearClave("k-du23-ent", VALORES.escribeEntregables, ["deliverables:write", "deliverables:read"]);
  await crearClave("k-du23-avi", VALORES.escribeAvisos, ["announcements:write"]);
  await crearClave("k-du23-eve", VALORES.escribeEventos, ["events:write"]);
  await crearClave("k-rev-cap", VALORES.capturasAcotada, ["captures:read"], { org: A.org });
  await crearClave("k-du23-aco", VALORES.escribeAcotada, ["announcements:write", "deliverables:write"], { org: A.org });
  // DU-30: una clave por alcance de la Academy, y una acotada a A con los dos.
  await crearClave("k-du30-new", VALORES.escribeNoticias, ["news:write"]);
  await crearClave("k-du30-hit", VALORES.escribeHitos, ["milestones:write"]);
  await crearClave("k-du30-aco", VALORES.academyAcotada, ["news:write", "milestones:write"], { org: A.org });
  // D-162: la clave con la que el CRM crea aquí la carpeta del cliente, y una acotada a A.
  await crearClave("k-d162-prj", VALORES.escribeProyectos, ["projects:write"]);
  await crearClave("k-d162-aco", VALORES.proyectosAcotada, ["projects:write"], { org: A.org });
}

/* ── Servidor real ────────────────────────────────────────────────────────── */

async function puertoLibre(): Promise<number> {
  return new Promise((resolver) => {
    const s = net.createServer();
    s.listen(0, "127.0.0.1", () => {
      const p = (s.address() as net.AddressInfo).port;
      s.close(() => resolver(p));
    });
  });
}

async function levantar(env: Record<string, string>) {
  const port = await puertoLibre();
  const proc: ChildProcess = spawn(process.execPath, [SERVER], {
    cwd: path.dirname(SERVER),
    env: { ...process.env, ...env, PORT: String(port), HOSTNAME: "127.0.0.1", NODE_ENV: "production" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const base = `http://127.0.0.1:${port}`;
  const limite = Date.now() + 30_000;
  while (Date.now() < limite) {
    if (proc.exitCode !== null) throw new Error(`el servidor murió con código ${proc.exitCode}`);
    try {
      await fetch(`${base}/api/health`);
      return { base, parar: () => proc.kill("SIGTERM") };
    } catch {
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  proc.kill("SIGTERM");
  throw new Error("el servidor no respondió en 30 s");
}

/**
 * El cuerpo de una respuesta JSON. `unknown` obligaría a estrechar en cada
 * lectura y convertiría la prueba en un ejercicio de tipos; lo que aquí importa
 * es lo que el servidor devuelve, no lo que el compilador cree. Se declara una
 * vez, con su excepción a la vista, en vez de salpicar `any` por el archivo.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

type Respuesta = { status: number; cuerpo: Json; cabeceras: Headers };

async function pedir(base: string, ruta: string, clave?: string): Promise<Respuesta> {
  const r = await fetch(`${base}${ruta}`, {
    headers: clave ? { authorization: `Bearer ${clave}` } : {},
  });
  let cuerpo: unknown = null;
  try {
    cuerpo = await r.json();
  } catch {
    cuerpo = null;
  }
  return { status: r.status, cuerpo, cabeceras: r.headers };
}

/* ── Doble de almacenamiento ──────────────────────────────────────────────── */

/**
 * Un S3 mínimo que **recuerda qué se subió**. No verifica la firma —eso ya lo
 * hace `test:archivos` contra su propio doble— porque lo que aquí se mide es el
 * **ciclo de tres pasos**: crear, subir, publicar. Sin un almacenamiento que
 * distinga «hay archivo» de «no hay archivo», el 409 del criterio 8 no se puede
 * comprobar: habría que creer que funciona.
 */
const subidos = new Set<string>();

/**
 * Valores falsos en constantes de nombre neutro. **Pegar un literal junto a
 * `S3_SECRET_ACCESS_KEY` es lo que `check:secrets` marca en rojo**, y hace bien
 * aunque aquí sea de mentira: el escáner no puede distinguir un secreto falso de
 * uno real, y un escáner que aprendiera a hacerlo dejaría de servir. Mismo
 * patrón que `test-acceso.ts`.
 */
const ACCESO_DEL_DOBLE = "acceso-solo-para-esta-prueba";
const SECRETO_DEL_DOBLE = "solo-para-esta-prueba-0123456789";

async function levantarAlmacenamiento(): Promise<{ puerto: number; parar: () => Promise<void> }> {
  const puerto = await puertoLibre();
  const servidor = http.createServer((req, res) => {
    const ruta = new URL(req.url ?? "/", `http://127.0.0.1:${puerto}`).pathname;
    req.resume();
    if (req.method === "PUT") {
      subidos.add(ruta);
      res.writeHead(200).end();
      return;
    }
    if (req.method === "HEAD") {
      res.writeHead(subidos.has(ruta) ? 200 : 404).end();
      return;
    }
    res.writeHead(200, { "content-type": "application/octet-stream" }).end("contenido");
  });
  await new Promise<void>((r) => servidor.listen(puerto, "127.0.0.1", r));
  return { puerto, parar: () => new Promise<void>((r) => servidor.close(() => r())) };
}

/* ── La prueba ────────────────────────────────────────────────────────────── */

async function main() {
  await sembrar();
  /**
   * Marca de agua. **`audit_log` no se puede limpiar** —es de solo inserción
   * desde la migración 0003— así que las comprobaciones de auditoría se acotan
   * por tiempo. Sin esto, la prueba leía apuntes de corridas anteriores y
   * juzgaba código que ya no existe.
   */
  const INICIO = new Date();
  const almacenamiento = await levantarAlmacenamiento();
  const servidor = await levantar({
    CRM_CONTACT_URL_TEMPLATE: "https://crm.example.test/contacts/{id}",
    S3_ENDPOINT: `http://127.0.0.1:${almacenamiento.puerto}`,
    S3_REGION: "auto",
    S3_ACCESS_KEY_ID: ACCESO_DEL_DOBLE,
    S3_SECRET_ACCESS_KEY: SECRETO_DEL_DOBLE,
    S3_BUCKET_DOWNLOADS: "downloads",
    S3_BUCKET_DELIVERABLES: "deliverables",
  });
  const { base } = servidor;
  const P = (ruta: string, clave?: string) => pedir(base, ruta, clave);

  try {
    console.log("\nCriterio 1 — sin clave, revocada o caducada: 401, y siempre el mismo:\n");

    const sinClave = await P("/api/v1/organizations");
    const malEsquema = await fetch(`${base}/api/v1/organizations`, {
      headers: { authorization: "Basic cXVlLXRhbA==" },
    });
    const inventada = await P("/api/v1/organizations", "valor-que-no-existe-en-ninguna-fila");
    const revocada = await P("/api/v1/organizations", VALORES.revocada);
    const caducada = await P("/api/v1/organizations", VALORES.caducada);

    for (const [nombre, r] of [
      ["sin cabecera", sinClave],
      ["clave inventada", inventada],
      ["clave revocada", revocada],
      ["clave caducada", caducada],
    ] as const) {
      check(`${nombre} → 401`, r.status === 401, String(r.status));
    }
    check("un esquema que no es Bearer → 401", malEsquema.status === 401);
    check(
      "los cuatro 401 traen EXACTAMENTE el mismo código y mensaje",
      new Set(
        [sinClave, inventada, revocada, caducada].map(
          (r) => `${r.cuerpo?.error?.code}|${r.cuerpo?.error?.message}`,
        ),
      ).size === 1,
      JSON.stringify([sinClave, inventada, revocada, caducada].map((r) => r.cuerpo?.error)),
    );
    check(
      "y ninguno dice cuál de los cuatro era",
      !JSON.stringify(revocada.cuerpo).match(/revoc|caduc|expir|existe/i),
      JSON.stringify(revocada.cuerpo),
    );
    check("el 401 lleva WWW-Authenticate: Bearer", sinClave.cabeceras.get("www-authenticate") === "Bearer");
    check(
      "y cada 401 lleva su request_id, distinto en cada llamada",
      typeof sinClave.cuerpo?.error?.request_id === "string" &&
        sinClave.cuerpo.error.request_id !== inventada.cuerpo?.error?.request_id,
    );

    console.log("\nCriterio 2 — alcance insuficiente: 403 que no dice qué faltaba:\n");

    const sinAlcance = await P("/api/v1/organizations", VALORES.capturas);
    check("una clave sin `orgs:read` en /organizations → 403", sinAlcance.status === 403, String(sinAlcance.status));
    check("con el código estable `insufficient_scope`", sinAlcance.cuerpo?.error?.code === "insufficient_scope");
    check(
      "y el mensaje NO nombra ningún alcance",
      !/orgs:read|captures:read|deliverables|announcements|events|scope|alcance [a-z]/i.test(
        sinAlcance.cuerpo?.error?.message ?? "",
      ),
      sinAlcance.cuerpo?.error?.message,
    );
    const otro403 = await P("/api/v1/captures", VALORES.entregables);
    check(
      "el 403 es el MISMO para cualquier ruta y cualquier alcance",
      otro403.status === 403 && otro403.cuerpo?.error?.message === sinAlcance.cuerpo?.error?.message,
    );

    console.log("\nCriterio 10 — la granularidad de alcances, recorrida entera:\n");

    const RUTAS: [string, string][] = [
      ["/api/v1/captures", "captures:read"],
      ["/api/v1/organizations", "orgs:read"],
      [`/api/v1/organizations/${A.org}/projects`, "orgs:read"],
      [`/api/v1/projects/${A.proyecto}/deliverables`, "deliverables:read"],
    ];
    const CLAVES: [string, string, Alcance[]][] = [
      ["capturas", VALORES.capturas, ["captures:read"]],
      ["entregables", VALORES.entregables, ["deliverables:read"]],
      ["eventos", VALORES.eventos, ["events:write"]],
    ];
    let celdas = 0;
    let correctas = 0;
    for (const [ruta, exigido] of RUTAS) {
      for (const [nombre, valor, alcances] of CLAVES) {
        const debePasar = (alcances as string[]).includes(exigido);
        const r = await P(ruta, valor);
        celdas++;
        const bien = debePasar ? r.status === 200 : r.status === 403;
        if (bien) correctas++;
        else console.error(`      ✗ ${nombre} en ${ruta}: ${r.status}, esperado ${debePasar ? 200 : 403}`);
      }
    }
    check(`las ${celdas} celdas de alcance × ruta se comportan como B.3 dice`, correctas === celdas, `${correctas}/${celdas}`);
    check(
      "y `events:write` no habilita NINGUNA lectura: los alcances no se implican (RF-147)",
      (await P("/api/v1/captures", VALORES.eventos)).status === 403 &&
        (await P("/api/v1/organizations", VALORES.eventos)).status === 403,
    );

    console.log("\nCriterio 3 — superado el límite: 429 con cabecera de reintento:\n");

    const primera = await P("/api/v1/organizations", VALORES.estrecha);
    const segunda = await P("/api/v1/organizations", VALORES.estrecha);
    const tercera = await P("/api/v1/organizations", VALORES.estrecha);
    check("las dos primeras pasan", primera.status === 200 && segunda.status === 200, `${primera.status}/${segunda.status}`);
    check("la tercera → 429", tercera.status === 429, String(tercera.status));
    check("con `Retry-After` en segundos", Number(tercera.cabeceras.get("retry-after")) > 0, tercera.cabeceras.get("retry-after") ?? "");
    check("y `RateLimit-Remaining: 0`", tercera.cabeceras.get("ratelimit-remaining") === "0");
    check(
      "el mensaje NO revela el umbral (la cifra solo viaja en las cabeceras)",
      !/\b2\b/.test(tercera.cuerpo?.error?.message ?? ""),
      tercera.cuerpo?.error?.message,
    );
    check("las respuestas buenas también traen RateLimit-Limit", primera.cabeceras.get("ratelimit-limit") === "2");

    console.log("\nCriterio 4 — `GET /captures`: evidencia, y nada de pipeline:\n");

    const capturas = await P("/api/v1/captures", VALORES.capturas);
    check("responde 200 con `captures:read`", capturas.status === 200, String(capturas.status));
    const cap = capturas.cuerpo?.data?.find((c: Json) => c.id === CAPTURA);
    check("y trae la captura sembrada", Boolean(cap));
    check("con su dominio de correo, que es columna generada", cap?.email_domain === "empresa.test", cap?.email_domain);
    check("con el estado de entrega al CRM", cap?.crm?.sync_status === "delivered" && cap?.crm?.contact_id === "3412");
    check("y el enlace profundo construido con la plantilla", cap?.crm?.contact_url === "https://crm.example.test/contacts/3412", cap?.crm?.contact_url);
    check("la descarga asociada viaja con su `doc_code`", cap?.download?.doc_code === "D-01", JSON.stringify(cap?.download));
    check("y la entrega, con su marca de completado", typeof cap?.delivery?.completed_at === "string");
    const PIPELINE = ["stage", "etapa", "owner", "propietario", "amount", "valor", "currency", "next_step", "score", "probabilit"];
    const serializada = JSON.stringify(cap ?? {}).toLowerCase();
    check(
      "NO hay etapa, propietario, valor, moneda, próximo paso ni puntuación (frontera (a))",
      !PIPELINE.some((p) => serializada.includes(p)),
      PIPELINE.filter((p) => serializada.includes(p)).join(", "),
    );
    const post = await fetch(`${base}/api/v1/captures`, {
      method: "POST",
      headers: { authorization: `Bearer ${VALORES.capturas}`, "content-type": "application/json" },
      body: "{}",
    });
    check("y no admite ninguna mutación: POST no existe", post.status === 405, String(post.status));

    console.log("\nRegresión de la revisión final — la fuga de capturas (C1):\n");

    /**
     * **El hueco que las «doce celdas» no cubrían.** La matriz de alcance × ruta
     * se recorría con claves **de SLG**, así que la combinación peligrosa —clave
     * ACOTADA a una empresa **con** `captures:read`— nunca se probaba. Y esa
     * clave leía el correo, el nombre, la empresa y el cargo de **todos los
     * visitantes del sitio**: `lead_capture` no tiene `organization_id`, así que
     * la política de fila no la acota y nada comprobaba el «solo SLG» que el
     * comentario del código daba por hecho.
     */
    const capturasAcotada = await P("/api/v1/captures", VALORES.capturasAcotada);
    check(
      "una clave ACOTADA a una empresa no puede leer capturas → 403",
      capturasAcotada.status === 403,
      String(capturasAcotada.status),
    );
    check(
      "y la respuesta no trae ni un correo de visitante",
      !JSON.stringify(capturasAcotada.cuerpo).includes("@"),
      JSON.stringify(capturasAcotada.cuerpo).slice(0, 160),
    );
    check(
      "la clave de SLG sigue pudiendo: el arreglo acota, no apaga",
      (await P("/api/v1/captures", VALORES.capturas)).status === 200,
    );
    /** Y la segunda capa: la combinación ya no se puede ni crear. */
    const { crearClave: crearPorLaPuerta } = await import("../../lib/hq/claves.ts");
    const { contextoDeSesion } = await import("../../lib/db/context.ts");
    const admin = contextoDeSesion({ userId: A.dueno, userName: "Resp", role: "slg_admin", organizationId: null });
    let rechazada = false;
    try {
      await crearPorLaPuerta(admin, {
        nombre: "Acotada con capturas",
        organizationId: A.org,
        alcances: ["captures:read"],
        limite: 10,
        ventanaSegundos: 60,
        caducaEn: "2027-01-01",
      });
    } catch {
      rechazada = true;
    }
    check("crear esa combinación se rechaza en el servicio (segunda capa)", rechazada);

    console.log("\nRegresión de la revisión final — `only_latest` perdía entregables (I1):\n");

    /**
     * Seis versiones de una familia y cuatro familias más, con `limit=2`. Antes
     * la deduplicación ocurría **en memoria sobre la ventana ya traída**, así que
     * `has_more` se calculaba sobre la lista reducida y la paginación mentía.
     */
    /**
     * En **su propio proyecto**. La primera versión los metió en el proyecto de
     * A y rompió tres comprobaciones anteriores que contaban entregables: una
     * prueba nueva no puede mover el suelo de las que ya existían.
     */
    const PROYECTO_REV = "p-rev-only-latest";
    await dueno`insert into project (id, organization_id, name, service, status)
                values (${PROYECTO_REV}, ${A.org}, 'Regresión only_latest', 'Phoenix PEEx', 'active')`;
    const famGorda = "fam-rev-gorda";
    for (let v = 1; v <= 6; v++) {
      await dueno`insert into deliverable (id, project_id, organization_id, title, type, version,
                                           family_id, visibility, published_at)
                  values (${`d-rev-g${v}`}, ${PROYECTO_REV}, ${A.org}, ${`Gorda v${v}`}, 'pdf', ${v},
                          ${famGorda}, 'client', now())`;
    }
    for (let f = 1; f <= 4; f++) {
      await dueno`insert into deliverable (id, project_id, organization_id, title, type, version,
                                           family_id, visibility, published_at)
                  values (${`d-rev-f${f}`}, ${PROYECTO_REV}, ${A.org}, ${`Familia ${f}`}, 'pdf', 1,
                          ${`fam-rev-${f}`}, 'client', now())`;
    }

    const familias = new Set<string>();
    let cursorUltimas: string | null = null;
    let paginas = 0;
    do {
      const consulta = `/api/v1/projects/${PROYECTO_REV}/deliverables?only_latest=true&limit=2${
        cursorUltimas ? `&cursor=${encodeURIComponent(cursorUltimas)}` : ""
      }`;
      const pagina = await P(consulta, VALORES.slg);
      for (const d of pagina.cuerpo.data as Json[]) familias.add(d.family_id as string);
      cursorUltimas = pagina.cuerpo.page.next_cursor;
      paginas++;
    } while (cursorUltimas && paginas < 20);

    check(
      "paginando `only_latest` se recorren TODAS las familias, sin perder ninguna",
      familias.size === 5,
      `${familias.size} familias en ${paginas} páginas: ${[...familias].join(", ")}`,
    );
    check(
      "y de la familia con seis versiones vuelve solo la última",
      (
        (await P(`/api/v1/projects/${PROYECTO_REV}/deliverables?only_latest=true&limit=50`, VALORES.slg))
          .cuerpo.data as Json[]
      ).filter((d: Json) => d.family_id === famGorda).map((d: Json) => d.version).join() === "6",
    );

    console.log("\nCriterio 5 — empresas y proyectos con `orgs:read`:\n");

    const orgs = await P("/api/v1/organizations", VALORES.slg);
    check("una clave de SLG ve las dos empresas", orgs.cuerpo?.data?.length >= 2, JSON.stringify(orgs.cuerpo?.data?.map((o: Json) => o.id)));
    check(
      "con el contacto principal pero SIN su correo (minimización)",
      orgs.cuerpo.data.some((o: Json) => o.primary_contact?.name === "Ana Directora") &&
        !JSON.stringify(orgs.cuerpo).includes("ana@du22.test"),
    );
    const orgsAcotada = await P("/api/v1/organizations", VALORES.empresa);
    check(
      "una clave acotada ve EXACTAMENTE una empresa: la suya",
      orgsAcotada.cuerpo?.data?.length === 1 && orgsAcotada.cuerpo.data[0].id === A.org,
      JSON.stringify(orgsAcotada.cuerpo?.data?.map((o: Json) => o.id)),
    );

    const proyectos = await P(`/api/v1/organizations/${A.org}/projects`, VALORES.slg);
    check("los proyectos de una empresa responden 200", proyectos.status === 200);
    /**
     * Contra el proyecto **por su id**, no contra `data[0]`. Anclar a la primera
     * fila hacía que cualquier proyecto nuevo en la misma empresa —el de la
     * regresión de `only_latest`, por ejemplo— rompiera estas dos
     * comprobaciones sin que nada del producto hubiera cambiado.
     */
    const proyectoSembrado = (proyectos.cuerpo?.data as Json[] | undefined)?.find(
      (p: Json) => p.id === A.proyecto,
    );
    check("con el servicio literal e intraducible (RF-14)", proyectoSembrado?.service === "Phoenix PEEx", proyectoSembrado?.service as string);
    check("y las fechas de calendario sin hora", proyectoSembrado?.starts_at === "2026-09-15", proyectoSembrado?.starts_at as string);

    const ajena = await P(`/api/v1/organizations/${B.org}/projects`, VALORES.empresa);
    check("una empresa ajena es 404, no 403", ajena.status === 404, String(ajena.status));
    const inexistente = await P("/api/v1/organizations/org-que-no-existe/projects", VALORES.slg);
    check(
      "y el 404 de lo ajeno es IDÉNTICO al de lo inexistente",
      JSON.stringify({ ...ajena.cuerpo.error, request_id: "" }) ===
        JSON.stringify({ ...inexistente.cuerpo.error, request_id: "" }),
      `${JSON.stringify(ajena.cuerpo.error)} vs ${JSON.stringify(inexistente.cuerpo.error)}`,
    );

    console.log("\nEntregables — la regla de visibilidad de §3.6:\n");

    const deSlg = await P(`/api/v1/projects/${A.proyecto}/deliverables`, VALORES.slg);
    check("una clave de SLG ve los cuatro, incluido el `internal`", deSlg.cuerpo?.data?.length === 4, String(deSlg.cuerpo?.data?.length));
    const deEmpresa = await P(`/api/v1/projects/${A.proyecto}/deliverables`, VALORES.empresa);
    const ids = (deEmpresa.cuerpo?.data ?? []).map((d: Json) => d.id);
    check("una clave acotada ve solo lo `client` y publicado", ids.length === 2 && !ids.includes("d-du22-3") && !ids.includes("d-du22-4"), ids.join(","));
    check(
      "NINGUNA respuesta trae URL de descarga del archivo",
      !JSON.stringify(deSlg.cuerpo).match(/X-Amz-Signature|signed_url|download_url/i),
    );
    check("sí trae el checksum, que es lo que el contrato promete", deSlg.cuerpo.data.some((d: Json) => d.file?.checksum_sha256 === "aaaa1111"));
    const ultimas = await P(`/api/v1/projects/${A.proyecto}/deliverables?only_latest=true`, VALORES.slg);
    check("`only_latest` deja una sola versión por familia", ultimas.cuerpo?.data?.filter((d: Json) => d.family_id === "fam-du22").length === 1);
    const proyectoAjeno = await P(`/api/v1/projects/${B.proyecto}/deliverables`, VALORES.empresa);
    check("un proyecto de otra empresa es 404", proyectoAjeno.status === 404, String(proyectoAjeno.status));

    console.log("\nCriterio 9 — toda entrada se valida contra esquema (RNF-33):\n");

    const malos: [string, string][] = [
      ["?limit=0", "limit fuera de rango"],
      ["?limit=999", "limit por encima del máximo"],
      ["?limit=abc", "limit que no es entero"],
      ["?source=inventado", "valor fuera de vocabulario"],
      ["?since=no-es-fecha", "fecha ilegible"],
      ["?limite=10", "parámetro que no existe"],
    ];
    let validados = 0;
    for (const [consulta, caso] of malos) {
      const r = await P(`/api/v1/captures${consulta}`, VALORES.capturas);
      if (r.status === 422 && r.cuerpo?.error?.code === "validation_failed") validados++;
      else console.error(`      ✗ ${caso}: ${r.status} ${JSON.stringify(r.cuerpo?.error)}`);
    }
    check(`los ${malos.length} parámetros inválidos dan 422`, validados === malos.length, `${validados}/${malos.length}`);
    const detalles = await P("/api/v1/captures?limit=999", VALORES.capturas);
    check("el 422 dice el CAMPO y el motivo", detalles.cuerpo?.error?.details?.[0]?.field === "limit");
    /**
     * Se mira **`details`**, no el sobre entero: el `request_id` es un UUID y
     * puede contener «999» por casualidad. La primera versión miraba el sobre y
     * fallaba una vez de cada tantas — una prueba que falla a veces enseña a
     * ignorarla, que es peor que no tenerla.
     */
    check(
      "y NO repite el valor recibido (RNF-26)",
      !JSON.stringify(detalles.cuerpo.error.details).includes("999"),
      JSON.stringify(detalles.cuerpo.error.details),
    );
    const cruzado = await P("/api/v1/captures?since=2026-10-01T00:00:00Z&until=2026-09-01T00:00:00Z", VALORES.capturas);
    check("`since` posterior a `until` → 422", cruzado.status === 422, String(cruzado.status));
    const cursorMalo = await P("/api/v1/captures?cursor=no-es-un-cursor", VALORES.capturas);
    check("un cursor corrupto → 400", cursorMalo.status === 400, String(cursorMalo.status));

    console.log("\nPaginación por cursor (§2.7):\n");

    const pagina1 = await P(`/api/v1/projects/${A.proyecto}/deliverables?limit=2`, VALORES.slg);
    check("la primera página trae `has_more` y `next_cursor`", pagina1.cuerpo?.page?.has_more === true && typeof pagina1.cuerpo.page.next_cursor === "string");
    const pagina2 = await P(
      `/api/v1/projects/${A.proyecto}/deliverables?limit=2&cursor=${encodeURIComponent(pagina1.cuerpo.page.next_cursor)}`,
      VALORES.slg,
    );
    const idsP1 = pagina1.cuerpo.data.map((d: Json) => d.id);
    const idsP2 = pagina2.cuerpo.data.map((d: Json) => d.id);
    check("la segunda no repite ningún elemento de la primera", !idsP2.some((i: string) => idsP1.includes(i)), `${idsP1} / ${idsP2}`);
    check("y entre las dos están los cuatro", new Set([...idsP1, ...idsP2]).size === 4);
    const cursorDeOtra = await P(
      `/api/v1/organizations?cursor=${encodeURIComponent(pagina1.cuerpo.page.next_cursor)}`,
      VALORES.slg,
    );
    check("un cursor de OTRA colección → 400, no una página sin sentido", cursorDeOtra.status === 400, String(cursorDeOtra.status));

    console.log("\nCriterios 7 y 8 — errores mudos, versión en la ruta y cabeceras:\n");

    const textos = [sinClave, sinAlcance, tercera, ajena, detalles, cursorMalo]
      .map((r) => JSON.stringify(r.cuerpo))
      .join(" ");
    check(
      "ningún error revela traza, tabla, consulta ni versión",
      !/at\s+\w+\s*\(|node_modules|select\s|from\s+"?(lead_capture|organization|project|deliverable)|postgres|drizzle|next@|\d+\.\d+\.\d+/i.test(textos),
      textos.slice(0, 300),
    );
    check(
      "todos los errores traen el mismo sobre: code, message, request_id y details",
      [sinClave, sinAlcance, tercera, ajena, detalles, cursorMalo].every(
        (r) =>
          typeof r.cuerpo?.error?.code === "string" &&
          typeof r.cuerpo?.error?.message === "string" &&
          typeof r.cuerpo?.error?.request_id === "string" &&
          Array.isArray(r.cuerpo?.error?.details),
      ),
    );
    check("la versión va en la ruta: `/api/v2` todavía no existe", (await P("/api/v2/organizations", VALORES.slg)).status === 404);
    check("y una ruta inventada bajo /api/v1 es 404", (await P("/api/v1/inventada", VALORES.slg)).status === 404);
    check("ninguna respuesta es cacheable", orgs.cabeceras.get("cache-control") === "no-store" && sinClave.cabeceras.get("cache-control") === "no-store");
    check("toda respuesta lleva X-Request-Id", Boolean(orgs.cabeceras.get("x-request-id")) && Boolean(sinClave.cabeceras.get("x-request-id")));

    console.log("\nDU-23 · el ciclo de tres pasos: crear → subir → publicar:\n");

    const postJson = async (ruta: string, clave: string, cuerpo: unknown, tipo = "application/json") => {
      const r = await fetch(`${base}${ruta}`, {
        method: "POST",
        headers: { authorization: `Bearer ${clave}`, "content-type": tipo },
        body: typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo),
      });
      let leido: Json = null;
      try {
        leido = await r.json();
      } catch {
        leido = null;
      }
      return { status: r.status, cuerpo: leido, cabeceras: r.headers };
    };

    const creado = await postJson("/api/v1/deliverables", VALORES.escribeEntregables, {
      project_id: A.proyecto,
      title: "Informe por API",
      type: "pdf",
      source: "file",
      visibility: "client",
      file: { filename: "informe.pdf", mime_type: "application/pdf", size_bytes: 1024 },
    });
    check("`POST /deliverables` responde 201", creado.status === 201, JSON.stringify(creado.cuerpo));
    check("con `Location` a la ruta de lectura", creado.cabeceras.get("location") === `/api/v1/projects/${A.proyecto}/deliverables`);
    check("el recurso nace SIN publicar", creado.cuerpo?.data?.published_at === null);
    check("y devuelve la URL firmada de subida con sus cabeceras", typeof creado.cuerpo?.upload?.url === "string" && creado.cuerpo.upload.method === "PUT");
    check(
      "la URL firmada NO se registra en la auditoría: contiene la firma (RNF-26)",
      (
        (await dueno`select count(*)::text as n from audit_log
                      where created_at >= ${INICIO} and metadata::text like '%X-Amz-Signature%'`) as unknown as { n: string }[]
      )[0]?.n === "0",
    );

    const idCreado = creado.cuerpo.data.id as string;

    // **Publicar sin haber subido es 409**, y el entregable se queda donde estaba.
    const sinSubir = await postJson(`/api/v1/deliverables/${idCreado}/publish`, VALORES.escribeEntregables, {});
    check("publicar sin archivo subido → 409 (criterio 8)", sinSubir.status === 409, String(sinSubir.status));
    check("con el código estable `conflict`", sinSubir.cuerpo?.error?.code === "conflict");

    // Paso 2: el `PUT` contra la URL firmada, que NO es una ruta nuestra.
    const puesto = await fetch(creado.cuerpo.upload.url, {
      method: "PUT",
      headers: creado.cuerpo.upload.headers,
      body: "x".repeat(1024),
    });
    check("el `PUT` contra la URL firmada funciona", puesto.ok, String(puesto.status));

    const publicado = await postJson(`/api/v1/deliverables/${idCreado}/publish`, VALORES.escribeEntregables, {});
    check("ahora publicar responde 200", publicado.status === 200, JSON.stringify(publicado.cuerpo?.error));
    check("con su marca de publicación", typeof publicado.cuerpo?.data?.published_at === "string");
    check(
      "y la atribución distingue CLAVE de persona (RF-111)",
      publicado.cuerpo.data.published_by?.actor_type === "api_key" &&
        publicado.cuerpo.data.published_by?.actor_id === "k-du23-ent",
      JSON.stringify(publicado.cuerpo.data.published_by),
    );
    const otraVez = await postJson(`/api/v1/deliverables/${idCreado}/publish`, VALORES.escribeEntregables, {});
    check("publicar dos veces → 409", otraVez.status === 409, String(otraVez.status));

    const leido = await P(`/api/v1/projects/${A.proyecto}/deliverables`, VALORES.escribeEntregables);
    check(
      "y el entregable ya aparece publicado en la lectura: el ciclo cierra de punta a punta",
      leido.cuerpo.data.some((d: Json) => d.id === idCreado && d.published_at !== null),
    );

    console.log("\nDU-23 · lo que el ciclo NO deja hacer:\n");

    const enlaceMalo = await postJson("/api/v1/deliverables", VALORES.escribeEntregables, {
      project_id: A.proyecto,
      title: "Enlace hostil",
      type: "link",
      source: "link",
      external_url: "javascript:alert(1)",
    });
    check("un `external_url` con esquema ejecutable → 422", enlaceMalo.status === 422, String(enlaceMalo.status));
    const incoherente = await postJson("/api/v1/deliverables", VALORES.escribeEntregables, {
      project_id: A.proyecto,
      title: "Incoherente",
      type: "pdf",
      source: "file",
      external_url: "https://ejemplo.test/x",
      file: { filename: "x.pdf", mime_type: "application/pdf", size_bytes: 10 },
    });
    check("`source=file` con `external_url` → 422", incoherente.status === 422, String(incoherente.status));
    const mimeMalo = await postJson("/api/v1/deliverables", VALORES.escribeEntregables, {
      project_id: A.proyecto,
      title: "MIME que no toca",
      type: "pdf",
      source: "file",
      file: { filename: "x.exe", mime_type: "application/x-msdownload", size_bytes: 10 },
    });
    check("un MIME fuera de lo permitido se rechaza ANTES de firmar (RNF-25)", mimeMalo.status === 422, String(mimeMalo.status));
    const grande = await postJson("/api/v1/deliverables", VALORES.escribeEntregables, {
      project_id: A.proyecto,
      title: "Demasiado grande",
      type: "md",
      source: "file",
      file: { filename: "x.md", mime_type: "text/markdown", size_bytes: 5 * 1024 * 1024 },
    });
    check("y un tamaño por encima del tope del tipo, también", grande.status === 422, String(grande.status));
    const familiaAjena = await postJson("/api/v1/deliverables", VALORES.escribeEntregables, {
      project_id: A.proyecto,
      title: "Familia de otro",
      type: "pdf",
      source: "file",
      family_id: "fam-que-no-existe",
      file: { filename: "x.pdf", mime_type: "application/pdf", size_bytes: 10 },
    });
    check("un `family_id` inexistente → 422", familiaAjena.status === 422, String(familiaAjena.status));
    const proyectoDeOtro = await postJson("/api/v1/deliverables", VALORES.escribeAcotada, {
      project_id: B.proyecto,
      title: "En casa ajena",
      type: "pdf",
      source: "file",
      file: { filename: "x.pdf", mime_type: "application/pdf", size_bytes: 10 },
    });
    check("crear en un proyecto de otra empresa → 404, no 403", proyectoDeOtro.status === 404, String(proyectoDeOtro.status));
    const soloLectura = await postJson("/api/v1/deliverables", VALORES.entregables, {
      project_id: A.proyecto,
      title: "Sin permiso",
      type: "pdf",
      source: "file",
      file: { filename: "x.pdf", mime_type: "application/pdf", size_bytes: 10 },
    });
    check("una clave de SOLO LECTURA no puede crear nada → 403 (DoD #6)", soloLectura.status === 403, String(soloLectura.status));

    console.log("\nDU-23 · avisos, y que el cliente los ve:\n");

    const avisoSinPublish = await postJson("/api/v1/announcements", VALORES.escribeAvisos, {
      organization_id: A.org,
      title: "Sin decidir",
      body_md: "cuerpo",
    });
    check("`publish` es obligatorio y sin defecto → 422", avisoSinPublish.status === 422, String(avisoSinPublish.status));
    check(
      "y el detalle nombra el campo que falta",
      avisoSinPublish.cuerpo?.error?.details?.some((d: Json) => d.field === "publish" && d.code === "required"),
      JSON.stringify(avisoSinPublish.cuerpo?.error?.details),
    );

    const avisoBorrador = await postJson("/api/v1/announcements", VALORES.escribeAvisos, {
      organization_id: A.org,
      title: "Borrador",
      body_md: "todavía no",
      publish: false,
    });
    check("con `publish: false` se crea sin publicar", avisoBorrador.status === 201 && avisoBorrador.cuerpo.data.published_at === null);
    check("y sin autor: lo impone la base, no la respuesta", avisoBorrador.cuerpo.data.author === null);

    const aviso = await postJson("/api/v1/announcements", VALORES.escribeAvisos, {
      organization_id: A.org,
      title: "Sesión de cierre de la cohorte 1",
      body_md: "La sesión queda fijada para el **22 de octubre**.",
      publish: true,
    });
    check("con `publish: true` responde 201 y queda publicado", aviso.status === 201 && typeof aviso.cuerpo.data.published_at === "string", JSON.stringify(aviso.cuerpo?.error));
    check(
      "la autoría distingue clave de persona (RF-111)",
      aviso.cuerpo.data.author?.actor_type === "api_key" && aviso.cuerpo.data.author?.actor_id === "k-du23-avi",
    );
    const enElPortal = (await dueno`
      select title, published_at, author_type from announcement
       where organization_id = ${A.org} and published_at is not null
    `) as unknown as { title: string; author_type: string }[];
    check(
      "y el aviso está en la empresa de ese cliente, publicado y atribuido a la clave (DoD #6)",
      enElPortal.length === 1 && enElPortal[0]!.title.startsWith("Sesión de cierre") && enElPortal[0]!.author_type === "api_key",
      JSON.stringify(enElPortal),
    );
    const avisoAjeno = await postJson("/api/v1/announcements", VALORES.escribeAcotada, {
      organization_id: B.org,
      title: "En casa ajena",
      body_md: "x",
      publish: true,
    });
    check("una clave acotada no puede escribir en otra empresa → 404", avisoAjeno.status === 404, String(avisoAjeno.status));

    console.log("\nDU-23 · eventos: enumerado abierto con forma exigida (RF-146):\n");

    const eventoConocido = await postJson("/api/v1/events", VALORES.escribeEventos, {
      kind: "deliverable.published",
      organization_id: A.org,
      payload: { unit: "DU-23" },
    });
    check("un `kind` del catálogo se acepta", eventoConocido.status === 201, String(eventoConocido.status));
    check("y se marca como conocido", eventoConocido.cuerpo.data.schema_known === true);

    const eventoNuevo = await postJson("/api/v1/events", VALORES.escribeEventos, {
      kind: "review.verdict",
      payload: { unit: "DU-23", verdict: "pass", checks: [{ id: "aislamiento", result: "pass" }] },
    });
    check("un `kind` NUEVO se acepta sin migrar el esquema (RF-146)", eventoNuevo.status === 201, String(eventoNuevo.status));
    check("y se dice honestamente que su esquema no se conoce", eventoNuevo.cuerpo.data.schema_known === false);
    check(
      "el payload estructurado se guarda entero",
      (
        (await dueno`select payload_json from agent_event where id = ${eventoNuevo.cuerpo.data.id}`) as unknown as { payload_json: Json }[]
      )[0]?.payload_json?.checks?.[0]?.id === "aislamiento",
    );
    const formaMala = await postJson("/api/v1/events", VALORES.escribeEventos, { kind: "SinPunto", payload: {} });
    check("un `kind` fuera de forma → 422", formaMala.status === 422, String(formaMala.status));
    check(
      "y el detalle señala `kind`",
      formaMala.cuerpo?.error?.details?.some((d: Json) => d.field === "kind"),
      JSON.stringify(formaMala.cuerpo?.error?.details),
    );
    const enTablero = (await dueno`
      select count(*)::text as n from agent_event where organization_id = ${A.org}
    `) as unknown as { n: string }[];
    check("el evento queda donde el tablero de HQ lo lee (RF-76, DoD #4)", Number(enTablero[0]?.n) >= 1, enTablero[0]?.n);

    console.log("\nDU-23 · el sobre de un POST: 415, 413, 400 y campos no declarados:\n");

    const tipoMalo = await postJson("/api/v1/events", VALORES.escribeEventos, "kind=x", "application/x-www-form-urlencoded");
    check("un `Content-Type` que no es JSON → 415", tipoMalo.status === 415, String(tipoMalo.status));
    const jsonRoto = await postJson("/api/v1/events", VALORES.escribeEventos, "{no es json");
    check("un JSON ilegible → 400", jsonRoto.status === 400, String(jsonRoto.status));
    const campoDeMas = await postJson("/api/v1/events", VALORES.escribeEventos, {
      kind: "review.verdict",
      payload: {},
      inventado: true,
    });
    check("un campo no declarado → 422, no se ignora en silencio", campoDeMas.status === 422, String(campoDeMas.status));
    /**
     * **El 413 se prueba con un cuerpo grande de verdad.** El primer intento
     * declaraba 60 MB en `content-length` y enviaba poco, para demostrar que el
     * rechazo ocurre **por la cabecera y sin leer el cuerpo**; no se puede: el
     * servidor no entrega la petición al manejador hasta que el cuerpo declarado
     * llega, así que la prueba se quedaba colgada. Queda dicho aquí porque es
     * una limitación real del entorno, no una decisión: la comprobación de la
     * cabecera **existe** en el manejador y ahorra analizar el JSON, pero lo que
     * esta prueba demuestra es el resultado —413— y no el ahorro.
     */
    const relleno = "a".repeat(51 * 1024 * 1024);
    const enorme = await postJson("/api/v1/events", VALORES.escribeEventos, {
      kind: "review.verdict",
      payload: { relleno },
    });
    check("un cuerpo por encima del tope duro → 413", enorme.status === 413, String(enorme.status));

    console.log("\nDU-30 · Academy — noticias: alcance, empresa y forma:\n");

    const RUTA_NOTICIAS_A = `/api/v1/organizations/${A.org}/news`;
    const NOTICIA = {
      title: "La UE fija el calendario del AI Act",
      source_url: "https://ejemplo.test/ai-act",
      summary_md: "Las obligaciones de alto riesgo entran en vigor en **agosto de 2027**.",
      comment_md: "Para tu caso: el copiloto de atención queda fuera del alto riesgo.",
      importance: 1,
      publish: true,
    };

    const noticiaSinAlcance = await postJson(RUTA_NOTICIAS_A, VALORES.escribeAvisos, NOTICIA);
    check("una clave sin `news:write` → 403 (criterio 1 de DU-30)", noticiaSinAlcance.status === 403, String(noticiaSinAlcance.status));
    check(
      "y es el MISMO 403 de siempre: no nombra el alcance que faltaba",
      noticiaSinAlcance.cuerpo?.error?.code === "insufficient_scope" &&
        noticiaSinAlcance.cuerpo?.error?.message === sinAlcance.cuerpo?.error?.message,
    );

    const noticia = await postJson(RUTA_NOTICIAS_A, VALORES.escribeNoticias, NOTICIA);
    check("con `news:write` → 201", noticia.status === 201, JSON.stringify(noticia.cuerpo?.error));
    check(
      "la respuesta lleva la empresa de la RUTA y la importancia editorial tal como se envió (D-161)",
      noticia.cuerpo?.data?.organization_id === A.org && noticia.cuerpo?.data?.importance === 1,
    );
    check(
      "y la autoría distingue clave de persona (RF-111)",
      noticia.cuerpo?.data?.author?.actor_type === "api_key" && noticia.cuerpo?.data?.author?.actor_id === "k-du30-new",
      JSON.stringify(noticia.cuerpo?.data?.author),
    );
    const filaNoticia = (await dueno`
      select author_type, author_id, published_at, importance from news_item where id = ${noticia.cuerpo?.data?.id ?? ""}
    `) as unknown as { author_type: string | null; author_id: string | null; published_at: Date | null; importance: number }[];
    check(
      "la fila lleva `author_type = api_key` y está publicada (criterio 1 de DU-30)",
      filaNoticia[0]?.author_type === "api_key" && filaNoticia[0]?.author_id === "k-du30-new" && filaNoticia[0]?.published_at !== null,
      JSON.stringify(filaNoticia[0]),
    );

    const borrador = await postJson(RUTA_NOTICIAS_A, VALORES.escribeNoticias, { ...NOTICIA, title: "Borrador", importance: 3, publish: false });
    check(
      "con `publish: false` nace sin publicar y sin autor: lo impone la base, no la respuesta",
      borrador.status === 201 && borrador.cuerpo?.data?.published_at === null && borrador.cuerpo?.data?.author === null,
      JSON.stringify(borrador.cuerpo?.data ?? borrador.cuerpo?.error),
    );

    const { publish: _sinPublish, ...NOTICIA_SIN_PUBLISH } = NOTICIA;
    void _sinPublish;
    const noticiaSinPublish = await postJson(RUTA_NOTICIAS_A, VALORES.escribeNoticias, NOTICIA_SIN_PUBLISH);
    check(
      "`publish` es obligatorio y sin defecto → 422 que nombra el campo",
      noticiaSinPublish.status === 422 &&
        noticiaSinPublish.cuerpo?.error?.details?.some((d: Json) => d.field === "publish" && d.code === "required"),
      JSON.stringify(noticiaSinPublish.cuerpo?.error?.details),
    );
    const importanciaFuera = await postJson(RUTA_NOTICIAS_A, VALORES.escribeNoticias, { ...NOTICIA, importance: 4 });
    check(
      "`importance: 4` → 422 `out_of_range` en `importance`, sin repetir el valor (RNF-26)",
      importanciaFuera.status === 422 &&
        importanciaFuera.cuerpo?.error?.details?.some((d: Json) => d.field === "importance" && d.code === "out_of_range") &&
        !JSON.stringify(importanciaFuera.cuerpo?.error?.details).includes("4"),
      JSON.stringify(importanciaFuera.cuerpo?.error?.details),
    );
    const importanciaTexto = await postJson(RUTA_NOTICIAS_A, VALORES.escribeNoticias, { ...NOTICIA, importance: "alta" });
    check("`importance: \"alta\"` → 422 `not_an_integer`", importanciaTexto.status === 422 && importanciaTexto.cuerpo?.error?.details?.some((d: Json) => d.code === "not_an_integer"));
    const fuenteHostil = await postJson(RUTA_NOTICIAS_A, VALORES.escribeNoticias, { ...NOTICIA, source_url: "javascript:alert(1)" });
    check(
      "un `source_url` con esquema ejecutable → 422 `scheme_not_allowed`",
      fuenteHostil.status === 422 && fuenteHostil.cuerpo?.error?.details?.some((d: Json) => d.field === "source_url" && d.code === "scheme_not_allowed"),
      JSON.stringify(fuenteHostil.cuerpo?.error?.details),
    );
    const sinComentario = await postJson(RUTA_NOTICIAS_A, VALORES.escribeNoticias, { ...NOTICIA, comment_md: "" });
    check("sin `comment_md` → 422: el comentario es el producto, no un adorno", sinComentario.status === 422 && sinComentario.cuerpo?.error?.details?.some((d: Json) => d.field === "comment_md"));
    const noticiaConCampoDeMas = await postJson(RUTA_NOTICIAS_A, VALORES.escribeNoticias, { ...NOTICIA, inventado: true });
    check("un campo no declarado → 422, no se ignora en silencio", noticiaConCampoDeMas.status === 422, String(noticiaConCampoDeMas.status));

    const noticiaAjena = await postJson(`/api/v1/organizations/${B.org}/news`, VALORES.academyAcotada, NOTICIA);
    check("una clave acotada a A no escribe en B → 404, nunca 403 (criterio 2, D-38)", noticiaAjena.status === 404, String(noticiaAjena.status));
    const noticiaInexistente = await postJson("/api/v1/organizations/org-que-no-existe/news", VALORES.escribeNoticias, NOTICIA);
    check(
      "y el 404 de lo ajeno es IDÉNTICO al de lo inexistente",
      noticiaInexistente.status === 404 &&
        JSON.stringify({ ...noticiaAjena.cuerpo?.error, request_id: "" }) === JSON.stringify({ ...noticiaInexistente.cuerpo?.error, request_id: "" }),
      `${JSON.stringify(noticiaAjena.cuerpo?.error)} vs ${JSON.stringify(noticiaInexistente.cuerpo?.error)}`,
    );
    const enSuCasa = await postJson(RUTA_NOTICIAS_A, VALORES.academyAcotada, { ...NOTICIA, title: "Desde la acotada", importance: 2 });
    check("la misma clave acotada SÍ escribe en la suya → 201", enSuCasa.status === 201, String(enSuCasa.status));
    const noticiaDespues = await postJson(RUTA_NOTICIAS_A, VALORES.escribeNoticias, { ...NOTICIA, title: "La segunda de importancia 1" });
    check("una segunda noticia de importancia 1, más reciente → 201", noticiaDespues.status === 201, String(noticiaDespues.status));

    console.log("\nDU-30 · Academy — hitos: la empresa sale del proyecto; hecho ⇔ con fecha:\n");

    const RUTA_HITOS_A = `/api/v1/projects/${A.proyecto}/milestones`;
    const HITO = { title: "Entrega del diagnóstico", due_at: "2026-10-15T00:00:00Z", position: 1 };

    check("`news:write` no habilita hitos: los alcances no se implican (RF-147)", (await postJson(RUTA_HITOS_A, VALORES.escribeNoticias, HITO)).status === 403);
    check("ni `milestones:write` habilita noticias", (await postJson(RUTA_NOTICIAS_A, VALORES.escribeHitos, NOTICIA)).status === 403);
    check("una clave sin ninguno de los dos → 403", (await postJson(RUTA_HITOS_A, VALORES.escribeAvisos, HITO)).status === 403);

    const hito = await postJson(RUTA_HITOS_A, VALORES.escribeHitos, HITO);
    check("con `milestones:write` → 201", hito.status === 201, JSON.stringify(hito.cuerpo?.error));
    check("nace `pending` y sin `done_at`", hito.cuerpo?.data?.status === "pending" && hito.cuerpo?.data?.done_at === null);
    check(
      "y su empresa es la del proyecto, que NO viajó en el cuerpo",
      hito.cuerpo?.data?.organization_id === A.org && hito.cuerpo?.data?.project_id === A.proyecto,
      JSON.stringify(hito.cuerpo?.data),
    );
    check("la fecha vuelve normalizada a ISO", hito.cuerpo?.data?.due_at === "2026-10-15T00:00:00.000Z", hito.cuerpo?.data?.due_at);
    const fechaMala = await postJson(RUTA_HITOS_A, VALORES.escribeHitos, { ...HITO, due_at: "el mes que viene" });
    check(
      "`due_at` que no es fecha → 422 `not_a_datetime`",
      fechaMala.status === 422 && fechaMala.cuerpo?.error?.details?.some((d: Json) => d.field === "due_at" && d.code === "not_a_datetime"),
      JSON.stringify(fechaMala.cuerpo?.error?.details),
    );
    const sinTitulo = await postJson(RUTA_HITOS_A, VALORES.escribeHitos, { due_at: HITO.due_at });
    check("sin `title` → 422 `required`", sinTitulo.status === 422 && sinTitulo.cuerpo?.error?.details?.some((d: Json) => d.field === "title" && d.code === "required"));
    const posicionNegativa = await postJson(RUTA_HITOS_A, VALORES.escribeHitos, { ...HITO, position: -1 });
    check("`position: -1` → 422 `out_of_range`", posicionNegativa.status === 422 && posicionNegativa.cuerpo?.error?.details?.some((d: Json) => d.field === "position"));
    check("un proyecto de otra empresa → 404, no 403", (await postJson(`/api/v1/projects/${B.proyecto}/milestones`, VALORES.academyAcotada, HITO)).status === 404);
    check("y un proyecto inexistente, también 404", (await postJson("/api/v1/projects/p-que-no-existe/milestones", VALORES.escribeHitos, HITO)).status === 404);

    const hitoId = hito.cuerpo?.data?.id as string;
    const hecho = await postJson(`/api/v1/milestones/${hitoId}/done`, VALORES.escribeHitos, {});
    check("`POST /milestones/{id}/done` → 200 con `status: done` y `done_at`", hecho.status === 200 && hecho.cuerpo?.data?.status === "done" && typeof hecho.cuerpo?.data?.done_at === "string", JSON.stringify(hecho.cuerpo));
    const filaHecho = (await dueno`select status, done_at from milestone where id = ${hitoId}`) as unknown as { status: string; done_at: Date | null }[];
    check("en la base: hecho ⇔ con fecha (`milestone_done_has_date`)", filaHecho[0]?.status === "done" && filaHecho[0]?.done_at !== null, JSON.stringify(filaHecho[0]));
    const otraVezHecho = await postJson(`/api/v1/milestones/${hitoId}/done`, VALORES.escribeHitos, {});
    check(
      "repetir `done` es idempotente: 200 y la MISMA fecha, un reintento no reescribe cuándo se entregó",
      otraVezHecho.status === 200 && otraVezHecho.cuerpo?.data?.done_at === hecho.cuerpo?.data?.done_at,
      `${hecho.cuerpo?.data?.done_at} vs ${otraVezHecho.cuerpo?.data?.done_at}`,
    );
    const reabierto = await postJson(`/api/v1/milestones/${hitoId}/reopen`, VALORES.escribeHitos, {});
    check("`POST /milestones/{id}/reopen` → 200, vuelve a `pending` y quita `done_at`", reabierto.status === 200 && reabierto.cuerpo?.data?.status === "pending" && reabierto.cuerpo?.data?.done_at === null, JSON.stringify(reabierto.cuerpo));
    const filaReabierto = (await dueno`select status, done_at from milestone where id = ${hitoId}`) as unknown as { status: string; done_at: Date | null }[];
    check("y en la base la fecha se fue con el estado", filaReabierto[0]?.status === "pending" && filaReabierto[0]?.done_at === null);
    const hitoB = await postJson(`/api/v1/projects/${B.proyecto}/milestones`, VALORES.escribeHitos, { ...HITO, title: "Hito de B" });
    check("la clave de SLG crea un hito en B (cruza empresas, como `agent_slg`)", hitoB.status === 201, String(hitoB.status));
    check("hacer un hito de OTRA empresa con la clave acotada → 404", (await postJson(`/api/v1/milestones/${hitoB.cuerpo?.data?.id}/done`, VALORES.academyAcotada, {})).status === 404);
    check("hacer un hito inexistente → 404", (await postJson("/api/v1/milestones/hito-que-no-existe/done", VALORES.escribeHitos, {})).status === 404);
    check("hacer un hito sin `milestones:write` → 403", (await postJson(`/api/v1/milestones/${hitoId}/done`, VALORES.escribeNoticias, {})).status === 403);
    check("`done` con un cuerpo que intenta parchear campos → 422: el estado no se escribe a mano", (await postJson(`/api/v1/milestones/${hitoId}/done`, VALORES.escribeHitos, { status: "done" })).status === 422);
    check("`reopen` con un `Content-Type` que no es JSON → 415", (await postJson(`/api/v1/milestones/${hitoId}/reopen`, VALORES.escribeHitos, "x", "text/plain")).status === 415);

    console.log("\nDU-30 · Academy — pendientes: `closes_by` se decide en el servidor:\n");

    const RUTA_PENDIENTES_A = `/api/v1/projects/${A.proyecto}/action-items`;
    const PENDIENTE = { title: "Enviar el organigrama", due_at: "2026-10-01T00:00:00Z", closes_by: "client" };

    check("una clave sin `milestones:write` → 403", (await postJson(RUTA_PENDIENTES_A, VALORES.escribeAvisos, PENDIENTE)).status === 403);
    const pendiente = await postJson(RUTA_PENDIENTES_A, VALORES.escribeHitos, PENDIENTE);
    check("con `milestones:write` → 201, abierto, del cliente y sin quien lo cerró", pendiente.status === 201 && pendiente.cuerpo?.data?.status === "open" && pendiente.cuerpo?.data?.closes_by === "client" && pendiente.cuerpo?.data?.done_by === null, JSON.stringify(pendiente.cuerpo));
    const sinFecha = await postJson(RUTA_PENDIENTES_A, VALORES.escribeHitos, { title: "Sin fecha límite", closes_by: "client" });
    check("`due_at` es opcional: sin él, 201 con `due_at: null`", sinFecha.status === 201 && sinFecha.cuerpo?.data?.due_at === null);
    const cierraInventado = await postJson(RUTA_PENDIENTES_A, VALORES.escribeHitos, { ...PENDIENTE, closes_by: "hermes" });
    check(
      "`closes_by` fuera de vocabulario → 422 `not_in_vocabulary`",
      cierraInventado.status === 422 && cierraInventado.cuerpo?.error?.details?.some((d: Json) => d.field === "closes_by" && d.code === "not_in_vocabulary"),
      JSON.stringify(cierraInventado.cuerpo?.error?.details),
    );
    const sinCierra = await postJson(RUTA_PENDIENTES_A, VALORES.escribeHitos, { title: "Sin decidir quién", due_at: PENDIENTE.due_at });
    check("`closes_by` es obligatorio y sin defecto → 422 `required`", sinCierra.status === 422 && sinCierra.cuerpo?.error?.details?.some((d: Json) => d.field === "closes_by" && d.code === "required"));
    check("`due_at` que no es fecha → 422", (await postJson(RUTA_PENDIENTES_A, VALORES.escribeHitos, { ...PENDIENTE, due_at: "pronto" })).status === 422);
    check("en un proyecto de otra empresa → 404", (await postJson(`/api/v1/projects/${B.proyecto}/action-items`, VALORES.academyAcotada, PENDIENTE)).status === 404);

    const pendienteId = pendiente.cuerpo?.data?.id as string;
    const cerrado = await postJson(`/api/v1/action-items/${pendienteId}/done`, VALORES.escribeHitos, {});
    check(
      "`POST /action-items/{id}/done` → 200, `done` y con quién lo cerró, que es la clave (RF-111)",
      cerrado.status === 200 && cerrado.cuerpo?.data?.status === "done" && typeof cerrado.cuerpo?.data?.done_at === "string" &&
        cerrado.cuerpo?.data?.done_by?.actor_type === "api_key" && cerrado.cuerpo?.data?.done_by?.actor_id === "k-du30-hit",
      JSON.stringify(cerrado.cuerpo),
    );
    const filaCerrado = (await dueno`select status, done_at, done_by_id from action_item where id = ${pendienteId}`) as unknown as { status: string; done_at: Date | null; done_by_id: string | null }[];
    check("en la base: cerrado ⇔ con fecha y con actor (`action_item_done_is_complete`)", filaCerrado[0]?.status === "done" && filaCerrado[0]?.done_at !== null && filaCerrado[0]?.done_by_id === "k-du30-hit", JSON.stringify(filaCerrado[0]));
    const otraVezCerrado = await postJson(`/api/v1/action-items/${pendienteId}/done`, VALORES.escribeHitos, {});
    check(
      "repetir el cierre no cambia nada: el primer cierre es el hecho",
      otraVezCerrado.status === 200 && otraVezCerrado.cuerpo?.data?.done_at === cerrado.cuerpo?.data?.done_at,
    );
    const pendienteDeSlg = await postJson(RUTA_PENDIENTES_A, VALORES.escribeHitos, { title: "Preparar el informe", closes_by: "slg" });
    const cerradoDeSlg = await postJson(`/api/v1/action-items/${pendienteDeSlg.cuerpo?.data?.id}/done`, VALORES.escribeHitos, {});
    check(
      "una clave con `milestones:write` cierra también los de SLG: cierra cualquiera",
      pendienteDeSlg.status === 201 && cerradoDeSlg.status === 200 && cerradoDeSlg.cuerpo?.data?.status === "done",
      `${pendienteDeSlg.status}/${cerradoDeSlg.status}`,
    );
    const pendienteB = await postJson(`/api/v1/projects/${B.proyecto}/action-items`, VALORES.escribeHitos, { ...PENDIENTE, title: "Pendiente de B" });
    check("cerrar un pendiente de OTRA empresa con la clave acotada → 404", pendienteB.status === 201 && (await postJson(`/api/v1/action-items/${pendienteB.cuerpo?.data?.id}/done`, VALORES.academyAcotada, {})).status === 404);
    check("cerrar uno inexistente → 404", (await postJson("/api/v1/action-items/pendiente-que-no-existe/done", VALORES.escribeHitos, {})).status === 404);
    check("cerrar sin `milestones:write` → 403", (await postJson(`/api/v1/action-items/${pendienteId}/done`, VALORES.escribeNoticias, {})).status === 403);

    console.log("\nD-162 · el proyecto nace en el CRM; este sitio lo recibe:\n");

    /**
     * Lo que D-162 promete y solo se ve por el puerto: que el alcance es propio
     * (`orgs:read` no lo implica), que la empresa de la ruta se verifica y no
     * se cree, que **repetir el mismo `crm_project_id` devuelve 200 con el que
     * ya existe y deja UNA fila**, que nada comercial entra por el cuerpo, y que
     * cerrar y reabrir son actos con nombre e idempotentes.
     */
    const RUTA_PROYECTOS_A = `/api/v1/organizations/${A.org}/projects`;
    const PROYECTO = {
      name: "Implementación Phoenix PEEx — Cohorte 1",
      service: "Phoenix PEEx",
      crm_project_id: "crm-d162-0001",
      starts_at: "2026-10-01T00:00:00Z",
      ends_at: "2026-12-15T00:00:00Z",
    };

    const proyectoSinAlcance = await postJson(RUTA_PROYECTOS_A, VALORES.escribeNoticias, PROYECTO);
    check("una clave sin `projects:write` → 403", proyectoSinAlcance.status === 403, String(proyectoSinAlcance.status));
    check(
      "y es el MISMO 403 de siempre: no nombra el alcance que faltaba",
      proyectoSinAlcance.cuerpo?.error?.code === "insufficient_scope" &&
        proyectoSinAlcance.cuerpo?.error?.message === sinAlcance.cuerpo?.error?.message,
    );
    check(
      "`orgs:read` NO implica `projects:write`: leer empresas no es crear proyectos (RF-147)",
      (await postJson(RUTA_PROYECTOS_A, VALORES.slg, PROYECTO)).status === 403,
    );

    const proyecto = await postJson(RUTA_PROYECTOS_A, VALORES.escribeProyectos, PROYECTO);
    check("con `projects:write` → 201", proyecto.status === 201, JSON.stringify(proyecto.cuerpo?.error));
    const idProyecto = proyecto.cuerpo?.data?.id as string;
    check(
      "la respuesta lleva la empresa de la RUTA, el servicio literal y el `crm_project_id` al lado",
      proyecto.cuerpo?.data?.organization_id === A.org &&
        proyecto.cuerpo?.data?.service === "Phoenix PEEx" &&
        proyecto.cuerpo?.data?.crm_project_id === PROYECTO.crm_project_id,
      JSON.stringify(proyecto.cuerpo?.data),
    );
    check(
      "nace `active`, sin responsable —se asigna en HQ— y con fechas de calendario, sin hora",
      proyecto.cuerpo?.data?.status === "active" &&
        proyecto.cuerpo?.data?.owner === null &&
        proyecto.cuerpo?.data?.starts_at === "2026-10-01" &&
        proyecto.cuerpo?.data?.ends_at === "2026-12-15",
      JSON.stringify(proyecto.cuerpo?.data),
    );
    const filaProyecto = (await dueno`
      select organization_id, crm_project_id, owner_user_id, status from project where id = ${idProyecto ?? ""}
    `) as unknown as { organization_id: string; crm_project_id: string | null; owner_user_id: string | null; status: string }[];
    check(
      "la fila lleva `crm_project_id`, es de A y `owner_user_id` es nulo",
      filaProyecto[0]?.organization_id === A.org && filaProyecto[0]?.crm_project_id === PROYECTO.crm_project_id && filaProyecto[0]?.owner_user_id === null,
      JSON.stringify(filaProyecto[0]),
    );

    const repetido = await postJson(RUTA_PROYECTOS_A, VALORES.escribeProyectos, PROYECTO);
    check(
      "el MISMO `crm_project_id` otra vez → 200 con el existente, ni 201 ni 409: un reintento no duplica la carpeta",
      repetido.status === 200 && repetido.cuerpo?.data?.id === idProyecto,
      `${repetido.status} ${JSON.stringify(repetido.cuerpo?.data?.id)}`,
    );
    const repetidoConOtroNombre = await postJson(RUTA_PROYECTOS_A, VALORES.escribeProyectos, { ...PROYECTO, name: "Otro nombre para el mismo" });
    check(
      "y con otro nombre también 200 con el existente, sin renombrarlo: manda el que ya está",
      repetidoConOtroNombre.status === 200 && repetidoConOtroNombre.cuerpo?.data?.name === PROYECTO.name,
      JSON.stringify(repetidoConOtroNombre.cuerpo?.data?.name),
    );
    const cuantos = (await dueno`select count(*)::text as n from project where crm_project_id = ${PROYECTO.crm_project_id}`) as unknown as { n: string }[];
    check("en la base hay UN solo proyecto con ese `crm_project_id` (índice único parcial de 0019)", cuantos[0]?.n === "1", cuantos[0]?.n);

    const enOtraEmpresa = await postJson(`/api/v1/organizations/${B.org}/projects`, VALORES.escribeProyectos, PROYECTO);
    check(
      "el mismo `crm_project_id` en OTRA empresa → 422 `already_taken`: un proyecto del CRM es de una sola",
      enOtraEmpresa.status === 422 &&
        enOtraEmpresa.cuerpo?.error?.details?.some((d: Json) => d.field === "crm_project_id" && d.code === "already_taken"),
      JSON.stringify(enOtraEmpresa.cuerpo?.error),
    );

    const proyectoAjenoDelCrm = await postJson(`/api/v1/organizations/${B.org}/projects`, VALORES.proyectosAcotada, { ...PROYECTO, crm_project_id: "crm-d162-ajeno" });
    check("una clave acotada a A no crea en B → 404, nunca 403 (§2.6)", proyectoAjenoDelCrm.status === 404, String(proyectoAjenoDelCrm.status));
    const proyectoInexistente = await postJson("/api/v1/organizations/org-que-no-existe/projects", VALORES.escribeProyectos, { ...PROYECTO, crm_project_id: "crm-d162-nadie" });
    check(
      "y el 404 de lo ajeno es IDÉNTICO al de lo inexistente",
      proyectoInexistente.status === 404 &&
        JSON.stringify({ ...proyectoAjenoDelCrm.cuerpo?.error, request_id: "" }) === JSON.stringify({ ...proyectoInexistente.cuerpo?.error, request_id: "" }),
      `${JSON.stringify(proyectoAjenoDelCrm.cuerpo?.error)} vs ${JSON.stringify(proyectoInexistente.cuerpo?.error)}`,
    );
    check(
      "ni lo ajeno ni lo inexistente dejaron fila: el 404 se decide antes de escribir",
      ((await dueno`select count(*)::text as n from project where crm_project_id in ('crm-d162-ajeno', 'crm-d162-nadie')`) as unknown as { n: string }[])[0]?.n === "0",
    );
    const enSuCasaProyecto = await postJson(RUTA_PROYECTOS_A, VALORES.proyectosAcotada, {
      ...PROYECTO,
      name: "Desde la acotada",
      crm_project_id: "crm-d162-0002",
      status: "paused",
    });
    check(
      "la misma clave acotada SÍ crea en la suya → 201, y respeta el `status` enviado",
      enSuCasaProyecto.status === 201 && enSuCasaProyecto.cuerpo?.data?.status === "paused",
      JSON.stringify(enSuCasaProyecto.cuerpo?.data ?? enSuCasaProyecto.cuerpo?.error),
    );

    const servicioInventado = await postJson(RUTA_PROYECTOS_A, VALORES.escribeProyectos, { ...PROYECTO, crm_project_id: "crm-d162-0003", service: "SLG Readiness" });
    check(
      "`service` fuera de los once literales —sin guion bajo— → 422 `not_in_vocabulary` en `service` (RF-14)",
      servicioInventado.status === 422 &&
        servicioInventado.cuerpo?.error?.details?.some((d: Json) => d.field === "service" && d.code === "not_in_vocabulary"),
      JSON.stringify(servicioInventado.cuerpo?.error?.details),
    );
    const crmVacio = await postJson(RUTA_PROYECTOS_A, VALORES.escribeProyectos, { ...PROYECTO, crm_project_id: "" });
    check(
      "`crm_project_id` vacío → 422 `required`: si el CRM manda, dice cuál es",
      crmVacio.status === 422 && crmVacio.cuerpo?.error?.details?.some((d: Json) => d.field === "crm_project_id" && d.code === "required"),
      JSON.stringify(crmVacio.cuerpo?.error?.details),
    );
    const { crm_project_id: _sinCrm, ...PROYECTO_SIN_CRM } = PROYECTO;
    void _sinCrm;
    const crmAusente = await postJson(RUTA_PROYECTOS_A, VALORES.escribeProyectos, PROYECTO_SIN_CRM);
    check("y ausente, también 422 `required`", crmAusente.status === 422 && crmAusente.cuerpo?.error?.details?.some((d: Json) => d.field === "crm_project_id" && d.code === "required"));
    const nombreEnBlanco = await postJson(RUTA_PROYECTOS_A, VALORES.escribeProyectos, { ...PROYECTO, crm_project_id: "crm-d162-0003", name: "   " });
    check("`name` de solo espacios → 422 en `name`", nombreEnBlanco.status === 422 && nombreEnBlanco.cuerpo?.error?.details?.some((d: Json) => d.field === "name"), JSON.stringify(nombreEnBlanco.cuerpo?.error?.details));
    const fechasAlReves = await postJson(RUTA_PROYECTOS_A, VALORES.escribeProyectos, { ...PROYECTO, crm_project_id: "crm-d162-0003", starts_at: "2026-12-15T00:00:00Z", ends_at: "2026-10-01T00:00:00Z" });
    check(
      "`ends_at` anterior a `starts_at` → 422 `before_starts_at`",
      fechasAlReves.status === 422 && fechasAlReves.cuerpo?.error?.details?.some((d: Json) => d.field === "ends_at" && d.code === "before_starts_at"),
      JSON.stringify(fechasAlReves.cuerpo?.error?.details),
    );
    check("`starts_at` ilegible → 422", (await postJson(RUTA_PROYECTOS_A, VALORES.escribeProyectos, { ...PROYECTO, crm_project_id: "crm-d162-0003", starts_at: "el mes que viene" })).status === 422);
    check("`status` fuera de vocabulario → 422", (await postJson(RUTA_PROYECTOS_A, VALORES.escribeProyectos, { ...PROYECTO, crm_project_id: "crm-d162-0003", status: "won" })).status === 422);
    const conCampoComercial = await postJson(RUTA_PROYECTOS_A, VALORES.escribeProyectos, { ...PROYECTO, crm_project_id: "crm-d162-0003", stage: "negotiation" });
    check(
      "un campo comercial de más → 422 `unknown_parameter`: la frontera (a) tampoco entra por el cuerpo",
      conCampoComercial.status === 422 && conCampoComercial.cuerpo?.error?.details?.some((d: Json) => d.code === "unknown_parameter"),
      JSON.stringify(conCampoComercial.cuerpo?.error?.details),
    );
    check(
      "ninguno de los rechazos dejó fila con ese `crm_project_id`",
      ((await dueno`select count(*)::text as n from project where crm_project_id = 'crm-d162-0003'`) as unknown as { n: string }[])[0]?.n === "0",
    );
    const sinFechas = await postJson(RUTA_PROYECTOS_A, VALORES.escribeProyectos, { name: "Sin fechas", service: "CoO as a Service", crm_project_id: "crm-d162-0004" });
    check(
      "las fechas son opcionales: sin ellas, 201 con `starts_at` y `ends_at` nulos y `status: active` por defecto",
      sinFechas.status === 201 && sinFechas.cuerpo?.data?.starts_at === null && sinFechas.cuerpo?.data?.ends_at === null && sinFechas.cuerpo?.data?.status === "active",
      JSON.stringify(sinFechas.cuerpo?.data ?? sinFechas.cuerpo?.error),
    );

    const listado = await P(`${RUTA_PROYECTOS_A}?limit=50`, VALORES.slg);
    check(
      "el proyecto creado aparece en `GET .../projects` con su `crm_project_id`",
      listado.status === 200 && listado.cuerpo?.data?.some((p: Json) => p.id === idProyecto && p.crm_project_id === PROYECTO.crm_project_id),
      JSON.stringify(listado.cuerpo?.data?.map((p: Json) => [p.id, p.crm_project_id])),
    );
    check(
      "y el sembrado a mano se lista con `crm_project_id: null`: los anteriores a D-162 no lo tienen",
      listado.cuerpo?.data?.some((p: Json) => p.id === A.proyecto && p.crm_project_id === null),
    );

    const proyectoCerrado = await postJson(`/api/v1/projects/${idProyecto}/close`, VALORES.escribeProyectos, {});
    check("`POST /projects/{id}/close` → 200 con `status: closed`", proyectoCerrado.status === 200 && proyectoCerrado.cuerpo?.data?.status === "closed", JSON.stringify(proyectoCerrado.cuerpo));
    const filaCerrada = (await dueno`select status from project where id = ${idProyecto ?? ""}`) as unknown as { status: string }[];
    check("en la base: `status = closed`", filaCerrada[0]?.status === "closed", JSON.stringify(filaCerrada[0]));
    const otraVezCerradoProyecto = await postJson(`/api/v1/projects/${idProyecto}/close`, VALORES.escribeProyectos, {});
    check("cerrarlo otra vez → 200, idempotente", otraVezCerradoProyecto.status === 200 && otraVezCerradoProyecto.cuerpo?.data?.status === "closed");
    check(
      "`GET .../projects?status=closed` lo devuelve: el filtro lee el estado que puso `/close`",
      (await P(`${RUTA_PROYECTOS_A}?status=closed`, VALORES.slg)).cuerpo?.data?.some((p: Json) => p.id === idProyecto),
    );
    const proyectoReabierto = await postJson(`/api/v1/projects/${idProyecto}/reopen`, VALORES.escribeProyectos, {});
    check("`POST /projects/{id}/reopen` → 200, vuelve a `active`", proyectoReabierto.status === 200 && proyectoReabierto.cuerpo?.data?.status === "active", JSON.stringify(proyectoReabierto.cuerpo));
    check("reabrir uno ya activo → 200, idempotente", (await postJson(`/api/v1/projects/${idProyecto}/reopen`, VALORES.escribeProyectos, {})).status === 200);
    check("cerrar un proyecto de OTRA empresa con la clave acotada → 404", (await postJson(`/api/v1/projects/${B.proyecto}/close`, VALORES.proyectosAcotada, {})).status === 404);
    check("cerrar uno inexistente → 404", (await postJson("/api/v1/projects/p-que-no-existe/close", VALORES.escribeProyectos, {})).status === 404);
    check("cerrar sin `projects:write` → 403", (await postJson(`/api/v1/projects/${idProyecto}/close`, VALORES.escribeHitos, {})).status === 403);
    check("`close` con un cuerpo que intenta parchear campos → 422: el estado no se escribe a mano", (await postJson(`/api/v1/projects/${idProyecto}/close`, VALORES.escribeProyectos, { status: "closed" })).status === 422);
    check("`reopen` con un `Content-Type` que no es JSON → 415", (await postJson(`/api/v1/projects/${idProyecto}/reopen`, VALORES.escribeProyectos, "x", "text/plain")).status === 415);
    check(
      "el proyecto de B sigue `active`: el 404 de la acotada no escribió",
      ((await dueno`select status from project where id = ${B.proyecto}`) as unknown as { status: string }[])[0]?.status === "active",
    );

    console.log("\nDU-30 · Academy — la puerta `lib/academy` con PERSONAS (B.3 por rol; criterio 1 de DU-27):\n");

    /**
     * La API es un cliente más de `lib/academy`; HQ y el portal son los otros
     * dos, y entran con personas. Lo que la API no puede demostrar —que un
     * `client_member` cierra sus pendientes y no los de SLG, y que el intento
     * se audita— se demuestra aquí, llamando a la puerta con un contexto de
     * sesión. Un contexto de cliente no necesita fila en `user`: la política de
     * fila lee `app.organization_id` y `app.actor_role`, y `audit_log` no lleva
     * clave foránea al actor.
     */
    const academy = await import("../../lib/academy/index.ts");
    const { ErrorDeAutorizacion } = await import("../../lib/auth/matriz.ts");
    const cliente = contextoDeSesion({ userId: "u-du30-cli", userName: "Cliente de A", role: "client_member", organizationId: A.org });
    const clienteDeB = contextoDeSesion({ userId: "u-du30-b", userName: "Cliente de B", role: "client_member", organizationId: B.org });
    const INICIO_PUERTA = new Date();
    const rechazoDe = async (fn: () => Promise<unknown>): Promise<unknown> => {
      try {
        await fn();
        return null;
      } catch (e) {
        return e;
      }
    };
    const denegadas = async (actorId: string, accion: string): Promise<number> =>
      Number(
        (
          (await dueno`select count(*)::text as n from audit_log
                        where actor_id = ${actorId} and action = ${`${accion}.denied`} and created_at >= ${INICIO_PUERTA}`) as unknown as { n: string }[]
        )[0]?.n ?? -1,
      );

    const paraElCliente = await postJson(RUTA_PENDIENTES_A, VALORES.escribeHitos, { title: "Confirmar la fecha de la Sesión 2", closes_by: "client" });
    const deSlgAbierto = await postJson(RUTA_PENDIENTES_A, VALORES.escribeHitos, { title: "Revisar el borrador", closes_by: "slg" });
    check("fixtures: un pendiente del cliente y uno de SLG, abiertos", paraElCliente.status === 201 && deSlgAbierto.status === 201);

    const cerradoPorCliente = await academy.cerrarPendiente(cliente, paraElCliente.cuerpo?.data?.id);
    check(
      "un `client_member` cierra un pendiente `closes_by = client`, y queda quién fue (persona, no clave)",
      cerradoPorCliente?.estado === "done" && cerradoPorCliente.hechoPorTipo === "user" && cerradoPorCliente.hechoPorId === "u-du30-cli",
      JSON.stringify(cerradoPorCliente),
    );
    const rechazoCierre = await rechazoDe(() => academy.cerrarPendiente(cliente, deSlgAbierto.cuerpo?.data?.id));
    check(
      "pero NO uno de SLG: el servidor lo rechaza con 403 aunque la pantalla no enseñe el botón",
      rechazoCierre instanceof ErrorDeAutorizacion && rechazoCierre.status === 403,
      String(rechazoCierre),
    );
    check("y el intento queda auditado como `action_item.close.denied` con su actor", (await denegadas("u-du30-cli", "action_item.close")) === 1);
    const sigueAbierto = (await dueno`select status from action_item where id = ${deSlgAbierto.cuerpo?.data?.id}`) as unknown as { status: string }[];
    check("y el pendiente de SLG sigue abierto", sigueAbierto[0]?.status === "open");
    const rechazoReabrir = await rechazoDe(() => academy.reabrirPendiente(cliente, paraElCliente.cuerpo?.data?.id));
    check("un cliente tampoco reabre: reabrir es escribir → 403", rechazoReabrir instanceof ErrorDeAutorizacion && rechazoReabrir.status === 403);
    const rechazoHito = await rechazoDe(() => academy.crearHito(cliente, { projectId: A.proyecto, titulo: "Un hito del cliente", venceEn: "2026-11-01T00:00:00Z" }));
    check("ni crea hitos (`milestone.write` es de SLG) → 403, y auditado", rechazoHito instanceof ErrorDeAutorizacion && (await denegadas("u-du30-cli", "milestone.create")) === 1);
    const rechazoNoticia = await rechazoDe(() =>
      academy.crearNoticia(cliente, {
        organizationId: A.org,
        titulo: "Del cliente",
        resumenMd: "x",
        comentarioMd: "y",
        importancia: 2,
        publicar: true,
      }),
    );
    check("ni escribe noticias → 403, y auditado como `news.create.denied`", rechazoNoticia instanceof ErrorDeAutorizacion && (await denegadas("u-du30-cli", "news.create")) === 1);

    const hitoDeAdmin = await academy.crearHito(admin, { projectId: A.proyecto, titulo: "Hito desde HQ", venceEn: "2026-12-01T00:00:00Z", posicion: 9 });
    const apunteDeAdmin = (await dueno`
      select organization_id from audit_log
       where actor_id = ${A.dueno} and action = 'milestone.create' and entity_id = ${hitoDeAdmin.id} and created_at >= ${INICIO_PUERTA}
    `) as unknown as { organization_id: string }[];
    check(
      "`slg_admin` crea un hito por la puerta y queda en `audit_log` con su actor y su empresa (RF-156)",
      hitoDeAdmin.organizationId === A.org && apunteDeAdmin.length === 1 && apunteDeAdmin[0]!.organization_id === A.org,
      JSON.stringify(apunteDeAdmin),
    );
    const hechoDesdeHq = await academy.actualizarHito(admin, hitoDeAdmin.id, { estado: "done" });
    check("y lo marca hecho: `hechoEn` aparece con el estado", hechoDesdeHq?.estado === "done" && typeof hechoDesdeHq.hechoEn === "string");
    const inexistenteDesdeHq = await academy.actualizarHito(admin, "hito-que-no-existe", { estado: "done" });
    check("editar un hito que no existe devuelve `null`, no lanza: quien llama decide", inexistenteDesdeHq === null);

    const lista = await academy.noticias(admin, { organizationId: A.org, soloPublicadas: true });
    const ordenEsperado = [noticiaDespues.cuerpo?.data?.id, noticia.cuerpo?.data?.id, enSuCasa.cuerpo?.data?.id];
    check(
      "`noticias()` ordena por importancia y, a igual importancia, la más reciente primero (RF-149)",
      lista.map((n) => n.id).join() === ordenEsperado.join(),
      `${lista.map((n) => `${n.importancia}:${n.titulo}`).join(" | ")}`,
    );
    check("y `soloPublicadas` deja fuera el borrador", !lista.some((n) => n.id === borrador.cuerpo?.data?.id));
    check("sin `soloPublicadas`, HQ ve también el borrador", (await academy.noticias(admin, { organizationId: A.org })).some((n) => n.id === borrador.cuerpo?.data?.id));
    check("`limite` acota la lista", (await academy.noticias(admin, { organizationId: A.org, limite: 1 })).length === 1);
    const desdeB = await academy.noticias(clienteDeB);
    check("un cliente de B no ve ni una noticia de A: la política de fila, no un WHERE (RF-150)", !desdeB.some((n) => n.organizationId === A.org));

    const proximos = await academy.proximosHitos(admin, A.org);
    const fechas = proximos.map((h) => h.venceEn);
    check(
      "`proximosHitos()` devuelve solo pendientes de A, por fecha, y sin el que HQ acaba de hacer",
      proximos.length >= 1 &&
        proximos.every((h) => h.estado === "pending" && h.organizationId === A.org) &&
        !proximos.some((h) => h.id === hitoDeAdmin.id) &&
        [...fechas].sort().join() === fechas.join(),
      JSON.stringify(proximos.map((h) => [h.titulo, h.estado, h.venceEn])),
    );
    const abiertos = await academy.pendientesAbiertos(admin, A.org);
    check(
      "`pendientesAbiertos()` trae el de SLG que sigue abierto y no el que la clave cerró",
      abiertos.every((p) => p.estado === "open") && abiertos.some((p) => p.id === deSlgAbierto.cuerpo?.data?.id) && !abiertos.some((p) => p.id === pendienteId),
    );
    const hitosDelCliente = await academy.hitosDeProyecto(cliente, A.proyecto);
    check("un `client_member` lee los hitos de su proyecto (`milestone.read` es de todos)", hitosDelCliente.length >= 2 && hitosDelCliente.some((h) => h.id === hitoId));
    check("y del proyecto de otra empresa, cero", (await academy.hitosDeProyecto(cliente, B.proyecto)).length === 0);
    check("los pendientes de su proyecto, también", (await academy.pendientesDeProyecto(cliente, A.proyecto)).some((p) => p.id === pendienteId));

    console.log("\nDU-23 · la especificación se genera del catálogo (criterio 5):\n");

    const sinClaveSpec = await P("/api/v1/openapi.json");
    check("sin clave → 401", sinClaveSpec.status === 401, String(sinClaveSpec.status));
    const spec = await P("/api/v1/openapi.json", VALORES.eventos);
    check("con CUALQUIER clave válida → 200, sea cual sea su alcance (RF-106)", spec.status === 200, String(spec.status));
    check("es OpenAPI 3.1", String(spec.cuerpo?.openapi).startsWith("3.1"));
    const NUEVE = [
      "/api/v1/captures",
      "/api/v1/organizations",
      "/api/v1/organizations/{id}/projects",
      "/api/v1/deliverables",
      "/api/v1/deliverables/{id}/publish",
      "/api/v1/projects/{id}/deliverables",
      "/api/v1/announcements",
      "/api/v1/events",
      "/api/v1/openapi.json",
    ];
    const SEIS_ACADEMY = [
      "/api/v1/organizations/{id}/news",
      "/api/v1/projects/{id}/milestones",
      "/api/v1/milestones/{id}/done",
      "/api/v1/milestones/{id}/reopen",
      "/api/v1/projects/{id}/action-items",
      "/api/v1/action-items/{id}/done",
    ];
    // D-162: `POST /organizations/{id}/projects` comparte ruta con el `GET`, así
    // que dieciocho operaciones son diecisiete rutas en `paths`.
    const TRES_DEL_CRM = ["/api/v1/organizations/{id}/projects", "/api/v1/projects/{id}/close", "/api/v1/projects/{id}/reopen"];
    check(
      "describe LAS DIECIOCHO operaciones —nueve de DU-22/23, seis de la Academy y tres de D-162— en diecisiete rutas, ni una más",
      [...NUEVE, ...SEIS_ACADEMY, ...TRES_DEL_CRM].every((r) => r in (spec.cuerpo?.paths ?? {})) && Object.keys(spec.cuerpo.paths).length === 17,
      Object.keys(spec.cuerpo?.paths ?? {}).join(" "),
    );
    const proyectosEnLaSpec = spec.cuerpo.paths["/api/v1/organizations/{id}/projects"];
    check(
      "la misma ruta lleva `orgs:read` en el GET y `projects:write` en el POST, leídos de B.3 (D-162)",
      proyectosEnLaSpec?.get?.["x-alcance-exigido"] === "orgs:read" &&
        proyectosEnLaSpec?.post?.["x-alcance-exigido"] === "projects:write" &&
        TRES_DEL_CRM.slice(1).every((r) => spec.cuerpo.paths[r]?.post?.["x-alcance-exigido"] === "projects:write"),
      JSON.stringify([proyectosEnLaSpec?.get?.["x-alcance-exigido"], proyectosEnLaSpec?.post?.["x-alcance-exigido"]]),
    );
    const esquemaProyecto = proyectosEnLaSpec?.post?.requestBody?.content?.["application/json"]?.schema;
    check(
      "la especificación anuncia `service` como enumerado de once literales y `crm_project_id` obligatorio",
      esquemaProyecto?.properties?.service?.enum?.length === 11 &&
        esquemaProyecto?.properties?.service?.enum?.includes("SLG_Readiness") &&
        esquemaProyecto?.required?.includes("crm_project_id") &&
        esquemaProyecto?.required?.includes("service"),
      JSON.stringify(esquemaProyecto?.properties?.service),
    );
    const alcancesAcademy = SEIS_ACADEMY.map((r) => spec.cuerpo.paths[r]?.post?.["x-alcance-exigido"]);
    check(
      "las seis de la Academy llevan `news:write` o `milestones:write`, leídos de B.3 (criterio 4 de DU-30)",
      alcancesAcademy[0] === "news:write" && alcancesAcademy.slice(1).every((a) => a === "milestones:write"),
      JSON.stringify(alcancesAcademy),
    );
    const esquemaNoticia = spec.cuerpo.paths["/api/v1/organizations/{id}/news"]?.post?.requestBody?.content?.["application/json"]?.schema;
    check(
      "la especificación anuncia `importance` 1…3 y `publish` obligatorio",
      esquemaNoticia?.properties?.importance?.minimum === 1 &&
        esquemaNoticia?.properties?.importance?.maximum === 3 &&
        esquemaNoticia?.required?.includes("publish"),
      JSON.stringify(esquemaNoticia?.properties?.importance),
    );
    check(
      "y pedir uno por encima del máximo anunciado → 422, como la especificación declara",
      (await postJson(RUTA_NOTICIAS_A, VALORES.escribeNoticias, { ...NOTICIA, importance: esquemaNoticia.properties.importance.maximum + 1 })).status === 422,
    );
    const esquemaPendiente = spec.cuerpo.paths["/api/v1/projects/{id}/action-items"]?.post?.requestBody?.content?.["application/json"]?.schema;
    check(
      "`closes_by` se describe como enumerado cerrado `client | slg`, obligatorio",
      JSON.stringify(esquemaPendiente?.properties?.closes_by?.enum) === JSON.stringify(["client", "slg"]) && esquemaPendiente?.required?.includes("closes_by"),
      JSON.stringify(esquemaPendiente?.properties?.closes_by),
    );
    const alcances = NUEVE.map((r) => {
      const nodo = spec.cuerpo.paths[r];
      const op = nodo.get ?? nodo.post;
      return op["x-alcance-exigido"];
    });
    check(
      "cada una lleva su alcance, y `openapi.json` ninguno",
      alcances.includes("captures:read") &&
        alcances.includes("orgs:read") &&
        alcances.includes("deliverables:write") &&
        alcances.includes("announcements:write") &&
        alcances.includes("events:write") &&
        alcances.filter((a) => a === null).length === 1,
      JSON.stringify(alcances),
    );
    check(
      "y todos los códigos de §2.5 aparecen en alguna respuesta",
      [401, 403, 429, 422, 404, 409, 413, 415, 400, 500, 503].every((c) =>
        JSON.stringify(spec.cuerpo.paths).includes(`"${c}"`),
      ),
    );
    /**
     * **La prueba de que no hay dos descripciones.** El catálogo declara el
     * máximo de `limit` en 200; si la especificación lo dijera de otro sitio,
     * este número podría discrepar. Se comprueba contra el comportamiento real:
     * lo que la especificación promete es lo que el servidor hace.
     */
    const limiteSpec = spec.cuerpo.paths["/api/v1/captures"].get.parameters.find((p: Json) => p.name === "limit");
    check("el máximo de `limit` que anuncia la especificación es el que valida el servidor", limiteSpec.schema.maximum === 200);
    check(
      "y pedir uno por encima devuelve 422, como la especificación declara",
      (await P(`/api/v1/captures?limit=${limiteSpec.schema.maximum + 1}`, VALORES.capturas)).status === 422,
    );
    check("la especificación tampoco es cacheable", spec.cabeceras.get("cache-control") === "no-store");

    console.log("\nLa política de la migración 0015, a nivel de base (R-26):\n");

    /**
     * **La marca `agent_slg` amplía quién cruza empresas, así que se prueba
     * donde se decide: en la política, no a través de HTTP.** Lo de arriba
     * demuestra el comportamiento de la API; esto demuestra que la política no
     * deja cruzar a nadie más — y que un `agent` acotado sigue sin poder,
     * aunque el código de la aplicación se equivocara.
     */
    const comoApp = postgres(process.env.DATABASE_URL!, { max: 1 });
    const cuantosVeCon = async (rol: string, org: string): Promise<number> => {
      const [fila] = (await comoApp.begin(async (tx) => {
        await tx`select set_config('app.organization_id', ${org}, true)`;
        await tx`select set_config('app.actor_role', ${rol}, true)`;
        return tx`select count(*)::text as n from project where organization_id = ${B.org}`;
      })) as unknown as { n: string }[];
      return Number(fila?.n ?? -1);
    };
    check("un `agent` acotado a A NO ve los proyectos de B", (await cuantosVeCon("agent", A.org)) === 0);
    check("`system` tampoco: `withSystemScope` no abre las tablas con empresa", (await cuantosVeCon("system", A.org)) === 0);
    check("y sin rol, cero", (await cuantosVeCon("", A.org)) === 0);
    check("`agent_slg` sí: es el actor que la clave de SLG usa", (await cuantosVeCon("agent_slg", A.org)) === 1);
    check("`slg_operator` sigue cruzando, como antes", (await cuantosVeCon("slg_operator", A.org)) === 1);
    check("y `client_admin` de A no cruza", (await cuantosVeCon("client_admin", A.org)) === 0);
    await comoApp.end({ timeout: 5 });

    console.log("\nCriterio 6 — TODA llamada queda auditada, también las rechazadas:\n");

    const apuntes = (await dueno`
      select action, actor_type, actor_id, actor_label, entity, ip, metadata
        from audit_log
       where actor_id in ('k-du22-slg','k-du22-cap','k-du22-emp','k-du22-lim','k-du22-ent','k-du22-eve',
                          'k-du22-rev','k-du22-cad','k-du23-ent','k-du23-avi','k-du23-eve','k-du23-aco','k-rev-cap',
                          'k-du30-new','k-du30-hit','k-du30-aco','k-d162-prj','k-d162-aco','unknown')
         and created_at >= ${INICIO}
       order by created_at desc limit 600
    `) as unknown as { action: string; actor_type: string; actor_id: string; actor_label: string | null; entity: string; ip: string | null; metadata: Json }[];

    check("hay apuntes de esta corrida", apuntes.length > 0, String(apuntes.length));
    check(
      "el 401 se audita como `system` con actor `unknown`: la fila no inventa una clave",
      apuntes.some((a) => a.actor_id === "unknown" && a.actor_type === "system" && a.metadata?.status === 401),
    );
    check(
      "el 403 se audita CON la clave que lo intentó",
      apuntes.some((a) => a.actor_type === "api_key" && a.metadata?.status === 403 && a.actor_label?.startsWith("Clave ")),
    );
    check("el 429 también", apuntes.some((a) => a.metadata?.status === 429));
    check("y las llamadas que salen bien", apuntes.some((a) => a.metadata?.status === 200 && a.action === "organization.list"));
    /**
     * **Una fila por LLAMADA, no dos por acto** (D-140). Esta prueba hace
     * exactamente ocho `POST /deliverables` —una que sale bien y siete que se
     * rechazan— y las ocho tienen que estar, una vez cada una: las rechazadas
     * porque toda llamada se audita, y la buena porque no se audita dos veces.
     */
    const CREACIONES_INTENTADAS = 8;
    const creaciones = apuntes.filter((a) => a.action === "deliverable.create").length;
    check(
      `las ${CREACIONES_INTENTADAS} llamadas de creación dejan ${CREACIONES_INTENTADAS} filas, ni una más`,
      creaciones === CREACIONES_INTENTADAS,
      `deliverable.create: ${creaciones}`,
    );
    check(
      "el apunte lleva acción, entidad y ruta",
      apuntes.every((a) => typeof a.action === "string" && typeof a.entity === "string" && typeof a.metadata?.path === "string"),
    );
    check(
      "el `request_id` de una respuesta ES una fila de auditoría",
      (
        (await dueno`select count(*)::text as n from audit_log where id = ${sinAlcance.cuerpo.error.request_id}`) as unknown as { n: string }[]
      )[0]?.n === "1",
      sinAlcance.cuerpo.error.request_id,
    );
    /**
     * Lo que aquí importa es que **el valor de la clave** no viaje al registro:
     * la palabra «Authorization» sí aparece —el motivo interno de un 401 dice
     * «sin cabecera Authorization: Bearer», que es la descripción de lo que
     * faltaba, no un secreto—. Se comprueba lo que de verdad sería una fuga:
     * cualquiera de las ocho claves en claro, o un `Bearer <algo>` copiado.
     */
    const metadatos = JSON.stringify(apuntes.map((a) => a.metadata));
    check(
      "el metadata NO lleva el valor de ninguna clave",
      !Object.values(VALORES).some((v) => metadatos.includes(v)) && !/bearer\s+\S/i.test(metadatos),
      metadatos.slice(0, 200),
    );
    check(
      "el 401 de una clave REVOCADA sí sabe cuál era, y eso vive solo en el registro",
      apuntes.some((a) => a.metadata?.status === 401 && /k-du22-rev/.test(a.metadata?.reason ?? "")) &&
        !JSON.stringify(revocada.cuerpo).includes("k-du22-rev"),
    );

    console.log("\nDU-30 · toda llamada de la Academy queda auditada, una fila por llamada (criterio 5, D-140):\n");

    const deLaAcademy = apuntes.filter((a) => a.actor_id.startsWith("k-du30-"));
    const noticiasCreadas = [noticia, borrador, enSuCasa, noticiaDespues].filter((r) => r.status === 201).length;
    check(
      `las ${noticiasCreadas} noticias creadas dejan ${noticiasCreadas} filas \`news.create\` con 201, ni una más`,
      deLaAcademy.filter((a) => a.action === "news.create" && a.metadata?.status === 201).length === noticiasCreadas,
      String(deLaAcademy.filter((a) => a.action === "news.create" && a.metadata?.status === 201).length),
    );
    check(
      "y las rechazadas también: hay `news.create` con 403, 404 y 422",
      [403, 404, 422].every((s) => apuntes.some((a) => a.action === "news.create" && a.metadata?.status === s)),
    );
    check(
      "`milestone.update` apunta `/done` y `/reopen`, cada uno con su ruta",
      deLaAcademy.some((a) => a.action === "milestone.update" && /\/done$/.test(a.metadata?.path ?? "")) &&
        deLaAcademy.some((a) => a.action === "milestone.update" && /\/reopen$/.test(a.metadata?.path ?? "")),
    );
    check(
      "`action_item.close` apunta los cierres con la entidad y la empresa",
      deLaAcademy.some((a) => a.action === "action_item.close" && a.entity === "action_item" && a.metadata?.status === 200),
    );
    check(
      "una fila por LLAMADA para las claves de la Academy: ninguna sin ruta (D-140)",
      deLaAcademy.length > 20 && deLaAcademy.every((a) => typeof a.metadata?.path === "string"),
      `${deLaAcademy.length} apuntes; sin ruta: ${deLaAcademy.filter((a) => typeof a.metadata?.path !== "string").length}`,
    );
    check(
      "el `request_id` del 404 de una empresa ajena ES una fila de auditoría (criterio 5 de DU-30)",
      (
        (await dueno`select count(*)::text as n from audit_log where id = ${noticiaAjena.cuerpo?.error?.request_id ?? ""}`) as unknown as { n: string }[]
      )[0]?.n === "1",
      noticiaAjena.cuerpo?.error?.request_id,
    );
    check(
      "y el de un 422 de validación, también",
      (
        (await dueno`select count(*)::text as n from audit_log where id = ${importanciaFuera.cuerpo?.error?.request_id ?? ""}`) as unknown as { n: string }[]
      )[0]?.n === "1",
    );

    console.log("\nD-162 · la carpeta del cliente queda auditada, también el 200 del reintento:\n");

    const delCrm = apuntes.filter((a) => a.actor_id.startsWith("k-d162-"));
    check(
      "`project.create` apunta el 201, el 200 del reintento y los rechazos 404 y 422, una fila por llamada",
      [201, 200, 404, 422].every((s) => delCrm.some((a) => a.action === "project.create" && a.metadata?.status === s)) &&
        delCrm.every((a) => typeof a.metadata?.path === "string"),
      JSON.stringify(delCrm.filter((a) => a.action === "project.create").map((a) => a.metadata?.status)),
    );
    check(
      "el 403 sin `projects:write` también es una fila `project.create`",
      apuntes.some((a) => a.action === "project.create" && a.metadata?.status === 403),
    );
    check(
      "`project.update` apunta `/close` y `/reopen`, cada uno con su ruta y con 200",
      delCrm.some((a) => a.action === "project.update" && /\/close$/.test(a.metadata?.path ?? "") && a.metadata?.status === 200) &&
        delCrm.some((a) => a.action === "project.update" && /\/reopen$/.test(a.metadata?.path ?? "") && a.metadata?.status === 200),
    );
  } finally {
    servidor.parar();
    await almacenamiento.parar();
    await limpiar();
    await dueno.end({ timeout: 5 });
  }

  if (fallos > 0) {
    console.error(`\n✗ api: ${fallos} de ${comprobaciones} comprobaciones fallaron.\n`);
    process.exit(1);
  }
  console.log(`\n✓ api: ${comprobaciones} comprobaciones contra el servidor real, sin fallos.`);
  process.exit(0);
}

await main();
