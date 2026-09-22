/**
 * test-secretos.ts — **La prueba sin red del comando de secretos** (§3 paso 8).
 *
 * LO QUE TIENE QUE DEMOSTRAR, y es lo único que importa de ese comando:
 *
 *   1. **Ningún valor secreto aparece en lo que sale por pantalla**, ni cuando
 *      todo va bien ni cuando una plataforma falla repitiendo el valor.
 *   2. **Ningún valor secreto va en la línea de comandos** de un proceso hijo:
 *      se comprueba con dobles de `vercel`, `npx` y `security` que apuntan sus
 *      argumentos y su entrada.
 *   3. **`--simular` no llama a nada**: ni procesos, ni `fetch`, ni sockets. Se
 *      ejecuta el comando de verdad, como proceso aparte, con esas tres puertas
 *      trampeadas.
 *
 * Y, de paso, lo que haría daño si fallara en silencio: que la contraseña de
 * `DATABASE_URL` es la misma que `APP_DB_PASSWORD` **y** la que corresponde al
 * verificador SCRAM que se mandó a la base; que una segunda ejecución no
 * regenera nada; que se niega a tocar los proyectos de producción de SLG.
 *
 * Sin red, sin base, sin cuentas: corre en cualquier Mac y en CI.
 *
 *   npm run test:sitio-secretos
 */
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  ENTORNOS,
  ErrorGuiado,
  GRUPO_BASE,
  POOLERS,
  SECRETOS_PROPIOS,
  ejecutar,
  urlDeAplicacion,
  validarOpciones,
  verificadorScram,
  type Dependencias,
  type Entorno,
  type Opciones,
} from "./nucleo.ts";
import { elegirClaveDeServicio, leerVariablesDeVercel, plataformasReales } from "./plataformas.ts";

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

const aleatorioHex = (n: number): string => crypto.randomBytes(n).toString("hex");

const OPCIONES: Opciones = {
  cliente: "demo",
  supabase: "abcdefghijklmnopqrst",
  vercel: "web-demo",
  dominio: "demo-cliente.com",
  simular: false,
  cambiarClaves: false,
};

// ─── 1 · SCRAM contra el vector del RFC 7677 ─────────────────────────────────
console.log("\n1 · Verificador SCRAM-SHA-256 (RFC 7677)");
{
  /**
   * El RFC da la conversación completa para el usuario «user» con contraseña
   * «pencil». Con el verificador que genera `verificadorScram` se reconstruyen
   * la prueba del cliente y la firma del servidor, y tienen que salir las del
   * RFC byte a byte. Si el verificador estuviera mal, PostgreSQL rechazaría la
   * contraseña y el sitio no conectaría: esto lo descubre sin base.
   */
  const sal = Buffer.from("W22ZaJ0SNY7soEsUEjb6gQ==", "base64");
  const v = verificadorScram("pencil", sal);
  const m = /^SCRAM-SHA-256\$4096:([^$]+)\$([^:]+):(.+)$/.exec(v);
  check("formato SCRAM-SHA-256$4096:sal$guardada:servidor", !!m, v);
  if (m) {
    const guardada = Buffer.from(m[2] ?? "", "base64");
    const servidor = Buffer.from(m[3] ?? "", "base64");
    const nonce = "rOprNGfwEbeRWgbNEkqO%hvYDpWUa2RaTCAfuxFIlj)hNlF$k0";
    const mensaje = `n=user,r=rOprNGfwEbeRWgbNEkqO,r=${nonce},s=W22ZaJ0SNY7soEsUEjb6gQ==,i=4096,c=biws,r=${nonce}`;
    const firmaServidor = crypto.createHmac("sha256", servidor).update(mensaje).digest("base64");
    check("firma del servidor igual a la del RFC", firmaServidor === "6rriTRBi23WpRR/wtup+mMhUZUn/dB5nLTJRsjl95G4=", firmaServidor);
    const salada = crypto.pbkdf2Sync("pencil", sal, 4096, 32, "sha256");
    const claveCliente = crypto.createHmac("sha256", salada).update("Client Key").digest();
    const firmaCliente = crypto.createHmac("sha256", guardada).update(mensaje).digest();
    const prueba = Buffer.from(claveCliente.map((b, i) => b ^ (firmaCliente[i] ?? 0))).toString("base64");
    check("prueba del cliente igual a la del RFC", prueba === "dHzbZapWIk4jUhN+Ute9ytag9zjfMHgsqmmiz7AndVQ=", prueba);
  }
}

// ─── 2 · Validación de los datos ─────────────────────────────────────────────
console.log("\n2 · Validación de los datos de entrada");
check("datos correctos pasan", validarOpciones(OPCIONES).length === 0);
check("rechaza la base de producción de SLG", validarOpciones({ ...OPCIONES, supabase: "jadrwpbgtshwqanrhjxp" }).length === 1);
check("rechaza el proyecto de producción de SLG", validarOpciones({ ...OPCIONES, vercel: "slg-website" }).length === 1);
check("rechaza un dominio con https://", validarOpciones({ ...OPCIONES, dominio: "https://demo.com" }).length === 1);
check("rechaza una referencia mal copiada", validarOpciones({ ...OPCIONES, supabase: "abc" }).length === 1);
check("rechaza un cliente con espacios", validarOpciones({ ...OPCIONES, cliente: "Acme Legal" }).length === 1);

// ─── Dobles en memoria de las cinco plataformas ──────────────────────────────

type Guardada = { valor: string; sensible: boolean; entornos: Set<Entorno> };

function dobles(
  o: {
    almacen?: Map<string, Guardada>;
    llavero?: Map<string, string>;
    poolersQueFallan?: readonly string[];
    anadirLanza?: (nombre: string, valor: string) => void;
  } = {},
) {
  const almacen = o.almacen ?? new Map<string, Guardada>();
  const llavero = o.llavero ?? new Map<string, string>();
  const lineas: string[] = [];
  const sqls: string[] = [];
  const llamadas: string[] = [];
  const pedidas: string[] = [];
  const verificadores = new Map<string, string>();
  const claves = {
    // Se arman en ejecución: un literal con esta forma haría saltar `check:secrets`.
    servicio: ["eyJ", aleatorioHex(12), ".eyJ", aleatorioHex(20), ".", aleatorioHex(16)].join(""),
    resendCuenta: "re_" + aleatorioHex(16),
    uptime: "u" + aleatorioHex(14),
    envio: "re_" + aleatorioHex(16),
  };
  const monitores: { url: string; pausado: boolean }[] = [];

  const d: Dependencias = {
    salida: (l) => lineas.push(l),
    aleatorio: (n) => crypto.randomBytes(n),
    esperar: async () => {},
    async pedirOculto(pregunta) {
      pedidas.push(pregunta);
      return /Resend/.test(pregunta) ? claves.resendCuenta : claves.uptime;
    },
    llavero: {
      async leer(c) {
        return llavero.get(c) ?? null;
      },
      async guardar(c, v) {
        llavero.set(c, v);
      },
    },
    vercel: {
      async comprobarSesion() {
        llamadas.push("vercel.sesion");
      },
      async variablesPresentes() {
        return new Map([...almacen].map(([k, v]) => [k, new Set(v.entornos)]));
      },
      async anadir(_p, nombre, valor, sensible) {
        llamadas.push(`vercel.anadir ${nombre}`);
        o.anadirLanza?.(nombre, valor);
        almacen.set(nombre, { valor, sensible, entornos: new Set(ENTORNOS) });
      },
    },
    supabase: {
      async ejecutarSql(_r, sql) {
        sqls.push(sql);
        for (const m of sql.matchAll(/ALTER ROLE (\w+)[^']*'([^']+)'/g)) verificadores.set(m[1] ?? "", m[2] ?? "");
      },
      async claveDeServicio() {
        return claves.servicio;
      },
    },
    base: {
      /**
       * La base de mentira hace lo que haría PostgreSQL: coge la contraseña de
       * la URL, la pica con la sal del verificador que recibió y compara. Si la
       * contraseña de `DATABASE_URL` no es la del `ALTER ROLE`, no entra.
       */
      async probar(url) {
        const u = new URL(url);
        if (o.poolersQueFallan?.includes(u.hostname)) throw new Error("Tenant or user not found");
        const rol = decodeURIComponent(u.username).split(".")[0] ?? "";
        const v = verificadores.get(rol);
        const sal = v ? Buffer.from(/:([^$]+)\$/.exec(v)?.[1] ?? "", "base64") : Buffer.alloc(0);
        if (!v || verificadorScram(decodeURIComponent(u.password), sal) !== v) {
          throw new Error(`password authentication failed for user "${u.username}" (${u.password})`);
        }
        return { usuario: rol, superusuario: false };
      },
    },
    resend: {
      async comprobarClave(c) {
        if (c !== claves.resendCuenta) throw new ErrorGuiado("clave mala", "—");
      },
      async buscarOCrearDominio(_c, nombre) {
        return {
          id: "dom_1",
          estado: "not_started",
          creado: true,
          registros: [{ tipo: "MX", nombre: `send.${nombre}`, valor: "feedback-smtp.sa-east-1.amazonses.com", prioridad: 10 }],
        };
      },
      async crearClaveDeEnvio() {
        llamadas.push("resend.claveDeEnvio");
        return claves.envio;
      },
    },
    uptime: {
      async comprobarClave() {},
      async buscarMonitor(_c, url) {
        const m = monitores.find((x) => x.url === url);
        return m ? { id: "1", pausado: m.pausado } : null;
      },
      async crearMonitor(_c, datos) {
        llamadas.push("uptime.crear");
        monitores.push({ url: datos.url, pausado: datos.pausado });
        return { id: "1", pausado: datos.pausado };
      },
      async reanudar() {
        llamadas.push("uptime.reanudar");
      },
    },
    sitioEnLinea: async () => false,
  };
  return { d, almacen, llavero, lineas, sqls, llamadas, pedidas, claves, monitores };
}

/** Todos los valores que NO pueden salir por pantalla en una ejecución. */
function valoresSecretos(x: ReturnType<typeof dobles>): string[] {
  return [
    ...[...x.almacen].filter(([k, v]) => v.sensible && k !== "MAIL_SMTP_USERNAME").map(([, v]) => v.valor),
    ...x.llavero.values(),
    x.claves.servicio,
    x.claves.envio,
  ];
}

function filtradosEn(texto: string, valores: string[]): string[] {
  return valores.filter((v) => v.length >= 8 && texto.includes(v)).map((v) => `${v.slice(0, 4)}…(${v.length})`);
}

// ─── 3 · Recorrido completo ──────────────────────────────────────────────────
console.log("\n3 · Recorrido completo con dobles en memoria");
const primera = dobles();
{
  const codigo = await ejecutar(OPCIONES, primera.d);
  const texto = primera.lineas.join("\n");
  check("termina con código 0", codigo === 0, texto.slice(-600));

  const esperadas = [...GRUPO_BASE, ...SECRETOS_PROPIOS.map((s) => s.nombre), "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "MAIL_SMTP_USERNAME", "MAIL_SMTP_PASSWORD"];
  const faltan = esperadas.filter((n) => !primera.almacen.get(n)?.entornos.has("production") || !primera.almacen.get(n)?.entornos.has("preview"));
  check("carga las 13 variables en Production y Preview", faltan.length === 0, `faltan: ${faltan.join(", ")}`);
  check("solo SUPABASE_URL va como no secreta", [...primera.almacen].filter(([, v]) => !v.sensible).map(([k]) => k).join() === "SUPABASE_URL");

  const filtrados = filtradosEn(texto, valoresSecretos(primera));
  check("NINGÚN valor secreto aparece en la salida", filtrados.length === 0, filtrados.join(", "));

  const app = primera.almacen.get("DATABASE_URL")?.valor ?? "";
  const dueno = primera.almacen.get("DATABASE_URL_MIGRATIONS")?.valor ?? "";
  const clave = primera.almacen.get("APP_DB_PASSWORD")?.valor ?? "";
  const uApp = new URL(app);
  const uDueno = new URL(dueno);
  check("DATABASE_URL: slg_app.<ref> por el pooler en modo transacción (6543)", uApp.username === "slg_app.abcdefghijklmnopqrst" && uApp.port === "6543" && uApp.hostname === POOLERS[0], app.replace(uApp.password, "***"));
  check("DATABASE_URL_MIGRATIONS: postgres.<ref> en modo sesión (5432)", uDueno.username === "postgres.abcdefghijklmnopqrst" && uDueno.port === "5432");
  check("la contraseña de DATABASE_URL es APP_DB_PASSWORD", uApp.password === clave && clave.length >= 32);
  check("las contraseñas son solo hexadecimales (no rompen la URL)", /^[0-9a-f]{48}$/.test(uApp.password) && /^[0-9a-f]{48}$/.test(uDueno.password));
  check("la del sitio y la del dueño son distintas", uApp.password !== uDueno.password);
  const sql = primera.sqls.join("\n");
  check("la orden a la base lleva verificadores SCRAM, no contraseñas", /slg_app WITH LOGIN PASSWORD 'SCRAM-SHA-256\$4096:/.test(sql) && /postgres WITH PASSWORD 'SCRAM-SHA-256\$4096:/.test(sql));
  check("…y ninguna contraseña en claro", !sql.includes(uApp.password) && !sql.includes(uDueno.password));
  check("pide las dos claves de cuenta la primera vez y las guarda", primera.pedidas.length === 2 && primera.llavero.size === 2);
  check("el monitor se crea en pausa (el dominio aún no responde)", primera.monitores.length === 1 && primera.monitores[0]?.pausado === true && primera.monitores[0]?.url === "https://demo-cliente.com/api/health");
  check("imprime los registros DNS (no son secretos)", texto.includes("feedback-smtp.sa-east-1.amazonses.com"));
  check("MAIL_SMTP_PASSWORD es la clave de solo envío, no la de cuenta", primera.almacen.get("MAIL_SMTP_PASSWORD")?.valor === primera.claves.envio);
}

// ─── 4 · Segunda ejecución: no regenera nada ─────────────────────────────────
console.log("\n4 · Idempotencia");
{
  const antes = new Map([...primera.almacen].map(([k, v]) => [k, v.valor]));
  const segunda = dobles({ almacen: primera.almacen, llavero: primera.llavero });
  segunda.claves.resendCuenta = primera.claves.resendCuenta;
  segunda.monitores.push(...primera.monitores);
  const codigo = await ejecutar(OPCIONES, segunda.d);
  check("termina con código 0", codigo === 0);
  check("no añade ninguna variable", !segunda.llamadas.some((l) => l.startsWith("vercel.anadir")), segunda.llamadas.join(", "));
  check("no toca la base", segunda.sqls.length === 0);
  check("no crea otra clave de envío ni otro monitor", !segunda.llamadas.includes("resend.claveDeEnvio") && !segunda.llamadas.includes("uptime.crear"));
  check("no vuelve a pedir las claves de cuenta", segunda.pedidas.length === 0);
  check("todo sigue con el mismo valor", [...antes].every(([k, v]) => primera.almacen.get(k)?.valor === v));
}
{
  // Una ejecución cortada a medias: DATABASE_URL está, APP_DB_PASSWORD no.
  const almacen = new Map(primera.almacen);
  almacen.delete("APP_DB_PASSWORD");
  const parcial = dobles({ almacen, llavero: primera.llavero });
  parcial.claves.resendCuenta = primera.claves.resendCuenta;
  await ejecutar(OPCIONES, parcial.d);
  const nuevas = parcial.llamadas.filter((l) => l.startsWith("vercel.anadir")).map((l) => l.split(" ")[1]);
  check("si falta una del grupo de la base, regenera las tres juntas", nuevas.sort().join() === [...GRUPO_BASE].sort().join(), nuevas.join());
  const u = new URL(almacen.get("DATABASE_URL")?.valor ?? "");
  check("…y quedan coherentes entre sí", u.password === almacen.get("APP_DB_PASSWORD")?.valor);
}
{
  const reactivar = dobles({ almacen: primera.almacen, llavero: primera.llavero });
  reactivar.claves.resendCuenta = primera.claves.resendCuenta;
  reactivar.monitores.push({ url: "https://demo-cliente.com/api/health", pausado: true });
  await ejecutar(OPCIONES, { ...reactivar.d, sitioEnLinea: async () => true });
  check("el día del lanzamiento, la misma línea activa el monitor", reactivar.llamadas.includes("uptime.reanudar"));
}

// ─── 5 · Pooler alternativo ──────────────────────────────────────────────────
console.log("\n5 · Pooler: si aws-0 no conoce el proyecto, se usa aws-1");
{
  const x = dobles({ poolersQueFallan: [POOLERS[0]] });
  const codigo = await ejecutar(OPCIONES, x.d);
  const u = new URL(x.almacen.get("DATABASE_URL")?.valor ?? "http://x");
  check("termina con código 0", codigo === 0);
  check("DATABASE_URL apunta a aws-1", u.hostname === POOLERS[1], u.hostname);
  const todos = dobles({ poolersQueFallan: POOLERS });
  const codigo2 = await ejecutar(OPCIONES, todos.d);
  check("si ninguno acepta, para sin cargar DATABASE_URL", codigo2 === 1 && !todos.almacen.has("DATABASE_URL"));
  check("…y dice qué hacer", todos.lineas.join("\n").includes("Qué hacer"));
}

// ─── 6 · Un error que repite el valor secreto ────────────────────────────────
console.log("\n6 · Red de seguridad: un error que repite el valor");
{
  const x = dobles({
    anadirLanza: (nombre, valor) => {
      if (nombre === "BETTER_AUTH_SECRET") throw new Error(`rechazado: ${nombre}=${valor}`);
    },
  });
  const codigo = await ejecutar(OPCIONES, x.d);
  const texto = x.lineas.join("\n");
  const valor = [...texto.matchAll(/BETTER_AUTH_SECRET=(\S+)/g)].map((m) => m[1]);
  check("para con código 1", codigo === 1);
  check("el valor sale como [oculto]", valor.length === 1 && valor[0] === "[oculto]", valor.join());
  check("ningún secreto en la salida", filtradosEn(texto, valoresSecretos(x)).length === 0);
}
{
  // Un error de la base que incluye la URL con la contraseña (el doble lo hace a propósito).
  const x = dobles();
  const d: Dependencias = {
    ...x.d,
    base: {
      async probar(url) {
        throw new Error(`no conecta a ${url}`);
      },
    },
  };
  await ejecutar(OPCIONES, d);
  const texto = x.lineas.join("\n");
  const claves = x.sqls.length > 0 ? [...texto.matchAll(/postgresql:\/\/[^\s]+/g)].map((m) => m[0]) : [];
  check("una URL con contraseña en un error sale oculta", claves.length > 0 && claves.every((c) => c.includes("[oculto]")), claves.join(" | "));
}
{
  const x = dobles();
  const codigo = await ejecutar({ ...OPCIONES, supabase: "jadrwpbgtshwqanrhjxp" }, x.d);
  check("con la base de SLG se niega sin llamar a nada", codigo === 1 && x.llamadas.length === 0 && x.sqls.length === 0);
}

// ─── 7 · Las plataformas reales, con dobles de las CLI ───────────────────────
console.log("\n7 · Ningún valor en la línea de comandos (dobles de vercel, npx y security)");
const TEMP = fs.mkdtempSync(path.join(os.tmpdir(), "test-secretos-"));
const BIN = path.join(TEMP, "bin");
fs.mkdirSync(BIN);
const DOBLE_CLI = `#!/bin/sh
nombre=$(basename "$0")
echo "$nombre $*" >> "$STUB_DIR/argv"
cat > "$STUB_DIR/stdin.$nombre"
if [ -n "$STUB_TRAMPA" ]; then exit 1; fi
case "$*" in *api-keys*) printf '%s' "$STUB_CLAVES_JSON" ;; esac
case "$*" in *"env ls"*) printf '%s' '{"envs":[{"key":"CRON_SECRET","target":["production","preview"]}]}' ;; esac
previo=""
for a in "$@"; do
  if [ "$previo" = "--file" ]; then cp "$a" "$STUB_DIR/sql.copiado"; echo "$a" > "$STUB_DIR/sql.ruta"; fi
  previo="$a"
done
exit 0
`;
for (const programa of ["vercel", "npx", "security", "supabase", "psql", "curl", "gh"]) {
  fs.writeFileSync(path.join(BIN, programa), DOBLE_CLI, { mode: 0o755 });
}
{
  const PATH_ORIGINAL = process.env.PATH;
  process.env.PATH = `${BIN}:${PATH_ORIGINAL}`;
  process.env.STUB_DIR = TEMP;
  const servicio = ["eyJ", aleatorioHex(12), ".eyJ", aleatorioHex(20), ".", aleatorioHex(16)].join("");
  process.env.STUB_CLAVES_JSON = JSON.stringify([
    { name: "anon", api_key: "anon-" + aleatorioHex(8) },
    { name: "service_role", api_key: servicio },
  ]);
  const real = plataformasReales(() => {});
  const leerArgv = (): string => (fs.existsSync(path.join(TEMP, "argv")) ? fs.readFileSync(path.join(TEMP, "argv"), "utf8") : "");
  const leerStdin = (p: string): string => fs.readFileSync(path.join(TEMP, `stdin.${p}`), "utf8");

  const valor = "v" + aleatorioHex(24);
  await real.vercel.anadir("web-demo", "BETTER_AUTH_SECRET", valor, true);
  const argvVercel = leerArgv();
  check("vercel env add: el valor NO va en los argumentos", !argvVercel.includes(valor));
  check("vercel env add: el valor va por la entrada, sin salto final", leerStdin("vercel") === valor);
  check(
    "vercel env add: proyecto, equipo, los dos entornos y --sensitive",
    /env add BETTER_AUTH_SECRET production,preview --project web-demo --scope team_\S+ --sensitive --force --yes --non-interactive/.test(argvVercel),
    argvVercel,
  );

  const presentes = await real.vercel.variablesPresentes("web-demo");
  check("vercel env ls: se lee el JSON", presentes.get("CRON_SECRET")?.size === 2);

  const claveCuenta = "re_" + aleatorioHex(16);
  await real.llavero.guardar("resend-api-key", claveCuenta);
  const argvSecurity = leerArgv().split("\n").filter((l) => l.startsWith("security")).join("\n");
  check("Llavero: la clave NO va en los argumentos de security", !argvSecurity.includes(claveCuenta) && /security -i/.test(argvSecurity), argvSecurity);
  check("Llavero: va por la entrada de security -i", leerStdin("security").includes(`-w "${claveCuenta}"`) && leerStdin("security").includes("-s slg-sitios"));
  let rechaza = false;
  try {
    await real.llavero.guardar("resend-api-key", 'a" ; delete-keychain x');
  } catch {
    rechaza = true;
  }
  check("Llavero: rechaza un valor que cerraría las comillas", rechaza);

  const sql = `ALTER ROLE slg_app WITH LOGIN PASSWORD '${verificadorScram("x" + aleatorioHex(8), crypto.randomBytes(16))}';`;
  await real.supabase.ejecutarSql("abcdefghijklmnopqrst", sql);
  const argvNpx = leerArgv().split("\n").filter((l) => l.startsWith("npx")).join("\n");
  check("supabase db query: la orden NO va en los argumentos", !argvNpx.includes("SCRAM") && /db query --linked --project-ref abcdefghijklmnopqrst --file /.test(argvNpx), argvNpx);
  check("supabase db query: la orden llega por el archivo", fs.readFileSync(path.join(TEMP, "sql.copiado"), "utf8") === sql);
  const ruta = fs.readFileSync(path.join(TEMP, "sql.ruta"), "utf8").trim();
  check("supabase db query: el archivo temporal se borra al terminar", !fs.existsSync(ruta), ruta);

  check("supabase api-keys: elige la service_role", (await real.supabase.claveDeServicio("abcdefghijklmnopqrst")) === servicio);
  check("…y no pasa por los argumentos nada que no sea la referencia", !leerArgv().includes(servicio));

  process.env.PATH = PATH_ORIGINAL;
}
{
  const nueva = "sb_secret_" + aleatorioHex(16);
  check("sin claves heredadas, acepta la secreta nueva", elegirClaveDeServicio(JSON.stringify([{ name: "default", type: "secret", api_key: nueva }])) === nueva);
  let enmascarada = false;
  try {
    elegirClaveDeServicio(JSON.stringify([{ name: "service_role", api_key: "eyJ••••••••" }]));
  } catch {
    enmascarada = true;
  }
  check("si la clave viene enmascarada, para en vez de cargarla", enmascarada);
  check("vercel env ls también en forma de lista", leerVariablesDeVercel(JSON.stringify([{ key: "A", target: "production" }])).get("A")?.has("production") === true);
}

// ─── 8 · --simular, como proceso aparte y con las puertas trampeadas ─────────
console.log("\n8 · --simular no llama a nada");
{
  const trampas = path.join(TEMP, "trampas.log");
  const precarga = path.join(TEMP, "sin-red.mjs");
  /**
   * Se cargan ANTES que el comando (`node --import`). Cualquier proceso,
   * `fetch` o socket que se abra queda apuntado y falla. `syncBuiltinESMExports`
   * hace que el `import { spawn }` de `plataformas.ts` vea la versión trampeada.
   */
  fs.writeFileSync(
    precarga,
    `import fs from "node:fs";
import cp from "node:child_process";
import net from "node:net";
import { syncBuiltinESMExports } from "node:module";
const apuntar = (q) => fs.appendFileSync(${JSON.stringify(trampas)}, q + "\\n");
for (const f of ["spawn", "spawnSync", "exec", "execSync", "execFile", "execFileSync", "fork"]) {
  cp[f] = (...a) => { apuntar("proceso " + String(a[0])); throw new Error("prohibido en la simulación"); };
}
globalThis.fetch = async (u) => { apuntar("fetch " + String(u)); throw new Error("prohibido en la simulación"); };
net.Socket.prototype.connect = function (...a) { apuntar("socket " + JSON.stringify(a[0])); throw new Error("prohibido en la simulación"); };
syncBuiltinESMExports();
`,
  );
  fs.rmSync(path.join(TEMP, "argv"), { force: true });
  const r = spawnSync(
    process.execPath,
    [
      "--import",
      pathToFileURL(precarga).href,
      path.join(import.meta.dirname, "secretos.ts"),
      "--simular",
      "--cliente",
      "demo",
      "--supabase",
      "abcdefghijklmnopqrst",
      "--vercel",
      "web-demo",
      "--dominio",
      "demo-cliente.com",
    ],
    { encoding: "utf8", env: { ...process.env, PATH: `${BIN}:${process.env.PATH}`, STUB_DIR: TEMP, STUB_TRAMPA: "1" }, input: "" },
  );
  const salida = `${r.stdout}${r.stderr}`;
  check("termina con código 0", r.status === 0, salida.slice(-800));
  const apuntadas = fs.existsSync(trampas) ? fs.readFileSync(trampas, "utf8").trim() : "";
  check("ningún proceso, fetch ni socket", apuntadas === "", apuntadas);
  check("ninguna CLI invocada (vercel, npx, security…)", !fs.existsSync(path.join(TEMP, "argv")));
  check("recorre los ocho pasos", [1, 2, 3, 4, 5, 6, 7, 8].every((n) => salida.includes(`── ${n}/8 ·`)));
  check("dice qué haría con cada plataforma", ["vercel env add", "supabase db query", "Llavero", "Resend", "monitor", "api-keys"].every((p) => salida.includes(p)));
  check("no pide nada por teclado", !/Pega la clave/.test(salida.replace(/pediría con entrada oculta: «[^»]*»/g, "")));
  const urls = [...salida.matchAll(/postgresql:\/\/\S+/g)].map((m) => m[0]);
  check("no enseña ninguna cadena de conexión", urls.length === 0, urls.join(" | "));
  check("cierra diciendo que no ha tocado nada", salida.includes("SIMULACIÓN terminada: no se ha tocado nada."));
}

// Una URL de la aplicación bien formada, por si alguien cambia el armado.
check("urlDeAplicacion arma usuario, host, puerto y base", new URL(urlDeAplicacion("h.example", "r", "c")).pathname === "/postgres");

fs.rmSync(TEMP, { recursive: true, force: true });
console.log(`\n${comprobaciones - fallos}/${comprobaciones} comprobaciones en verde.`);
if (fallos > 0) process.exit(1);
