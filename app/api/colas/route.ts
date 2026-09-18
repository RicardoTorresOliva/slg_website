import { timingSafeEqual } from "node:crypto";

import { barrerColasUnaVez } from "@/lib/colas/barrer";

/**
 * `/api/colas` — el gancho para un planificador externo (ver `lib/colas`).
 *
 * Barre las colas una vez y dice cuántas filas procesó. Está pensada para un
 * cron de la plataforma, un temporizador del sistema o un monitor que mande la
 * cabecera: cualquiera que quiera una cadencia garantizada de reintentos, sin
 * depender del tráfico ni de la sonda.
 *
 * **Sin `CRON_SECRET` la ruta responde 404**, igual que `/api/ops` sin su
 * testigo: una ruta que toca la base y llama al CRM no se anuncia por defecto.
 * El testigo se compara en tiempo constante y tiene que ser largo. Los crons de
 * plataforma lo envían como `Authorization: Bearer <CRON_SECRET>`; un
 * temporizador propio hace lo mismo con `curl -H`.
 *
 * Es idempotente y segura de repetir: cada barrendero reclama con
 * `FOR UPDATE SKIP LOCKED`, así que dos llamadas a la vez no duplican nada.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LARGO_MINIMO = 32;

function autorizada(request: Request): boolean {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || secreto.length < LARGO_MINIMO) return false;
  const dado = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(dado);
  const b = Buffer.from(secreto);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function manejar(request: Request): Promise<Response> {
  if (!autorizada(request)) return new Response(null, { status: 404 });
  const resultado = await barrerColasUnaVez("planificador");
  return Response.json({ ok: true, ...resultado, at: new Date().toISOString() });
}

export const GET = manejar;
export const POST = manejar;
