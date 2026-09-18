/**
 * Modo `contact_note` (D-19, RF-47) — el que funciona con el CRM tal como está hoy.
 *
 * Tres pasos: **buscar** el contacto por correo, **crearlo** si no está, y
 * **añadir una nota** con el contexto. La nota transporta documento, ruta,
 * idioma, empresa declarada, origen y UTM **en su texto**, porque es el único
 * sitio donde este CRM acepta contexto libre sin obligarnos a inventar campos.
 *
 * **No crea oportunidad ni etapa.** El pipeline vive en el CRM y lo mueve una
 * persona (RF-57): un adaptador que abriera oportunidades estaría decidiendo
 * cosas de negocio desde un formulario web.
 *
 * EL CONTRATO ES EL DEL CRM REAL, no el de un doble imaginado. Se comprobó el
 * 2026-09-17 contra `crm.softlandingglobal.com` (`crm_slg/backend`), después de
 * que la primera versión —escrita contra un doble— devolviera 400 en producción:
 *
 *   · `GET /api/v1/contacts?q=<correo>&pageSize=50`. `q` busca por «contiene»
 *     en nombre, apellido y correo, así que la coincidencia EXACTA de correo se
 *     comprueba aquí, no se supone.
 *   · `POST /api/v1/contacts` exige `firstName` y `lastName`; acepta `email` y
 *     `jobTitle`; **rechaza cualquier otra clave**. Ni la empresa declarada (es
 *     texto, y el CRM quiere un `companyId`) ni el origen: los dos van en la nota.
 *   · `POST /api/v1/notes` recibe `{ body, contactId }`.
 *   · Toda respuesta viene envuelta: `{ data, meta? }`.
 *
 * Los scopes que necesita la clave de captura son `contacts:write` (alta) y
 * `activities:write` (nota), además de `crm:read` (búsqueda): §4septies.1.
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

/**
 * El CRM exige nombre Y apellido, y los formularios públicos piden los dos,
 * obligatorios: el contacto se crea con `firstName = nombre` y
 * `lastName = apellido`, tal cual los escribió la persona.
 *
 * El repliegue queda SOLO para las capturas anteriores a la columna
 * `last_name`, que pueden seguir en cola: con nombre y sin apellido se parte el
 * nombre por el primer espacio; sin nada, la parte local del correo hace de
 * nombre y el dominio, entre paréntesis, de apellido. Es visiblemente
 * provisional a propósito: quien abra la oportunidad lo completa (RF-57).
 */
function nombreYApellido(c: CapturaParaCrm): { firstName: string; lastName: string } {
  const nombre = (c.nombre ?? "").trim().replace(/\s+/g, " ");
  const apellido = (c.apellido ?? "").trim().replace(/\s+/g, " ");
  if (nombre && apellido) return { firstName: nombre, lastName: apellido };
  if (nombre) {
    const [primero, ...resto] = nombre.split(" ");
    return { firstName: primero ?? nombre, lastName: resto.join(" ") || "—" };
  }
  const [local, dominio] = c.email.split("@");
  return { firstName: local || c.email, lastName: apellido || `(${dominio || c.dominio})` };
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

      // 1 · Buscar por correo. `q` es «contiene»: se filtra por igualdad aquí.
      const busqueda = await llamar(
        "GET",
        `/api/v1/contacts?q=${encodeURIComponent(captura.email)}&pageSize=50`,
      );
      if (!busqueda.ok) {
        return { ...vacio, ok: false, endpoint: "GET /api/v1/contacts", codigo: busqueda.codigo, error: busqueda.error };
      }

      let contactId = contactoConCorreo(busqueda.cuerpo, captura.email);

      // 2 · Crear si no está. Solo las claves que el CRM admite.
      if (!contactId) {
        const cuerpo = {
          ...nombreYApellido(captura),
          email: captura.email,
          ...(captura.cargo ? { jobTitle: captura.cargo } : {}),
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
        contactId = idDe(datosDe(creado.cuerpo));
        if (!contactId) {
          return {
            ...vacio,
            ok: false,
            endpoint: "POST /api/v1/contacts",
            codigo: creado.codigo,
            cuerpoEnviado: cuerpo,
            cuerpoRecibido: creado.cuerpo,
            error: "el CRM creó el contacto pero la respuesta no trae su id",
          };
        }
      }

      // 3 · La nota con el contexto, atada al contacto.
      const nota = { contactId, body: textoDeLaNota(captura) };
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

/** Desenvuelve `{ data }`; si la respuesta viene suelta, la devuelve tal cual. */
function datosDe(cuerpo: string | null): unknown {
  if (!cuerpo) return null;
  try {
    const json = JSON.parse(cuerpo) as unknown;
    if (json && typeof json === "object" && "data" in json) return (json as { data: unknown }).data;
    return json;
  } catch {
    return null;
  }
}

function idDe(x: unknown): string | null {
  const id = (x as { id?: string | number } | null | undefined)?.id;
  return id === undefined || id === null ? null : String(id);
}

/** El id del contacto cuyo correo coincide EXACTAMENTE (sin mayúsculas), o `null`. */
function contactoConCorreo(cuerpo: string | null, email: string): string | null {
  const datos = datosDe(cuerpo);
  const lista = Array.isArray(datos) ? datos : [];
  const buscado = email.trim().toLowerCase();
  const hallado = lista.find(
    (c) => String((c as { email?: string } | null)?.email ?? "").trim().toLowerCase() === buscado,
  );
  return idDe(hallado);
}
