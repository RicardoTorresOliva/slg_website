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
export type Variable = {
  readonly nombre: string;
  readonly para: string;
  readonly secreta: boolean;
  readonly obligatoria: boolean;
};

export const VARIABLES: readonly Variable[] = [
  { nombre: "DATABASE_URL", para: "Cómo se conecta el sitio a la base (rol slg_app)", secreta: true, obligatoria: true },
  { nombre: "DATABASE_URL_MIGRATIONS", para: "Cómo se conectan las migraciones (rol dueño)", secreta: true, obligatoria: true },
  { nombre: "APP_DB_PASSWORD", para: "La contraseña que el botón de abajo le pone a slg_app", secreta: true, obligatoria: true },
  { nombre: "BETTER_AUTH_SECRET", para: "Firma las sesiones", secreta: true, obligatoria: true },
  { nombre: "NEXT_PUBLIC_SITE_URL", para: "La dirección pública del sitio", secreta: false, obligatoria: true },
  { nombre: "S3_ENDPOINT", para: "Dónde está MinIO por dentro", secreta: false, obligatoria: true },
  { nombre: "S3_ACCESS_KEY_ID", para: "Usuario de MinIO", secreta: true, obligatoria: true },
  { nombre: "S3_SECRET_ACCESS_KEY", para: "Contraseña de MinIO", secreta: true, obligatoria: true },
  { nombre: "S3_BUCKET_DOWNLOADS", para: "Nombre del bucket de documentos", secreta: false, obligatoria: false },
  { nombre: "S3_BUCKET_DELIVERABLES", para: "Nombre del bucket de entregables", secreta: false, obligatoria: false },
  { nombre: "MAIL_SMTP_HOST", para: "Servidor de correo saliente", secreta: false, obligatoria: true },
  { nombre: "MAIL_SMTP_USERNAME", para: "Usuario SMTP", secreta: true, obligatoria: true },
  { nombre: "MAIL_SMTP_PASSWORD", para: "Contraseña SMTP", secreta: true, obligatoria: true },
  { nombre: "MAIL_FROM_ADDRESS", para: "Desde qué dirección se manda", secreta: false, obligatoria: true },
  { nombre: "OPS_MAIL_TO", para: "A quién va el correo de prueba de esta página", secreta: false, obligatoria: true },
  { nombre: "CRM_BASE_URL", para: "La API del CRM", secreta: false, obligatoria: false },
  { nombre: "CRM_API_KEY_CAPTURE", para: "Clave del CRM que escribe", secreta: true, obligatoria: false },
  { nombre: "CRM_API_KEY_READ", para: "Clave del CRM que solo lee", secreta: true, obligatoria: false },
  { nombre: "STAGING_BASIC_AUTH_USER", para: "SOLO en staging. En producción tiene que estar VACÍA", secreta: false, obligatoria: false },
];

/** Las obligatorias que NO están puestas. Solo nombres: jamás un valor. */
export function obligatoriasQueFaltan(): string[] {
  return VARIABLES.filter((v) => v.obligatoria && !process.env[v.nombre]?.trim()).map((v) => v.nombre);
}
