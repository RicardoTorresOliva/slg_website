/**
 * plataformas.ts — **Las conversaciones reales del comando de secretos**, y su
 * doble para `--simular`.
 *
 * TRES REGLAS QUE CUMPLE CADA FUNCIÓN DE ESTE ARCHIVO:
 *
 *   1. **Ningún valor secreto va en la línea de comandos.** Los argumentos de un
 *      proceso los ve cualquiera con `ps` mientras dura, y los que escribe una
 *      persona acaban en el historial del intérprete. Los valores viajan por la
 *      entrada estándar (`vercel env add`, `security -i`) o en un archivo
 *      temporal con permisos 0600 que se borra al terminar (`supabase db query`).
 *      La prueba lo comprueba con dobles de las tres CLI que apuntan sus
 *      argumentos.
 *   2. **Ninguna salida de una CLI se imprime tal cual.** Se captura y solo se
 *      enseña un trozo si falla, y aun así pasa por el barrido de `nucleo.ts`.
 *   3. **Cada fallo que se reconoce sale explicado** (`ErrorGuiado`): qué pasó y
 *      qué pegar a continuación. Quien ejecuta esto no es programador.
 *
 * POR QUÉ LA CLI Y NO LA API, EN CADA CASO:
 *   · Vercel y Supabase: sus CLI ya tienen **la sesión de Ricardo** en este Mac.
 *     Usar su API exigiría un testigo más que pedir, guardar y rotar.
 *   · Resend y UptimeRobot: no hay CLI con sesión; su clave de cuenta se pide
 *     una vez y vive en el Llavero.
 *   · La base: el paquete `postgres` del propio repositorio, para **probar** que
 *     la contraseña nueva entra antes de cargarla en Vercel.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";

import postgres from "postgres";

import {
  EQUIPO_VERCEL,
  ENTORNOS,
  ErrorGuiado,
  SERVICIO_LLAVERO,
  type Dependencias,
  type Entorno,
  type Monitor,
  type RegistroDns,
} from "./nucleo.ts";

type Resultado = { codigo: number; salida: string; error: string };

/**
 * Lanza un proceso y espera. **Sin shell**: los argumentos van tal cual al
 * programa, así que nada de lo que contengan se interpreta. La entrada, si la
 * hay, se escribe y se cierra — sin salto de línea final, porque
 * `vercel env add` guardaría el salto dentro del valor.
 */
function correr(
  programa: string,
  args: readonly string[],
  opciones: { entrada?: string; cwd?: string; env?: NodeJS.ProcessEnv } = {},
): Promise<Resultado> {
  return new Promise((resolve) => {
    const hijo = spawn(programa, args, {
      cwd: opciones.cwd,
      env: opciones.env ?? process.env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let salida = "";
    let error = "";
    hijo.stdout.on("data", (b: Buffer) => (salida += b.toString("utf8")));
    hijo.stderr.on("data", (b: Buffer) => (error += b.toString("utf8")));
    hijo.on("error", (e) => resolve({ codigo: 127, salida, error: `${error}\n${e.message}` }));
    hijo.on("close", (codigo) => resolve({ codigo: codigo ?? 1, salida, error }));
    if (opciones.entrada !== undefined) hijo.stdin.end(opciones.entrada);
    else hijo.stdin.end();
  });
}

/**
 * Las últimas líneas de lo que dijo una CLI, para contar el fallo sin inundar.
 * Se recorta **por líneas enteras, nunca por caracteres**: un corte a mitad de
 * línea puede partir un valor secreto que la CLI haya repetido, y medio secreto
 * ya no lo reconoce el barrido de `nucleo.ts`.
 */
function cola(r: Resultado): string {
  const lineas = `${r.error}\n${r.salida}`.trim().split("\n").filter((l) => l.trim());
  let ultimas = lineas.slice(-4);
  while (ultimas.length > 1 && ultimas.join(" | ").length > 600) ultimas = ultimas.slice(1);
  return ultimas.join(" | ");
}

// ─── Vercel ──────────────────────────────────────────────────────────────────

/**
 * El entorno de la CLI de Vercel **sin** `VERCEL_ORG_ID` ni `VERCEL_PROJECT_ID`:
 * si Ricardo los tuviera exportados de otra cosa, mandarían sobre `--project` y
 * los secretos irían a otro proyecto. Y el directorio de trabajo es uno vacío,
 * no el repositorio: la carpeta `.vercel` de `slg_website` apunta a producción
 * de SLG.
 */
function entornoVercel(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env.VERCEL_ORG_ID;
  delete env.VERCEL_PROJECT_ID;
  return env;
}

let neutra: string | null = null;
function carpetaNeutra(): string {
  if (!neutra) {
    const creada = fs.mkdtempSync(path.join(os.tmpdir(), "sitio-vercel-"));
    neutra = creada;
    process.on("exit", () => fs.rmSync(creada, { recursive: true, force: true }));
  }
  return neutra;
}

const SIN_SESION_VERCEL = new ErrorGuiado(
  "La CLI de Vercel no tiene sesión abierta en este Mac.",
  "en esta misma Terminal pega  vercel login  y pulsa Enter; elige «Continue with GitHub» y autoriza en el navegador. Cuando la Terminal diga «Congratulations», vuelve a pegar la línea del comando de secretos.",
);

/** Saca de la salida JSON de `vercel env ls` los nombres y sus entornos. */
export function leerVariablesDeVercel(json: string): Map<string, Set<Entorno>> {
  const mapa = new Map<string, Set<Entorno>>();
  let datos: unknown;
  try {
    datos = JSON.parse(json);
  } catch {
    throw new Error("La CLI de Vercel no devolvió JSON al listar las variables.");
  }
  const lista: unknown[] = Array.isArray(datos)
    ? datos
    : Array.isArray((datos as { envs?: unknown[] })?.envs)
      ? (datos as { envs: unknown[] }).envs
      : [];
  for (const v of lista) {
    const { key, target } = (v ?? {}) as { key?: unknown; target?: unknown };
    if (typeof key !== "string") continue;
    const destinos = (Array.isArray(target) ? target : [target]).filter(
      (t): t is Entorno => t === "production" || t === "preview",
    );
    const e = mapa.get(key) ?? new Set<Entorno>();
    for (const t of destinos) e.add(t);
    mapa.set(key, e);
  }
  return mapa;
}

// ─── Supabase ────────────────────────────────────────────────────────────────

/**
 * La CLI de Supabase detecta `CLAUDECODE` y se pone en modo JSON sin prompts
 * (anotado en la memoria del proyecto el 2026-09-17). Ricardo lo ejecuta en su
 * Terminal, donde no está, pero si algún día lo lanza desde una pestaña de
 * Claude el comando tiene que comportarse igual.
 */
function entornoSupabase(ref: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, SUPABASE_PROJECT_ID: ref };
  delete env.CLAUDECODE;
  delete env.CLAUDE_CODE_ENTRYPOINT;
  return env;
}

function supabase(ref: string, args: readonly string[], cwd?: string): Promise<Resultado> {
  return correr("npx", ["--yes", "supabase", ...args, "--agent", "no"], { env: entornoSupabase(ref), cwd });
}

function errorDeSupabase(r: Resultado, que: string): Error {
  const texto = `${r.error}\n${r.salida}`;
  if (/access token|not logged in|supabase login|unauthorized/i.test(texto)) {
    return new ErrorGuiado(
      "La CLI de Supabase no tiene sesión abierta en este Mac.",
      "en esta misma Terminal pega  npx --yes supabase login  y pulsa Enter; en el navegador que se abre, clic en «Authorize»; copia el código que aparece, pégalo en la Terminal y pulsa Enter. Cuando diga «You are now logged in», vuelve a pegar la línea del comando de secretos.",
    );
  }
  if (/not found|does not exist|forbidden|403|404/i.test(texto)) {
    return new ErrorGuiado(
      `Supabase no encuentra el proyecto, o tu sesión no lo ve (${que}).`,
      "comprueba en https://supabase.com/dashboard que el proyecto del cliente existe en la organización «Softlanding Global». Si existe, copia estas líneas y pégalas en la sesión de Claude.",
    );
  }
  return new Error(`La CLI de Supabase falló al ${que}: ${cola(r)}`);
}

/**
 * Busca en la salida JSON de `supabase projects api-keys` la clave de servicio.
 * Se prefiere la **`service_role`** (JWT): es la que usa producción de SLG y la
 * única probada con `lib/files/supabase.ts`, que la manda también como
 * `Authorization: Bearer`. Si el proyecto ya no tiene claves heredadas, se
 * acepta la secreta nueva (`sb_secret_…`).
 */
export function elegirClaveDeServicio(json: string): string {
  let datos: unknown;
  try {
    datos = JSON.parse(json);
  } catch {
    throw new Error("La CLI de Supabase no devolvió JSON al pedir las claves.");
  }
  const claves: { name?: string; type?: string; api_key?: string }[] = [];
  const recorrer = (x: unknown): void => {
    if (Array.isArray(x)) x.forEach(recorrer);
    else if (x && typeof x === "object") {
      const o = x as Record<string, unknown>;
      if (typeof o.api_key === "string") claves.push(o as { name?: string; type?: string; api_key: string });
      else Object.values(o).forEach(recorrer);
    }
  };
  recorrer(datos);
  const heredada = claves.find((c) => c.name === "service_role" && c.api_key);
  const nueva = claves.find((c) => (c.type === "secret" || c.api_key?.startsWith("sb_secret_")) && c.api_key);
  const elegida = heredada?.api_key ?? nueva?.api_key;
  if (!elegida || /[•*]{4}/.test(elegida)) {
    throw new ErrorGuiado(
      "Supabase no devolvió la clave de servicio del proyecto.",
      "copia estas líneas y pégalas en la sesión de Claude.",
    );
  }
  return elegida;
}

// ─── Resend y UptimeRobot ────────────────────────────────────────────────────

async function resend(clave: string, metodo: string, ruta: string, cuerpo?: unknown): Promise<unknown> {
  const r = await fetch(`https://api.resend.com${ruta}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${clave}`, "Content-Type": "application/json", "User-Agent": "slg-sitios/1" },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    signal: AbortSignal.timeout(20_000),
  });
  const texto = await r.text();
  if (r.status === 401 || (r.status === 403 && /api key|restricted|permission/i.test(texto))) {
    throw new ErrorGuiado(
      "Resend rechaza la clave guardada (revocada, o sin permiso «Full access»).",
      "crea una nueva en https://resend.com/api-keys (nombre slg-sitios, permiso Full access) y vuelve a pegar la línea del comando de secretos añadiendo al final un espacio y  -- --cambiar-claves",
    );
  }
  if (r.status === 403 && /limit|plan|upgrade/i.test(texto)) {
    throw new ErrorGuiado(
      "Tu plan de Resend no admite otro dominio de envío.",
      "es una compra: decide en https://resend.com/settings/billing si subes de plan. Si subes, vuelve a pegar la misma línea; si no, dilo en la sesión de Claude.",
    );
  }
  if (!r.ok) throw new Error(`Resend respondió ${r.status} en ${metodo} ${ruta}: ${texto.slice(0, 200)}`);
  return texto ? JSON.parse(texto) : {};
}

type RegistroResend = { record?: string; name?: string; type?: string; value?: string; priority?: number; status?: string };

function registrosDeResend(d: { records?: RegistroResend[] }): RegistroDns[] {
  return (d.records ?? []).map((r) => ({
    tipo: r.type ?? "?",
    nombre: r.name ?? "?",
    valor: r.value ?? "?",
    prioridad: r.priority,
    estado: r.status,
  }));
}

async function uptime(clave: string, metodo: string, campos: Record<string, string> = {}): Promise<Record<string, unknown>> {
  const r = await fetch(`https://api.uptimerobot.com/v2/${metodo}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Cache-Control": "no-cache" },
    body: new URLSearchParams({ api_key: clave, format: "json", ...campos }).toString(),
    signal: AbortSignal.timeout(20_000),
  });
  const datos = (await r.json().catch(() => ({}))) as Record<string, unknown>;
  if (datos.stat !== "ok") {
    const e = JSON.stringify(datos.error ?? datos).slice(0, 200);
    if (/api_key/i.test(e)) {
      throw new ErrorGuiado(
        "UptimeRobot rechaza la clave guardada.",
        "crea una «Main API key» en https://dashboard.uptimerobot.com/integrations → API y vuelve a pegar la línea del comando de secretos añadiendo al final un espacio y  -- --cambiar-claves",
      );
    }
    throw new Error(`UptimeRobot respondió con error en ${metodo}: ${e}`);
  }
  return datos;
}

// ─── Entrada oculta ──────────────────────────────────────────────────────────

/**
 * Pide un valor **sin eco**: lo que se pega no aparece en la pantalla, ni
 * siquiera como asteriscos (un asterisco por carácter ya dice la longitud).
 */
function pedirOculto(pregunta: string): Promise<string> {
  const entrada = process.stdin;
  if (!entrada.isTTY) {
    return Promise.reject(
      new ErrorGuiado(
        "Esta ventana no admite escribir una clave oculta.",
        "abre la app Terminal (Aplicaciones → Utilidades → Terminal) y pega allí la línea del comando de secretos.",
      ),
    );
  }
  process.stdout.write(pregunta);
  return new Promise((resolve, reject) => {
    let valor = "";
    entrada.setRawMode(true);
    entrada.resume();
    const alTeclear = (b: Buffer): void => {
      for (const ch of b.toString("utf8")) {
        if (ch === "\r" || ch === "\n") {
          terminar();
          process.stdout.write("\n");
          resolve(valor);
          return;
        }
        if (ch === "\u0003") {
          terminar();
          process.stdout.write("\n");
          reject(new ErrorGuiado("Cancelado con Ctrl + C.", "vuelve a pegar la línea cuando quieras."));
          return;
        }
        if (ch === "\u007f" || ch === "\b") valor = valor.slice(0, -1);
        else valor += ch;
      }
    };
    const terminar = (): void => {
      entrada.off("data", alTeclear);
      entrada.setRawMode(false);
      entrada.pause();
    };
    entrada.on("data", alTeclear);
  });
}

// ─── Las dependencias reales ─────────────────────────────────────────────────

export function plataformasReales(salida: (l: string) => void): Dependencias {
  return {
    salida,
    aleatorio: (n) => crypto.randomBytes(n),
    esperar: (ms) => new Promise((r) => setTimeout(r, ms)),
    pedirOculto,

    llavero: {
      async leer(cuenta) {
        const r = await correr("security", ["find-generic-password", "-s", SERVICIO_LLAVERO, "-a", cuenta, "-w"]);
        if (r.codigo === 0) return r.salida.replace(/\n$/, "") || null;
        // 44 = «no está en el Llavero»: la primera vez, que es lo normal.
        if (r.codigo === 44) return null;
        throw new ErrorGuiado(
          `No se pudo leer el Llavero (${cola(r)}).`,
          "si macOS mostró una ventana pidiendo permiso, vuelve a pegar la línea y pulsa «Permitir siempre».",
        );
      },
      async guardar(cuenta, valor) {
        /**
         * `security add-generic-password -w <valor>` pondría la clave en los
         * argumentos. El modo interactivo (`security -i`) lee la orden de la
         * entrada estándar, así que la clave no aparece en `ps`. Como la orden
         * se interpreta con comillas, se rechaza cualquier valor que pudiera
         * cerrarlas: las claves de Resend y UptimeRobot no llevan ni comillas
         * ni barras.
         */
        if (!/^[A-Za-z0-9_.-]+$/.test(valor)) {
          throw new ErrorGuiado("La clave tiene caracteres inesperados y no se guarda.", "comprueba que la copiaste entera, sin espacios, y vuelve a pegar la línea.");
        }
        const r = await correr("security", ["-i"], {
          entrada: `add-generic-password -U -s ${SERVICIO_LLAVERO} -a ${cuenta} -w "${valor}"\n`,
        });
        if (r.codigo !== 0 || /error/i.test(r.error)) {
          throw new ErrorGuiado(`No se pudo guardar en el Llavero (${cola(r)}).`, "copia estas líneas y pégalas en la sesión de Claude.");
        }
      },
    },

    vercel: {
      async comprobarSesion() {
        const r = await correr("vercel", ["whoami", "--non-interactive"], { env: entornoVercel(), cwd: carpetaNeutra() });
        if (r.codigo !== 0) throw SIN_SESION_VERCEL;
      },
      async variablesPresentes(proyecto) {
        const r = await correr(
          "vercel",
          ["env", "ls", "--project", proyecto, "--scope", EQUIPO_VERCEL, "--format", "json", "--non-interactive"],
          { env: entornoVercel(), cwd: carpetaNeutra() },
        );
        if (r.codigo !== 0) {
          if (/not found|no project|does not exist/i.test(`${r.error}${r.salida}`)) {
            throw new ErrorGuiado(
              `Vercel no encuentra el proyecto «${proyecto}» en el equipo de Softlanding Global.`,
              "comprueba en https://vercel.com que el proyecto existe (lo crea Claude en el paso 5 de crear-sitio). Si existe, copia estas líneas y pégalas en la sesión de Claude.",
            );
          }
          if (/log ?in|credentials|token/i.test(`${r.error}${r.salida}`)) throw SIN_SESION_VERCEL;
          throw new Error(`vercel env ls falló: ${cola(r)}`);
        }
        return leerVariablesDeVercel(r.salida);
      },
      async anadir(proyecto, nombre, valor, sensible) {
        const r = await correr(
          "vercel",
          [
            "env",
            "add",
            nombre,
            ENTORNOS.join(","),
            "--project",
            proyecto,
            "--scope",
            EQUIPO_VERCEL,
            sensible ? "--sensitive" : "--no-sensitive",
            "--force",
            "--yes",
            "--non-interactive",
          ],
          { entrada: valor, env: entornoVercel(), cwd: carpetaNeutra() },
        );
        if (r.codigo !== 0) throw new Error(`Vercel no aceptó ${nombre}: ${cola(r)}`);
      },
    },

    supabase: {
      async ejecutarSql(ref, sql) {
        const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), "sitio-sql-"));
        const archivo = path.join(carpeta, "orden.sql");
        try {
          fs.writeFileSync(archivo, sql, { mode: 0o600 });
          const r = await supabase(ref, ["db", "query", "--linked", "--project-ref", ref, "--file", archivo], carpeta);
          if (r.codigo !== 0) throw errorDeSupabase(r, "cambiar las contraseñas de la base");
        } finally {
          fs.rmSync(carpeta, { recursive: true, force: true });
        }
      },
      async claveDeServicio(ref) {
        const r = await supabase(ref, ["projects", "api-keys", "--project-ref", ref, "--reveal", "--output", "json"]);
        if (r.codigo !== 0) throw errorDeSupabase(r, "leer la clave de servicio");
        return elegirClaveDeServicio(r.salida);
      },
    },

    base: {
      async probar(url) {
        const sql = postgres(url, { max: 1, prepare: false, connect_timeout: 15, onnotice: () => {} });
        try {
          const filas = (await sql`select current_user as usuario, current_setting('is_superuser') as super`) as unknown as {
            usuario: string;
            super: string;
          }[];
          return { usuario: filas[0]?.usuario ?? "?", superusuario: filas[0]?.super === "on" };
        } finally {
          await sql.end({ timeout: 5 }).catch(() => {});
        }
      },
    },

    resend: {
      async comprobarClave(clave) {
        await resend(clave, "GET", "/domains");
      },
      async buscarOCrearDominio(clave, nombre, region) {
        const lista = (await resend(clave, "GET", "/domains")) as { data?: { id: string; name: string }[] };
        const existente = (lista.data ?? []).find((x) => x.name === nombre);
        if (existente) {
          const d = (await resend(clave, "GET", `/domains/${existente.id}`)) as { id: string; status?: string; records?: RegistroResend[] };
          return { id: d.id, estado: d.status ?? "?", creado: false, registros: registrosDeResend(d) };
        }
        const d = (await resend(clave, "POST", "/domains", { name: nombre, region })) as {
          id: string;
          status?: string;
          records?: RegistroResend[];
        };
        return { id: d.id, estado: d.status ?? "not_started", creado: true, registros: registrosDeResend(d) };
      },
      async crearClaveDeEnvio(clave, nombre, dominioId) {
        const d = (await resend(clave, "POST", "/api-keys", { name: nombre, permission: "sending_access", domain_id: dominioId })) as {
          token?: string;
        };
        if (!d.token) throw new Error("Resend no devolvió la clave de envío.");
        return d.token;
      },
    },

    uptime: {
      async comprobarClave(clave) {
        await uptime(clave, "getAccountDetails");
      },
      async buscarMonitor(clave, url) {
        const host = new URL(url).hostname;
        const d = await uptime(clave, "getMonitors", { search: host });
        const m = ((d.monitors as { id: number; url: string; status: number }[] | undefined) ?? []).find((x) => x.url === url);
        return m ? { id: String(m.id), pausado: m.status === 0 } : null;
      },
      async crearMonitor(clave, datos): Promise<Monitor> {
        /**
         * Tipo 2 = «palabra clave», y `keyword_type` 2 = avisar si NO aparece.
         * Así un 200 que sirve una página de error no cuenta como vivo
         * (`deployment.md` §5.1). Se enlazan todos los contactos de alerta de
         * la cuenta: un monitor sin contactos está en rojo y no avisa a nadie.
         */
        const contactos = await uptime(clave, "getAlertContacts");
        const ids = ((contactos.alert_contacts as { id: string | number }[] | undefined) ?? []).map((c) => `${c.id}_0_0`);
        const d = await uptime(clave, "newMonitor", {
          type: "2",
          url: datos.url,
          friendly_name: datos.nombre,
          interval: "300",
          keyword_type: "2",
          keyword_value: '"status":"ok"',
          ...(ids.length > 0 ? { alert_contacts: ids.join("-") } : {}),
        });
        const id = String((d.monitor as { id: number } | undefined)?.id ?? "");
        if (!id) throw new Error("UptimeRobot no devolvió el monitor creado.");
        if (datos.pausado) await uptime(clave, "editMonitor", { id, status: "0" });
        return { id, pausado: datos.pausado };
      },
      async reanudar(clave, id) {
        await uptime(clave, "editMonitor", { id, status: "1" });
      },
    },

    async sitioEnLinea(url) {
      try {
        const r = await fetch(url, { signal: AbortSignal.timeout(8_000), redirect: "follow" });
        return r.ok && (await r.text()).includes('"status":"ok"');
      } catch {
        return false;
      }
    },
  };
}

// ─── Las dependencias de `--simular` ─────────────────────────────────────────

/**
 * Recorren **el mismo** `ejecutar` que las reales y en vez de llamar dicen qué
 * harían. No leen el Llavero, no abren procesos, no tocan la red: la prueba lo
 * comprueba con dobles de `vercel`, `npx` y `security` que apuntan cualquier
 * llamada, y con un `fetch` que falla si alguien lo usa.
 */
export function plataformasSimuladas(salida: (l: string) => void): Dependencias {
  const s = (texto: string): void => salida(`  [simulación] ${texto}`);
  const falso = (prefijo: string): string => `${prefijo}${crypto.randomBytes(12).toString("hex")}`;
  return {
    salida,
    aleatorio: (n) => crypto.randomBytes(n),
    esperar: async () => {},
    async pedirOculto(pregunta) {
      s(`pediría con entrada oculta: «${pregunta.trim()}»`);
      return falso("re_simulada_");
    },
    llavero: {
      async leer(cuenta) {
        s(`leería «${cuenta}» del Llavero (servicio ${SERVICIO_LLAVERO}); se supone que no está.`);
        return null;
      },
      async guardar(cuenta) {
        s(`guardaría «${cuenta}» en el Llavero con  security -i  (el valor por la entrada, no en la línea).`);
      },
    },
    vercel: {
      async comprobarSesion() {
        s("comprobaría la sesión con  vercel whoami.");
      },
      async variablesPresentes(proyecto) {
        s(`listaría las variables de ${proyecto} con  vercel env ls --format json; se supone que no hay ninguna.`);
        return new Map();
      },
      async anadir(proyecto, nombre, _valor, sensible) {
        s(`vercel env add ${nombre} production,preview --project ${proyecto}${sensible ? " --sensitive" : ""} (valor por la entrada estándar).`);
      },
    },
    supabase: {
      async ejecutarSql(ref) {
        s(`ALTER ROLE slg_app y postgres con verificadores SCRAM, por  supabase db query --linked --project-ref ${ref} --file <temporal 0600>.`);
      },
      async claveDeServicio(ref) {
        s(`leería la clave service_role con  supabase projects api-keys --project-ref ${ref} --reveal --output json.`);
        return falso("clave_simulada_");
      },
    },
    base: {
      async probar(url) {
        const u = new URL(url);
        s(`probaría a conectar como ${decodeURIComponent(u.username)} en ${u.host}.`);
        return { usuario: u.username.split(".")[0] ?? "?", superusuario: false };
      },
    },
    resend: {
      async comprobarClave() {
        s("comprobaría la clave de Resend con GET /domains.");
      },
      async buscarOCrearDominio(_clave, nombre, region) {
        s(`buscaría ${nombre} en Resend y, si no está, lo crearía en ${region} (POST /domains).`);
        return {
          id: "simulado",
          estado: "simulado",
          creado: true,
          registros: [{ tipo: "TXT", nombre: `(los que devuelva Resend para ${nombre})`, valor: "—" }],
        };
      },
      async crearClaveDeEnvio(_clave, nombre) {
        s(`crearía la clave de envío «${nombre}» (sending_access, solo este dominio).`);
        return falso("re_simulada_");
      },
    },
    uptime: {
      async comprobarClave() {
        s("comprobaría la clave de UptimeRobot con getAccountDetails.");
      },
      async buscarMonitor(_clave, url) {
        s(`buscaría un monitor sobre ${url}; se supone que no hay.`);
        return null;
      },
      async crearMonitor(_clave, datos) {
        s(`crearía el monitor «${datos.nombre}» (palabra clave "status":"ok", cada 5 min)${datos.pausado ? " en pausa" : ""}.`);
        return { id: "simulado", pausado: datos.pausado };
      },
      async reanudar() {
        s("activaría el monitor.");
      },
    },
    async sitioEnLinea(url) {
      s(`comprobaría si ${url} responde; se supone que aún no.`);
      return false;
    },
  };
}
