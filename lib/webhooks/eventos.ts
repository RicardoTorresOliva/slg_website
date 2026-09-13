/**
 * Los **nueve eventos** de B.7 (RF-112).
 *
 * La lista es CERRADA a propósito, al revés que `agent_event.kind`, que es un
 * enumerado abierto. Un evento saliente es un **contrato con quien lo recibe**:
 * si cualquier parte del código pudiera inventarse uno, el suscriptor tendría
 * que estar preparado para lo que sea, y eso no es un contrato.
 */
export const EVENTOS = [
  "lead.captured",
  "lead.delivered_to_crm",
  "download.completed",
  "contact.submitted",
  "doctrine.requested",
  "invitation.sent",
  "deliverable.published",
  "announcement.published",
  "post.published",
] as const;

export type Evento = (typeof EVENTOS)[number];

/**
 * Qué lleva cada evento.
 *
 * **Ningún payload lleva datos que el suscriptor no necesite**: ni el mensaje
 * de contacto, ni el cuerpo del artículo, ni nada que convierta un webhook en
 * una copia de la base de datos por la puerta de atrás.
 *
 * `post.published` es la excepción en tamaño, y está razonada en RF-145: lleva
 * los tres extractos de redes **y el enlace canónico del artículo en su
 * idioma**, para que quien lo reciba pueda publicar **sin leer de vuelta el
 * repositorio**. Un webhook que obliga a ir a buscar el resto no ahorra nada.
 */
export type PayloadDe = {
  "lead.captured": { leadId: string; source: string; emailDomain: string; locale: string; page: string };
  "lead.delivered_to_crm": { leadId: string; crmMode: string; crmContactId: string | null };
  "download.completed": { leadId: string; downloadSlug: string; locale: string };
  "contact.submitted": { leadId: string; emailDomain: string; locale: string };
  "doctrine.requested": { leadId: string; emailDomain: string; locale: string };
  "invitation.sent": { invitationId: string; organizationId: string; role: string };
  "deliverable.published": { deliverableId: string; projectId: string; organizationId: string };
  "announcement.published": { announcementId: string; organizationId: string | null };
  "post.published": {
    slug: string;
    locale: string;
    title: string;
    /** El canónico, no un identificador: RF-145. */
    url: string;
    tags: readonly string[];
    social: { hook: string; linkedin: string; x: string };
  };
};
