/**
 * revisar-cuenta.ts — **Por qué no entra esta cuenta.** Solo lectura.
 *
 * POR QUÉ EXISTE. «No hemos podido iniciar sesión con esos datos» es un mensaje
 * deliberadamente mudo (RNF-32): no distingue «ese correo no existe» de «la
 * contraseña no coincide» de «esta cuenta entra con Google», porque decirlo se
 * lo diría también a quien tenga una sesión ajena delante. Eso está bien de cara
 * al público y es inútil para quien administra: sin esto, el diagnóstico es
 * adivinar. Aquí, con las credenciales de la base en la mano, se puede mirar.
 *
 * **NO ESCRIBE NADA.** Ni crea, ni restablece, ni desbloquea. Si la contraseña
 * no coincide, el camino es `/recuperar`, que manda un enlace de un solo uso al
 * correo de la cuenta; y si la cuenta no existe, `scripts/auth/primer-admin.ts`
 * o una invitación desde `/hq/usuarios`. Un guion de diagnóstico que además
 * arregla acaba usándose para arreglar sin diagnosticar.
 *
 * **MIRA CON LAS DOS CONEXIONES, Y AHÍ ESTÁ LA GRACIA.** Con la del dueño dice
 * qué hay en la base; con la de la aplicación dice qué ve la aplicación. Cuando
 * las dos no coinciden, el problema no es la cuenta: es que el sitio está
 * mirando otra base, que es exactamente el fallo que un vistazo no encuentra.
 *
 *   node --env-file=<archivo.env> scripts/auth/revisar-cuenta.ts \
 *        --correo tu@correo [--password "la que se prueba"]
 *
 * Sin `--password` comprueba todo menos la contraseña.
 */
import postgres from "postgres";

function argumento(nombre: string): string | undefined {
  const i = process.argv.indexOf(`--${nombre}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function abortar(mensaje: string): never {
  console.error(`\n✗ ${mensaje}\n`);
  process.exit(1);
}

const CORREO = (argumento("correo") ?? "").trim().toLowerCase();
const CLAVE = argumento("password");

if (!CORREO.includes("@")) {
  abortar(
    "Falta --correo.\n\n" +
      "Uso: node --env-file=<archivo.env> scripts/auth/revisar-cuenta.ts \\\n" +
      "       --correo tu@correo [--password \"la que se prueba\"]",
  );
}

/** Los dos nombres de cada cadena: el de `.env.example` y el de los archivos de `ops/`. */
function cadena(nombres: readonly string[]): string | undefined {
  for (const n of nombres) {
    const v = process.env[n]?.trim();
    if (v) return v;
  }
  return undefined;
}

const URL_DUENO = cadena(["DATABASE_URL_MIGRATIONS", "DATABASE_URL_OWNER"]);
const URL_APP = cadena(["DATABASE_URL", "DATABASE_URL_APP"]);
if (!URL_DUENO && !URL_APP) {
  abortar(
    "No hay ninguna cadena de conexión.\n" +
      "  Se buscan: DATABASE_URL_MIGRATIONS, DATABASE_URL_OWNER, DATABASE_URL, DATABASE_URL_APP.\n" +
      "  Cárgalas con --env-file en vez de escribirlas.",
  );
}
// La librería de identidad la exige al importarse; no se llega a abrir esa conexión.
process.env.DATABASE_URL = URL_APP ?? URL_DUENO!;

/** Host, puerto y base de una cadena, **sin la contraseña**. */
function señas(url: string | undefined): string {
  if (!url) return "(no definida)";
  try {
    const u = new URL(url);
    return `${u.username.split(".")[0]}@${u.hostname}:${u.port || "5432"}${u.pathname}`;
  } catch {
    return "(no es una URL)";
  }
}

type FilaDeUsuario = {
  id: string;
  name: string;
  email: string;
  email_verified: boolean;
  role: string;
  banned: boolean | null;
  created_at: string;
};

async function main() {
  console.log(`\nCuenta: ${CORREO}\n`);
  console.log(`  Base del dueño        ${señas(URL_DUENO)}`);
  console.log(`  Base de la aplicación ${señas(URL_APP)}`);
  if (URL_DUENO && URL_APP && señas(URL_DUENO).split("@")[1] !== señas(URL_APP).split("@")[1]) {
    console.log(`  ⚠ apuntan a HOSTS distintos: puede ser el pooler y el host directo, o dos bases.`);
  }

  const dueno = URL_DUENO ? postgres(URL_DUENO, { max: 1, prepare: false, onnotice: () => {} }) : null;
  const app = URL_APP ? postgres(URL_APP, { max: 1, prepare: false, onnotice: () => {} }) : null;
  const cerrar = async () => {
    await dueno?.end({ timeout: 5 }).catch(() => {});
    await app?.end({ timeout: 5 }).catch(() => {});
  };

  try {
    /* ── 1. ¿Existe la cuenta? ───────────────────────────────────────────── */
    const consulta = (sql: postgres.Sql) => sql<FilaDeUsuario[]>`
      select id, name, email, email_verified, role, banned, created_at::text
        from "user" where lower(email) = ${CORREO}`;

    const [porElDueno] = dueno ? await consulta(dueno) : [];
    const [porLaApp] = app ? await consulta(app) : [];
    const usuario = porElDueno ?? porLaApp;

    console.log(`\n¿Existe la cuenta?\n`);
    if (!usuario) {
      console.log(`  ✗ NO hay ninguna fila en «user» con ese correo.`);
      const [{ n }] = await (dueno ?? app!)<{ n: number }[]>`select count(*)::int as n from "user"`;
      console.log(`    La base tiene ${n} usuario(s) en total.`);
      if (n === 0) console.log(`    Base vacía: es el caso de scripts/auth/primer-admin.ts.`);
      else console.log(`    Con usuarios ya creados, la vía es invitar desde /hq/usuarios.`);
      await cerrar();
      process.exit(1);
    }
    console.log(`  ✓ existe · id ${usuario.id}`);
    console.log(`    nombre           ${usuario.name}`);
    console.log(`    correo guardado  ${usuario.email}${usuario.email !== CORREO ? "   ⚠ distinto en mayúsculas" : ""}`);
    console.log(`    rol              ${usuario.role}`);
    console.log(`    creada           ${usuario.created_at}`);

    /**
     * Las dos conexiones tienen que ver LO MISMO. Si el dueño la ve y la
     * aplicación no, el sitio está mirando otra base y ninguna contraseña
     * funcionaría jamás — que es el fallo que parece «credenciales mal».
     */
    if (dueno && app) {
      console.log(
        porLaApp
          ? `  ✓ la conexión de la APLICACIÓN también la ve`
          : `  ✗ la conexión de la APLICACIÓN **no** la ve: el sitio mira otra base`,
      );
    }

    /* ── 2. Las tres puertas que cierran el paso ─────────────────────────── */
    console.log(`\n¿Qué le impediría entrar?\n`);
    console.log(
      usuario.email_verified
        ? `  ✓ correo verificado`
        : `  ✗ correo SIN verificar — y el acceso por contraseña lo exige (requireEmailVerification)`,
    );
    console.log(usuario.banned ? `  ✗ cuenta SUSPENDIDA (banned)` : `  ✓ cuenta no suspendida`);

    const sql = dueno ?? app!;
    const cuentas = await sql<{ provider_id: string; tiene_clave: boolean }[]>`
      select provider_id, (password is not null) as tiene_clave
        from account where user_id = ${usuario.id} order by provider_id`;
    if (cuentas.length === 0) {
      console.log(`  ✗ sin ninguna fila en «account»: esta cuenta no tiene con qué entrar`);
    } else {
      for (const c of cuentas) {
        console.log(
          `  ${c.provider_id === "credential" && !c.tiene_clave ? "✗" : "✓"} método «${c.provider_id}»` +
            (c.provider_id === "credential" ? (c.tiene_clave ? " con contraseña guardada" : " SIN contraseña") : ""),
        );
      }
      if (!cuentas.some((c) => c.provider_id === "credential")) {
        console.log(`    Nota: sin método «credential», el formulario de correo y contraseña nunca va a servir.`);
      }
    }

    const pertenencias = await sql<{ organization_id: string; org_role: string; name: string; type: string }[]>`
      select m.organization_id, m.org_role, o.name, o.type
        from membership m join organization o on o.id = m.organization_id
       where m.user_id = ${usuario.id}`;
    console.log(
      pertenencias.length === 0
        ? `  ✗ sin pertenencia a ninguna empresa: entra, pero no tiene superficie donde aterrizar`
        : `  ✓ pertenece a ${pertenencias.map((p) => `${p.name} (${p.type}, ${p.org_role})`).join(" · ")}`,
    );

    const [sesiones] = await sql<{ n: number }[]>`
      select count(*)::int as n from "session" where user_id = ${usuario.id} and expires_at > now()`;
    console.log(`  · sesiones vivas: ${sesiones?.n ?? 0}`);

    /* ── 3. La contraseña, contra el verificador de la librería ──────────── */
    if (CLAVE) {
      console.log(`\n¿Sirve esa contraseña?\n`);
      const [credencial] = await sql<{ password: string | null }[]>`
        select password from account where user_id = ${usuario.id} and provider_id = 'credential' limit 1`;
      if (!credencial?.password) {
        console.log(`  ✗ no hay hash que comprobar`);
      } else {
        // El verificador de la propia librería: uno escrito aquí podría decir
        // que sí donde el login dice que no, que es el peor diagnóstico posible.
        const { auth } = await import("../../lib/auth/better-auth.ts");
        const contexto = await auth.$context;
        const vale = await contexto.password.verify({ hash: credencial.password, password: CLAVE });
        console.log(
          vale
            ? `  ✓ la contraseña COINCIDE. Si aun así no entra, el problema es otro de los de arriba.`
            : `  ✗ la contraseña NO coincide. Restablécela desde /recuperar (enlace de un solo uso al correo).`,
        );
      }
    } else {
      console.log(`\n  (sin --password no se comprueba la contraseña)`);
    }

    console.log("");
    await cerrar();
    process.exit(0);
  } catch (e) {
    console.error(`\n✗ ${(e as Error).message}\n`);
    await cerrar();
    process.exit(1);
  }
}

main();
