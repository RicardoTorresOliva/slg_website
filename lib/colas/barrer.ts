/**
 * `lib/colas` — UN solo punto para vaciar las colas, lo pida quien lo pida.
 *
 * POR QUÉ EXISTE (decisión del 2026-09-17, ver `docs/work_log.md`). Los
 * barrenderos nacieron como `setInterval` dentro del proceso (A-01): correcto
 * en un VPS, donde el proceso vive siempre. En una plataforma de funciones el
 * proceso solo existe mientras atiende una petición y se congela después: el
 * temporizador no dispara, y una captura se queda `pending` hasta que alguien,
 * por casualidad, mantenga la función despierta veinte segundos. Se vio en
 * producción: el CRM vacío con las claves bien puestas.
 *
 * LA REGLA NUEVA: **la cola se vacía por acontecimientos, no por reloj.**
 *
 *   1. Tras cada captura, el manejador barre UNA vez **después de responder**
 *      (`after()` de Next): el visitante no espera al CRM —criterio 1 de DU-09
 *      intacto— y la entrega ocurre segundos después, en cualquier plataforma.
 *   2. Los reintentos con espera (1, 10, 60 min…) los recoge cualquier petición
 *      posterior que llame a `barrerDespues()`. Hoy lo hace la sonda
 *      `/api/health`, que el monitor externo visita cada cinco minutos (D-49).
 *      La sonda no cambia su respuesta por ello: el barrido corre cuando la
 *      respuesta ya salió.
 *   3. `/api/colas` con `CRON_SECRET` es el gancho para un planificador (cron de
 *      la plataforma, temporizador del sistema, monitor con cabecera) donde se
 *      quiera una cadencia garantizada. Sin la variable, la ruta no existe.
 *
 * El `setInterval` de `instrumentation.ts` sigue ahí para el VPS: es un
 * acontecimiento más, no el único. Y es seguro que coincidan: cada barrendero
 * reclama con `FOR UPDATE SKIP LOCKED`, así que dos barridos simultáneos se
 * reparten el lote en vez de repetirlo.
 *
 * Nada de aquí lanza: un fallo del barrido jamás toca la petición que lo pidió.
 */
import { after } from "next/server";

import * as crm from "@/lib/crm";
import * as webhooks from "@/lib/webhooks";

export type ResultadoDeBarrido = { readonly crm: number; readonly webhooks: number };

/** Una pasada por cada cola, en paralelo. Devuelve cuántas filas procesó cada una. */
export async function barrerColasUnaVez(): Promise<ResultadoDeBarrido> {
  const [c, w] = await Promise.all([
    crm.barrerUnaVez().catch(() => 0),
    webhooks.barrerUnaVez().catch(() => 0),
  ]);
  return { crm: c, webhooks: w };
}

/**
 * Freno entre barridos oportunistas: la sonda llega cada cinco minutos, pero
 * en un pico de tráfico podría llegar cada segundo, y la cola no cambia tan
 * rápido. Vive en el módulo: en una función congelada se reinicia, y eso es
 * exactamente lo que se quiere.
 */
const MINIMO_ENTRE_BARRIDOS_MS = 30_000;
let ultimoBarrido = 0;

/**
 * Programa un barrido para DESPUÉS de responder la petición en curso.
 *
 * `inmediato` salta el freno: es para el manejador que acaba de encolar algo y
 * sabe que hay trabajo. Las mismas salidas de escape que `instrumentation.ts`:
 * sin base de datos no hay cola, y `CRM_QUEUE_DISABLED=1` apaga el barrido
 * automático para las pruebas y el barrido manual.
 */
export function barrerDespues(opciones: { readonly inmediato?: boolean } = {}): void {
  if (!process.env.DATABASE_URL) return;
  if (process.env.CRM_QUEUE_DISABLED === "1") return;
  const ahora = Date.now();
  if (!opciones.inmediato && ahora - ultimoBarrido < MINIMO_ENTRE_BARRIDOS_MS) return;
  ultimoBarrido = ahora;
  after(() => barrerColasUnaVez());
}
