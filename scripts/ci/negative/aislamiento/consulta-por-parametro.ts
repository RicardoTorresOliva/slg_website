/**
 * FIXTURE NEGATIVO de `test-aislamiento.ts` (R-26, criterio 5 de FU-13).
 *
 * Esta función hace **exactamente lo que RF-71 prohíbe**: construye el contexto
 * **a partir de un `organization_id` que llega por parámetro**, en vez de usar
 * el de la sesión autenticada. A partir de ahí la política de fila hace su
 * trabajo… **para la empresa equivocada**, y quien llame lee los avisos de
 * cualquiera sabiendo solo su identificador — que está en cualquier URL.
 *
 * ES EL FALLO CLÁSICO Y SE ESCRIBE SIN MALA FE: parece una función de utilidad
 * razonable —«dame los avisos de esta empresa»—, compila, pasa la revisión y se
 * lee perfectamente bien. La política de fila **no lo para**, porque desde
 * dentro no hay nada raro: alguien dijo que el actor pertenece a esa empresa.
 *
 * PRIMERA VERSIÓN DE ESTE FIXTURE, y por qué no servía: usaba
 * `withSystemScope`, que fija `app.actor_role = 'system'`. Y `system` **no está
 * en la lista de roles que la política deja pasar**, así que la consulta
 * devolvía cero y el fixture no filtraba nada. Fue un hallazgo útil —
 * `withSystemScope` no abre las tablas con `organization_id`, y conviene
 * saberlo— pero como prueba negativa no valía: un fixture que no rompe nada no
 * demuestra que la batería sepa ponerse roja.
 *
 * No se importa desde la aplicación y no se compila con ella.
 */
import { sql } from "drizzle-orm";

import { contextoDeSesion } from "../../../../lib/db/context.ts";
import { withScope } from "../../../../lib/db/scope.ts";

export async function avisosPorParametro(organizationId: string) {
  // ⚠️ El contexto sale del PARÁMETRO. Aquí está el fallo, entero.
  const contextoFabricado = contextoDeSesion({
    userId: "quien-sea",
    userName: "Quien sea",
    role: "client_member",
    organizationId,
  });

  return withScope(contextoFabricado, async (db) => {
    const filas = (await db.execute(sql`
      SELECT id, title, organization_id FROM announcement
    `)) as unknown as { id: string; title: string; organization_id: string }[];
    return filas;
  });
}
