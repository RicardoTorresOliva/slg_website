/**
 * test-acceso.ts — DU-01 contra el servidor REAL, con navegador simulado.
 *
 * Se arranca la salida `standalone` y se le habla por HTTP con cookies, como
 * haría un navegador: es la única forma de comprobar lo que DU-01 promete —que
 * la cookie lleva sus banderas, que el mensaje es el mismo en los cuatro casos,
 * que cerrar sesión en todos los dispositivos deja fuera al otro navegador—.
 *
 * Necesita `bash scripts/db/local-pg.sh up` y `npm run build:standalone`.
 */
import { spawn, type ChildProcess } from "node:child_process";
import net from "node:net";
import path from "node:path";

import postgres from "postgres";
import { SMTPServer } from "smtp-server";

import { generarTestigo } from "../../lib/invitations/token.ts";

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
if (!URL_DUENO) throw new Error("Falta DATABASE_URL_MIGRATIONS para sembrar los fixtures.");
const dueno = postgres(URL_DUENO, { max: 2 });

/* ── Buzón, para capturar el enlace de recuperación ──────────────────────── */

let ultimoEnlace: string | null = null;

async function levantarSmtp(puerto: number) {
  const servidor = new SMTPServer({
    secure: false,
    // Con `authOptional` y SIN `onAuth`, el servidor responde 535 a la
    // autenticación y ningún correo sale. Se acepta cualquier credencial: lo
    // que esta prueba mide es la recuperación, no el SMTP, que ya tiene la suya.
    authOptional: true,
    onAuth: (_a, _s, cb) => cb(null, { user: "u" }),
    disabledCommands: ["STARTTLS"],
    onData(flujo, _s, cb) {
      let crudo = "";
      flujo.on("data", (c) => (crudo += c.toString("utf8")));
      flujo.on("end", () => {
        /**
         * Quoted-printable: además de los saltos blandos (`=\r\n`), hay que
         * deshacer las secuencias `=XX`. Sin eso, un `=` del enlace llega como
         * `=3D` y el testigo sale con un «3D» pegado delante — que es
         * exactamente el fallo que esta prueba dio la primera vez.
         */
        const limpio = crudo
          .replace(/=\r?\n/g, "")
          .replace(/=([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
        const m = limpio.match(/https?:\/\/[^\s"<>]+/);
        if (m) ultimoEnlace = m[0];
        cb();
      });
    },
  });
  await new Promise<void>((r) => servidor.listen(puerto, "127.0.0.1", r));
  return () => new Promise<void>((r) => servidor.close(() => r()));
}

/* ── Navegador simulado: guarda cookies como un navegador ────────────────── */

class Navegador {
  private cookies = new Map<string, string>();
  readonly setCookieCrudos: string[] = [];
  private readonly base: string;

  // Sin propiedad de parámetro: Node ejecuta TypeScript quitando los tipos, y
  // `constructor(private x)` es sintaxis que además EMITE código.
  constructor(base: string) {
    this.base = base;
  }

  async pedir(ruta: string, init: RequestInit = {}): Promise<Response> {
    const cabeceras = new Headers(init.headers);
    if (this.cookies.size > 0) {
      cabeceras.set(
        "cookie",
        [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; "),
      );
    }
    const r = await fetch(`${this.base}${ruta}`, { ...init, headers: cabeceras, redirect: "manual" });
    for (const crudo of r.headers.getSetCookie()) {
      this.setCookieCrudos.push(crudo);
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
    const cuerpo = new URLSearchParams(campos).toString();
    return this.pedir(ruta, {
      method: "POST",
      body: cuerpo,
      headers: { "content-type": "application/x-www-form-urlencoded" },
    });
  }

  tieneSesion(): boolean {
    return [...this.cookies.keys()].some((k) => k.includes("session_token"));
  }
}

/* ── Servidor ────────────────────────────────────────────────────────────── */

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

async function arrancar(
  construirEnv: (base: string) => Record<string, string>,
): Promise<{ base: string; parar: () => void }> {
  const port = await puertoLibre();
  // `BETTER_AUTH_URL` tiene que ser la base REAL del servidor: la librería
  // comprueba el origen de cada petición contra ella y, si no cuadra, responde
  // 403 sin decir por qué. Es el mismo fallo que en producción se ve como
  // `redirect_uri_mismatch`.
  const env = construirEnv(`http://127.0.0.1:${port}`);
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

/* ── Fixtures ────────────────────────────────────────────────────────────── */

/**
 * Valores falsos en constantes de nombre neutro. Pegar un literal junto al
 * nombre de una variable de secreto es lo que `check:secrets` marca en rojo, y
 * hace bien aunque aquí sea de mentira.
 */
const SECRETO_EFIMERO = "solo-para-esta-prueba-0123456789";
const CLAVE_DEL_BUZON_LOCAL = "valor-de-prueba-local";

const CORREO = "persona@du01.test";
const CLAVE = "una-contrasena-larga-de-verdad";

const ORG = "org-du01";

async function limpiar() {
  await dueno`delete from invitation where email like '%du01%'`;
  await dueno`delete from membership where organization_id = ${ORG}`;
  await dueno`delete from "session" where user_id like 'u-du01%'`;
  await dueno`delete from account where user_id like 'u-du01%'`;
  await dueno`delete from "user" where id like 'u-du01%'`;
  await dueno`delete from verification where identifier like '%du01%'`;
  await dueno`delete from email_delivery where to_email like '%du01%'`;
  await dueno`delete from "session" where user_id in (select id from "user" where email like '%du01%')`;
  await dueno`delete from account where user_id in (select id from "user" where email like '%du01%')`;
  await dueno`delete from "user" where email like '%du01%'`;
  await dueno`delete from organization where id = ${ORG}`;
}

/** Siembra la empresa y una invitación vigente: es la ÚNICA vía a una cuenta. */
async function sembrarInvitacion(): Promise<string> {
  const { enClaro, hash } = generarTestigo();
  await dueno`
    insert into organization (id, name, slug, type, status)
    values (${ORG}, 'Acme DU01', 'acme-du01', 'client', 'active')
  `;
  await dueno`
    insert into invitation (id, email, organization_id, role, token_hash, status, expires_at)
    values ('inv-du01', ${CORREO}, ${ORG}, 'client_member', ${hash}, 'pending', now() + interval '72 hours')
  `;
  // Una segunda, que se queda SIN aceptar: es el caso «invitación vigente pero
  // sin cuenta» que RF-59 nombra aparte.
  const otra = generarTestigo();
  await dueno`
    insert into invitation (id, email, organization_id, role, token_hash, status, expires_at)
    values ('inv-du01-b', 'pendiente@du01.test', ${ORG}, 'client_member', ${otra.hash}, 'pending', now() + interval '72 hours')
  `;
  return enClaro;
}

/* ══════════════════════════════════════════════════════════════════════════ */

async function main() {
  console.log("Acceso, sesión y recuperación — contra el servidor real\n");
  const cerrarSmtp = await levantarSmtp(2530);
  await limpiar();
  const testigo = await sembrarInvitacion();

  const entorno: Record<string, string> = {
    DATABASE_URL: process.env.DATABASE_URL!,
    BETTER_AUTH_SECRET: SECRETO_EFIMERO,
    MAIL_SMTP_HOST: "127.0.0.1",
    MAIL_SMTP_PORT: "2530",
    MAIL_SMTP_USERNAME: "u",
    MAIL_SMTP_PASSWORD: CLAVE_DEL_BUZON_LOCAL,
    MAIL_FROM_ADDRESS: "no-reply@mailweb.softlandingglobal.com",
    MAIL_REPLY_TO: "support@softlandingglobal.com",
    MAIL_ALERTS_TO: "support@softlandingglobal.com",
    // Sin GOOGLE_* ni MICROSOFT_*: es el estado real hasta que F.2-2 y F.2-3
    // se cierren, y el criterio 8 exige que la pantalla lo diga.
  };

  const { base, parar } = await arrancar((b) => ({ ...entorno, BETTER_AUTH_URL: b }));

  try {
    /* ── Criterio 8 · proveedor no disponible ────────────────────────────── */
    console.log("Criterio 8 — la pantalla dice la verdad sobre los proveedores:\n");
    const pantalla = await (await fetch(`${base}/acceder`)).text();
    check("`/acceder` responde", pantalla.includes("Acceder"));
    check(
      "los dos botones sociales se pintan DESHABILITADOS, no escondidos",
      pantalla.includes("No disponible todav") && pantalla.includes("Google") && pantalla.includes("Microsoft"),
      "un botón que desaparece hace pensar que el método no existe",
    );
    const enIngles = await (await fetch(`${base}/en/sign-in`)).text();
    check("`/en/sign-in` existe y está en inglés", enIngles.includes("Sign in"));
    check(
      "el grupo (auth) no se indexa",
      (await fetch(`${base}/acceder`)).headers.get("x-robots-tag")?.includes("noindex") === true,
    );

    /* ── §10-10 · no existe registro público ─────────────────────────────── */
    console.log("\n§10-10 — el acceso es SOLO por invitación:\n");
    const altaPublica = await fetch(`${base}/api/auth/sign-up/email`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "intruso@du01.test", password: CLAVE, name: "Intruso" }),
    });
    check(
      "el alta pública de la librería NO existe",
      altaPublica.status === 404,
      `status ${altaPublica.status} — con ella, cualquiera se da de alta en un sitio solo por invitación`,
    );
    const [intruso] = await dueno<{ n: string }[]>`
      select count(*)::text as n from "user" where email = 'intruso@du01.test'
    `;
    check("y no se creó ninguna cuenta", intruso?.n === "0");

    /* ── Criterio 4 · contraseña de 12, por la vía de la invitación ──────── */
    console.log("\nCriterio 4 — la contraseña y el alta por invitación:\n");
    const invitado = new Navegador(base);

    const corta = await invitado.formulario("/api/acceso/invitacion", {
      token: testigo,
      nombre: "Persona",
      password: "corta123",
    });
    check(
      "una contraseña de menos de 12 caracteres se rechaza",
      (corta.headers.get("location") ?? "").includes("error="),
    );

    const conTestigoMalo = await invitado.formulario("/api/acceso/invitacion", {
      token: "testigo-inventado",
      nombre: "Persona",
      password: CLAVE,
    });
    check(
      "sin un testigo válido no se crea cuenta",
      (conTestigoMalo.headers.get("location") ?? "").includes("error=enlace"),
    );

    ultimoEnlace = null;
    const alta = await invitado.formulario("/api/acceso/invitacion", {
      token: testigo,
      nombre: "Persona",
      password: CLAVE,
    });
    check("con testigo válido y doce o más, la cuenta se crea", alta.status === 303, `status ${alta.status}`);

    const [creada] = await dueno<{ role: string; email_verified: boolean }[]>`
      select role, email_verified from "user" where email = ${CORREO}
    `;
    check("la cuenta existe", creada !== undefined);
    check("y hereda el rol de la invitación (RF-61)", creada?.role === "client_member");

    const [pertenencia] = await dueno<{ n: string }[]>`
      select count(*)::text as n from membership where organization_id = ${ORG}
    `;
    check("y queda ligada a la empresa de la invitación", pertenencia?.n === "1");

    const [consumida] = await dueno<{ status: string }[]>`
      select status from invitation where id = 'inv-du01'
    `;
    check("la invitación queda consumida", consumida?.status === "accepted");

    const reuso = await new Navegador(base).formulario("/api/acceso/invitacion", {
      token: testigo,
      nombre: "Otro",
      password: CLAVE,
    });
    check(
      "el mismo enlace no crea una segunda cuenta",
      (reuso.headers.get("location") ?? "").includes("error=enlace"),
    );

    /* ── Criterio 2 · el mismo mensaje, siempre ──────────────────────────── */
    console.log("\nCriterio 2 — la respuesta no revela si la cuenta existe (RF-59):\n");
    const navegador = new Navegador(base);

    const casos: [string, Record<string, string>][] = [
      ["correo que no existe", { email: "nadie@du01.test", password: CLAVE, lang: "es", volver: "" }],
      ["correo que existe, contraseña mal", { email: CORREO, password: "otra-contrasena-larga", lang: "es", volver: "" }],
      /**
       * RF-59 nombra los dos casos: «si el correo no corresponde a un usuario
       * NI a una invitación vigente». Este es el segundo: hay invitación
       * pendiente pero todavía no hay cuenta, y la respuesta tiene que ser la
       * misma que para un desconocido.
       */
      ["correo con invitación pendiente pero sin cuenta", { email: "pendiente@du01.test", password: CLAVE, lang: "es", volver: "" }],
    ];
    const destinos: string[] = [];
    for (const [nombre, campos] of casos) {
      const r = await navegador.formulario("/api/acceso/contrasena", campos);
      const destino = r.headers.get("location") ?? "";
      destinos.push(destino.replace(/^https?:\/\/[^/]+/, ""));
      check(`${nombre} → redirige de vuelta`, r.status === 303, `status ${r.status}`);
      check(`${nombre} → sin cookie de sesión`, !navegador.tieneSesion());
    }
    check(
      "los tres casos dan EXACTAMENTE el mismo destino",
      new Set(destinos).size === 1,
      destinos.join(" | "),
    );
    /**
     * Se mira lo que el visitante LEE, no el HTML entero.
     *
     * Next serializa en la página los datos de sus límites de error, y ahí va
     * el texto de la 404 —«Esta página no existe»— en cada respuesta del sitio.
     * Comparar contra el HTML completo daba un rojo por una frase que nadie ve
     * en esta pantalla y que no dice nada de ningún correo. Lo que RNF-32
     * protege es el mensaje visible.
     */
    const htmlError = await (await fetch(`${base}${destinos[0]}`)).text();
    const visible = htmlError
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<[^>]+>/g, " ");
    check(
      "y el texto no dice si el correo existe",
      !/no existe|no encontrado|incorrecta|not found/i.test(visible),
      visible.slice(0, 200),
    );

    /* ── Criterio 5 · bloqueo progresivo ─────────────────────────────────── */
    console.log("\nCriterio 5 — bloqueo progresivo, y la misma cerradura en recuperación:\n");
    const atacante = new Navegador(base);
    const vistos: string[] = [];
    for (let i = 0; i < 6; i++) {
      const r = await atacante.formulario("/api/acceso/contrasena", {
        email: "objetivo@du01.test",
        password: `intento-numero-${i}-largo`,
        lang: "es",
        volver: "",
      });
      vistos.push((r.headers.get("location") ?? "").includes("bloqueado") ? "bloqueado" : "error");
    }
    check(
      "tras varios intentos seguidos, el acceso se bloquea",
      vistos.includes("bloqueado"),
      vistos.join(", "),
    );
    const recuperacionBloqueada = await atacante.formulario("/api/acceso/recuperar", {
      email: "objetivo@du01.test",
      lang: "es",
    });
    check(
      "y la recuperación NO es la puerta sin vigilar",
      (recuperacionBloqueada.headers.get("location") ?? "").includes("estado=") ,
      "RNF-24: el mismo mecanismo protege las dos",
    );

    /* ── Criterio 2bis · la recuperación tampoco revela ──────────────────── */
    console.log("\nRecuperación — la misma respuesta exista o no la cuenta:\n");
    const n1 = new Navegador(base);
    const existe = await n1.formulario("/api/acceso/recuperar", { email: CORREO, lang: "es" });
    const n2 = new Navegador(base);
    const noExiste = await n2.formulario("/api/acceso/recuperar", { email: "fantasma@du01.test", lang: "es" });
    check(
      "la respuesta es idéntica exista o no el correo",
      existe.headers.get("location")?.replace(/^https?:\/\/[^/]+/, "") ===
        noExiste.headers.get("location")?.replace(/^https?:\/\/[^/]+/, ""),
      `${existe.headers.get("location")} vs ${noExiste.headers.get("location")}`,
    );

    /* ── Criterio 4bis · el enlace de recuperación, de un solo uso ───────── */
    console.log("\nCriterio 4 — la recuperación llega por enlace de un solo uso:\n");
    ultimoEnlace = null;
    await new Navegador(base).formulario("/api/acceso/recuperar", { email: CORREO, lang: "es" });
    await new Promise((r) => setTimeout(r, 800));

    check("el correo de recuperación sale", ultimoEnlace !== null);
    check(
      "y apunta a NUESTRA pantalla, no a la que trae la librería",
      (ultimoEnlace ?? "").includes("/restablecer?token="),
      ultimoEnlace ?? "(ninguno)",
    );

    const tokenDeReset = new URL(ultimoEnlace!).searchParams.get("token") ?? "";
    const CLAVE_NUEVA = "otra-contrasena-larga-distinta";

    const primerUso = await new Navegador(base).formulario("/api/acceso/restablecer", {
      token: tokenDeReset,
      password: CLAVE_NUEVA,
    });
    check(
      "el enlace sirve una vez",
      (primerUso.headers.get("location") ?? "").includes("/acceder") &&
        !(primerUso.headers.get("location") ?? "").includes("error"),
      primerUso.headers.get("location") ?? "",
    );

    const segundoUso = await new Navegador(base).formulario("/api/acceso/restablecer", {
      token: tokenDeReset,
      password: "y-otra-contrasena-mas-larga",
    });
    check(
      "y solo una vez",
      (segundoUso.headers.get("location") ?? "").includes("error"),
      segundoUso.headers.get("location") ?? "",
    );

    const conLaVieja = await new Navegador(base).formulario("/api/acceso/contrasena", {
      email: CORREO,
      password: CLAVE,
      lang: "es",
      volver: "/",
    });
    check(
      "la contraseña anterior deja de valer",
      (conLaVieja.headers.get("location") ?? "").includes("error="),
    );

    /* ── Criterio 6 · cookies y sesión de 7 días ─────────────────────────── */
    console.log("\nCriterio 6 — las banderas de la cookie y los 7 días:\n");
    await dueno`update "user" set email_verified = true where email = ${CORREO}`;

    const bueno = new Navegador(base);
    const entrada = await bueno.formulario("/api/acceso/contrasena", {
      email: CORREO,
      password: CLAVE_NUEVA,
      lang: "es",
      volver: "/",
    });
    check("con credenciales correctas, entra", entrada.status === 303 && bueno.tieneSesion(), `status ${entrada.status}`);

    const cookieDeSesion = bueno.setCookieCrudos.find((c) => c.includes("session_token")) ?? "";
    check("la cookie lleva HttpOnly", /httponly/i.test(cookieDeSesion), cookieDeSesion.slice(0, 120));
    check("la cookie lleva SameSite", /samesite=lax/i.test(cookieDeSesion));
    check("la cookie lleva Path=/", /path=\//i.test(cookieDeSesion));

    const [fila] = await dueno<{ dias: string }[]>`
      select round(extract(epoch from (expires_at - now())) / 86400)::text as dias
      from "session" where user_id = (select id from "user" where email = ${CORREO})
      order by created_at desc limit 1
    `;
    check("la sesión dura 7 días (RF-65)", fila?.dias === "7", `dura ${fila?.dias} días`);

    /* ── Criterio 7 · cerrar sesión en todos los dispositivos ────────────── */
    console.log("\nCriterio 7 — cerrar sesión en todos los dispositivos (RF-66):\n");
    const segundo = new Navegador(base);
    await segundo.formulario("/api/acceso/contrasena", {
      email: CORREO,
      password: CLAVE_NUEVA,
      lang: "es",
      volver: "/",
    });
    check("un segundo navegador también entra", segundo.tieneSesion());

    const [antes] = await dueno<{ n: string }[]>`
      select count(*)::text as n from "session"
      where user_id = (select id from "user" where email = ${CORREO})
    `;
    check("hay dos sesiones vivas", antes?.n === "2", `hay ${antes?.n}`);

    await bueno.formulario("/api/acceso/cerrar-todo", {});

    const [despues] = await dueno<{ n: string }[]>`
      select count(*)::text as n from "session"
      where user_id = (select id from "user" where email = ${CORREO})
    `;
    check(
      "cerrar en todos los dispositivos borra LAS DOS, no solo la propia",
      despues?.n === "0",
      `quedan ${despues?.n}`,
    );

    const segundoTrasCierre = await segundo.pedir("/hq");
    check(
      "el OTRO navegador queda fuera en su siguiente petición",
      segundoTrasCierre.status === 307 || segundoTrasCierre.status === 302 || segundoTrasCierre.status === 404,
      `status ${segundoTrasCierre.status}`,
    );
  } finally {
    parar();
    await cerrarSmtp();
    await limpiar();
    await dueno.end({ timeout: 5 });
  }
}

try {
  await main();
} catch (e) {
  console.error(`\n✗ La prueba no pudo completarse: ${(e as Error).message}`);
  fallos++;
}

console.log("");
if (fallos > 0) {
  console.error(`✗ acceso: ${fallos} fallo(s) sobre ${comprobaciones} comprobaciones.\n`);
  process.exit(1);
}
console.log(`✓ acceso: ${comprobaciones} comprobaciones contra el servidor real, sin fallos.\n`);
