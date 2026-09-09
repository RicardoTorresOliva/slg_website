/**
 * setup-app-role.ts — Prepara el rol de aplicación en la base de datos.
 *
 * POR QUÉ EXISTE. Las migraciones crean el rol `slg_app` y le quitan
 * `BYPASSRLS`, pero **no pueden asignarle contraseña**: una contraseña en un
 * archivo de migración versionado sería un secreto en un repositorio público.
 * Sin ese paso, la aplicación no puede conectarse y el despliegue falla.
 *
 * Este script cierra ese hueco. Se ejecuta en el despliegue, después de las
 * migraciones y antes de arrancar la aplicación.
 *
 * CÓMO. Lee `DATABASE_URL` —la cadena con la que la aplicación se conectará— y
 * se asegura de que ese usuario existe en PostgreSQL con esa contraseña. Una
 * sola fuente de verdad: no hay una tercera variable que pueda desincronizarse
 * de la cadena de conexión.
 *
 * SEGURIDAD. La contraseña nunca se imprime, ni entera ni en fragmentos. Y se
 * comprueba lo que de verdad importa: que el rol de la aplicación NO sea
 * superusuario y NO tenga `BYPASSRLS`. Con cualquiera de las dos, las políticas
 * de fila dejan de aplicarse y el aislamiento entre empresas es decorativo.
 */

import postgres from "postgres";

const APP_URL = process.env.DATABASE_URL;
const OWNER_URL = process.env.DATABASE_URL_MIGRATIONS;

function salir(mensaje: string): never {
  console.error(`✗ ${mensaje}`);
  process.exit(1);
}

if (!APP_URL) salir("Falta DATABASE_URL: es la cadena con la que se conecta la aplicación.");
if (!OWNER_URL) {
  salir(
    "Falta DATABASE_URL_MIGRATIONS. Crear un rol exige privilegios que la propia " +
      "aplicación no tiene —y no debe tener—, así que este paso necesita la conexión del dueño.",
  );
}

let usuario: string;
let contrasena: string;
try {
  const u = new URL(APP_URL);
  usuario = decodeURIComponent(u.username);
  contrasena = decodeURIComponent(u.password);
} catch {
  salir("DATABASE_URL no es una URL válida.");
}

if (!usuario) salir("DATABASE_URL no incluye usuario.");
if (!contrasena) salir("DATABASE_URL no incluye contraseña.");

if (usuario === "postgres") {
  salir(
    "DATABASE_URL apunta al usuario `postgres`, que es superusuario. Con él las " +
      "políticas de fila NO se aplican y el aislamiento entre empresas desaparece. " +
      "La aplicación debe conectarse con un rol sin privilegios (`slg_app`).",
  );
}

const owner = postgres(OWNER_URL, { max: 1, onnotice: () => {} });

async function main() {
  console.log(`Preparando el rol de aplicación «${usuario}»…\n`);

  const [existe] = await owner`select 1 from pg_roles where rolname = ${usuario}`;

  if (existe) {
    // `postgres.js` no parametriza identificadores ni contraseñas en ALTER ROLE,
    // así que se usa `unsafe` con valores que NO vienen del usuario final: salen
    // de una variable de entorno del despliegue. Aun así se escapan.
    await owner.unsafe(
      `ALTER ROLE ${escaparIdent(usuario)} WITH LOGIN NOBYPASSRLS PASSWORD ${escaparLiteral(contrasena)}`,
    );
    console.log("  ✓ rol existente actualizado (login, sin BYPASSRLS, contraseña fijada)");
  } else {
    await owner.unsafe(
      `CREATE ROLE ${escaparIdent(usuario)} WITH LOGIN NOBYPASSRLS PASSWORD ${escaparLiteral(contrasena)}`,
    );
    console.log("  ✓ rol creado");
  }

  await owner.unsafe(`GRANT USAGE ON SCHEMA public TO ${escaparIdent(usuario)}`);
  await owner.unsafe(
    `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${escaparIdent(usuario)}`,
  );
  await owner.unsafe(
    `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${escaparIdent(usuario)}`,
  );
  // La auditoría es de solo inserción y lectura, también para este rol (RNF-29).
  await owner.unsafe(`REVOKE UPDATE, DELETE, TRUNCATE ON audit_log FROM ${escaparIdent(usuario)}`);
  console.log("  ✓ privilegios concedidos · audit_log revocada para modificación");

  // Verificación: lo que se comprueba no es que el script haya corrido, sino que
  // la aplicación NO puede saltarse el aislamiento.
  const [rol] = await owner`
    select rolsuper as superusuario, rolbypassrls as bypass, rolcanlogin as login
    from pg_roles where rolname = ${usuario}`;

  const problemas: string[] = [];
  if (rol.superusuario) problemas.push("es SUPERUSUARIO");
  if (rol.bypass) problemas.push("tiene BYPASSRLS");
  if (!rol.login) problemas.push("no puede iniciar sesión");

  if (problemas.length) {
    salir(
      `El rol «${usuario}» ${problemas.join(" y ")}. ` +
        "Con superusuario o BYPASSRLS, las políticas de fila no se aplican y la " +
        "separación entre empresas clientes desaparece. El despliegue se detiene.",
    );
  }
  console.log("  ✓ verificado: sin superusuario, sin BYPASSRLS, con login");

  // Prueba real de conexión con las credenciales de la aplicación.
  const app = postgres(APP_URL!, { max: 1, onnotice: () => {} });
  try {
    await app`select 1`;
    console.log("  ✓ la aplicación se conecta correctamente");
  } finally {
    await app.end({ timeout: 5 }).catch(() => {});
  }

  console.log("\n✓ Rol de aplicación listo.\n");
  await owner.end({ timeout: 5 });
}

/** Escapa un identificador SQL con comillas dobles. */
function escaparIdent(v: string): string {
  return `"${v.replace(/"/g, '""')}"`;
}

/** Escapa un literal SQL con comillas simples. */
function escaparLiteral(v: string): string {
  return `'${v.replace(/'/g, "''")}'`;
}

main().catch(async (e) => {
  // El mensaje de error puede contener la cadena de conexión: se recorta.
  const msg = String(e?.message ?? e).replace(/:\/\/[^@\s]*@/g, "://***@");
  console.error(`\n✗ No se pudo preparar el rol de aplicación: ${msg}\n`);
  await owner.end({ timeout: 5 }).catch(() => {});
  process.exit(1);
});
