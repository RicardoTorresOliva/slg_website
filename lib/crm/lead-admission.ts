/**
 * Modo `lead_admission` (D-19, RF-46) — el que el CRM **todavía no expone**.
 *
 * Un `POST` al endpoint de admisión, **idempotente por correo + documento**: si
 * el mismo visitante pide dos veces el mismo documento, el CRM tiene una sola
 * entrada. La idempotencia viaja en una cabecera y en el cuerpo, porque las dos
 * formas existen en la práctica y el endpoint aún no está escrito.
 *
 * **Está construido y probado contra un doble, no contra el CRM**, y eso es lo
 * que el criterio 2 pide. El día que el endpoint exista, activarlo es cambiar
 * `CRM_MODE`: sin migrar datos y sin tocar este archivo (R-24).
 */
import { createHash } from "node:crypto";

import { llamar } from "./http.ts";
import type { CapturaParaCrm, PuertoDeCrm, ResultadoDeEntrega } from "./port.ts";

/** La clave de idempotencia: correo + documento, estable y sin datos dentro. */
export function claveDeIdempotencia(c: CapturaParaCrm): string {
  return createHash("sha256")
    .update(`${c.email.toLowerCase()}|${c.documento ?? c.origen}`)
    .digest("hex")
    .slice(0, 32);
}

export function adaptadorLeadAdmission(): PuertoDeCrm {
  return {
    modo: "lead_admission",
    async entregar(captura: CapturaParaCrm): Promise<ResultadoDeEntrega> {
      const cuerpo = {
        idempotency_key: claveDeIdempotencia(captura),
        email: captura.email,
        email_domain: captura.dominio,
        name: captura.nombre,
        company: captura.empresa,
        job_title: captura.cargo,
        message: captura.mensaje,
        source: captura.origen,
        document: captura.documento,
        page: captura.pagina,
        locale: captura.idioma,
        utm: captura.utm,
      };
      const r = await llamar("POST", "/api/v1/leads", cuerpo);
      const ids = idsDe(r.cuerpo);
      return {
        ok: r.ok,
        contactId: ids.contact,
        companyId: ids.company,
        opportunityId: ids.opportunity,
        endpoint: "POST /api/v1/leads",
        codigo: r.codigo,
        cuerpoEnviado: cuerpo,
        cuerpoRecibido: r.cuerpo,
        error: r.error,
      };
    },
  };
}

function idsDe(cuerpo: string | null) {
  const vacio = { contact: null, company: null, opportunity: null };
  if (!cuerpo) return vacio;
  try {
    const j = JSON.parse(cuerpo) as Record<string, unknown>;
    const como = (v: unknown) => (v === undefined || v === null ? null : String(v));
    return {
      contact: como(j.contact_id ?? j.contactId),
      company: como(j.company_id ?? j.companyId),
      opportunity: como(j.opportunity_id ?? j.opportunityId),
    };
  } catch {
    return vacio;
  }
}
