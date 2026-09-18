/**
 * migrar.ts — **El migrador que sí existe dentro de la imagen de producción.**
 *
 * EL DEFECTO QUE ESTO ARREGLA, DICHO SIN RODEOS. El comando de despliegue
 * documentado es `npm run db:migrate`, y ese guion llamaba a `drizzle-kit
 * migrate`. `drizzle-kit` es una **dependencia de desarrollo**, y la imagen de
 * producción se construye a partir de la salida `standalone` de Next: ahí no
 * está `drizzle-kit`, no está `drizzle.config.ts` y no estaban ni las
 * migraciones. El comando de despliegue **no podía funcionar en el servidor**.
 * Nadie lo había visto porque en CI sí hay `node_modules` completo. Lo encontró
 * la revisión final.
 *
 * POR QUÉ UN MIGRADOR PROPIO Y NO METER `drizzle-kit` EN LA IMAGEN. Meterlo
 * significa instalar las dependencias de desarrollo en el contenedor que sirve
 * peticiones: más superficie, más peso y una herramienta de generación de
 * esquema en producción. `drizzle-orm` —que ya es dependencia de producción
 * porque la aplicación la usa— trae el migrador de ejecución, que lee **las
 * mismas** migraciones, el **mismo** `meta/_journal.json` y lleva la cuenta en
 * la **misma** tabla `drizzle.__drizzle_migrations`. Son intercambiables: una
 * base migrada con `drizzle-kit` sigue desde donde estaba.
 *
 * SIGUE SIN MIGRAR AL ARRANCAR. Esto es un guion que se ejecuta en el paso de
 * despliegue, con el rol DUEÑO. El sitio en marcha usa el rol de aplicación, que
 * no puede alterar el esquema, y eso es deliberado (FU-04).
 */
import fs from "node:fs";
import path from "node:path";

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

// `DATABASE_URL_OWNER` es el nombre del archivo de `ops/` que se carga con
// `node --env-file`: así la cadena del dueño no pasa por la línea de comandos
// (mismo trato que en `scripts/auth/primer-admin.ts`).
const URL_DUENO =
  process.env.DATABASE_URL_MIGRATIONS ?? process.env.DATABASE_URL_OWNER ?? process.env.DATABASE_URL;
if (!URL_DUENO) {
  console.error(
    "Falta DATABASE_URL_MIGRATIONS. Las migraciones las aplica el rol DUEÑO, nunca el rol de " +
      "la aplicación: si se aplicaran con el rol de la aplicación haría falta darle permiso para " +
      "alterar el esquema, y entonces una inyección tendría a mano el `DROP`.",
  );
  process.exit(1);
}

const CARPETA = path.resolve(import.meta.dirname, "../../drizzle");

/**
 * `max: 1` a propósito: las migraciones son una secuencia, y con varias
 * conexiones dos despliegues simultáneos podrían entrelazarse.
 */
const conexion = postgres(URL_DUENO, {
  max: 1,
  /**
   * `CREATE SCHEMA IF NOT EXISTS` y `CREATE TABLE IF NOT EXISTS` emiten un
   * NOTICE cuando ya existen, y el cliente los imprime como objetos. En el
   * registro de un despliegue eso son ocho líneas que parecen un error y no lo
   * son: un aviso ruidoso que no significa nada enseña a ignorar los avisos.
   * Se callan **solo los NOTICE**; los WARNING siguen saliendo.
   */
  onnotice: (aviso) => {
    if (aviso.severity !== "NOTICE") console.warn(aviso.message);
  },
});

/**
 * Cuántas hay aplicadas, o cero si la tabla del migrador aún no existe (base
 * vacía). Se lee antes y después para poder decir QUÉ hizo esta ejecución:
 * «aplicadas (o ya estaban todas)» servía para el despliegue y no servía para la
 * persona que acaba de lanzarlo a mano y necesita saber si la 0018 entró.
 */
async function aplicadas(): Promise<{ n: number; ultima: string | null }> {
  const [existe] = await conexion<{ n: number }[]>`
    select count(*)::int as n from information_schema.tables
     where table_schema = 'drizzle' and table_name = '__drizzle_migrations'`;
  if (!existe?.n) return { n: 0, ultima: null };
  const [fila] = await conexion<{ n: number; ultima: string | null }[]>`
    select count(*)::int as n, max(created_at)::text as ultima from drizzle.__drizzle_migrations`;
  return { n: fila?.n ?? 0, ultima: fila?.ultima ?? null };
}

try {
  const antes = await aplicadas();
  await migrate(drizzle(conexion), { migrationsFolder: CARPETA });
  const despues = await aplicadas();
  const nuevas = despues.n - antes.n;
  const enDisco = fs.readdirSync(CARPETA).filter((f) => f.endsWith(".sql")).sort();
  const recienAplicadas = nuevas > 0 ? enDisco.slice(-nuevas) : [];
  console.log(
    nuevas > 0
      ? `✓ ${nuevas} migración(es) aplicada(s) ahora: ${recienAplicadas.join(", ")}. Total en la base: ${despues.n} de ${enDisco.length}.`
      : `✓ nada que aplicar: la base ya tiene las ${despues.n} migraciones (${enDisco.length} en disco).`,
  );
  if (despues.n !== enDisco.length) {
    console.warn(`  ⚠ la base tiene ${despues.n} y en disco hay ${enDisco.length}: revisa el journal.`);
  }
} catch (error) {
  console.error("✗ la migración falló y el despliegue NO debe seguir:");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await conexion.end({ timeout: 5 });
}
