/**
 * inventory.ts — Recuentos por tabla, el lado "de la copia" de la comparación
 * del paso 6 de §9.3.
 *
 * Vive aparte de `run-backup.ts` y de `restore-backup.ts` a propósito: los dos
 * lo necesitan, y los dos son programas que arrancan al importarse. Importar
 * uno desde el otro para reutilizar una función habría disparado una copia de
 * seguridad completa cada vez que alguien restaura.
 */
import postgres from "postgres";

export async function recuentosPorTabla(databaseUrl: string): Promise<Record<string, number>> {
  const sql = postgres(databaseUrl, { max: 1, onnotice: () => {} });
  try {
    const tablas = await sql<{ nombre: string }[]>`
      SELECT tablename AS nombre FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
    `;
    const recuentos: Record<string, number> = {};
    for (const { nombre } of tablas) {
      // El nombre viene del catálogo de PostgreSQL, no de una entrada, pero se
      // valida igual antes de interpolarlo: `sql.unsafe` no escapa nada y una
      // comprobación barata aquí es más fiable que una suposición sobre qué
      // puede llegar a haber en `pg_tables`.
      if (!/^[a-z_][a-z0-9_]*$/.test(nombre)) continue;
      const [fila] = await sql.unsafe<{ n: string }[]>(
        `SELECT count(*)::text AS n FROM public."${nombre}"`,
      );
      recuentos[nombre] = Number(fila.n);
    }
    return recuentos;
  } finally {
    await sql.end({ timeout: 5 });
  }
}
