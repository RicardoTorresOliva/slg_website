import fs from "node:fs";
import path from "node:path";

/**
 * Sonda de vida del contenedor.
 *
 * Deliberadamente tonta: responde si el proceso web está vivo y puede servir.
 * NO comprueba la base de datos ni el CRM — una sonda que falla porque una
 * integración externa está caída provoca que el orquestador reinicie un
 * contenedor sano, y eso convierte una incidencia menor en una caída.
 *
 * NO sustituye al monitor externo de D-49: esta sonda vive dentro del VPS, y
 * un VPS caído no puede informar de su propia caída.
 *
 * ── QUÉ VERSIÓN ESTÁ DESPLEGADA ──────────────────────────────────────────
 *
 * Devolvía `{"status":"ok"}` a secas, y eso dejó una pregunta sin poder
 * responder la noche de la publicación: **`/api/ops` daba 404 y no había forma
 * de saber si era por el testigo o porque seguía desplegado el código
 * anterior** —que no tenía esa ruta en absoluto—. Las dos líneas respondían
 * exactamente lo mismo aquí.
 *
 * Ahora dice QUÉ corre, y con dos datos que no son adorno:
 *
 *   · `app` identifica la línea de código. Su sola presencia ya distingue: una
 *     versión anterior a este cambio devuelve solo `status`.
 *   · `migraciones` es cuántas espera el código desplegado. Comparado con lo
 *     que dice `/api/ops`, responde la otra pregunta que siempre surge: si el
 *     esquema de la base va por detrás del código que lo consulta.
 *
 * NO ES INFORMACIÓN SENSIBLE: el repositorio es público y esto no dice nada que
 * no esté ahí. Y sigue sin tocar la base: el diario es un archivo del propio
 * despliegue, leído una vez.
 */
export const dynamic = "force-dynamic";

/**
 * Se lee UNA vez al cargar el módulo, no en cada petición: esta ruta la llama
 * el monitor externo cada cinco minutos y el orquestador cada treinta segundos.
 * Si el archivo no está, la sonda no se rompe — devuelve `null` y sigue siendo
 * una sonda de vida, que es su trabajo.
 */
const MIGRACIONES: number | null = (() => {
  try {
    const diario = path.join(process.cwd(), "drizzle", "meta", "_journal.json");
    const { entries } = JSON.parse(fs.readFileSync(diario, "utf8")) as { entries: unknown[] };
    return Array.isArray(entries) ? entries.length : null;
  } catch {
    return null;
  }
})();

export function GET() {
  return Response.json({ status: "ok", app: "slg_website", migraciones: MIGRACIONES }, { status: 200 });
}
