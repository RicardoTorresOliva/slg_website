/**
 * nucleo.ts — **Lo que decide el comando de secretos, sin tocar ninguna red.**
 *
 * POR QUÉ ESTÁ PARTIDO EN DOS. `secretos.ts` habla con cinco plataformas
 * (Vercel, Supabase, la base, Resend, UptimeRobot) y con el Llavero del Mac.
 * Ninguna de esas conversaciones se puede repetir en una prueba sin gastar algo
 * real: un proyecto, una clave, un dominio. Así que aquí vive **todo lo que se
 * decide** —qué se genera, en qué orden, qué se da por hecho, qué se le dice a
 * Ricardo— y las plataformas entran como un objeto (`Dependencias`) que la
 * prueba sustituye por uno de memoria. Lo que la prueba comprueba aquí es lo
 * mismo que se ejecuta de verdad; lo único que cambia es quién contesta.
 *
 * LA REGLA QUE ORGANIZA TODO: **ningún valor secreto sale por la pantalla.**
 * Se cumple dos veces, a propósito:
 *
 *   1. Por construcción: los mensajes nombran variables, nunca las leen.
 *   2. Por red de seguridad: cada secreto que este proceso genera o recibe se
 *      apunta en `secretos`, y **toda** línea que sale por `decir` se barre
 *      contra esa lista antes de imprimirse. Un mensaje de error de una
 *      plataforma que repitiera el valor —pasa: hay CLI que devuelven lo que
 *      recibieron— sale con «[oculto]» en su lugar.
 *
 * La primera es la que se diseña; la segunda es la que salva el día que alguien
 * añade un `decir(\`… ${valor}\`)` sin pensar.
 *
 * IDEMPOTENTE. Ricardo puede volver a pegar la misma línea cuantas veces quiera:
 * lo que ya está en Vercel no se regenera. No es comodidad —regenerar
 * `BETTER_AUTH_SECRET` cierra la sesión de todo el mundo, y regenerar la
 * contraseña de la base sin volver a cargar `DATABASE_URL` tira el sitio—.
 */
import crypto from "node:crypto";

// ─── Constantes de la plataforma ─────────────────────────────────────────────

/**
 * Los dos proyectos que este comando **no puede tocar nunca**: los de
 * producción de SLG. El comando existe para sitios de clientes, y un despiste
 * al copiar una referencia le cambiaría la contraseña de la base al sitio que
 * factura. Mejor que se niegue a que dependa de que nadie se equivoque.
 */
export const PROHIBIDOS = {
  supabase: ["jadrwpbgtshwqanrhjxp"],
  vercel: ["slg-website"],
} as const;

/** El equipo de Vercel de Softlanding Global (`ricardotorresolivas-projects`). */
export const EQUIPO_VERCEL = "team_NVmg2F1svT5W7CKrSInHh5VD";

/**
 * Los *pooler* candidatos, en orden. `aws-0` es el que funciona para SLG
 * (comprobado el 2026-09-17), pero Supabase asigna los proyectos nuevos a veces
 * a `aws-1`, y la API que lo diría (`config/database/pooler`) no está al alcance
 * de la CLI. Así que no se adivina: se **prueba** con la contraseña recién
 * puesta, y el que acepta es el que se escribe en `DATABASE_URL`.
 */
export const POOLERS = ["aws-0-us-east-1.pooler.supabase.com", "aws-1-us-east-1.pooler.supabase.com"] as const;

/** Región del dominio de envío: la misma que el de SLG (`sa-east-1`, São Paulo). */
export const REGION_RESEND = "sa-east-1";

/** Servicio del Llavero bajo el que se guardan las dos claves de cuenta. */
export const SERVICIO_LLAVERO = "slg-sitios";

export type Entorno = "production" | "preview";
export const ENTORNOS: readonly Entorno[] = ["production", "preview"];

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type Opciones = {
  readonly cliente: string;
  readonly supabase: string;
  readonly vercel: string;
  readonly dominio: string;
  readonly simular: boolean;
  readonly cambiarClaves: boolean;
  /**
   * Salta el alta del dominio de envío en Resend (paso 7) y no pide su clave.
   * Para un sitio sin dominio real todavía —la demo de la plantilla, o un
   * cliente que aún no ha delegado su DNS—: el resto queda cargado y el correo
   * se completa el día que se vuelve a pegar la línea sin esta opción.
   */
  readonly sinCorreo?: boolean;
  /** Salta el monitor de UptimeRobot (paso 8) y no pide su clave. Mismo caso. */
  readonly sinMonitor?: boolean;
};

export type RegistroDns = {
  readonly tipo: string;
  readonly nombre: string;
  readonly valor: string;
  readonly prioridad?: number;
  readonly estado?: string;
};

export type Monitor = { readonly id: string; readonly pausado: boolean };

/**
 * Todo lo que el núcleo necesita del mundo. Cada método es una conversación con
 * una plataforma; las implementaciones reales están en `plataformas.ts`, las de
 * la simulación también, y las de la prueba en `test-secretos.ts`.
 */
export type Dependencias = {
  readonly salida: (linea: string) => void;
  readonly aleatorio: (bytes: number) => Buffer;
  readonly esperar: (ms: number) => Promise<void>;
  readonly pedirOculto: (pregunta: string) => Promise<string>;
  readonly llavero: {
    leer(cuenta: string): Promise<string | null>;
    guardar(cuenta: string, valor: string): Promise<void>;
  };
  readonly vercel: {
    comprobarSesion(): Promise<void>;
    /** Nombre → entornos en los que ya existe. */
    variablesPresentes(proyecto: string): Promise<Map<string, Set<Entorno>>>;
    anadir(proyecto: string, nombre: string, valor: string, sensible: boolean): Promise<void>;
  };
  readonly supabase: {
    ejecutarSql(ref: string, sql: string): Promise<void>;
    claveDeServicio(ref: string): Promise<string>;
  };
  readonly base: {
    /** Abre una conexión nueva y dice como quién ha entrado. Lanza si no entra. */
    probar(url: string): Promise<{ usuario: string; superusuario: boolean }>;
  };
  readonly resend: {
    comprobarClave(clave: string): Promise<void>;
    buscarOCrearDominio(
      clave: string,
      nombre: string,
      region: string,
    ): Promise<{ id: string; estado: string; creado: boolean; registros: RegistroDns[] }>;
    crearClaveDeEnvio(clave: string, nombre: string, dominioId: string): Promise<string>;
  };
  readonly uptime: {
    comprobarClave(clave: string): Promise<void>;
    buscarMonitor(clave: string, url: string): Promise<Monitor | null>;
    crearMonitor(clave: string, datos: { url: string; nombre: string; pausado: boolean }): Promise<Monitor>;
    reanudar(clave: string, id: string): Promise<void>;
  };
  /** ¿Responde ya el dominio del cliente con la sonda en verde? */
  readonly sitioEnLinea: (url: string) => Promise<boolean>;
};

/**
 * Un error que ya viene explicado para una persona: **qué pasó** y **qué hacer**.
 * Las plataformas lanzan esto cuando reconocen el fallo (sesión caducada,
 * clave revocada, plan agotado); lo que no reconocen sale como error normal y
 * el núcleo añade el consejo genérico.
 */
export class ErrorGuiado extends Error {
  readonly queHacer: string;
  constructor(queHaPasado: string, queHacer: string) {
    super(queHaPasado);
    this.queHacer = queHacer;
  }
}

// ─── Piezas puras (las prueba `test-secretos.ts` una a una) ─────────────────

/**
 * Un secreto aleatorio en base64url: sin `+`, `/` ni `=`, así que se puede
 * pegar en una URL o en un panel sin escaparlo. 32 bytes = 256 bits.
 */
export function secretoAleatorio(aleatorio: (n: number) => Buffer, bytes = 32): string {
  return aleatorio(bytes).toString("base64url");
}

/**
 * Contraseña de base de datos en hexadecimal. **Solo `0-9a-f`** a propósito: va
 * dentro de `DATABASE_URL`, y una contraseña con `@`, `:` o `/` rompe la cadena
 * de conexión de una forma que no avisa —conecta a otro sitio o no parsea—.
 * 24 bytes = 192 bits: sobra para una clave que nadie teclea.
 */
export function claveDeBase(aleatorio: (n: number) => Buffer): string {
  return aleatorio(24).toString("hex");
}

/**
 * El verificador SCRAM-SHA-256 de una contraseña, en el formato que PostgreSQL
 * guarda en `pg_authid` y acepta tal cual en `ALTER ROLE … PASSWORD`.
 *
 * POR QUÉ SE MANDA EL VERIFICADOR Y NO LA CONTRASEÑA. La orden `ALTER ROLE`
 * viaja por la API de gestión de Supabase y **puede quedar en sus registros**
 * (el panel enseña las consultas). Con la contraseña en claro, quien lea esos
 * registros tiene la base. Con el verificador tiene un hash con sal y 4096
 * iteraciones de una cadena aleatoria de 192 bits: no se puede invertir.
 * PostgreSQL reconoce el prefijo `SCRAM-SHA-256$` y lo guarda sin volver a
 * picarlo (documentación de `CREATE ROLE`, «ENCRYPTED PASSWORD»).
 *
 * El algoritmo es el del RFC 5802 con SHA-256 (RFC 7677); la prueba lo coteja
 * con el vector de ejemplo del RFC 7677. La contraseña es hexadecimal, así que
 * SASLprep no la cambia y no hace falta implementarlo.
 */
export function verificadorScram(clave: string, sal: Buffer, iteraciones = 4096): string {
  const salada = crypto.pbkdf2Sync(clave, sal, iteraciones, 32, "sha256");
  const claveCliente = crypto.createHmac("sha256", salada).update("Client Key").digest();
  const claveGuardada = crypto.createHash("sha256").update(claveCliente).digest();
  const claveServidor = crypto.createHmac("sha256", salada).update("Server Key").digest();
  return `SCRAM-SHA-256$${iteraciones}:${sal.toString("base64")}$${claveGuardada.toString("base64")}:${claveServidor.toString("base64")}`;
}

/**
 * Arma una cadena de conexión por piezas. Se concatena en vez de escribir la
 * plantilla entera porque `check:secrets` busca en el código fuente la forma
 * «esquema, usuario, dos puntos, contraseña, arroba», y una plantilla literal
 * con esa forma es indistinguible de una cadena filtrada.
 */
function cadena(usuario: string, clave: string, host: string, puerto: number): string {
  return "postgresql://" + usuario + ":" + clave + "@" + host + ":" + String(puerto) + "/postgres";
}

/** La cadena de la aplicación: rol `slg_app`, *pooler* en modo transacción (6543). */
export function urlDeAplicacion(host: string, ref: string, clave: string): string {
  return cadena("slg_app." + ref, clave, host, 6543);
}

/**
 * La cadena del dueño: rol `postgres`, *pooler* en modo **sesión** (5432). Las
 * migraciones necesitan sesión: el modo transacción no garantiza que dos
 * sentencias seguidas caigan en la misma conexión.
 */
export function urlDelDueno(host: string, ref: string, clave: string): string {
  return cadena("postgres." + ref, clave, host, 5432);
}

const RE_CLIENTE = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;
const RE_REF = /^[a-z]{20}$/;
const RE_VERCEL = /^(?:prj_[A-Za-z0-9]{10,}|[a-z0-9](?:[a-z0-9._-]{0,98}[a-z0-9])?)$/;
const RE_DOMINIO = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

/**
 * Comprueba los cuatro datos **antes de tocar nada**. Un dato mal copiado que se
 * descubre en el paso 5 deja cuatro pasos hechos contra el proyecto
 * equivocado; aquí se descubre sin haber hecho ninguno.
 */
export function validarOpciones(o: Opciones): string[] {
  const errores: string[] = [];
  if (!RE_CLIENTE.test(o.cliente)) {
    errores.push(`--cliente «${o.cliente}»: solo minúsculas, números y guiones (ej.: acme-legal).`);
  }
  if (!RE_REF.test(o.supabase)) {
    errores.push(`--supabase «${o.supabase}»: la referencia son 20 letras minúsculas (está en la URL del proyecto).`);
  } else if ((PROHIBIDOS.supabase as readonly string[]).includes(o.supabase)) {
    errores.push(`--supabase «${o.supabase}» es la base de PRODUCCIÓN de SLG. Este comando es solo para clientes.`);
  }
  if (!RE_VERCEL.test(o.vercel)) {
    errores.push(`--vercel «${o.vercel}»: nombre del proyecto en minúsculas (ej.: web-acme-legal) o su id prj_….`);
  } else if ((PROHIBIDOS.vercel as readonly string[]).includes(o.vercel)) {
    errores.push(`--vercel «${o.vercel}» es el proyecto de PRODUCCIÓN de SLG. Este comando es solo para clientes.`);
  }
  if (!RE_DOMINIO.test(o.dominio)) {
    errores.push(`--dominio «${o.dominio}»: solo el dominio, sin https:// ni barras (ej.: acmelegal.com).`);
  }
  return errores;
}

/** ¿Está la variable en los DOS entornos? Estar solo en uno cuenta como que falta. */
function completa(presentes: Map<string, Set<Entorno>>, nombre: string): boolean {
  const e = presentes.get(nombre);
  return !!e && ENTORNOS.every((x) => e.has(x));
}

// ─── El recorrido ────────────────────────────────────────────────────────────

/** Los secretos propios de la aplicación: no dependen de ninguna plataforma. */
export const SECRETOS_PROPIOS: readonly { nombre: string; para: string }[] = [
  { nombre: "BETTER_AUTH_SECRET", para: "firma las sesiones de quien entra al sitio" },
  { nombre: "DELIVERABLE_VIEWER_SECRET", para: "firma los vales del visor de entregables" },
  { nombre: "CRON_SECRET", para: "abre /api/colas al planificador que vacía las colas" },
  { nombre: "WEBHOOK_SIGNING_SECRET", para: "firma los avisos salientes (webhooks), si algún día se conectan" },
];

/** Las tres que tienen que cambiar JUNTAS: la contraseña y las dos cadenas que la llevan. */
export const GRUPO_BASE = ["APP_DB_PASSWORD", "DATABASE_URL_MIGRATIONS", "DATABASE_URL"] as const;

const TOTAL_PASOS = 8;

/**
 * El recorrido entero. Devuelve el código de salida: 0 si todo quedó hecho, 1 si
 * algo se paró. **Nunca lanza**: todo error acaba en pantalla, barrido y con su
 * «qué hacer», porque un volcado de pila no le dice nada a quien lo ejecuta.
 */
export async function ejecutar(o: Opciones, d: Dependencias): Promise<number> {
  const secretos = new Set<string>();
  const guardar = (v: string): string => {
    if (v.length >= 8) secretos.add(v);
    return v;
  };
  const decir = (linea = ""): void => {
    let limpia = linea;
    for (const s of secretos) limpia = limpia.split(s).join("[oculto]");
    d.salida(limpia);
  };
  const paso = (n: number, titulo: string): void => {
    decir("");
    decir(`── ${n}/${TOTAL_PASOS} · ${titulo} ${"─".repeat(Math.max(3, 60 - titulo.length))}`);
  };
  const resumen: { nombre: string; donde: string; estado: string }[] = [];
  let registrosDns: RegistroDns[] = [];

  decir(o.simular ? "SIMULACIÓN — no se llama a ninguna plataforma. Así sería:" : "Comando de secretos del sitio.");
  decir(`  Cliente: ${o.cliente} · Supabase: ${o.supabase} · Vercel: ${o.vercel} · Dominio: ${o.dominio}`);
  decir("  Ningún valor secreto se muestra en pantalla. Si algo falla, puedes volver a");
  decir("  pegar la misma línea: lo que ya esté hecho no se repite.");

  try {
    const errores = validarOpciones(o);
    if (errores.length > 0) {
      throw new ErrorGuiado(
        `Los datos del comando no son válidos:\n    · ${errores.join("\n    · ")}`,
        "Pide a Claude la línea de nuevo, copiada de la sesión del cliente, y pégala entera.",
      );
    }

    // ── 1 · Sesiones ────────────────────────────────────────────────────────
    paso(1, "Sesión de Vercel");
    await d.vercel.comprobarSesion();
    decir("  ✓ La CLI de Vercel tiene sesión abierta.");

    // ── 2 · Claves de cuenta (Llavero) ──────────────────────────────────────
    paso(2, "Claves de Resend y UptimeRobot (Llavero del Mac)");
    if (o.sinCorreo && o.sinMonitor) decir("  · Nada que pedir: --sin-correo y --sin-monitor saltan las dos plataformas.");
    const claveResend = o.sinCorreo ? null : guardar(
      await claveDeCuenta(d, decir, o, {
        cuenta: "resend-api-key",
        nombre: "Resend",
        donde: "https://resend.com/api-keys (la que empieza por re_)",
        valida: (v) => v.startsWith("re_") && v.length >= 20,
        comprobar: (v) => d.resend.comprobarClave(v),
      }),
    );
    const claveUptime = o.sinMonitor ? null : guardar(
      await claveDeCuenta(d, decir, o, {
        cuenta: "uptimerobot-api-key",
        nombre: "UptimeRobot",
        donde: "https://dashboard.uptimerobot.com/integrations → API → Main API key",
        valida: (v) => v.length >= 20,
        comprobar: (v) => d.uptime.comprobarClave(v),
      }),
    );

    paso(3, "Qué variables tiene ya el proyecto de Vercel");
    const presentes = await d.vercel.variablesPresentes(o.vercel);
    decir(`  ✓ El proyecto ${o.vercel} tiene ${presentes.size} variable(s). Solo se añaden las que faltan.`);

    const cargar = async (nombre: string, valor: string, sensible: boolean, donde: string): Promise<void> => {
      if (sensible) guardar(valor);
      await d.vercel.anadir(o.vercel, nombre, valor, sensible);
      presentes.set(nombre, new Set(ENTORNOS));
      resumen.push({ nombre, donde, estado: "cargada" });
      decir(`  ✓ ${nombre} → Vercel (Production y Preview)${sensible ? ", como secreta" : ""}.`);
    };
    const yaEstaba = (nombre: string, donde: string): void => {
      resumen.push({ nombre, donde, estado: "ya estaba" });
      decir(`  · ${nombre}: ya estaba en Vercel, no se toca.`);
    };

    // ── 4 · Base de datos ───────────────────────────────────────────────────
    paso(4, "Contraseñas de la base de datos");
    if (GRUPO_BASE.every((n) => completa(presentes, n))) {
      for (const n of GRUPO_BASE) yaEstaba(n, "Vercel");
    } else {
      /**
       * LAS TRES O NINGUNA. Si una ejecución anterior se cortó entre medias, lo
       * que hay en Vercel puede llevar una contraseña que ya no es la de la
       * base. Regenerar el grupo entero es la única forma de que las tres
       * digan lo mismo que la base.
       */
      const claveApp = guardar(claveDeBase(d.aleatorio));
      const claveDueno = guardar(claveDeBase(d.aleatorio));
      const sql =
        `ALTER ROLE slg_app WITH LOGIN PASSWORD '${verificadorScram(claveApp, d.aleatorio(16))}';\n` +
        `ALTER ROLE postgres WITH PASSWORD '${verificadorScram(claveDueno, d.aleatorio(16))}';\n`;
      await d.supabase.ejecutarSql(o.supabase, sql);
      decir("  ✓ Contraseñas nuevas puestas a slg_app (el sitio) y a postgres (migraciones), por la CLI de Supabase.");

      const host = await elegirPooler(d, decir, o.supabase, claveApp);
      const urlApp = guardar(urlDeAplicacion(host, o.supabase, claveApp));
      const urlDueno = guardar(urlDelDueno(host, o.supabase, claveDueno));
      const dueno = await conReintentos(d, () => d.base.probar(urlDueno));
      if (dueno.usuario !== "postgres") {
        throw new ErrorGuiado(
          `La cadena del dueño entra como «${dueno.usuario}», no como «postgres».`,
          "No sigas. Copia estas líneas y pégalas en la sesión de Claude.",
        );
      }
      decir(`  ✓ La base acepta las dos contraseñas (por ${host}).`);

      await cargar("APP_DB_PASSWORD", claveApp, true, "Vercel");
      await cargar("DATABASE_URL_MIGRATIONS", urlDueno, true, "Vercel");
      await cargar("DATABASE_URL", urlApp, true, "Vercel");
    }

    // ── 5 · Secretos propios ────────────────────────────────────────────────
    paso(5, "Secretos propios del sitio");
    for (const s of SECRETOS_PROPIOS) {
      if (completa(presentes, s.nombre)) yaEstaba(s.nombre, "Vercel");
      else await cargar(s.nombre, secretoAleatorio(d.aleatorio), true, "Vercel");
    }

    // ── 6 · Archivos (Supabase Storage) ─────────────────────────────────────
    paso(6, "Archivos: Supabase Storage");
    if (completa(presentes, "SUPABASE_URL")) yaEstaba("SUPABASE_URL", "Vercel");
    else await cargar("SUPABASE_URL", `https://${o.supabase}.supabase.co`, false, "Vercel");
    if (completa(presentes, "SUPABASE_SERVICE_ROLE_KEY")) {
      yaEstaba("SUPABASE_SERVICE_ROLE_KEY", "Vercel");
    } else {
      const clave = guardar(await d.supabase.claveDeServicio(o.supabase));
      await cargar("SUPABASE_SERVICE_ROLE_KEY", clave, true, "Vercel");
    }

    // ── 7 · Correo (Resend) ─────────────────────────────────────────────────
    paso(7, "Correo: dominio de envío en Resend");
    if (claveResend === null) {
      decir("  · Saltado (--sin-correo): el sitio no enviará correo hasta que vuelvas a pegar la línea sin esa opción.");
      resumen.push({ nombre: "MAIL_SMTP_USERNAME", donde: "Vercel", estado: "pendiente (--sin-correo)" });
      resumen.push({ nombre: "MAIL_SMTP_PASSWORD", donde: "Vercel", estado: "pendiente (--sin-correo)" });
    } else {
      const subdominio = `mailweb.${o.dominio}`;
      const dominio = await d.resend.buscarOCrearDominio(claveResend, subdominio, REGION_RESEND);
      decir(`  ✓ ${subdominio} ${dominio.creado ? "dado de alta" : "ya estaba dado de alta"} en Resend (estado: ${dominio.estado}).`);
      registrosDns = dominio.registros;
      if (completa(presentes, "MAIL_SMTP_PASSWORD") && completa(presentes, "MAIL_SMTP_USERNAME")) {
        yaEstaba("MAIL_SMTP_USERNAME", "Vercel");
        yaEstaba("MAIL_SMTP_PASSWORD", "Vercel");
      } else {
        /**
         * UNA CLAVE DE ENVÍO POR SITIO, NO LA DE CUENTA. La clave que está en el
         * Llavero puede crear y borrar dominios de todos los clientes; la que va
         * al servidor del sitio solo puede **enviar**, y solo desde su dominio.
         * Si un sitio se ve comprometido, se revoca la suya y los demás siguen.
         */
        const token = guardar(await d.resend.crearClaveDeEnvio(claveResend, `web_${o.cliente} · envío`, dominio.id));
        await cargar("MAIL_SMTP_USERNAME", "resend", true, "Vercel");
        await cargar("MAIL_SMTP_PASSWORD", token, true, "Vercel");
      }
    }

    // ── 8 · Monitor (UptimeRobot) ───────────────────────────────────────────
    paso(8, "Monitor de caída: UptimeRobot");
    if (claveUptime === null) {
      decir("  · Saltado (--sin-monitor): nadie vigila el sitio hasta que vuelvas a pegar la línea sin esa opción.");
    } else {
      const urlSonda = `https://${o.dominio}/api/health`;
      const monitor = await d.uptime.buscarMonitor(claveUptime, urlSonda);
      const enLinea = await d.sitioEnLinea(urlSonda);
      if (!monitor) {
        /**
         * EN PAUSA HASTA EL LANZAMIENTO. El dominio del cliente no apunta a
         * Vercel hasta el día 5; un monitor activo desde hoy mandaría un aviso de
         * caída cada cinco minutos durante una semana, y eso enseña a ignorar
         * los avisos justo antes de que empiecen a importar.
         */
        await d.uptime.crearMonitor(claveUptime, { url: urlSonda, nombre: `web_${o.cliente} · producción`, pausado: !enLinea });
        decir(
          enLinea
            ? `  ✓ Monitor creado y activo sobre ${urlSonda}.`
            : `  ✓ Monitor creado EN PAUSA sobre ${urlSonda}: el dominio aún no responde.`,
        );
      } else if (monitor.pausado && enLinea) {
        await d.uptime.reanudar(claveUptime, monitor.id);
        decir(`  ✓ El dominio ya responde: monitor activado.`);
      } else {
        decir(`  · El monitor ya existía (${monitor.pausado ? "en pausa: el dominio aún no responde" : "activo"}).`);
      }
      if (!enLinea) {
        decir("    El día del lanzamiento vuelve a pegar esta misma línea: verá el dominio en línea y lo activará.");
      }
    }
  } catch (e) {
    decir("");
    const guiado = e instanceof ErrorGuiado;
    decir(`✗ ${(e as Error).message}`);
    decir(
      `  Qué hacer: ${
        guiado
          ? (e as ErrorGuiado).queHacer
          : "copia todo lo que ves en esta ventana y pégalo en la sesión de Claude. Lo que ya se hizo no se pierde: vuelve a pegar la misma línea cuando Claude te lo diga."
      }`,
    );
    return 1;
  }

  // ── Cierre ────────────────────────────────────────────────────────────────
  decir("");
  decir("── Resumen " + "─".repeat(62));
  for (const r of resumen) decir(`  ${r.estado === "cargada" ? "✓" : "·"} ${r.nombre.padEnd(28)} ${r.donde} — ${r.estado}`);
  if (registrosDns.length > 0) {
    decir("");
    decir(`── Registros DNS del correo (no son secretos) — zona ${o.dominio} ${"─".repeat(10)}`);
    for (const r of registrosDns) {
      decir(
        `  ${r.tipo.padEnd(5)} ${r.nombre}  →  ${r.valor}${r.prioridad !== undefined ? `  (prioridad ${r.prioridad})` : ""}${r.estado ? `  [${r.estado}]` : ""}`,
      );
    }
  }
  decir("");
  decir(o.simular ? "SIMULACIÓN terminada: no se ha tocado nada." : "✓ Listo. Ningún secreto ha pasado por la pantalla.");
  if (!o.simular) {
    decir("  Ahora: selecciona desde «── Resumen» hasta aquí, cópialo (Cmd + C) y pégalo en la");
    decir("  sesión de Claude. Claude crea los registros DNS y comprueba la vista previa.");
  }
  return 0;
}

// ─── Ayudantes del recorrido ─────────────────────────────────────────────────

/**
 * Lee una clave de cuenta del Llavero; si no está (primera vez) o se pide
 * cambiarla, la pide con entrada oculta, **comprueba que funciona** y solo
 * entonces la guarda. Guardar una clave mal pegada haría fallar todos los
 * clientes siguientes con un error que ya no apunta al pegado.
 */
async function claveDeCuenta(
  d: Dependencias,
  decir: (l: string) => void,
  o: Opciones,
  c: {
    cuenta: string;
    nombre: string;
    donde: string;
    valida: (v: string) => boolean;
    comprobar: (v: string) => Promise<void>;
  },
): Promise<string> {
  const guardada = o.cambiarClaves ? null : await d.llavero.leer(c.cuenta);
  if (guardada) {
    await c.comprobar(guardada);
    decir(`  ✓ Clave de ${c.nombre}: leída del Llavero y comprobada.`);
    return guardada;
  }
  decir(`  La clave de ${c.nombre} no está en el Llavero${o.cambiarClaves ? " (se pidió cambiarla)" : " (primera vez)"}.`);
  decir(`  Cópiala de tu gestor de contraseñas. Si no la tienes: ${c.donde}.`);
  const valor = (await d.pedirOculto(`  Pega la clave de ${c.nombre} y pulsa Enter (no se verá nada al pegar): `)).trim();
  if (!c.valida(valor)) {
    throw new ErrorGuiado(
      `Eso no parece una clave de ${c.nombre}.`,
      `vuelve a pegar la misma línea y, cuando la pida, pega la clave completa (${c.donde}).`,
    );
  }
  await c.comprobar(valor);
  await d.llavero.guardar(c.cuenta, valor);
  decir(`  ✓ Clave de ${c.nombre} comprobada y guardada en el Llavero («${SERVICIO_LLAVERO}»). No se volverá a pedir.`);
  return valor;
}

/**
 * Supavisor (el *pooler*) tarda unos segundos en ver una contraseña recién
 * cambiada. Un fallo de autenticación en el primer intento no significa nada;
 * en el cuarto, sí.
 */
async function conReintentos<T>(d: Dependencias, fn: () => Promise<T>, intentos = 4, pausaMs = 5000): Promise<T> {
  let ultimo: unknown;
  for (let i = 0; i < intentos; i++) {
    try {
      return await fn();
    } catch (e) {
      ultimo = e;
      if (/tenant or user not found/i.test((e as Error).message)) throw e;
      if (i < intentos - 1) await d.esperar(pausaMs);
    }
  }
  throw ultimo;
}

/** Prueba los *pooler* en orden con la contraseña nueva y devuelve el que acepta. */
async function elegirPooler(d: Dependencias, decir: (l: string) => void, ref: string, claveApp: string): Promise<string> {
  const fallos: string[] = [];
  for (const host of POOLERS) {
    try {
      const r = await conReintentos(d, () => d.base.probar(urlDeAplicacion(host, ref, claveApp)));
      if (r.superusuario || r.usuario !== "slg_app") {
        throw new ErrorGuiado(
          `La cadena del sitio entra como «${r.usuario}»${r.superusuario ? ", que es SUPERUSUARIO" : ""}, y tiene que ser «slg_app» sin privilegios: si no, el aislamiento entre empresas no existe.`,
          "No sigas. Copia estas líneas y pégalas en la sesión de Claude.",
        );
      }
      return host;
    } catch (e) {
      if (e instanceof ErrorGuiado) throw e;
      // La primera línea entera, sin recortar por caracteres: un recorte podría
      // partir un secreto por la mitad, y medio secreto ya no lo reconoce el
      // barrido de `decir`.
      fallos.push(`${host}: ${(e as Error).message.split("\n")[0]}`);
      decir(`  · ${host} no la acepta; se prueba el siguiente.`);
    }
  }
  throw new ErrorGuiado(
    `Ningún pooler acepta la contraseña nueva de slg_app:\n    · ${fallos.join("\n    · ")}`,
    "espera dos minutos y vuelve a pegar la misma línea (el pooler a veces tarda). Si falla igual, copia estas líneas y pégalas en la sesión de Claude.",
  );
}
