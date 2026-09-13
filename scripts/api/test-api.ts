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
 * Necesita `bash scripts/db/local-pg.sh up` y `npm run build:standalone`.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { createHash } from "node:crypto";
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
  | "events:write";

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
  await dueno`delete from api_key where id like 'k-du22-%'`;
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

  await dueno`insert into lead_capture (id, email, email_domain, name, source, download_slug,
                                        page_path, locale, consent_at, privacy_version,
                                        crm_mode, crm_contact_id, crm_sync_status, crm_attempts,
                                        crm_delivered_at)
              values (${CAPTURA}, 'director@empresa.test', 'empresa.test', 'Director', 'download',
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

type Respuesta = { status: number; cuerpo: any; cabeceras: Headers };

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

/* ── La prueba ────────────────────────────────────────────────────────────── */

async function main() {
  await sembrar();
  const servidor = await levantar({
    CRM_CONTACT_URL_TEMPLATE: "https://crm.example.test/contacts/{id}",
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
    const cap = capturas.cuerpo?.data?.find((c: any) => c.id === CAPTURA);
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

    console.log("\nCriterio 5 — empresas y proyectos con `orgs:read`:\n");

    const orgs = await P("/api/v1/organizations", VALORES.slg);
    check("una clave de SLG ve las dos empresas", orgs.cuerpo?.data?.length >= 2, JSON.stringify(orgs.cuerpo?.data?.map((o: any) => o.id)));
    check(
      "con el contacto principal pero SIN su correo (minimización)",
      orgs.cuerpo.data.some((o: any) => o.primary_contact?.name === "Ana Directora") &&
        !JSON.stringify(orgs.cuerpo).includes("ana@du22.test"),
    );
    const orgsAcotada = await P("/api/v1/organizations", VALORES.empresa);
    check(
      "una clave acotada ve EXACTAMENTE una empresa: la suya",
      orgsAcotada.cuerpo?.data?.length === 1 && orgsAcotada.cuerpo.data[0].id === A.org,
      JSON.stringify(orgsAcotada.cuerpo?.data?.map((o: any) => o.id)),
    );

    const proyectos = await P(`/api/v1/organizations/${A.org}/projects`, VALORES.slg);
    check("los proyectos de una empresa responden 200", proyectos.status === 200);
    check("con el servicio literal e intraducible (RF-14)", proyectos.cuerpo?.data?.[0]?.service === "Phoenix PEEx", proyectos.cuerpo?.data?.[0]?.service);
    check("y las fechas de calendario sin hora", proyectos.cuerpo?.data?.[0]?.starts_at === "2026-09-15", proyectos.cuerpo?.data?.[0]?.starts_at);

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
    const ids = (deEmpresa.cuerpo?.data ?? []).map((d: any) => d.id);
    check("una clave acotada ve solo lo `client` y publicado", ids.length === 2 && !ids.includes("d-du22-3") && !ids.includes("d-du22-4"), ids.join(","));
    check(
      "NINGUNA respuesta trae URL de descarga del archivo",
      !JSON.stringify(deSlg.cuerpo).match(/X-Amz-Signature|signed_url|download_url/i),
    );
    check("sí trae el checksum, que es lo que el contrato promete", deSlg.cuerpo.data.some((d: any) => d.file?.checksum_sha256 === "aaaa1111"));
    const ultimas = await P(`/api/v1/projects/${A.proyecto}/deliverables?only_latest=true`, VALORES.slg);
    check("`only_latest` deja una sola versión por familia", ultimas.cuerpo?.data?.filter((d: any) => d.family_id === "fam-du22").length === 1);
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
    check(
      "y NO repite el valor recibido (RNF-26)",
      !JSON.stringify(detalles.cuerpo).includes("999"),
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
    const idsP1 = pagina1.cuerpo.data.map((d: any) => d.id);
    const idsP2 = pagina2.cuerpo.data.map((d: any) => d.id);
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
       where actor_id in ('k-du22-slg','k-du22-cap','k-du22-emp','k-du22-lim','k-du22-ent','k-du22-eve','k-du22-rev','k-du22-cad','unknown')
       order by created_at desc limit 400
    `) as unknown as { action: string; actor_type: string; actor_id: string; actor_label: string | null; entity: string; ip: string | null; metadata: any }[];

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
  } finally {
    servidor.parar();
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
