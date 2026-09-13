/**
 * El puerto del CRM — **dos modos detrás de la misma forma** (D-19, RF-46).
 *
 * `contact_note` busca el contacto por correo, lo crea si no está y añade una
 * nota con el contexto. `lead_admission` hace un `POST` al endpoint de admisión,
 * idempotente por correo + documento. **Cambiar de modo es cambiar una variable
 * de entorno**: ni migración de datos, ni tocar esta unidad (R-24).
 *
 * Lo que el puerto NO expone, y es deliberado: nada de listar contactos, ni de
 * leer el pipeline, ni de borrar. El CRM es el sistema de registro de leads y
 * este adaptador **solo entrega**. Un puerto sin la operación no se puede usar
 * mal, que es la misma razón por la que `lib/files` no tiene `listar`.
 */
export const MODOS_DE_CRM = ["contact_note", "lead_admission"] as const;
export type ModoDeCrm = (typeof MODOS_DE_CRM)[number];

/** Lo que se entrega. Es la captura, no la fila entera: el puerto no conoce la tabla. */
export type CapturaParaCrm = {
  readonly email: string;
  readonly dominio: string;
  readonly nombre: string | null;
  readonly empresa: string | null;
  readonly cargo: string | null;
  readonly mensaje: string | null;
  readonly origen: string;
  readonly documento: string | null;
  readonly pagina: string;
  readonly idioma: string;
  readonly utm: Readonly<Record<string, string>> | null;
};

export type ResultadoDeEntrega = {
  readonly ok: boolean;
  readonly contactId: string | null;
  readonly companyId: string | null;
  readonly opportunityId: string | null;
  /** Para la traza de `crm_delivery`: qué se llamó y qué contestó. */
  readonly endpoint: string;
  readonly codigo: number | null;
  readonly cuerpoEnviado: Record<string, unknown> | null;
  readonly cuerpoRecibido: string | null;
  /**
   * Saneado y apto para una pantalla de HQ: **nunca** lleva la clave de API ni
   * cabeceras. Un error que se muestra es un error que alguien puede leer.
   */
  readonly error: string | null;
};

export type PuertoDeCrm = {
  readonly modo: ModoDeCrm;
  entregar(captura: CapturaParaCrm): Promise<ResultadoDeEntrega>;
};

/**
 * El enlace profundo a la ficha del contacto, para el aviso por correo (RF-53).
 * La plantilla es configurable (RF-54, marcado `asumido`): un CRM que cambie de
 * rutas no debe obligar a desplegar.
 */
export function enlaceAlContacto(contactId: string | null): string | null {
  const plantilla = process.env.CRM_CONTACT_URL_TEMPLATE;
  if (!plantilla || !contactId) return null;
  return plantilla.replace("{id}", encodeURIComponent(contactId));
}
