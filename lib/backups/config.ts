/**
 * config.ts — Variables de entorno de las copias de seguridad (FU-14).
 *
 * Tres lectores, no uno, y ésa es la decisión: cada proceso lee SOLO sus
 * credenciales.
 *
 *   `leerConfigDeCopia()`        → token de ESCRITURA  (`slg-backup-write`)
 *   `leerConfigDePurga()`        → token de PURGA      (`slg-backup-purge`)
 *   `leerConfigDeRestauracion()` → token de LECTURA    (`slg-backup-restore`)
 *
 * La mitigación 2 de R-37 (`architecture` §9.2) dice que el borrado de copias
 * antiguas lo hace un proceso distinto con otras credenciales. Aquí eso no es
 * una convención escrita en un comentario: `leerConfigDeCopia()` **falla** si
 * encuentra una variable de purga en el entorno. Si alguien monta las dos
 * credenciales en el mismo servicio, la copia no arranca — que es exactamente
 * lo que la mitigación pide y lo que un comentario nunca garantiza.
 *
 * API S3 genérica (D-20, D-21): endpoint + credenciales en variables. Cambiar
 * de proveedor no toca una línea de código. Por eso no existe aquí ninguna
 * variable con nombre de producto: `R2_*` es el prefijo que ya fijó
 * `.env.example` en M0, no una dependencia del SDK de Cloudflare — el cliente
 * es el mismo `@aws-sdk/client-s3` que FU-09 usa contra MinIO.
 */

/** Configuración del puerto de §8.3 — el destino, sin saber de quién es. */
export type DestinoConfig = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
};

/**
 * El PAPEL de cada cubo de volúmenes, en el orden en que los devuelve
 * `volumenes()`. Dentro del paquete de copia, los objetos se guardan bajo su
 * papel y no bajo el nombre del cubo: si llevaran el nombre real, restaurar en
 * staging escribiría en los cubos de PRODUCCIÓN, que es el nombre que vendría
 * escrito en el paquete. Con el papel, cada entorno traduce al cubo que dice
 * su propia configuración.
 */
export const PAPELES_DE_VOLUMEN = ["downloads", "deliverables"] as const;
export type PapelDeVolumen = (typeof PAPELES_DE_VOLUMEN)[number];

/** Origen de los volúmenes de archivos que se copian (§9.1: `slg-files`). */
export type VolumenesConfig = {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** En el orden de `PAPELES_DE_VOLUMEN`: primero `downloads`, luego `deliverables`. */
  buckets: string[];
};

export type CopiaConfig = {
  destino: DestinoConfig;
  /** 256 bits en hexadecimal (64 caracteres). Custodiada fuera del VPS (D-66). */
  claveDeCifradoHex: string;
  /** Cadena de conexión que usa `pg_dump`. Distinta de la de la aplicación. */
  databaseUrl: string;
  /** Orden de invocación de `pg_dump` (ver `comandoDeHerramienta`). */
  pgDump: string[];
  volumenes: VolumenesConfig;
};

export type RetencionConfig = {
  daily: number;
  weekly: number;
  monthly: number;
  "pre-migration": number;
};

export type PurgaConfig = {
  destino: DestinoConfig;
  retencion: RetencionConfig;
};

export type RestauracionConfig = {
  destino: DestinoConfig;
  claveDeCifradoHex: string;
  /** Base de datos DE STAGING donde se carga el volcado. Nunca la de producción. */
  databaseUrl: string;
  psql: string[];
  volumenes: VolumenesConfig;
};

const VARIABLES_DE_PURGA = ["R2_ACCESS_KEY_ID_PRUNE", "R2_SECRET_ACCESS_KEY_PRUNE"] as const;

function requerida(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor || !valor.trim()) {
    throw new Error(
      `Falta ${nombre}. Las copias de seguridad (FU-14) no tienen valores por defecto: ver .env.example.`,
    );
  }
  return valor.trim();
}

function enteroRequerido(nombre: string): number {
  const valor = Number(requerida(nombre));
  if (!Number.isInteger(valor) || valor < 1) {
    throw new Error(`${nombre} debe ser un entero mayor o igual que 1.`);
  }
  return valor;
}

/**
 * Una herramienta externa (`pg_dump`, `psql`) se declara como ORDEN COMPLETA,
 * no como ruta a un binario. En el servicio de Easypanel vale `pg_dump` a
 * secas, porque la imagen lleva `postgresql16-client`; en una máquina de
 * desarrollo sin cliente de PostgreSQL instalado vale
 * `docker exec -i slg-db pg_dump`. Ninguna de las dos formas cambia el código,
 * que es el mismo principio de D-21 aplicado a las herramientas locales.
 */
function comandoDeHerramienta(nombre: string, porDefecto: string): string[] {
  const valor = (process.env[nombre] ?? porDefecto).trim();
  const partes = valor.split(/\s+/).filter(Boolean);
  if (partes.length === 0) throw new Error(`${nombre} no puede estar vacía.`);
  return partes;
}

function claveDeCifrado(): string {
  const clave = requerida("BACKUP_ENCRYPTION_KEY");
  if (!/^[0-9a-fA-F]{64}$/.test(clave)) {
    throw new Error(
      "BACKUP_ENCRYPTION_KEY debe ser una clave de 256 bits en hexadecimal " +
        "(64 caracteres), la que produce `openssl rand -hex 32` (D-66).",
    );
  }
  return clave.toLowerCase();
}

function volumenes(): VolumenesConfig {
  return {
    endpoint: requerida("FILES_S3_ENDPOINT"),
    region: requerida("FILES_S3_REGION"),
    accessKeyId: requerida("FILES_S3_ACCESS_KEY_ID"),
    secretAccessKey: requerida("FILES_S3_SECRET_ACCESS_KEY"),
    buckets: [requerida("FILES_BUCKET_DOWNLOADS"), requerida("FILES_BUCKET_DELIVERABLES")],
  };
}

function destino(sufijo: "WRITE" | "PRUNE" | "RESTORE"): DestinoConfig {
  return {
    endpoint: requerida("R2_ENDPOINT"),
    region: requerida("R2_REGION"),
    bucket: requerida("R2_BUCKET"),
    accessKeyId: requerida(`R2_ACCESS_KEY_ID_${sufijo}`),
    secretAccessKey: requerida(`R2_SECRET_ACCESS_KEY_${sufijo}`),
  };
}

/**
 * Configuración del proceso de COPIA. Mitigación 2 de R-37, aplicada de
 * verdad: si el entorno trae la credencial de purga, esto lanza. Un servicio
 * de copia que puede borrar no es un servicio de copia.
 */
export function leerConfigDeCopia(): CopiaConfig {
  const filtradas = VARIABLES_DE_PURGA.filter((v) => (process.env[v] ?? "").trim() !== "");
  if (filtradas.length > 0) {
    throw new Error(
      `El proceso de copia NO puede ver la credencial de purga (mitigación 2 de R-37, ` +
        `architecture §9.2). Variables presentes que no deberían estarlo: ${filtradas.join(", ")}. ` +
        `La purga es un servicio aparte con su propio entorno.`,
    );
  }

  return {
    destino: destino("WRITE"),
    claveDeCifradoHex: claveDeCifrado(),
    databaseUrl: requerida("BACKUP_DATABASE_URL"),
    pgDump: comandoDeHerramienta("BACKUP_PG_DUMP_BIN", "pg_dump"),
    volumenes: volumenes(),
  };
}

/**
 * Configuración del proceso de PURGA. No lee la clave de cifrado: purgar es
 * borrar objetos por su clave, nunca abrirlos.
 */
export function leerConfigDePurga(): PurgaConfig {
  const cfg = {
    destino: destino("PRUNE"),
    retencion: {
      daily: enteroRequerido("BACKUP_RETENTION_DAILY"),
      weekly: enteroRequerido("BACKUP_RETENTION_WEEKLY"),
      monthly: enteroRequerido("BACKUP_RETENTION_MONTHLY"),
      "pre-migration": enteroRequerido("BACKUP_RETENTION_PRE_MIGRATION"),
    },
  };

  const escritura = (process.env.R2_ACCESS_KEY_ID_WRITE ?? "").trim();
  if (escritura && escritura === cfg.destino.accessKeyId) {
    throw new Error(
      "R2_ACCESS_KEY_ID_PRUNE y R2_ACCESS_KEY_ID_WRITE son el mismo token. " +
        "La mitigación 2 de R-37 exige dos credenciales distintas (D-65: " +
        "`slg-backup-write` y `slg-backup-purge`), no una reutilizada.",
    );
  }

  return cfg;
}

/**
 * Configuración de la RESTAURACIÓN. Credencial propia, de lectura: §8.3 dice
 * expresamente que restaurar no comparte puerto con copiar, porque restaurar
 * exige leer y el puerto de copia no lee.
 */
export function leerConfigDeRestauracion(): RestauracionConfig {
  return {
    destino: destino("RESTORE"),
    claveDeCifradoHex: claveDeCifrado(),
    databaseUrl: requerida("RESTORE_DATABASE_URL"),
    psql: comandoDeHerramienta("BACKUP_PSQL_BIN", "psql"),
    volumenes: volumenes(),
  };
}
