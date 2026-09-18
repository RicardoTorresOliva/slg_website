/**
 * test-hoy.ts — **La portada «Hoy» del portal** (DU-26 · RF-149 · RF-150 ·
 * RF-88), contra PostgreSQL real y contra el servidor real.
 *
 * Los criterios, y por qué cada uno necesita la base de verdad:
 *
 *   · **1** — un `client_member` de la empresa A ve **solo lo de A en los cinco
 *     bloques**, y pedir explícitamente lo de B a las puertas de `lib/academy`
 *     devuelve cero. Lo que acota es la política de fila de FU-15, no la
 *     pantalla, así que se prueba llamando a los servicios con el contexto de
 *     una sesión de cliente. Y se barre `lib/portal/hoy.ts`: ninguna llamada
 *     escribe un `organizationId`.
 *   · **2** — sin noticias de hoy, el bloque enseña **las últimas tres con su
 *     fecha**, no un hueco. Es una función pura y se prueba con una fecha en la
 *     que no hay nada.
 *   · **RF-149** — el orden es el del producto: noticias por importancia (1
 *     primero) y solo publicadas; el próximo hito de cada proyecto **activo** y
 *     ninguno de un proyecto pausado ni ninguno hecho; los pendientes que cierra
 *     el cliente **antes** que los de SLG; los tres entregables más recientes y
 *     ninguno `internal`; los tres últimos avisos.
 *   · **4** — wayfinding: la pantalla tiene los cinco bloques en su orden y
 *     cada uno enlaza a su pantalla completa; `/portal/avisos` existe con el
 *     mismo render; la navegación pasa de `announcements` a `today` en `/portal`
 *     y todas las cadenas existen en los dos idiomas.
 *   · **Portada por HTTP** — se arranca la salida `standalone`, se entra con
 *     una cuenta de A por la vía de la invitación y se pide `/portal`: **200**
 *     con los cinco bloques, con una noticia de A y **sin** la de B.
 *
 * Necesita `bash scripts/db/local-pg.sh up` y `npm run build:standalone`.
 */
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";

import postgres from "postgres";

import { contextoDeSesion } from "../../lib/db/context.ts";
import type { UserRole } from "../../lib/db/schema.ts";
import { generarTestigo } from "../../lib/invitations/token.ts";

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

const RAIZ = path.resolve(import.meta.dirname, "../..");
const SERVER = path.join(RAIZ, ".next", "standalone", "server.js");
const URL_DUENO = process.env.DATABASE_URL_MIGRATIONS;
if (!URL_DUENO) throw new Error("Falta DATABASE_URL_MIGRATIONS.");
const dueno = postgres(URL_DUENO, { max: 3 });

/** Dos empresas: la nuestra y la de al lado. El criterio 1 vive en la de al lado. */
const A = { org: "org-du26-a", slug: "du26-a", user: "u-du26-a", activo: "p-du26-a1", pausado: "p-du26-a2" };
const B = { org: "org-du26-b", slug: "du26-b", user: "u-du26-b", activo: "p-du26-b1", pausado: "" };

/** La cuenta que entra por HTTP: se crea por invitación, como manda DU-01. */
const CORREO_HTTP = "portada@du26.test";
const CLAVE_HTTP = "una-contrasena-larga-de-verdad";

/**
 * Valores falsos en constantes de nombre neutro. Pegar un literal junto al
 * nombre de una variable de secreto es lo que `check:secrets` marca en rojo, y
 * hace bien aunque aquí sea de mentira.
 */
const SECRETO_EFIMERO = "solo-para-esta-prueba-0123456789";
const CLAVE_DEL_BUZON_LOCAL = "valor-de-prueba-local";
const USUARIO_DE_STAGING = "slg-staging";
const CLAVE_DE_STAGING = "otra-cadena-larga-solo-para-esta-prueba";

const cliente = (lado: typeof A, rol: UserRole = "client_member") =>
  contextoDeSesion({ userId: lado.user, userName: `Cliente ${lado.slug}`, role: rol, organizationId: lado.org });

async function limpiar() {
  for (const lado of [A, B]) {
    await dueno`delete from news_item where organization_id = ${lado.org}`;
    await dueno`delete from action_item where organization_id = ${lado.org}`;
    await dueno`delete from milestone where organization_id = ${lado.org}`;
    await dueno`delete from deliverable where organization_id = ${lado.org}`;
    await dueno`delete from announcement where organization_id = ${lado.org}`;
    await dueno`delete from project where organization_id = ${lado.org}`;
    await dueno`delete from invitation where organization_id = ${lado.org}`;
    await dueno`delete from membership where organization_id = ${lado.org}`;
    await dueno`delete from "session" where user_id in (select id from "user" where email like '%du26%')`;
    await dueno`delete from account where user_id in (select id from "user" where email like '%du26%')`;
    await dueno`delete from "user" where email like '%du26%'`;
    await dueno`delete from organization where id = ${lado.org} or slug = ${lado.slug}`;
  }
}

/** `haceDias === null` es un borrador; si no, publicada hace tantos días (0 = hoy). */
async function noticia(org: string, titulo: string, importancia: number, haceDias: number | null) {
  const id = crypto.randomUUID();
  // Publicada ⇔ con autor (`news_item_published_needs_author`): un borrador no lleva ninguno.
  if (haceDias === null) {
    await dueno`insert into news_item (id, organization_id, title, summary_md, comment_md, importance)
                values (${id}, ${org}, ${titulo}, 'Resumen.', 'Comentario.', ${importancia})`;
  } else {
    await dueno`insert into news_item (id, organization_id, title, source_url, summary_md, comment_md, importance,
                                       published_at, author_type, author_id, author_label)
                values (${id}, ${org}, ${titulo}, 'https://fuente.example/x', 'Resumen.', 'Lo que significa.',
                        ${importancia}, now() - make_interval(days => ${haceDias}), 'user', 'u-du26-slg', 'SLG')`;
  }
  return id;
}

async function entregable(org: string, proyecto: string, titulo: string, visibilidad: string, haceMinutos: number) {
  await dueno`insert into deliverable (id, project_id, organization_id, title, type, version, family_id, visibility,
                                       published_at, created_at)
              values (${crypto.randomUUID()}, ${proyecto}, ${org}, ${titulo}, 'pdf', 1, ${crypto.randomUUID()},
                      ${visibilidad}, now(), now() - make_interval(mins => ${haceMinutos}))`;
}

async function sembrar() {
  await limpiar();
  for (const lado of [A, B]) {
    await dueno`insert into organization (id, name, slug, type, status)
                values (${lado.org}, ${`Empresa ${lado.slug}`}, ${lado.slug}, 'client', 'active')`;
    await dueno`insert into "user" (id, name, email, email_verified, role, locale)
                values (${lado.user}, ${`Cliente ${lado.slug}`}, ${`${lado.slug}@du26.test`}, true, 'client_member', 'es')`;
    await dueno`insert into membership (id, user_id, organization_id, org_role)
                values (${crypto.randomUUID()}, ${lado.user}, ${lado.org}, 'client_member')`;
    await dueno`insert into project (id, organization_id, name, service, status)
                values (${lado.activo}, ${lado.org}, ${`Proyecto ${lado.slug}`}, 'Phoenix PEEx', 'active')`;
  }
  await dueno`insert into project (id, organization_id, name, service, status)
              values (${A.pausado}, ${A.org}, 'Proyecto pausado', 'SLG_Readiness', 'paused')`;

  // Noticias de A: dos de hoy con importancia distinta —insertadas al revés—,
  // una de ayer, un borrador. Y una de hoy en B, que A no puede ver.
  await noticia(A.org, "Noticia A normal", 2, 0);
  await noticia(A.org, "Noticia A primera", 1, 0);
  await noticia(A.org, "Noticia A de ayer", 1, 1);
  await noticia(A.org, "Noticia A borrador", 1, null);
  await noticia(B.org, "Noticia B ajena", 1, 0);

  // Hitos: en el activo de A, dos pendientes (el más lejano primero) y uno
  // hecho; en el pausado, uno pendiente que NO debe salir; uno en B.
  const hito = (org: string, proyecto: string, titulo: string, dias: number, estado: "pending" | "done") =>
    dueno`insert into milestone (id, project_id, organization_id, title, due_at, status, done_at)
          values (${crypto.randomUUID()}, ${proyecto}, ${org}, ${titulo}, now() + make_interval(days => ${dias}),
                  ${estado}, ${estado === "done" ? dueno`now()` : null})`;
  await hito(A.org, A.activo, "Hito lejano", 30, "pending");
  await hito(A.org, A.activo, "Hito próximo", 7, "pending");
  await hito(A.org, A.activo, "Hito hecho", -7, "done");
  await hito(A.org, A.pausado, "Hito del pausado", 1, "pending");
  await hito(B.org, B.activo, "Hito ajeno", 1, "pending");

  // Pendientes: en A, uno de SLG que vence antes, uno del cliente que vence
  // después y uno cerrado; uno abierto en B.
  const pendiente = (org: string, proyecto: string, titulo: string, cierra: string, dias: number | null, estado: "open" | "done") =>
    dueno`insert into action_item (id, project_id, organization_id, title, due_at, status, closes_by,
                                   done_at, done_by_type, done_by_id, done_by_label)
          values (${crypto.randomUUID()}, ${proyecto}, ${org}, ${titulo},
                  ${dias === null ? null : dueno`now() + make_interval(days => ${dias})`}, ${estado}, ${cierra},
                  ${estado === "done" ? dueno`now()` : null}, ${estado === "done" ? "user" : null},
                  ${estado === "done" ? "u-du26-slg" : null}, ${estado === "done" ? "SLG" : null})`;
  await pendiente(A.org, A.activo, "Pendiente de SLG", "slg", 2, "open");
  await pendiente(A.org, A.activo, "Pendiente del cliente", "client", 9, "open");
  await pendiente(A.org, A.activo, "Pendiente sin fecha", "client", null, "open");
  await pendiente(A.org, A.activo, "Pendiente cerrado", "client", 1, "done");
  await pendiente(B.org, B.activo, "Pendiente ajeno", "client", 1, "open");

  // Entregables: cuatro de cliente en A con antigüedad creciente, y el más
  // reciente de todos es `internal` — no puede asomar. Uno en B.
  await entregable(A.org, A.activo, "Interno reciente", "internal", 0);
  await entregable(A.org, A.activo, "Entregable 1", "client", 10);
  await entregable(A.org, A.activo, "Entregable 2", "client", 20);
  await entregable(A.org, A.activo, "Entregable 3", "client", 30);
  await entregable(A.org, A.activo, "Entregable 4", "client", 40);
  await entregable(B.org, B.activo, "Entregable ajeno", "client", 0);

  // Avisos: cuatro en A, uno en B.
  for (const n of [1, 2, 3, 4]) {
    await dueno`insert into announcement (id, organization_id, title, body_md, locale, published_at, created_at)
                values (${crypto.randomUUID()}, ${A.org}, ${`Aviso ${n}`}, 'cuerpo', 'es', now(),
                        now() - make_interval(mins => ${n}))`;
  }
  await dueno`insert into announcement (id, organization_id, title, body_md, locale, published_at)
              values (${crypto.randomUUID()}, ${B.org}, 'Aviso ajeno', 'cuerpo', 'es', now())`;
}

/** Sin comentarios: lo que el archivo DICE no cuenta, solo lo que HACE. */
function sinComentarios(fuente: string): string {
  return fuente
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + " ".repeat(m.length - p1.length));
}

const leer = (rel: string) => fs.readFileSync(path.join(RAIZ, rel), "utf8");

/* ── Servidor y navegador simulado, como en `test-acceso` ────────────────── */

async function puertoLibre(): Promise<number> {
  return new Promise((resolver, rechazar) => {
    const s = net.createServer();
    s.once("error", rechazar);
    s.listen(0, "127.0.0.1", () => {
      const p = (s.address() as net.AddressInfo).port;
      s.close(() => resolver(p));
    });
  });
}

async function arrancar(construirEnv: (base: string) => Record<string, string>) {
  const port = await puertoLibre();
  const base = `http://127.0.0.1:${port}`;
  const proc: ChildProcess = spawn(process.execPath, [SERVER], {
    cwd: path.dirname(SERVER),
    env: { ...process.env, ...construirEnv(base), PORT: String(port), HOSTNAME: "127.0.0.1", NODE_ENV: "production" },
    stdio: ["ignore", "pipe", "pipe"],
  });
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

class Navegador {
  private cookies = new Map<string, string>();
  private readonly base: string;
  private readonly fijas: Record<string, string>;

  constructor(base: string, fijas: Record<string, string>) {
    this.base = base;
    this.fijas = fijas;
  }

  async pedir(ruta: string, init: RequestInit = {}): Promise<Response> {
    const cabeceras = new Headers({ ...this.fijas, ...(init.headers as Record<string, string>) });
    if (this.cookies.size > 0) cabeceras.set("cookie", [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; "));
    const r = await fetch(`${this.base}${ruta}`, { ...init, headers: cabeceras, redirect: "manual" });
    for (const crudo of r.headers.getSetCookie()) {
      const [par] = crudo.split(";");
      const i = par.indexOf("=");
      const nombre = par.slice(0, i).trim();
      const valor = par.slice(i + 1).trim();
      if (valor === "" || /expires=Thu, 01 Jan 1970/i.test(crudo)) this.cookies.delete(nombre);
      else this.cookies.set(nombre, valor);
    }
    return r;
  }

  formulario(ruta: string, campos: Record<string, string>): Promise<Response> {
    return this.pedir(ruta, {
      method: "POST",
      body: new URLSearchParams(campos).toString(),
      headers: { "content-type": "application/x-www-form-urlencoded" },
    });
  }

  tieneSesion(): boolean {
    return [...this.cookies.keys()].some((k) => k.includes("session_token"));
  }
}

/**
 * La portada por HTTP, con sesión de verdad. El portal está cerrado por RF-87
 * hasta que M4 cierre, así que se abre como en staging: compuerta básica
 * delante y `SUPERFICIES_EN_REVISION=portal` — la única combinación con la que
 * `superficieAbierta()` dice que sí, y la que `test-acceso` demuestra que no
 * alcanza a producción.
 */
async function portadaPorHttp(): Promise<{ status: number; html: string }> {
  const { enClaro, hash } = generarTestigo();
  await dueno`insert into invitation (id, email, organization_id, role, token_hash, status, expires_at)
              values ('inv-du26', ${CORREO_HTTP}, ${A.org}, 'client_member', ${hash}, 'pending', now() + interval '72 hours')`;

  const basica = {
    authorization: `Basic ${Buffer.from(`${USUARIO_DE_STAGING}:${CLAVE_DE_STAGING}`).toString("base64")}`,
  };
  const { base, parar } = await arrancar((b) => ({
    DATABASE_URL: process.env.DATABASE_URL!,
    BETTER_AUTH_SECRET: SECRETO_EFIMERO,
    BETTER_AUTH_URL: b,
    STAGING_BASIC_AUTH_USER: USUARIO_DE_STAGING,
    STAGING_BASIC_AUTH_PASSWORD: CLAVE_DE_STAGING,
    SUPERFICIES_EN_REVISION: "portal",
    // Sin buzón: nada de esta prueba manda correo, y si algo lo intentara
    // fallaría en alto en vez de salir a ninguna parte.
    MAIL_SMTP_HOST: "127.0.0.1",
    MAIL_SMTP_PORT: "1",
    MAIL_SMTP_USERNAME: "u",
    MAIL_SMTP_PASSWORD: CLAVE_DEL_BUZON_LOCAL,
    MAIL_FROM_ADDRESS: "no-reply@mailweb.softlandingglobal.com",
    MAIL_REPLY_TO: "support@softlandingglobal.com",
    MAIL_ALERTS_TO: "support@softlandingglobal.com",
  }));
  try {
    const navegador = new Navegador(base, basica);
    const alta = await navegador.formulario("/api/acceso/invitacion", { token: enClaro, nombre: "Portada", password: CLAVE_HTTP });
    if (alta.status !== 303) throw new Error(`el alta por invitación devolvió ${alta.status}`);
    await navegador.formulario("/api/acceso/contrasena", { email: CORREO_HTTP, password: CLAVE_HTTP, lang: "es", volver: "/" });
    if (!navegador.tieneSesion()) throw new Error("el inicio de sesión no dejó cookie");
    const r = await navegador.pedir("/portal");
    return { status: r.status, html: await r.text() };
  } finally {
    parar();
  }
}

/* ══════════════════════════════════════════════════════════════════════════ */

async function main() {
  await sembrar();

  const { bloquesDeHoy, noticiasDeHoy, proximoHitoPorProyecto, ordenarPendientes, ultimosEntregables, ULTIMOS } =
    await import("../../lib/portal/hoy.ts");
  const { noticias, proximosHitos, pendientesAbiertos } = await import("../../lib/academy/index.ts");
  const { SECCIONES, exigirSeccion, seccionDeLaRuta } = await import("../../lib/app/navegacion.ts");

  const miembroA = cliente(A);
  const miembroB = cliente(B);

  console.log("\nCriterio 1 — un `client_member` de A ve SOLO lo de A en los cinco bloques:\n");

  const hoyA = await bloquesDeHoy(miembroA);
  const deA = (org: string) => org === A.org;
  check("noticias: todas de A", hoyA.noticias.lista.length > 0 && hoyA.noticias.lista.every((n) => deA(n.organizationId)));
  check("hitos: todos de A", hoyA.hitos.length > 0 && hoyA.hitos.every((h) => deA(h.hito.organizationId)));
  check("pendientes: todos de A", hoyA.pendientes.length > 0 && hoyA.pendientes.every((p) => deA(p.pendiente.organizationId)));
  check("entregables: todos de A", hoyA.entregables.length > 0 && hoyA.entregables.every((e) => deA(e.entregable.organizationId)));
  check("avisos: todos de A", hoyA.avisos.length > 0 && hoyA.avisos.every((a) => deA(a.organizationId)));

  // Y al revés, para que un «no devuelve nada nunca» no pase por verde.
  const hoyB = await bloquesDeHoy(miembroB);
  check(
    "B ve lo suyo —uno por bloque— y nada de A",
    hoyB.noticias.lista.length === 1 && hoyB.hitos.length === 1 && hoyB.pendientes.length === 1 &&
      hoyB.entregables.length === 1 && hoyB.avisos.length === 1 &&
      hoyB.noticias.lista[0]!.organizationId === B.org && hoyB.avisos[0]!.organizationId === B.org,
    JSON.stringify({ n: hoyB.noticias.lista.length, h: hoyB.hitos.length, p: hoyB.pendientes.length, e: hoyB.entregables.length, a: hoyB.avisos.length }),
  );

  check("A pidiendo explícitamente las noticias de B recibe CERO", (await noticias(miembroA, { organizationId: B.org, soloPublicadas: true })).length === 0);
  check("y los hitos de B, CERO", (await proximosHitos(miembroA, B.org)).length === 0);
  check("y los pendientes de B, CERO", (await pendientesAbiertos(miembroA, B.org)).length === 0);

  const fuenteDeHoy = sinComentarios(leer("lib/portal/hoy.ts"));
  check(
    "`lib/portal/hoy.ts` no escribe ningún `organizationId`: no hay dónde pasar la empresa ajena",
    !/organizationId/.test(fuenteDeHoy),
  );

  console.log("\nRF-149 — el orden de la portada es el del producto:\n");

  check("noticias de hoy: las dos publicadas hoy, y ninguna otra", hoyA.noticias.deHoy && hoyA.noticias.lista.length === 2, JSON.stringify(hoyA.noticias.lista.map((n) => n.titulo)));
  check("la de importancia 1 va primero aunque se insertó después", hoyA.noticias.lista[0]?.titulo === "Noticia A primera");
  check("el borrador no sale", hoyA.noticias.lista.every((n) => n.titulo !== "Noticia A borrador"));
  check("cada una trae su comentario para la empresa", hoyA.noticias.lista.every((n) => n.comentarioMd.length > 0));

  check("qué sigue: un solo hito, el próximo del proyecto activo", hoyA.hitos.length === 1 && hoyA.hitos[0]?.hito.titulo === "Hito próximo", JSON.stringify(hoyA.hitos.map((h) => h.hito.titulo)));
  check("con el título del proyecto al lado", hoyA.hitos[0]?.proyecto.nombre === "Proyecto du26-a");
  check("el proyecto pausado no aporta hito", hoyA.hitos.every((h) => h.proyecto.id !== A.pausado));

  check("pendientes: tres abiertos, el cerrado no", hoyA.pendientes.length === 3, JSON.stringify(hoyA.pendientes.map((p) => p.pendiente.titulo)));
  check(
    "los que cierra el cliente van primero aunque venzan después, y el de SLG al final",
    hoyA.pendientes[0]?.pendiente.cierra === "client" && hoyA.pendientes[1]?.pendiente.cierra === "client" &&
      hoyA.pendientes[2]?.pendiente.titulo === "Pendiente de SLG",
  );
  check("dentro del grupo, el con fecha antes que el sin fecha", hoyA.pendientes[0]?.pendiente.titulo === "Pendiente del cliente");

  check(`entregables: los ${ULTIMOS} más recientes`, hoyA.entregables.map((e) => e.entregable.titulo).join(",") === "Entregable 1,Entregable 2,Entregable 3", JSON.stringify(hoyA.entregables.map((e) => e.entregable.titulo)));
  check("y el `internal`, aunque sea el más nuevo, no asoma", hoyA.entregables.every((e) => e.entregable.visibilidad === "client"));
  check(`avisos: los ${ULTIMOS} últimos`, hoyA.avisos.map((a) => a.titulo).join(",") === "Aviso 1,Aviso 2,Aviso 3", JSON.stringify(hoyA.avisos.map((a) => a.titulo)));

  console.log("\nCriterio 2 — sin noticias de hoy, las últimas tres con su fecha, no un hueco:\n");

  const todasDeA = await noticias(miembroA, { soloPublicadas: true });
  const otroDia = new Date(Date.now() + 10 * 24 * 3600 * 1000);
  const sinHoy = noticiasDeHoy(todasDeA, otroDia);
  check("no son «de hoy»", sinHoy.deHoy === false);
  check("son tres, y las tres publicadas", sinHoy.lista.length === 3 && sinHoy.lista.every((n) => n.publicadaEn !== null), JSON.stringify(sinHoy.lista.map((n) => n.titulo)));
  check("por fecha, la más reciente primero", sinHoy.lista[2]?.titulo === "Noticia A de ayer");
  check("sin ninguna noticia, la lista queda vacía y la pantalla lo redacta", noticiasDeHoy([], otroDia).lista.length === 0);

  // Las otras tres funciones puras, con listas vacías: nunca lanzan.
  check("sin hitos ni proyectos, cero filas", proximoHitoPorProyecto([], []).length === 0);
  check("sin pendientes, cero filas", ordenarPendientes([], []).length === 0);
  check("sin entregables, cero filas", ultimosEntregables([], []).length === 0);

  console.log("\nCriterio 4 — wayfinding: cinco bloques en su orden, cada uno con su salida:\n");

  const pantalla = leer("app/(portal)/portal/page.tsx");
  const codigo = sinComentarios(pantalla);
  check("la portada gobierna su sección con la clave `today`", codigo.includes('exigirSeccion(sesion.ctx, "today")'));
  check("y pide los bloques por la única puerta", codigo.includes("bloquesDeHoy(sesion.ctx)"));
  const titulos = ["portal.today.news", "portal.today.next", "portal.today.pending", "portal.today.deliverables", "portal.today.announcements"];
  const posiciones = titulos.map((k) => codigo.indexOf(`t["${k}"]`));
  check("los cinco bloques existen, en este orden", posiciones.every((p) => p >= 0) && posiciones.every((p, i) => i === 0 || p > posiciones[i - 1]!), posiciones.join(","));
  check("«Qué sigue» y «Pendientes» enlazan a /portal/programa", (codigo.match(/"\/portal\/programa"/g) ?? []).length === 2);
  check("«Últimos entregables» enlaza a /portal/proyectos", codigo.includes('"/portal/proyectos"'));
  check("«Avisos» enlaza a /portal/avisos", codigo.includes('"/portal/avisos"'));
  check("el comentario y el resumen pasan por Markdown dentro de ContenidoEntregado (RNF-31)", codigo.includes("<Markdown texto={n.comentarioMd} />") && codigo.includes("<Markdown texto={n.resumenMd} />") && codigo.includes("<ContenidoEntregado"));
  check("la fuente es un enlace externo sin `opener`", codigo.includes('rel="noopener"'));
  check("el paso «Agenda tu Sesión Cero» sigue en la portada", codigo.includes("<PasoDeSesionCero textos={t} />"));

  const avisosPagina = sinComentarios(leer("app/(portal)/portal/avisos/page.tsx"));
  check("`/portal/avisos` existe y gobierna con `announcements`", avisosPagina.includes('exigirSeccion(sesion.ctx, "announcements")'));
  check("y renderiza igual que antes: ContenidoEntregado + Markdown del cuerpo", avisosPagina.includes("<Markdown texto={a.cuerpoMd} />") && avisosPagina.includes("<ContenidoEntregado idioma={a.idioma}>"));

  check("la sección de `/portal` es `today`", seccionDeLaRuta("/portal")?.clave === "today");
  check("la de `/portal/avisos` es `announcements`", seccionDeLaRuta("/portal/avisos")?.clave === "announcements");
  check("las dos comparten acción: son los mismos datos", SECCIONES.find((s) => s.clave === "today")?.accion === SECCIONES.find((s) => s.clave === "announcements")?.accion);
  let pasa = true;
  try {
    exigirSeccion(miembroA, "today");
    exigirSeccion(miembroA, "announcements");
  } catch {
    pasa = false;
  }
  check("`client_member` alcanza las dos en el servidor", pasa);

  const usadas = [...new Set([...pantalla.matchAll(/t\["(portal\.today\.[A-Za-z]+)"\]/g)].map((m) => m[1]!))];
  check("la portada usa cadenas `portal.today.*`", usadas.length >= 20, String(usadas.length));
  for (const idioma of ["es", "en"]) {
    const cadenas = JSON.parse(leer(`content/ui/${idioma}.json`)) as Record<string, string>;
    const faltan = [...usadas, "app.nav.today", "app.nav.announcements"].filter((k) => !cadenas[k]?.trim());
    check(`todas tienen texto en ${idioma}.json`, faltan.length === 0, faltan.join(", "));
  }

  console.log("\nLa portada por HTTP — 200 con los cinco bloques, y solo lo de A:\n");

  if (!fs.existsSync(SERVER)) throw new Error("falta .next/standalone/server.js: corre `npm run build:standalone`.");
  const portada = await portadaPorHttp();
  check("`/portal` responde 200 con sesión de cliente", portada.status === 200, `status ${portada.status}`);
  for (const bloque of ["noticias", "que-sigue", "pendientes", "entregables", "avisos"]) {
    check(`el bloque «${bloque}» está en la página`, portada.html.includes(`id="hoy-${bloque}"`));
  }
  check("con la noticia de A y su comentario", portada.html.includes("Noticia A primera") && portada.html.includes("Lo que significa."));
  check("y SIN la de B", !portada.html.includes("Noticia B ajena"));
  check("con el hito próximo, el pendiente del cliente, el entregable y el aviso", ["Hito próximo", "Pendiente del cliente", "Entregable 1", "Aviso 1"].every((s) => portada.html.includes(s)));
  check("y sin lo que no toca: ni el hecho, ni el cerrado, ni el interno, ni el cuarto aviso", ["Hito hecho", "Pendiente cerrado", "Interno reciente", "Aviso 4"].every((s) => !portada.html.includes(s)));

  await limpiar();
  await dueno.end({ timeout: 5 });

  if (fallos > 0) {
    console.error(`\n✗ hoy: ${fallos} de ${comprobaciones} comprobaciones fallaron.\n`);
    process.exit(1);
  }
  console.log(`\n✓ hoy: ${comprobaciones} comprobaciones contra PostgreSQL y el servidor real, sin fallos.`);
  process.exit(0);
}

try {
  await main();
} catch (e) {
  console.error(`\n✗ hoy: la prueba no pudo completarse: ${(e as Error).message}`);
  await limpiar().catch(() => undefined);
  await dueno.end({ timeout: 5 });
  process.exit(1);
}
