/**
 * variables.ts — La lista de variables de entorno del despliegue.
 *
 * VIVE AQUÍ Y NO DENTRO DE `/api/ops` porque la usan **dos sitios**, y el
 * segundo existe por un motivo que costó una noche: `/api/ops` **no puede
 * decirte qué falta si lo que falta es la variable que la enciende**. Sin
 * `OPS_TOKEN` esa página devuelve 404 —a propósito, es una ruta que manda correo
 * y toca la base— y entonces no queda ningún sitio donde mirar.
 *
 * `/api/health` sí está siempre abierta, así que ahí va la misma lista. Enseña
 * **nombres, nunca valores**: los nombres ya están en `.env.example`, que es
 * público, y saber cuál falta es justo lo que desatasca un despliegue.
 */
import { moduloActivo } from "../sitio/index.ts";

export type Variable = {
  readonly nombre: string;
  readonly para: string;
  readonly secreta: boolean;
  readonly obligatoria: boolean;
};

const SOBRE_SUPABASE = process.env.FILES_DRIVER === "supabase";
const SOBRE_S3 = !SOBRE_SUPABASE;

/**
 * Sin CRM, el correo al buzón del cliente es el único aviso de una captura
 * (plantilla, paso 5b): faltar `MAIL_LEADS_TO` es perder contactos en silencio.
 * Con CRM no se usa, y pedirla sería reclamar lo que no hace falta.
 */
const SIN_CRM = !moduloActivo("crm");

export const VARIABLES: readonly Variable[] = [
  { nombre: "DATABASE_URL", para: "Cómo se conecta el sitio a la base (rol slg_app)", secreta: true, obligatoria: true },
  { nombre: "DATABASE_URL_MIGRATIONS", para: "Cómo se conectan las migraciones (rol dueño)", secreta: true, obligatoria: true },
  { nombre: "APP_DB_PASSWORD", para: "La contraseña que el botón de abajo le pone a slg_app", secreta: true, obligatoria: true },
  { nombre: "BETTER_AUTH_SECRET", para: "Firma las sesiones", secreta: true, obligatoria: true },
  { nombre: "NEXT_PUBLIC_SITE_URL", para: "La dirección pública del sitio", secreta: false, obligatoria: true },
  // Proveedor de archivos: S3 (MinIO en el VPS) salvo que FILES_DRIVER=supabase.
  // Las obligatorias de cada uno lo son SOLO cuando ese proveedor manda: pedir
  // claves S3 en un despliegue sobre Supabase Storage sería reclamar lo que no
  // se usa, y /api/health diría «faltan» para siempre.
  { nombre: "FILES_DRIVER", para: "Proveedor de archivos: vacío = S3/MinIO, «supabase» = Supabase Storage", secreta: false, obligatoria: false },
  { nombre: "S3_ENDPOINT", para: "Dónde está MinIO por dentro", secreta: false, obligatoria: SOBRE_S3 },
  { nombre: "S3_ACCESS_KEY_ID", para: "Usuario de MinIO", secreta: true, obligatoria: SOBRE_S3 },
  { nombre: "S3_SECRET_ACCESS_KEY", para: "Contraseña de MinIO", secreta: true, obligatoria: SOBRE_S3 },
  { nombre: "SUPABASE_URL", para: "La URL del proyecto de Supabase (https://<ref>.supabase.co)", secreta: false, obligatoria: SOBRE_SUPABASE },
  { nombre: "SUPABASE_SERVICE_ROLE_KEY", para: "Clave de servicio de Supabase: firma, sube y borra archivos", secreta: true, obligatoria: SOBRE_SUPABASE },
  { nombre: "S3_BUCKET_DOWNLOADS", para: "Nombre del bucket de documentos", secreta: false, obligatoria: false },
  { nombre: "S3_BUCKET_DELIVERABLES", para: "Nombre del bucket de entregables", secreta: false, obligatoria: false },
  { nombre: "MAIL_SMTP_HOST", para: "Servidor de correo saliente", secreta: false, obligatoria: true },
  { nombre: "MAIL_SMTP_USERNAME", para: "Usuario SMTP", secreta: true, obligatoria: true },
  { nombre: "MAIL_SMTP_PASSWORD", para: "Contraseña SMTP", secreta: true, obligatoria: true },
  { nombre: "MAIL_FROM_ADDRESS", para: "Desde qué dirección se manda", secreta: false, obligatoria: true },
  { nombre: "OPS_MAIL_TO", para: "A quién va el correo de prueba de esta página", secreta: false, obligatoria: true },
  { nombre: "MAIL_LEADS_TO", para: "El buzón del cliente que recibe los contactos de la web (sitio sin CRM)", secreta: false, obligatoria: SIN_CRM },
  { nombre: "CRON_SECRET", para: "Testigo de /api/colas: barre las colas desde un planificador externo (opcional)", secreta: true, obligatoria: false },
  { nombre: "CRM_BASE_URL", para: "La API del CRM", secreta: false, obligatoria: false },
  { nombre: "CRM_API_KEY_CAPTURE", para: "Clave del CRM que escribe", secreta: true, obligatoria: false },
  { nombre: "CRM_API_KEY_READ", para: "Clave del CRM que solo lee", secreta: true, obligatoria: false },
  { nombre: "STAGING_BASIC_AUTH_USER", para: "SOLO en staging. En producción tiene que estar VACÍA", secreta: false, obligatoria: false },
];

/** Las obligatorias que NO están puestas. Solo nombres: jamás un valor. */
export function obligatoriasQueFaltan(): string[] {
  return VARIABLES.filter((v) => v.obligatoria && !process.env[v.nombre]?.trim()).map((v) => v.nombre);
}
