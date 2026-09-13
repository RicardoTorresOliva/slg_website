/**
 * Modo `contact_note` (D-19, RF-47) — el que funciona con el CRM tal como está hoy.
 *
 * Tres pasos: **buscar** el contacto por correo, **crearlo** si no está, y
 * **añadir una nota** con el contexto. La nota transporta documento, ruta,
 * idioma y UTM **en su texto**, porque es el único sitio donde este CRM acepta
 * contexto libre sin obligarnos a inventar campos suyos.
 *
 * **No crea oportunidad ni etapa.** El pipeline vive en el CRM y lo mueve una
 * persona (RF-57): un adaptador que abriera oportunidades estaría decidiendo
 * cosas de negocio desde un formulario web.
 */
import { llamar } from "./http.ts";
import type { CapturaParaCrm, PuertoDeCrm, ResultadoDeEntrega } from "./port.ts";

function textoDeLaNota(c: CapturaParaCrm): string {
  const lineas = [
    `Captura web · ${c.origen}`,
    c.documento ? `Documento: ${c.documento}` : null,
    `Página: ${c.pagina}`,
    `Idioma: ${c.idioma}`,
    c.empresa ? `Empresa declarada: ${c.empresa}` : null,
    c.cargo ? `Cargo: ${c.cargo}` : null,
    c.utm ? `UTM: ${Object.entries(c.utm).map(([k, v]) => `${k}=${v}`).join(" · ")}` : null,
    c.mensaje ? `\nMensaje:\n${c.mensaje}` : null,
  ].filter(Boolean);
  return lineas.join("\n");
}

export function adaptadorContactNote(): PuertoDeCrm {
  return {
    modo: "contact_note",
    async entregar(captura: CapturaParaCrm): Promise<ResultadoDeEntrega> {
      const vacio = {
        contactId: null,
        companyId: null,
        opportunityId: null,
        cuerpoEnviado: null,
        cuerpoRecibido: null,
      };

      // 1 · Buscar por correo.
      const busqueda = await llamar("GET", `/api/v1/contacts?email=${encodeURIComponent(captura.email)}`);
      if (!busqueda.ok) {
        return { ...vacio, ok: false, endpoint: "GET /api/v1/contacts", codigo: busqueda.codigo, error: busqueda.error };
      }

      let contactId = primerId(busqueda.cuerpo);

      // 2 · Crear si no está.
      if (!contactId) {
        const cuerpo = {
          email: captura.email,
          name: captura.nombre ?? captura.email,
          company: captura.empresa,
          job_title: captura.cargo,
          source: `web:${captura.origen}`,
        };
        const creado = await llamar("POST", "/api/v1/contacts", cuerpo);
        if (!creado.ok) {
          return {
            ...vacio,
            ok: false,
            endpoint: "POST /api/v1/contacts",
            codigo: creado.codigo,
            cuerpoEnviado: cuerpo,
            cuerpoRecibido: creado.cuerpo,
            error: creado.error,
          };
        }
        contactId = primerId(creado.cuerpo);
      }

      // 3 · La nota con el contexto.
      const nota = { contact_id: contactId, body: textoDeLaNota(captura) };
      const puesta = await llamar("POST", "/api/v1/notes", nota);
      return {
        ok: puesta.ok,
        contactId,
        companyId: null,
        opportunityId: null,
        endpoint: "POST /api/v1/notes",
        codigo: puesta.codigo,
        cuerpoEnviado: nota,
        cuerpoRecibido: puesta.cuerpo,
        error: puesta.error,
      };
    },
  };
}

/** El `id` de la respuesta, venga suelto o dentro de una lista. */
function primerId(cuerpo: string | null): string | null {
  if (!cuerpo) return null;
  try {
    const json = JSON.parse(cuerpo) as unknown;
    const candidato = Array.isArray(json)
      ? json[0]
      : ((json as { data?: unknown[] }).data?.[0] ?? json);
    const id = (candidato as { id?: string | number } | undefined)?.id;
    return id === undefined || id === null ? null : String(id);
  } catch {
    return null;
  }
}
