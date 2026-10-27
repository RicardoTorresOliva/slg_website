/**
 * test-programa.ts — DU-27 · Portal «Programa» (RF-151 · RF-156).
 *
 * Tres cosas se demuestran, y ninguna se supone:
 *
 *   1. **Aislamiento**: un `client_member` de A ve los hitos y pendientes de A y
 *      ninguno de B; cerrar un pendiente de B por su id devuelve `null` y no
 *      escribe nada.
 *   2. **`closes_by` manda en el servidor**: el cliente cierra el suyo (`done`,
 *      con `done_by_id` = él); intentar cerrar uno de SLG lanza
 *      `ErrorDeAutorizacion`, deja el pendiente `open` **y** una fila
 *      `action_item.close.denied` en `audit_log`. Esconder el botón no protege;
 *      esto es lo que protege.
 *   3. **La pantalla dice siempre «qué sigue»**: el reparto puro de
 *      `lib/portal/programa.ts` y, por HTTP con sesión real, `/portal/programa`
 *      responde 200 con el bloque de cada proyecto activo, el pausado fuera, y
 *      el botón solo en los pendientes del cliente.
 *
 * Necesita PostgreSQL (`DATABASE_URL_MIGRATIONS` y `DATABASE_URL`) y, para la
 * parte HTTP, `npm run build:standalone` hecho — como `test-hoy` y `test-acceso`.
 */
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";

import postgres from "postgres";

import { contextoDeSesion } from "../../lib/db/context.ts";
import type { UserRole } from "../../lib/db/schema.ts";
import { generarTestigo } from "../../lib/invitations/token.ts";
import { nombresDeServicio } from "../../lib/sitio/index.ts";
/**
 * Los servicios con los que se siembran los proyectos salen de la ficha
 * (`site.config.ts`): la base no restringe `project.service` (0024), pero la
 * aplicación solo acepta los literales de la oferta, y una prueba que sembrara
 * el nombre de un servicio de otro sitio probaría datos que este sitio no
 * puede producir.
 */
const [SERVICIO, OTRO_SERVICIO = SERVICIO] = nombresDeServicio();

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

const A = { org: "org-du27-a", slug: "du27-a", user: "u-du27-a", activo: "p-du27-a1", pausado: "p-du27-a2" };
const B = { org: "org-du27-b", slug: "du27-b", user: "u-du27-b", activo: "p-du27-b1", pausado: "" };

const IDS = {
  hitoHecho: "h-du27-hecho",
  hitoProximo: "h-du27-proximo",
  hitoLejano: "h-du27-lejano",
  hitoPausado: "h-du27-pausado",
  hitoAjeno: "h-du27-ajeno",
  pendienteCliente: "ai-du27-cliente",
  pendienteSinFecha: "ai-du27-sinfecha",
  pendienteSlg: "ai-du27-slg",
  pendienteCerrado: "ai-du27-cerrado",
  pendienteAjeno: "ai-du27-ajeno",
};

const CORREO_HTTP = "programa@du27.test";
const CLAVE_HTTP = "una-contrasena-larga-de-verdad";
const SECRETO_EFIMERO = "solo-para-esta-prueba-0123456789";
const CLAVE_DEL_BUZON_LOCAL = "valor-de-prueba-local";
const USUARIO_DE_STAGING = "slg-staging";
const CLAVE_DE_STAGING = "otra-cadena-larga-solo-para-esta-prueba";

const cliente = (lado: typeof A, rol: UserRole = "client_member") =>
  contextoDeSesion({ userId: lado.user, userName: `Cliente ${lado.slug}`, role: rol, organizationId: lado.org });

async function limpiar() {
  for (const lado of [A, B]) {
    await dueno`delete from action_item where organization_id = ${lado.org}`;
    await dueno`delete from milestone where organization_id = ${lado.org}`;
    await dueno`delete from project where organization_id = ${lado.org}`;
    await dueno`delete from invitation where organization_id = ${lado.org}`;
    await dueno`delete from membership where organization_id = ${lado.org}`;
    await dueno`delete from "session" where user_id in (select id from "user" where email like '%du27%')`;
    await dueno`delete from account where user_id in (select id from "user" where email like '%du27%')`;
    await dueno`delete from "user" where email like '%du27%'`;
    await dueno`delete from organization where id = ${lado.org} or slug = ${lado.slug}`;
  }
  // `audit_log` no se limpia: es de solo inserción (RNF-29). Se acota por tiempo.
}

async function sembrar() {
  await limpiar();
  for (const lado of [A, B]) {
    await dueno`insert into organization (id, name, slug, type, status)
                values (${lado.org}, ${`Empresa ${lado.slug}`}, ${lado.slug}, 'client', 'active')`;
    await dueno`insert into "user" (id, name, email, email_verified, role, locale)
                values (${lado.user}, ${`Cliente ${lado.slug}`}, ${`${lado.slug}@du27.test`}, true, 'client_member', 'es')`;
    await dueno`insert into membership (id, user_id, organization_id, org_role)
                values (${crypto.randomUUID()}, ${lado.user}, ${lado.org}, 'client_member')`;
    await dueno`insert into project (id, organization_id, name, service, status)
                values (${lado.activo}, ${lado.org}, ${`Proyecto ${lado.slug}`}, ${SERVICIO}, 'active')`;
  }
  await dueno`insert into project (id, organization_id, name, service, status)
              values (${A.pausado}, ${A.org}, 'Proyecto pausado', ${OTRO_SERVICIO}, 'paused')`;

  const hito = (id: string, org: string, proyecto: string, titulo: string, dias: number, posicion: number, estado: "pending" | "done") =>
    dueno`insert into milestone (id, project_id, organization_id, title, due_at, status, position, done_at)
          values (${id}, ${proyecto}, ${org}, ${titulo}, now() + make_interval(days => ${dias}), ${estado}, ${posicion},
                  ${estado === "done" ? dueno`now() - interval '1 day'` : null})`;
  await hito(IDS.hitoHecho, A.org, A.activo, "Hito hecho", -7, 1, "done");
  // Posición 3 pero vence antes que el de posición 2: «siguiente» es por fecha.
  await hito(IDS.hitoProximo, A.org, A.activo, "Hito próximo", 7, 3, "pending");
  await hito(IDS.hitoLejano, A.org, A.activo, "Hito lejano", 30, 2, "pending");
  await hito(IDS.hitoPausado, A.org, A.pausado, "Hito del pausado", 1, 1, "pending");
  await hito(IDS.hitoAjeno, B.org, B.activo, "Hito ajeno", 1, 1, "pending");

  const pendiente = (id: string, org: string, proyecto: string, titulo: string, cierra: string, dias: number | null, estado: "open" | "done") =>
    dueno`insert into action_item (id, project_id, organization_id, title, due_at, status, closes_by,
                                   done_at, done_by_type, done_by_id, done_by_label)
          values (${id}, ${proyecto}, ${org}, ${titulo},
                  ${dias === null ? null : dueno`now() + make_interval(days => ${dias})`}, ${estado}, ${cierra},
                  ${estado === "done" ? dueno`now()` : null}, ${estado === "done" ? "user" : null},
                  ${estado === "done" ? "u-du27-slg" : null}, ${estado === "done" ? "SLG" : null})`;
  await pendiente(IDS.pendienteSlg, A.org, A.activo, "Pendiente de SLG", "slg", 2, "open");
  await pendiente(IDS.pendienteCliente, A.org, A.activo, "Pendiente del cliente", "client", 9, "open");
  await pendiente(IDS.pendienteSinFecha, A.org, A.activo, "Pendiente sin fecha", "client", null, "open");
  await pendiente(IDS.pendienteCerrado, A.org, A.activo, "Pendiente cerrado", "client", 1, "done");
  await pendiente(IDS.pendienteAjeno, B.org, B.activo, "Pendiente ajeno", "client", 1, "open");
}

function sinComentarios(fuente: string): string {
  return fuente
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + " ".repeat(m.length - p1.length));
}

const leer = (rel: string) => fs.readFileSync(path.join(RAIZ, rel), "utf8");

/* ── Servidor y navegador simulado, como en `test-hoy` ───────────────────── */

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

async function programaPorHttp(): Promise<{ status: number; html: string }> {
  const { enClaro, hash } = generarTestigo();
  await dueno`insert into invitation (id, email, organization_id, role, token_hash, status, expires_at)
              values ('inv-du27', ${CORREO_HTTP}, ${A.org}, 'client_member', ${hash}, 'pending', now() + interval '72 hours')`;

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
    MAIL_SMTP_HOST: "127.0.0.1",
    MAIL_SMTP_PORT: "1",
    MAIL_SMTP_USERNAME: "u",
    MAIL_SMTP_PASSWORD: CLAVE_DEL_BUZON_LOCAL,
    MAIL_FROM_ADDRESS: "no-reply@mail.demo.example.com",
    MAIL_REPLY_TO: "hola@demo.example.com",
    MAIL_ALERTS_TO: "hola@demo.example.com",
  }));
  try {
    const navegador = new Navegador(base, basica);
    const alta = await navegador.formulario("/api/acceso/invitacion", { token: enClaro, nombre: "Programa", password: CLAVE_HTTP });
    if (alta.status !== 303) throw new Error(`el alta por invitación devolvió ${alta.status}`);
    await navegador.formulario("/api/acceso/contrasena", { email: CORREO_HTTP, password: CLAVE_HTTP, lang: "es", volver: "/" });
    if (!navegador.tieneSesion()) throw new Error("el inicio de sesión no dejó cookie");
    const r = await navegador.pedir("/portal/programa");
    return { status: r.status, html: await r.text() };
  } finally {
    parar();
  }
}

/* ══════════════════════════════════════════════════════════════════════════ */

async function main() {
  await sembrar();
  /** Marca de agua: todo apunte de auditoría posterior a esto es de esta corrida. */
  const INICIO = new Date();

  const { programaDelCliente, repartirHitos, repartirPendientes } = await import("../../lib/portal/programa.ts");
  const { cerrarPendiente } = await import("../../lib/academy/index.ts");
  const { ErrorDeAutorizacion } = await import("../../lib/auth/matriz.ts");
  const { SECCIONES, seccionDeLaRuta } = await import("../../lib/app/navegacion.ts");

  const miembroA = cliente(A);
  const miembroB = cliente(B);

  console.log("\nCriterio de aislamiento — A ve lo de A, y nada de B:\n");

  const programaA = await programaDelCliente(miembroA);
  check("un bloque por proyecto ACTIVO: el pausado no aparece", programaA.length === 1 && programaA[0]?.proyecto.id === A.activo, JSON.stringify(programaA.map((b) => b.proyecto.id)));
  const bloqueA = programaA[0]!;
  const todosDeA = [...bloqueA.hitos.hechos, ...bloqueA.hitos.futuros, bloqueA.hitos.siguiente!].every((h) => h.organizationId === A.org)
    && [...bloqueA.pendientes.abiertos, ...bloqueA.pendientes.cerrados].every((p) => p.organizationId === A.org);
  check("todos los hitos y pendientes del bloque son de A", todosDeA);
  const programaB = await programaDelCliente(miembroB);
  check("B ve su único proyecto con su hito y su pendiente, y nada de A",
    programaB.length === 1 && programaB[0]?.hitos.siguiente?.id === IDS.hitoAjeno && programaB[0]?.pendientes.abiertos[0]?.id === IDS.pendienteAjeno && programaB[0]?.pendientes.abiertos.length === 1);
  check("`lib/portal/programa.ts` no escribe ningún `organizationId`", !/organizationId/.test(sinComentarios(leer("lib/portal/programa.ts"))));

  console.log("\nRF-151 — el reparto dice siempre «qué sigue»:\n");

  check("«siguiente» es el pendiente que vence antes, no el de menor posición", bloqueA.hitos.siguiente?.id === IDS.hitoProximo, bloqueA.hitos.siguiente?.titulo);
  check("hechos: el hecho; futuros: el lejano", bloqueA.hitos.hechos.map((h) => h.id).join() === IDS.hitoHecho && bloqueA.hitos.futuros.map((h) => h.id).join() === IDS.hitoLejano);
  check("sin hitos, «siguiente» es null y las listas vacías: la pantalla lo redacta", repartirHitos([]).siguiente === null && repartirHitos([]).hechos.length === 0);
  check("abiertos: los del cliente primero (con fecha antes que sin fecha), el de SLG al final",
    bloqueA.pendientes.abiertos.map((p) => p.id).join() === [IDS.pendienteCliente, IDS.pendienteSinFecha, IDS.pendienteSlg].join(),
    JSON.stringify(bloqueA.pendientes.abiertos.map((p) => p.titulo)));
  check("cerrados aparte, con quién lo cerró", bloqueA.pendientes.cerrados.length === 1 && bloqueA.pendientes.cerrados[0]?.hechoPor === "SLG");
  check("sin pendientes, dos listas vacías", repartirPendientes([]).abiertos.length === 0 && repartirPendientes([]).cerrados.length === 0);

  console.log("\nCriterio 1 — `closes_by` manda en el servidor, no el botón:\n");

  const cerrado = await cerrarPendiente(miembroA, IDS.pendienteCliente);
  check("el cliente cierra el suyo: `done`", cerrado?.estado === "done");
  check("y `done_by_id` es él, del contexto y no de un parámetro", cerrado?.hechoPorId === A.user && cerrado?.hechoPorTipo === "user");
  const [fila] = await dueno`select status, done_by_id from action_item where id = ${IDS.pendienteCliente}`;
  check("la base lo dice igual", fila?.status === "done" && fila?.done_by_id === A.user);

  let rechazo: unknown = null;
  try {
    await cerrarPendiente(miembroA, IDS.pendienteSlg);
  } catch (e) {
    rechazo = e;
  }
  check("cerrar uno de SLG lanza ErrorDeAutorizacion", rechazo instanceof ErrorDeAutorizacion, String(rechazo));
  const [sigueAbierto] = await dueno`select status from action_item where id = ${IDS.pendienteSlg}`;
  check("y el pendiente sigue `open`", sigueAbierto?.status === "open");
  const denegados = await dueno`select count(*)::int as n from audit_log
    where action = 'action_item.close.denied' and entity_id = ${IDS.pendienteSlg} and actor_id = ${A.user} and created_at >= ${INICIO}`;
  check("y hay fila `action_item.close.denied` en audit_log con el actor", denegados[0]?.n === 1, `filas: ${denegados[0]?.n}`);

  check("cerrar por id de OTRA empresa devuelve null", (await cerrarPendiente(miembroA, IDS.pendienteAjeno)) === null);
  const [ajenoSigue] = await dueno`select status from action_item where id = ${IDS.pendienteAjeno}`;
  check("y el de B sigue `open`", ajenoSigue?.status === "open");
  check("repetir el cierre del suyo no cambia nada (idempotente)", (await cerrarPendiente(miembroA, IDS.pendienteCliente))?.hechoEn === cerrado?.hechoEn);

  console.log("\nWayfinding y navegación:\n");

  const codigo = sinComentarios(leer("app/(portal)/portal/programa/page.tsx"));
  check("la pantalla gobierna su sección con la clave `program`", codigo.includes('exigirSeccion(sesion.ctx, "program")'));
  check("y pide los bloques por la única puerta", codigo.includes("programaDelCliente(sesion.ctx)"));
  check("el botón se pinta solo si `cierra === \"client\"`", /p\.cierra === "client" \? \(\s*<form action=\{accionCerrarPendiente\}/.test(codigo));
  check("y el de SLG lo dice con palabras", codigo.includes('t["portal.program.slgs"]'));
  check("sin hitos, la frase «sin hitos programados»", codigo.includes('t["portal.program.noMilestones"]'));
  check("cada bloque enlaza a su proyecto", codigo.includes("/portal/proyectos/${proyecto.id}"));
  check("la sección de `/portal/programa` es `program` con `milestone.read`", seccionDeLaRuta("/portal/programa")?.clave === "program" && SECCIONES.find((s) => s.clave === "program")?.accion === "milestone.read");
  const acciones = sinComentarios(leer("app/(portal)/portal/_acciones.ts"));
  check("la Server Action vuelve a exigir la sección y cuenta el rechazo como `permiso`", acciones.includes('sesionDelPortal("program")') && acciones.includes("/portal/programa?error=permiso"));

  console.log("\nPor HTTP, con sesión real (compuerta de staging + SUPERFICIES_EN_REVISION=portal):\n");

  if (!fs.existsSync(SERVER)) {
    console.log("  (sin build standalone: se omite la parte HTTP; en CI se corre)");
  } else {
    const r = await programaPorHttp();
    check("/portal/programa responde 200", r.status === 200, `HTTP ${r.status}`);
    check("con el bloque del proyecto activo y sin el pausado", r.html.includes(`programa-${A.activo}`) && !r.html.includes(`programa-${A.pausado}`));
    check("«Hito próximo» destacado, «Hito ajeno» ausente", r.html.includes("Hito próximo") && !r.html.includes("Hito ajeno"));
    check("el botón de cerrar aparece para el pendiente sin fecha (del cliente) y no para el de SLG",
      r.html.includes(`value="${IDS.pendienteSinFecha}"`) && !r.html.includes(`value="${IDS.pendienteSlg}"`));
  }

  await limpiar();
  await dueno.end({ timeout: 5 });

  if (fallos) {
    console.error(`\n✗ programa: ${fallos} de ${comprobaciones} comprobaciones fallaron.\n`);
    process.exit(1);
  }
  console.log(`\n✓ programa: ${comprobaciones} comprobaciones, sin fallos.\n`);
}

main().catch(async (e) => {
  console.error("\n✗ La prueba de «Programa» no pudo completarse:", e);
  await dueno.end({ timeout: 5 }).catch(() => {});
  process.exit(1);
});
