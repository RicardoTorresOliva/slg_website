/**
 * FIXTURE NEGATIVO de `check-hq.ts` (R-26).
 *
 * Esta «pantalla de HQ» cruza la frontera (a) del alcance de las tres formas
 * que el freno tiene que atrapar:
 *
 *   1. **gestiona el pipeline** — mueve la etapa de un lead y edita su
 *      oportunidad, con los nombres escritos en camelCase, que es como se
 *      escriben de verdad y como un `\b` a secas no los vería;
 *   2. **escribe en el CRM desde HQ** con un `POST`;
 *   3. **usa la clave de captura para leer**, que funciona igual de bien y por
 *      eso es el fallo que nadie descubre hasta el día de revocar una clave.
 *
 * Si el freno no se pone ROJO aquí, su verde sobre HQ no vale nada. No se
 * importa desde ninguna parte y no se compila con la aplicación.
 */
import { llamar } from "../../../../lib/crm/http.ts";

type LeadEnPipeline = { id: string; etapaActual: string; oportunidadId: string; probabilidad: number };

export async function moverEtapaDelLead(lead: LeadEnPipeline, etapaNueva: string) {
  await llamar("POST", `/opportunities/${lead.oportunidadId}`, { stage: etapaNueva }, "captura");
  await llamar("GET", "/dashboard/metrics", undefined, "captura");
}

export function PanelDePipeline({ leads }: { leads: LeadEnPipeline[] }) {
  return (
    <ul>
      {leads.map((l) => (
        <li key={l.id}>
          {l.etapaActual} · {l.probabilidad}
        </li>
      ))}
    </ul>
  );
}
