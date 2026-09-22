/**
 * sin-crm.ts — El aviso por correo de un sitio que NO tiene CRM (plantilla, paso 5b).
 *
 * **EN UN SITIO SIN CRM, EL CORREO ES EL CRM.** La ficha (`site.config.ts`)
 * dice `modulos.crm: false`: no hay a quién entregar la captura, y la cola, en
 * vez de llamar a un CRM que no existe, manda un correo al buzón del cliente con
 * los datos del contacto. Antes de esto, la cola intentaba cinco veces una
 * entrega imposible y a las ~31 horas avisaba de un FALLO que no lo era,
 * mientras el cliente no se enteraba de que alguien le había escrito.
 *
 * **LO HACE LA COLA, NO EL FORMULARIO**, y por las mismas dos razones que con
 * el CRM: el visitante no espera al proveedor de correo (el barrido corre
 * después de responder, `lib/colas`), y un proceso que muere entre guardar y
 * avisar deja la fila `pending`, que el barrido siguiente recoge. Un aviso
 * mandado en línea se habría ido con el proceso.
 *
 * Aquí vive solo lo propio del correo —a quién va, en qué idioma, con qué
 * datos—; la reserva, la escalera de espera y el estado son los de `cola.ts`.
 */
import { moduloActivo, sitio, type Idioma } from "../sitio/index.ts";

/** ¿Tiene este sitio CRM? La única pregunta que decide qué hace la cola. */
export function crmEncendido(): boolean {
  return moduloActivo("crm");
}

/**
 * El buzón del cliente: quien recibe los contactos de la web.
 *
 * **Lanza si falta**, y lo recoge la cola como un fallo de aviso más: la fila
 * se reintenta con la escalera de siempre y, si nadie pone la variable, acaba
 * en `notify_failed` con este mensaje en HQ. No se cae a `MAIL_ALERTS_TO`
 * porque ese buzón es el del equipo que opera el sitio, no el del cliente: el
 * contacto llegaría a quien no tiene que contestarlo, y nadie notaría que falta
 * la variable.
 */
export function destinatarioDeContactos(): string {
  const v = process.env.MAIL_LEADS_TO?.trim();
  if (!v) {
    throw new Error(
      "Falta MAIL_LEADS_TO: es el buzón del cliente que recibe los contactos de la web. " +
        "En un sitio sin CRM es obligatoria: sin ella, nadie se entera de las capturas.",
    );
  }
  return v;
}

/**
 * El idioma del aviso es el **principal del sitio**, no el de la persona que
 * rellenó el formulario: quien lee este correo es el cliente, y su idioma es el
 * de su web. El de la persona va dentro, como un dato más.
 */
export function idiomaDelAviso(): Idioma {
  return sitio.idiomas.principal;
}

/** Lo que la cola sabe de una captura, con los nombres de sus columnas. */
export type CapturaParaAviso = {
  readonly id: string;
  readonly email: string;
  readonly name: string | null;
  readonly last_name: string | null;
  readonly company: string | null;
  readonly job_title: string | null;
  readonly message: string | null;
  readonly source: string;
  readonly download_slug: string | null;
  readonly page_path: string;
  readonly locale: string;
};

/**
 * Los datos de la plantilla `capture_inbox_notice`.
 *
 * Solo cadenas, y las vacías se omiten: `componer` distingue «no hay dato» de
 * «hay dato» por la presencia de la clave, y una empresa vacía pintaría una
 * línea «Empresa: .» en el correo.
 *
 * La página va como **dirección completa** cuando se conoce la base pública:
 * el cliente la abre con un clic y ve lo que vio la persona. El enlace a HQ
 * solo se pone si el sitio tiene intranet; sin ella, `/hq` es un 404.
 */
export function datosDelAviso(c: CapturaParaAviso): Record<string, string> {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  const datos: Record<string, string> = {
    correo: c.email,
    origen: c.source,
    pagina: base ? `${base}${c.page_path}` : c.page_path,
    idiomaDelContacto: c.locale,
  };
  const opcionales: Record<string, string | null> = {
    nombre: c.name,
    apellido: c.last_name,
    empresa: c.company,
    cargo: c.job_title,
    mensaje: c.message,
    documento: c.download_slug,
    urlHq: base && moduloActivo("intranet") ? `${base}/hq/capturas#${c.id}` : null,
  };
  for (const [clave, valor] of Object.entries(opcionales)) {
    const limpio = valor?.trim();
    if (limpio) datos[clave] = limpio;
  }
  return datos;
}
