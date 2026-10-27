import { barrerDespues } from "@/lib/colas/barrer";
import { probarConexionDeAplicacion } from "@/lib/db/administracion";

/**
 * Sonda de la BASE: ¿la aplicación llega a su base de datos, con su rol?
 *
 * EXISTE POR UN INCIDENTE (01-10-2026). En producción de SLG, `DATABASE_URL`
 * era el marcador `db.example.com` desde la mudanza a Vercel. Contacto,
 * descargas y acceso daban 500 y se perdieron capturas durante días, mientras
 * `/api/health` respondía `ok`: esa sonda es de vida y no toca la base, a
 * propósito. Sin tráfico, Supabase pausó la base por inactividad, y tampoco
 * lo vio nadie.
 *
 * `/api/health` se queda tonta (ver su comentario: una sonda de vida que
 * depende de una integración convierte una incidencia en una caída). Esta es
 * la que vigila el monitor externo (UptimeRobot, D-49): **503 si la base no
 * contesta o contesta con el rol equivocado**, y el monitor avisa en minutos.
 *
 * SIN DETALLES EN LA RESPUESTA. El motivo exacto (host, rol) se escribe en el
 * registro del servidor; fuera solo sale `ok` o `error`.
 *
 * UNA PRUEBA POR MINUTO Y POR INSTANCIA. Cada prueba abre una conexión nueva
 * (es lo que la hace fiable: un pool viejo podría tapar una contraseña rota), y
 * el *pooler* gratuito admite pocas. Una ruta pública que abriera una conexión
 * por visita sería una forma barata de agotarlas.
 */
export const dynamic = "force-dynamic";

const VIGENCIA_MS = 60_000;
let ultima: { cuando: number; ok: boolean } | null = null;

export async function GET() {
  // El monitor pasa a visitar esta ruta en vez de `/api/health`: el latido que
  // recoge los reintentos vencidos de las colas tiene que seguir dándose.
  barrerDespues();

  if (!ultima || Date.now() - ultima.cuando > VIGENCIA_MS) {
    const r = await probarConexionDeAplicacion();
    if (!r.ok) console.error(`[health/base] ${r.detalle}`);
    ultima = { cuando: Date.now(), ok: r.ok };
  }
  return Response.json(
    { status: ultima.ok ? "ok" : "error", base: ultima.ok ? "ok" : "no conecta" },
    { status: ultima.ok ? 200 : 503, headers: { "cache-control": "no-store" } },
  );
}
