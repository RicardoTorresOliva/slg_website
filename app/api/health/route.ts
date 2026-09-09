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
 */
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ status: "ok" }, { status: 200 });
}
