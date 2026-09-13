/**
 * administracion.ts — **Las dos órdenes de puesta en marcha de la base**, para
 * que nadie tenga que abrir una consola de PostgreSQL.
 *
 * EL PROBLEMA QUE RESUELVE. La migración 0002 crea el rol `slg_app` **con
 * `LOGIN` y sin contraseña**, a propósito: este repositorio es público y una
 * contraseña en una migración es una contraseña publicada. Alguien tiene que
 * ponérsela una vez. El paso a paso decía «en la consola de `slgwebpostgres`»,
 * que es una frase que solo entiende quien ya sabe que Easypanel tiene una
 * pestaña de consola — y quien lo sabe no necesita el documento.
 *
 * Así que lo hace el código: la aplicación ya tiene la conexión del **rol
 * dueño** (`DATABASE_URL_MIGRATIONS`), que es el único que puede cambiar la
 * contraseña de otro rol. Poner dos variables en un panel que ya se está usando
 * y pulsar un botón es una cosa; encontrar una consola de PostgreSQL es otra.
 *
 * POR QUÉ NO ES UN AGUJERO. Solo lo llama `/api/ops`, que **no existe** sin
 * `OPS_TOKEN` —sin la variable la ruta devuelve 404, no 403— y que se apaga
 * borrando esa variable cuando la puesta en marcha termina. La contraseña
 * **nunca llega por la petición**: sale de `APP_DB_PASSWORD`, o sea del mismo
 * panel donde vive la cadena de conexión. Una ruta que aceptara la contraseña
 * por parámetro sería una ruta para cambiar la contraseña de la base desde
 * fuera.
 */
import postgres from "postgres";

export type ResultadoDeAdministracion = { readonly ok: boolean; readonly detalle: string };

const ROL = "slg_app";

/**
 * Le pone a `slg_app` la contraseña de `APP_DB_PASSWORD`.
 *
 * Es **idempotente**: ejecutarla dos veces deja la misma contraseña. Y se puede
 * ejecutar aunque `DATABASE_URL` todavía lleve una contraseña que no vale —que
 * es justo el estado en el que se ejecuta la primera vez—, porque usa la
 * conexión del dueño, que es otra.
 */
export async function ponerClaveDeAplicacion(): Promise<ResultadoDeAdministracion> {
  const url = process.env.DATABASE_URL_MIGRATIONS;
  if (!url) {
    return {
      ok: false,
      detalle:
        "Falta DATABASE_URL_MIGRATIONS. Es la cadena del rol DUEÑO de la base, el que puede cambiar contraseñas.",
    };
  }
  const clave = process.env.APP_DB_PASSWORD;
  if (!clave || clave.length < 12) {
    return {
      ok: false,
      detalle:
        "Falta APP_DB_PASSWORD, o tiene menos de 12 caracteres. Invéntate una larga y ponla en Easypanel; " +
        "tiene que ser la MISMA que va dentro de DATABASE_URL.",
    };
  }

  const dueno = postgres(url, { max: 1, onnotice: () => {} });
  try {
    /**
     * `ALTER ROLE` no admite parámetros: la contraseña va **en el texto de la
     * orden**. Se escapa duplicando las comillas simples, que es la regla de
     * PostgreSQL, y el valor **no viene de la petición** sino del entorno — las
     * dos cosas juntas son lo que hace que esto no sea una inyección esperando.
     */
    const escapada = clave.replace(/'/g, "''");
    await dueno.unsafe(`ALTER ROLE ${ROL} WITH LOGIN PASSWORD '${escapada}'`);
    return { ok: true, detalle: `El rol ${ROL} ya tiene contraseña. No se muestra, y no hace falta verla.` };
  } catch (e) {
    return { ok: false, detalle: `No se pudo: ${(e as Error).message.slice(0, 200)}` };
  } finally {
    await dueno.end({ timeout: 5 });
  }
}

/**
 * Comprueba que la aplicación **puede conectarse con lo que tiene puesto**.
 *
 * Se hace con una conexión nueva y no con el pool de la aplicación a propósito:
 * el pool se creó al arrancar, puede llevar dentro una conexión abierta con la
 * contraseña vieja, y entonces diría que todo va bien mientras la siguiente
 * petición falla. Aquí se abre una conexión de cero, que es lo que hará el
 * servidor después de reiniciarse.
 */
export async function probarConexionDeAplicacion(): Promise<ResultadoDeAdministracion> {
  const url = process.env.DATABASE_URL;
  if (!url) return { ok: false, detalle: "Falta DATABASE_URL." };
  const app = postgres(url, { max: 1, onnotice: () => {} });
  try {
    const filas = (await app`select current_user as quien, current_setting('is_superuser') as super`) as unknown as {
      quien: string;
      super: string;
    }[];
    const quien = filas[0]?.quien ?? "?";
    const esSuper = filas[0]?.super === "on";
    if (esSuper) {
      return {
        ok: false,
        detalle:
          `Conecta como «${quien}», que es SUPERUSUARIO. Un superusuario se salta las políticas de fila y ` +
          "el aislamiento entre empresas deja de existir. DATABASE_URL tiene que usar slg_app.",
      };
    }
    return { ok: quien === ROL, detalle: quien === ROL ? `Conecta como «${quien}».` : `Conecta como «${quien}», y debería ser «${ROL}».` };
  } catch (e) {
    return { ok: false, detalle: `No conecta: ${(e as Error).message.slice(0, 200)}` };
  } finally {
    await app.end({ timeout: 5 });
  }
}

/**
 * ¿Están aplicadas las migraciones? Se mira si existe la tabla de control de
 * Drizzle y cuántas filas tiene.
 */
export async function estadoDeMigraciones(): Promise<ResultadoDeAdministracion> {
  const url = process.env.DATABASE_URL_MIGRATIONS ?? process.env.DATABASE_URL;
  if (!url) return { ok: false, detalle: "Falta DATABASE_URL_MIGRATIONS." };
  const conexion = postgres(url, { max: 1, onnotice: () => {} });
  try {
    const filas = (await conexion`
      select count(*)::int as n from information_schema.tables
       where table_schema = 'drizzle' and table_name = '__drizzle_migrations'
    `) as unknown as { n: number }[];
    if ((filas[0]?.n ?? 0) === 0) {
      return {
        ok: false,
        detalle: "No hay tabla de migraciones: la base está vacía. El «Deploy command» tiene que ser `npm run db:migrate`.",
      };
    }
    const aplicadas = (await conexion`select count(*)::int as n from drizzle.__drizzle_migrations`) as unknown as {
      n: number;
    }[];
    return { ok: true, detalle: `${aplicadas[0]?.n ?? 0} migraciones aplicadas.` };
  } catch (e) {
    return { ok: false, detalle: `No se pudo comprobar: ${(e as Error).message.slice(0, 160)}` };
  } finally {
    await conexion.end({ timeout: 5 });
  }
}
