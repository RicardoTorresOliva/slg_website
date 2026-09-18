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
 * LA CONTRASEÑA SE PICA CON EL HASHEADOR DE LA LIBRERÍA, no con uno propio:
 * `auth.$context.password.hash` es el mismo que usa `signUpEmail`, así que si
 * mañana se cambia la opción `emailAndPassword.password.hash`, esto la sigue.
 * Escribir aquí un scrypt «equivalente» es cómo se acaba con una cuenta que el
 * guion crea y el login no reconoce.
 *
 * NO SE USA `auth.api.signUpEmail` a propósito: con `sendOnSignUp: true`, el
 * alta manda un correo de verificación, y el arranque ocurre **antes** de que el
 * correo esté garantizado. Un arranque que falla porque no pudo mandar un correo
 * que además sobra —el correo lo verifica quien tiene las credenciales de la
 * base— es un arranque que no arranca.
 *
 *   node scripts/auth/primer-admin.ts --correo tu@correo --nombre "Tu Nombre"
 *
 * Opcionales: `--empresa` (por defecto «SLG Agency»), `--slug` (por defecto
 * `slg`), y `PRIMER_ADMIN_PASSWORD` en el entorno. Sin ella se genera una y se
 * enseña **una sola vez**.
 */
import { randomUUID, randomInt } from "node:crypto";

import postgres from "postgres";

import { auth } from "../../lib/auth/better-auth.ts";

/* ── Argumentos ─────────────────────────────────────────────────────────── */

function argumento(nombre: string): string | undefined {
  const i = process.argv.indexOf(`--${nombre}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const CORREO = (argumento("correo") ?? "").trim().toLowerCase();
const NOMBRE = (argumento("nombre") ?? "").trim();
const EMPRESA = (argumento("empresa") ?? "SLG Agency").trim();
const SLUG = (argumento("slug") ?? "slg").trim();
const IDIOMA = (argumento("idioma") ?? "es").trim() === "en" ? "en" : "es";

if (!CORREO.includes("@") || !NOMBRE) {
  console.error(
    "Uso: node scripts/auth/primer-admin.ts --correo tu@correo --nombre \"Tu Nombre\"\n" +
      "     [--empresa \"SLG Agency\"] [--slug slg] [--idioma es|en]\n",
  );
  process.exit(1);
}

/**
 * La contraseña. Doce caracteres es el mínimo que exige la librería
 * (`minPasswordLength`), y una generada aquí trae veinticuatro: la que se
 * escribe a mano en una línea de comandos acaba en el historial del intérprete.
 */
const ALFABETO = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function generarContrasena(largo = 24): string {
  let s = "";
  for (let i = 0; i < largo; i++) s += ALFABETO[randomInt(ALFABETO.length)];
  return s;
}

const DADA = process.env.PRIMER_ADMIN_PASSWORD?.trim();
if (DADA && DADA.length < 12) {
  console.error("✗ PRIMER_ADMIN_PASSWORD tiene menos de 12 caracteres, que es el mínimo de DU-01.");
  process.exit(1);
}
const CONTRASENA = DADA || generarContrasena();

/* ── La conexión del dueño ──────────────────────────────────────────────── */

const URL_DUENO = process.env.DATABASE_URL_MIGRATIONS ?? process.env.DATABASE_URL;
if (!URL_DUENO) {
  console.error("✗ Falta DATABASE_URL_MIGRATIONS (la del rol dueño). Ver `.env.example`.");
  process.exit(1);
}
const sql = postgres(URL_DUENO, { max: 2, onnotice: () => {} });

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
  if (cuantos > 0) {
    throw new Error(
      `La base ya tiene ${cuantos} usuario(s). Esto es el arranque de una base vacía y nada más: ` +
        `a partir del primero, las cuentas se crean invitando desde /hq/usuarios, que deja traza ` +
        `del actor que invita. Si de verdad hace falta otra cuenta de SLG y no hay con quién ` +
        `entrar, se restablece la contraseña de una existente, no se crea una por la puerta de atrás.`,
    );
  }

  // El hasheador de la librería, no uno propio. Ver la cabecera.
  const contexto = await auth.$context;
  const hash = await contexto.password.hash(CONTRASENA);

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
     */
    await tx`
      insert into account (id, user_id, provider_id, account_id, password)
      values (${randomUUID()}, ${idUsuario}, 'credential', ${idUsuario}, ${hash})
    `;

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
              ${sql.json({ correo: CORREO, rol: "slg_admin", empresa: empresa.name })})
    `;

    return empresa;
  });

  console.log(`\n✓ Primera cuenta creada.\n`);
  console.log(`  Empresa      ${resumen.name} (${SLUG}, tipo slg)`);
  console.log(`  Usuario      ${NOMBRE} <${CORREO}>`);
  console.log(`  Rol          slg_admin`);
  if (!DADA) {
    console.log(`\n  CONTRASEÑA   ${CONTRASENA}`);
    console.log(
      `\n  Cópiala ahora a tu gestor de contraseñas: no se guarda en ninguna parte y no\n` +
        `  se vuelve a enseñar. Cámbiala desde /perfil en cuanto entres.`,
    );
  }
  console.log(`\n  Entra en /acceder con ese correo y esa contraseña.`);
  console.log(
    `  Si /hq contesta 404, no es la cuenta: es que la superficie sigue cerrada\n` +
      `  (SUPERFICIES_ABIERTAS en lib/auth/roles.ts).\n`,
  );

  await sql.end({ timeout: 5 });
  process.exit(0);
}

main().catch(async (e) => {
  console.error(`\n✗ ${(e as Error).message}\n`);
  await sql.end({ timeout: 5 }).catch(() => {});
  process.exit(1);
});
