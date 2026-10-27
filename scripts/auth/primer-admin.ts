/**
 * primer-admin.ts — **El aprovisionamiento de arranque de la intranet.**
 *
 * EL AGUJERO QUE ESTO TAPA. En producción no había forma de crear la primera
 * cuenta. `/acceder` es correo + contraseña, y el alta pública está cerrada en
 * el middleware: solo se crea cuenta **canjeando una invitación**
 * (`app/api/acceso/invitacion/route.ts`). Y `lib/invitations` exige un actor con
 * rol de SLG para invitar. Sin usuarios no hay quien invite, y sin invitación no
 * hay usuario: la base de producción no tenía ninguno y HQ era inalcanzable para
 * todo el mundo, su dueño incluido. El `seed` no sirve —son datos de ejemplo con
 * correos `.test` y sin contraseña— y Google y Microsoft no están configurados.
 *
 * UNA SOLA VEZ, Y SOLO SI NO HAY NADIE. La primera comprobación es
 * `count(*) from "user"`: con una sola fila, esto se niega a hacer nada. No es
 * prudencia decorativa —es lo único que separa «arrancar la casa» de «crear un
 * administrador en una base que ya tiene dueños», que es una puerta trasera. A
 * partir de la segunda cuenta el camino es el que ya existe: invitar desde
 * `/hq/usuarios`.
 *
 * CON EL ROL DUEÑO, Y NO ES UN ATAJO. `membership` lleva `FORCE ROW LEVEL
 * SECURITY` y su política solo deja escribir al actor cuya empresa coincide o a
 * `slg_admin`/`slg_operator`/`agent_slg` (migraciones 0001 y 0015).
 * `withSystemScope` pone `app.actor_role = 'system'`, que **no** está en esa
 * lista y no puede estarlo: la migración 0015 escribe con todas las letras que
 * añadirlo convertiría cualquier trabajo de fondo en un actor que cruza
 * empresas. Y `withScope` exige un `AuthContext`, que solo se construye desde
 * una sesión o una clave verificadas y no se puede fabricar. Es decir: **la
 * aplicación no puede crear su primera pertenencia, por diseño**. El único actor
 * que puede es el dueño de la base, y por eso esto es un guion —como `migrar.ts`
 * y `seed.ts`— y no una acción de `/api/ops`: una acción HTTP tendría que correr
 * con la conexión de la aplicación, que es justamente la que no puede.
 *
 * DEJA TRAZA. Escribe una fila en `audit_log` con actor `system` y acción
 * `auth.primer-admin`. Es de solo inserción (migración 0002), así que la
 * creación de la primera cuenta queda en el registro y nadie —tampoco quien la
 * creó— puede quitarla de ahí.
 *
 * **NO IMPRIME NINGUNA CONTRASEÑA** (plantilla, paso 9). La primera versión
 * generaba una y la enseñaba en la terminal: acababa en el historial del
 * intérprete, en el registro de la sesión y en la transcripción de quien lo
 * ejecutara por otro —Claude incluido—, y era la credencial de `slg_admin`, la
 * que abre todo. Ahora la cuenta nace **sin contraseña** —sin fila `credential`
 * en `account`: no hay nada con qué entrar— y el guion pide a la librería un
 * **enlace de recuperación** para ese correo, el mismo de `/recuperar`. Llega
 * como «Restablecer tu contraseña», sirve una vez y caduca en una hora; al
 * abrirlo, la persona elige la suya en `/restablecer`, y Better Auth crea
 * entonces la fila `credential` con la forma exacta que el login busca. La
 * contraseña la conoce solo quien la eligió.
 *
 * Por qué el enlace de recuperación y no una invitación de `lib/invitations`:
 * la invitación **crea** la cuenta al canjearse y exige un actor de SLG que
 * invite, que es justo lo que todavía no existe. Aquí la cuenta ya está creada
 * y solo le falta la contraseña, que es exactamente lo que resuelve
 * `requestPasswordReset` —con su token de un solo uso, su caducidad y su
 * plantilla—, sin una línea de criptografía propia.
 *
 * **MODO DE EMERGENCIA: `--imprimir-contrasena`.** Para el día en que el correo
 * no se puede mandar —el proveedor sin verificar, las variables SMTP sin
 * poner— y hace falta entrar igual. Se escribe entero a propósito, avisa antes
 * de hacer nada, y hace lo de siempre: genera una contraseña y la enseña una
 * vez, o usa `PRIMER_ADMIN_PASSWORD` sin enseñarla. Fuera de ese modo,
 * `PRIMER_ADMIN_PASSWORD` se rechaza: una variable que en silencio cambia de
 * «manda un enlace» a «pon esta contraseña» es un modo de emergencia sin
 * nombre.
 *
 * LA CONTRASEÑA, CUANDO LA HAY, SE PICA CON EL HASHEADOR DE LA LIBRERÍA, no
 * con uno propio: `auth.$context.password.hash` es el mismo que usa
 * `signUpEmail`, así que si mañana se cambia la opción
 * `emailAndPassword.password.hash`, esto la sigue. Escribir aquí un scrypt
 * «equivalente» es cómo se acaba con una cuenta que el guion crea y el login no
 * reconoce.
 *
 * NO SE USA `auth.api.signUpEmail` a propósito: con `sendOnSignUp: true`, el
 * alta manda un correo de verificación, y el arranque ocurre **antes** de que el
 * correo esté garantizado. Un arranque que falla porque no pudo mandar un correo
 * que además sobra —el correo lo verifica quien tiene las credenciales de la
 * base— es un arranque que no arranca.
 *
 *   node --env-file=<archivo.env> scripts/auth/primer-admin.ts \
 *        --correo tu@correo --nombre "Tu Nombre"
 *
 * **La cadena del dueño no se escribe en la línea de comandos.** `--env-file` es
 * de Node, no del guion: carga el archivo de variables que ya existe fuera del
 * repositorio y así la credencial no pasa por el historial del intérprete. Sirven
 * los nombres de los dos sitios donde viven hoy: `DATABASE_URL_OWNER` /
 * `DATABASE_URL_APP` (los archivos de `ops/`) o `DATABASE_URL_MIGRATIONS` /
 * `DATABASE_URL` (`.env.example`). También hace falta `BETTER_AUTH_SECRET`, que
 * está en el mismo archivo, y —para mandar el enlace— las variables de correo
 * (`MAIL_SMTP_*`, `MAIL_FROM_ADDRESS`) y la dirección pública del sitio
 * (`NEXT_PUBLIC_SITE_URL`), que es a donde apunta el enlace.
 *
 * El `tu@correo` de los ejemplos **está mal a propósito**: no tiene dominio de
 * primer nivel, así que pegarlo tal cual no crea nada y lo dice. Un ejemplo que
 * parece una dirección se pega, y esto sólo se puede hacer una vez.
 *
 * Opcionales: `--empresa` (por defecto la marca de la ficha, `sitio.marca.nombre`),
 * `--slug` (por defecto `slg`, el espacio de nombres técnico del operador), `--idioma es|en` (el del correo), `--rehacer` (ver
 * `exigirArranqueSinConsumir`) y `--imprimir-contrasena` (arriba).
 */
import { randomUUID, randomInt } from "node:crypto";

import postgres from "postgres";

import { sitio } from "../../lib/sitio/index.ts";

/**
 * **Por qué la librería se importa abajo y no aquí.** `lib/auth/better-auth.ts`
 * arrastra `lib/db/scope.ts`, que abre su conexión **al importarse**: con una
 * cadena ausente o mal escrita, el proceso moría con un volcado de pila de
 * `node:internal/url` antes de llegar a una sola comprobación de este guion.
 * Quien arranca una base por primera vez es exactamente quien se equivoca al
 * pegar la cadena, y merece una frase, no una traza. Las comprobaciones van
 * primero y la librería entra después, con `await import`.
 */

/* ── Argumentos ─────────────────────────────────────────────────────────── */

function argumento(nombre: string): string | undefined {
  const i = process.argv.indexOf(`--${nombre}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const CORREO = (argumento("correo") ?? "").trim().toLowerCase();
const NOMBRE = (argumento("nombre") ?? "").trim();
const EMPRESA = (argumento("empresa") ?? sitio.marca.nombre).trim();
const SLUG = (argumento("slug") ?? "slg").trim();
const IDIOMA = (argumento("idioma") ?? "es").trim() === "en" ? "en" : "es";
/** Ver §«El arranque que salió mal» en la cabecera de `main`. */
const REHACER = process.argv.includes("--rehacer");
/** El modo de emergencia: ver la cabecera. Sin él, la cuenta nace sin contraseña. */
const CON_CONTRASENA = process.argv.includes("--imprimir-contrasena");

function abortar(mensaje: string): never {
  console.error(`\n✗ ${mensaje}\n`);
  process.exit(1);
}

const USO =
  "Uso: node --env-file=<archivo.env> scripts/auth/primer-admin.ts \\\n" +
  "       --correo tu@correo --nombre \"Tu Nombre\"\n" +
  `     [--empresa "${sitio.marca.nombre}"] [--slug slg] [--idioma es|en] [--rehacer]\n` +
  "     [--imprimir-contrasena]   (emergencia: sin correo, la contraseña sale en pantalla)";

if (!CORREO || !NOMBRE) abortar(`Falta --correo o --nombre.\n\n${USO}`);

/**
 * **El correo se comprueba de verdad, y no por pedantería.** La cuenta se crea
 * una sola vez: un correo que no existe deja un administrador al que no se le
 * puede mandar el enlace de recuperación, y el guion ya no se deja repetir. La
 * forma que se exige es la mínima que descarta el error real —un marcador de
 * posición pegado tal cual, `TU@CORREO` o `tu@correo`, que no tiene dominio de
 * primer nivel— sin ponerse a validar direcciones, que no se puede.
 */
if (!/^[^@\s]+@[^@\s.]+(\.[^@\s.]+)+$/.test(CORREO)) {
  abortar(
    `«${CORREO}» no es una dirección de correo: ${CORREO.includes("@") ? "le falta el dominio" : "no tiene arroba"}.\n` +
      `  Parece el hueco del ejemplo sin rellenar. Escribe tu correo real —el tuyo, el que lees—:\n` +
      `  la cuenta se crea una sola vez y el enlace de recuperación va a esa dirección.`,
  );
}

/**
 * La contraseña del modo de emergencia. Doce caracteres es el mínimo que exige
 * la librería (`minPasswordLength`), y una generada aquí trae veinticuatro: la
 * que se escribe a mano en una línea de comandos acaba en el historial del
 * intérprete. **Solo existe con `--imprimir-contrasena`**; sin él, la cuenta
 * nace sin contraseña y `CONTRASENA` es `null`.
 */
const ALFABETO = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function generarContrasena(largo = 24): string {
  let s = "";
  for (let i = 0; i < largo; i++) s += ALFABETO[randomInt(ALFABETO.length)];
  return s;
}

const DADA = process.env.PRIMER_ADMIN_PASSWORD?.trim();
if (DADA && !CON_CONTRASENA) {
  abortar(
    "PRIMER_ADMIN_PASSWORD está puesta, y por defecto este guion ya no pone contraseña: manda al\n" +
      "  correo un enlace para que la elija quien la va a usar. Quítala del entorno, o, si de verdad\n" +
      "  hace falta entrar sin correo, pídelo con todas las letras: --imprimir-contrasena.",
  );
}
if (DADA && DADA.length < 12) {
  abortar("PRIMER_ADMIN_PASSWORD tiene menos de 12 caracteres, que es el mínimo de DU-01.");
}
const CONTRASENA = CON_CONTRASENA ? DADA || generarContrasena() : null;

/**
 * La dirección pública del sitio: el enlace del correo apunta a su
 * `/restablecer` (`sendResetPassword`, `lib/auth/better-auth.ts`). Sin ella, la
 * librería caería a su ruta `/reset-password`, que en este proyecto es un 404.
 */
const BASE_PUBLICA = (process.env.NEXT_PUBLIC_SITE_URL ?? process.env.BETTER_AUTH_URL ?? "").trim().replace(/\/$/, "");

/**
 * **Todo lo que el enlace necesita se comprueba ANTES de crear nada.** La
 * cuenta se crea una sola vez: si se creara y el correo no pudiera salir por
 * una variable que faltaba, quedaría un administrador sin contraseña y sin
 * enlace, y habría que rehacer el arranque. Mejor negarse ahora y decir qué
 * falta.
 */
if (!CON_CONTRASENA) {
  const faltan = [
    "MAIL_SMTP_HOST",
    "MAIL_SMTP_PORT",
    "MAIL_SMTP_USERNAME",
    "MAIL_SMTP_PASSWORD",
    "MAIL_FROM_ADDRESS",
  ].filter((n) => !process.env[n]?.trim());
  if (!BASE_PUBLICA) faltan.push("NEXT_PUBLIC_SITE_URL");
  if (faltan.length > 0) {
    abortar(
      `Para mandar el enlace de la contraseña faltan: ${faltan.join(", ")}.\n` +
        `  Añádelas al mismo archivo de --env-file (los valores del despliegue) y repite.\n` +
        `  No se ha creado nada. Si el correo no tiene arreglo hoy: --imprimir-contrasena.`,
    );
  }
} else {
  console.warn(
    `\n⚠ MODO DE EMERGENCIA (--imprimir-contrasena).\n` +
      (DADA
        ? `  Se usa PRIMER_ADMIN_PASSWORD y no se enseña.\n`
        : `  La contraseña de slg_admin se va a IMPRIMIR en esta terminal: queda en su historial y en\n` +
          `  cualquier registro o transcripción de esta sesión.\n`) +
      `  Cámbiala en cuanto entres (/perfil, o /recuperar con ese correo).`,
  );
}

/* ── Las conexiones ─────────────────────────────────────────────────────── */

/** Los dos nombres de cada cadena: el de `.env.example` y el de los archivos de `ops/`. */
function cadena(nombres: readonly string[]): string | undefined {
  for (const n of nombres) {
    const v = process.env[n]?.trim();
    if (v) return v;
  }
  return undefined;
}

/**
 * Que la cadena **parezca** una cadena, antes de que la abra nadie. Un `…` o un
 * marcador de posición sin sustituir es el error de pegado más común, y sin esto
 * lo cuenta `node:internal/url` con un volcado de pila.
 */
function exigirCadena(valor: string | undefined, nombres: readonly string[], para: string): string {
  if (!valor) {
    abortar(
      `Falta la cadena de conexión ${para}.\n  Se busca, por este orden: ${nombres.join(", ")}.\n` +
        `  Cárgala con --env-file en vez de escribirla: ` +
        `node --env-file=<archivo.env> scripts/auth/primer-admin.ts …`,
    );
  }
  try {
    const u = new URL(valor);
    if (!u.protocol.startsWith("postgres")) throw new Error("protocolo");
  } catch {
    abortar(
      `La cadena ${para} no es una URL de PostgreSQL: «${valor.slice(0, 24)}…».\n` +
        `  Si ves puntos suspensivos, el marcador de posición se pegó tal cual.`,
    );
  }
  return valor;
}

const NOMBRES_DUENO = ["DATABASE_URL_MIGRATIONS", "DATABASE_URL_OWNER"] as const;
const NOMBRES_APP = ["DATABASE_URL", "DATABASE_URL_APP"] as const;

const URL_DUENO = exigirCadena(cadena(NOMBRES_DUENO), NOMBRES_DUENO, "del rol DUEÑO");

/**
 * `DATABASE_URL` no la usa este guion: la exige `lib/db/scope.ts` al importarse,
 * y sin ella la librería de identidad no se puede cargar ni para picar una
 * contraseña. Se le da la del rol de aplicación si está, y si no la del dueño —
 * esa conexión **no se llega a abrir**, porque aquí sólo se llama al hasheador.
 */
process.env.DATABASE_URL = exigirCadena(
  cadena(NOMBRES_APP) ?? URL_DUENO,
  NOMBRES_APP,
  "del rol de aplicación",
);

if (!process.env.BETTER_AUTH_SECRET?.trim()) {
  abortar(
    "Falta BETTER_AUTH_SECRET. Está en el mismo archivo de variables que la cadena del dueño;\n" +
      "  la librería lo exige para inicializarse, aunque aquí sólo se le pida picar la contraseña.",
  );
}

const sql = postgres(URL_DUENO, { max: 2, onnotice: () => {} });

/** Solo el tipo: la librería se carga dentro de `main`, ver la nota de arriba. */
type LibreriaDeIdentidad = (typeof import("../../lib/auth/better-auth.ts"))["auth"];

/**
 * ── EL ARRANQUE QUE SALIÓ MAL ────────────────────────────────────────────────
 *
 * Con la base ya poblada, este guion no hace nada: a partir del primer usuario
 * las cuentas se crean invitando desde `/hq/usuarios`, que deja traza del actor
 * que invita. Ésa es la regla y no se toca.
 *
 * `--rehacer` es la excepción, y existe porque el fallo ocurrió: el 2026-09-18 el
 * arranque se lanzó con el marcador de posición del ejemplo (`TU@CORREO`) y creó
 * un administrador con un correo inexistente — al que no se le puede mandar el
 * enlace de recuperación— y, de paso, cerró la única puerta que había para
 * arreglarlo. **Una operación que sólo se puede hacer una vez tiene que admitir
 * que esa vez salga mal.**
 *
 * Las tres condiciones son lo que impide que esto sea una puerta trasera, y se
 * exigen las tres a la vez:
 *
 *   1. hay **exactamente un** usuario;
 *   2. lo creó **este guion** — hay un apunte `auth.primer-admin` en `audit_log`
 *      cuyo `entity_id` es ese usuario. No basta con que haya uno solo: uno
 *      creado por otro camino no se borra desde aquí;
 *   3. **nadie ha entrado jamás**: cero filas en `session`. Es la condición que
 *      de verdad manda, porque separa «el arranque no llegó a usarse» de «esta
 *      cuenta ya es de alguien». En cuanto se abre sesión una vez, `--rehacer`
 *      deja de funcionar para siempre.
 *
 * El borrado arrastra `account` y `membership` (las dos con `ON DELETE CASCADE`),
 * deja la empresa —que se reaprovecha por `slug`— y **no borra el apunte de
 * auditoría**: `audit_log` es de solo inserción, así que el arranque fallido
 * queda en la historia y encima se le añade el suyo al rehacerlo.
 */
async function exigirArranqueSinConsumir(cuantos: number): Promise<void> {
  const negarse = (motivo: string): never => {
    throw new Error(
      `${motivo}\n  Esto es el arranque de una base vacía y nada más: a partir del primer usuario, ` +
        `las cuentas\n  se crean invitando desde /hq/usuarios, que deja traza del actor que invita. ` +
        `Si hace falta\n  otra cuenta de SLG y no hay con quién entrar, se restablece la contraseña ` +
        `de una existente.`,
    );
  };

  if (!REHACER) {
    negarse(
      `La base ya tiene ${cuantos} usuario(s).` +
        (cuantos === 1
          ? `\n  Si ese usuario es un arranque que salió mal y nadie ha entrado todavía, ` +
            `--rehacer lo sustituye.`
          : ""),
    );
  }
  if (cuantos !== 1) negarse(`--rehacer sustituye UN arranque, y la base tiene ${cuantos} usuarios.`);

  const [{ n: sesiones }] = await sql<{ n: number }[]>`select count(*)::int as n from session`;
  if (sesiones > 0) {
    negarse(
      `Ya se ha abierto sesión con esa cuenta (${sesiones} en «session»): el arranque está consumido ` +
        `y la cuenta es de alguien.`,
    );
  }

  const [victima] = await sql<{ id: string; email: string }[]>`
    select u.id, u.email
      from "user" u
      join audit_log a on a.entity_id = u.id and a.action = 'auth.primer-admin'
     limit 1
  `;
  if (!victima) {
    negarse("El único usuario de la base NO lo creó este guion: no hay apunte «auth.primer-admin».");
  }

  await sql.begin(async (tx) => {
    // `account` y `membership` se van con él por CASCADE; el apunte, no.
    await tx`delete from "user" where id = ${victima.id}`;
    await tx`
      insert into audit_log (id, actor_type, actor_id, actor_label, action, entity, entity_id, metadata)
      values (${randomUUID()}, 'system', null, 'scripts/auth/primer-admin.ts',
              'auth.primer-admin.rehecho', 'user', ${victima.id},
              ${sql.json({ correoAnterior: victima.email, correoNuevo: CORREO })})
    `;
  });
  console.log(`  Arranque anterior retirado: <${victima.email}>. El apunte de auditoría se queda.`);
}

async function main() {
  /**
   * La comprobación inversa a la de `lib/auth/db.ts`: allí el proceso se niega a
   * servir **con** BYPASSRLS; aquí se niega a arrancar **sin** él, porque sin
   * BYPASSRLS la política de `membership` rechaza la escritura y el guion
   * dejaría una cuenta sin pertenencia —que no puede entrar a ninguna
   * superficie— en vez de fallar del todo.
   */
  const [rol] = await sql<{ rolname: string; rolbypassrls: boolean; rolsuper: boolean }[]>`
    select rolname, rolbypassrls, rolsuper from pg_roles where rolname = current_user
  `;
  if (!rol?.rolbypassrls && !rol?.rolsuper) {
    throw new Error(
      `La conexión entra como «${rol?.rolname ?? "?"}», que no salta las políticas de fila. ` +
        `Usa la cadena del rol DUEÑO (DATABASE_URL_MIGRATIONS), la misma de las migraciones: ` +
        `la política de «membership» le impide al rol de aplicación crear la primera pertenencia.`,
    );
  }

  const [{ n: cuantos }] = await sql<{ n: number }[]>`select count(*)::int as n from "user"`;
  if (cuantos > 0) await exigirArranqueSinConsumir(cuantos);

  // La librería se importa AQUÍ, con las comprobaciones ya hechas, porque
  // importarla abre conexiones. Sin contraseña no hay nada que picar.
  const { auth } = await import("../../lib/auth/better-auth.ts");
  const hash = CONTRASENA ? await (await auth.$context).password.hash(CONTRASENA) : null;

  const idUsuario = randomUUID();
  const idEmpresa = randomUUID();

  const resumen = await sql.begin(async (tx) => {
    /**
     * La empresa de SLG. `on conflict (slug)` porque una base con la empresa ya
     * creada y sin usuarios es un estado real —pasa si un arranque anterior se
     * quedó a medias— y volver a intentarlo tiene que funcionar.
     */
    const [empresa] = await tx<{ id: string; name: string }[]>`
      insert into organization (id, name, slug, type, status)
      values (${idEmpresa}, ${EMPRESA}, ${SLUG}, 'slg', 'active')
      on conflict (slug) do update set name = excluded.name
      returning id, name
    `;

    /**
     * `email_verified` en `true` por construcción: quien ejecuta esto tiene las
     * credenciales del dueño de la base. Pedirle además que confirme un correo
     * es pedir una prueba más débil que la que ya dio — y el alta exige el
     * correo verificado para poder entrar (`requireEmailVerification`).
     */
    await tx`
      insert into "user" (id, name, email, email_verified, role, locale)
      values (${idUsuario}, ${NOMBRE}, ${CORREO}, true, 'slg_admin', ${IDIOMA})
    `;

    /**
     * `provider_id = 'credential'` y `account_id = user_id`: es la forma exacta
     * en la que Better Auth guarda una cuenta de contraseña, y la que
     * `lib/auth/acceso.ts` busca para saber si alguien puede cambiar la suya.
     *
     * **Solo en el modo de emergencia.** Por defecto no se escribe: la fila la
     * crea la propia librería cuando la persona abre el enlace y elige su
     * contraseña (`resetPassword` crea la cuenta `credential` si no existe), y
     * hasta entonces no hay contraseña con la que entrar —ni conocida ni
     * desconocida—.
     */
    if (hash) {
      await tx`
        insert into account (id, user_id, provider_id, account_id, password)
        values (${randomUUID()}, ${idUsuario}, 'credential', ${idUsuario}, ${hash})
      `;
    }

    await tx`
      insert into membership (id, user_id, organization_id, org_role)
      values (${randomUUID()}, ${idUsuario}, ${empresa.id}, 'slg_admin')
    `;

    /**
     * La traza. Actor `system` porque no hay ningún usuario que pueda ser el
     * actor: esta fila describe precisamente el momento en que no había ninguno.
     */
    await tx`
      insert into audit_log (id, actor_type, actor_id, actor_label, action, entity, entity_id, organization_id, metadata)
      values (${randomUUID()}, 'system', null, 'scripts/auth/primer-admin.ts',
              'auth.primer-admin', 'user', ${idUsuario}, ${empresa.id},
              ${sql.json({
                correo: CORREO,
                rol: "slg_admin",
                empresa: empresa.name,
                // Cómo se le dio acceso: la diferencia importa al auditar, porque
                // una contraseña impresa ha pasado por una terminal.
                acceso: CONTRASENA ? "contrasena_impresa" : "enlace_por_correo",
              })})
    `;

    return empresa;
  });

  console.log(`\n✓ Primera cuenta creada.\n`);
  console.log(`  Empresa      ${resumen.name} (${SLUG}, tipo slg)`);
  console.log(`  Usuario      ${NOMBRE} <${CORREO}>`);
  console.log(`  Rol          slg_admin`);

  const correoSalio = CONTRASENA ? true : await mandarEnlace(auth);

  if (CONTRASENA && !DADA) {
    console.log(`\n  CONTRASEÑA   ${CONTRASENA}`);
    console.log(
      `\n  Cópiala ahora a tu gestor de contraseñas: no se guarda en ninguna parte y no\n` +
        `  se vuelve a enseñar. Y cámbiala al entrar: ha pasado por esta terminal.`,
    );
  }
  if (CONTRASENA) console.log(`\n  Entra en /acceder con ese correo y esa contraseña.`);
  console.log(
    `  Si /hq contesta 404, no es la cuenta: es que la superficie sigue cerrada\n` +
      `  (SUPERFICIES_ABIERTAS en lib/auth/roles.ts).\n`,
  );

  await sql.end({ timeout: 5 });
  process.exit(correoSalio ? 0 : 1);
}

/**
 * Pide a la librería el enlace de recuperación para la cuenta recién creada y
 * dice si el correo salió.
 *
 * `requestPasswordReset` no lo cuenta —responde lo mismo exista la cuenta o no,
 * y un fallo del correo lo registra y se lo traga (RF-59, RF-119)—, así que la
 * respuesta se lee de donde queda escrita: la fila de `email_delivery` que
 * `enviarCorreo` deja SIEMPRE, salga o no. Sin fila, el correo ni se intentó.
 *
 * **Un fallo aquí no deshace la cuenta**, y no debe: nadie ha entrado, así que
 * `--rehacer` sigue disponible, y `/recuperar` manda otro enlace en cuanto el
 * correo funcione. El guion sale con código 1 para que no pase por un éxito.
 */
async function mandarEnlace(auth: LibreriaDeIdentidad): Promise<boolean> {
  // El instante lo da la base y no este proceso: la fila la fecha PostgreSQL, y
  // un reloj local adelantado un par de segundos haría que no se encontrara.
  const [{ desde }] = await sql<{ desde: Date }[]>`select now() as desde`;
  await auth.api.requestPasswordReset({ body: { email: CORREO } });

  const [fila] = await sql<{ status: string; last_error: string | null }[]>`
    select status, last_error from email_delivery
     where to_email = ${CORREO} and kind = 'password_reset' and created_at >= ${desde}
     order by created_at desc
     limit 1
  `;

  if (fila?.status === "delivered") {
    console.log(`  Contraseña   ninguna todavía: la elige esa persona con el enlace.`);
    console.log(
      `\n✓ Enlace enviado a <${CORREO}>, con el asunto «Restablecer tu contraseña».\n` +
        `  Sirve una vez y caduca en una hora. Al abrirlo se elige la contraseña (12 caracteres\n` +
        `  como mínimo) y después se entra en ${BASE_PUBLICA}/acceder.\n` +
        `  Si caduca o no llega: ${BASE_PUBLICA}/recuperar con ese mismo correo manda otro.`,
    );
    return true;
  }

  console.error(
    `\n✗ La cuenta está creada, pero el correo con el enlace NO salió` +
      (fila ? `: ${fila.last_error ?? fila.status}.` : ": no llegó ni a intentarse.") +
      `\n  Nadie ha entrado todavía, así que hay dos salidas:\n` +
      `    1. Arregla el correo y pide el enlace en ${BASE_PUBLICA}/recuperar con <${CORREO}>.\n` +
      `    2. O repite este guion con --rehacer (y, si el correo no tiene arreglo hoy,\n` +
      `       --imprimir-contrasena).`,
  );
  return false;
}

main().catch(async (e) => {
  console.error(`\n✗ ${(e as Error).message}\n`);
  await sql.end({ timeout: 5 }).catch(() => {});
  process.exit(1);
});
