/**
 * port.ts — El puerto de correo. UNA operación.
 *
 * `architecture` §8.2 lo define en una línea:
 *
 *     enviar(tipo, destinatario, plantilla, idioma, datos)
 *         → identificador de mensaje del proveedor
 *
 * CONTRATO. Devuelve identificador si el proveedor **aceptó** el mensaje; lanza
 * un error clasificado si no. **No promete entrega en bandeja**: eso no es
 * observable en el momento del envío, y un puerto que promete lo que no puede
 * comprobar obliga a mentir en la capa de arriba.
 *
 * POR QUÉ ESTE ARCHIVO NO IMPORTA NADA. Es la frontera. El adaptador SMTP la
 * implementa, los casos de uso la consumen, y ninguno de los dos conoce al otro.
 * Cambiar de proveedor es escribir otro adaptador —o, como en la práctica exige
 * D-22, cambiar cuatro variables de entorno— sin tocar un solo caso de uso.
 */

/** Los cuatro tipos de la v1 (`data_model` §3.12). Cuatro, no tres: RF-50 pide uno más. */
export const TIPOS_DE_CORREO = [
  "invitation",
  "password_reset",
  "capture_notice",
  "capture_failed_alert",
] as const;

export type TipoDeCorreo = (typeof TIPOS_DE_CORREO)[number];

export const IDIOMAS = ["es", "en"] as const;
export type Idioma = (typeof IDIOMAS)[number];

/**
 * Clasificación del fallo. No es decoración: decide si se reintenta.
 *
 *   · `red` y `tiempo_agotado` — el proveedor no contestó. Se reintenta.
 *   · `autenticacion` — la credencial está mal. Reintentar no arregla una
 *     credencial equivocada; lo que hace falta es que alguien la mire.
 *   · `rechazo` — el proveedor dijo que no (destinatario inválido, dominio no
 *     verificado). Reintentar repite el mismo «no».
 */
export const CLASES_DE_FALLO = ["red", "autenticacion", "rechazo", "tiempo_agotado"] as const;
export type ClaseDeFallo = (typeof CLASES_DE_FALLO)[number];

export class ErrorDeCorreo extends Error {
  readonly clase: ClaseDeFallo;
  /** Si no, insistir solo gasta intentos y retrasa el aviso a una persona. */
  readonly reintentable: boolean;

  constructor(clase: ClaseDeFallo, mensaje: string) {
    super(mensaje);
    this.name = "ErrorDeCorreo";
    this.clase = clase;
    this.reintentable = clase === "red" || clase === "tiempo_agotado";
  }
}

export type MensajeSaliente = {
  readonly tipo: TipoDeCorreo;
  readonly para: string;
  readonly idioma: Idioma;
  /**
   * Datos de la plantilla. Los valores se escapan al componer el HTML; el
   * cuerpo **no se guarda** en la base de datos (§8.2, prohibiciones), así que
   * un token de invitación que viaje aquí no se persiste en ningún sitio.
   */
  readonly datos: Readonly<Record<string, string>>;
};

export type EnvioAceptado = {
  /** Lo que el proveedor devuelve. Se persiste como evidencia propia. */
  readonly providerMessageId: string;
  readonly from: string;
  readonly replyTo: string | null;
  readonly templateKey: string;
  readonly subjectKey: string;
};

/** La interfaz que implementa el adaptador y consumen los casos de uso. */
export type PuertoDeCorreo = {
  enviar(mensaje: MensajeSaliente): Promise<EnvioAceptado>;
  /** Cierra el transporte. Solo para scripts y pruebas. */
  cerrar(): Promise<void>;
};
