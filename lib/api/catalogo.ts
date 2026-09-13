/**
 * catalogo.ts — **Las nueve rutas de `/api/v1`, como DATOS** (DU-22 · DU-23 ·
 * `api_contracts` §2, §3 y §4).
 *
 * ESTE ARCHIVO EXISTE PARA QUE LA ESPECIFICACIÓN NO PUEDA MENTIR. El criterio 5
 * de DU-23 pide que `GET /openapi.json` se genere **a partir de los mismos
 * esquemas que validan las peticiones**, y no se escriba a mano. La razón está
 * escrita en el contrato con todas las letras: *una especificación mantenida
 * aparte se desincroniza en la segunda semana, y una especificación que miente
 * es peor que no tenerla*.
 *
 * Así que aquí se declara **una sola vez** cada parámetro y cada campo, con su
 * vocabulario y sus topes; el validador los aplica y el generador de OpenAPI los
 * describe. Añadir un parámetro sin que aparezca en la especificación es
 * imposible: son el mismo objeto.
 *
 * La otra mitad de la disciplina: **el alcance de cada ruta sale de la acción de
 * B.3**, no de una lista aparte. Una tabla de permisos, no dos.
 */
import { ACCIONES, MATRIZ_B3, type Accion } from "../auth/index.ts";
import {
  DELIVERABLE_TYPES,
  LEAD_SOURCES,
  ORG_STATUS,
  ORG_TYPES,
  PROJECT_STATUS,
  QUEUE_STATUS,
  VISIBILITY,
  type ApiScope,
} from "../db/schema.ts";

/* ══════════════════════════════════════════════════════════════════════════
 * Declaraciones: un parámetro o un campo, con su regla
 * ══════════════════════════════════════════════════════════════════════════ */

export type Declaracion = {
  readonly nombre: string;
  readonly descripcion: string;
  readonly obligatorio?: boolean;
} & (
  | { readonly tipo: "enum"; readonly valores: readonly string[]; readonly defecto?: string }
  | { readonly tipo: "datetime" }
  | { readonly tipo: "boolean"; readonly defecto?: boolean }
  | { readonly tipo: "integer"; readonly minimo: number; readonly maximo: number; readonly defecto?: number }
  | { readonly tipo: "string"; readonly maximo: number; readonly forma?: RegExp; readonly minimo?: number }
  | { readonly tipo: "objeto"; readonly campos: readonly Declaracion[] }
  | { readonly tipo: "opaco" }
);

const LIMIT: Declaracion = {
  nombre: "limit",
  tipo: "integer",
  minimo: 1,
  maximo: 200,
  defecto: 50,
  descripcion: "Cuántos elementos devolver. Por encima del máximo, 422.",
};
const CURSOR: Declaracion = {
  nombre: "cursor",
  tipo: "opaco",
  descripcion: "Cursor opaco de la respuesta anterior. De otra colección, 400.",
};

/* ══════════════════════════════════════════════════════════════════════════
 * Las nueve rutas
 * ══════════════════════════════════════════════════════════════════════════ */

export type RutaDeApi = {
  readonly metodo: "GET" | "POST";
  /** Con `{id}` donde va el identificador, como en el contrato. */
  readonly ruta: string;
  /** La acción de B.3. De ella sale el alcance exigido — no hay lista aparte. */
  readonly accion: Accion | null;
  readonly resumen: string;
  readonly query?: readonly Declaracion[];
  readonly cuerpo?: readonly Declaracion[];
  /** Los códigos que esta ruta puede devolver, además de los comunes. */
  readonly codigos: readonly number[];
};

/** Los que puede devolver **cualquier** ruta (§2.5). */
export const CODIGOS_COMUNES = [401, 403, 429, 500, 503] as const;

export const RUTAS: readonly RutaDeApi[] = [
  {
    metodo: "GET",
    ruta: "/api/v1/captures",
    accion: "capture.read",
    resumen: "Evidencia del embudo de captura y su estado de entrega al CRM. Solo lectura.",
    query: [
      { nombre: "since", tipo: "datetime", descripcion: "created_at >= since." },
      { nombre: "until", tipo: "datetime", descripcion: "created_at < until." },
      { nombre: "source", tipo: "enum", valores: LEAD_SOURCES, descripcion: "Origen de la captura." },
      {
        nombre: "crm_sync_status",
        tipo: "enum",
        valores: QUEUE_STATUS,
        descripcion: "Estado de la entrega al CRM.",
      },
      {
        nombre: "doc_code",
        tipo: "string",
        maximo: 20,
        forma: /^[Dd]-\d{2}$/,
        descripcion: "Documento de la descarga, `D-01`…`D-11`.",
      },
      LIMIT,
      CURSOR,
    ],
    codigos: [200, 400, 422],
  },
  {
    metodo: "GET",
    ruta: "/api/v1/organizations",
    accion: "org.read",
    resumen: "Empresas. Una clave acotada ve exactamente la suya.",
    query: [
      { nombre: "status", tipo: "enum", valores: ORG_STATUS, defecto: "active", descripcion: "Estado." },
      { nombre: "type", tipo: "enum", valores: ORG_TYPES, defecto: "client", descripcion: "Tipo." },
      LIMIT,
      CURSOR,
    ],
    codigos: [200, 400, 422],
  },
  {
    metodo: "GET",
    ruta: "/api/v1/organizations/{id}/projects",
    accion: "org.read",
    resumen: "Proyectos de una empresa. Ajena o inexistente, 404.",
    query: [
      { nombre: "status", tipo: "enum", valores: PROJECT_STATUS, descripcion: "Estado del proyecto." },
      { nombre: "service", tipo: "string", maximo: 60, descripcion: "Servicio literal (RF-14)." },
      LIMIT,
      CURSOR,
    ],
    codigos: [200, 400, 404, 422],
  },
  {
    metodo: "POST",
    ruta: "/api/v1/deliverables",
    accion: "deliverable.publish",
    resumen: "Crea los metadatos de un entregable y devuelve la URL firmada de subida.",
    cuerpo: [
      { nombre: "project_id", tipo: "string", maximo: 200, obligatorio: true, descripcion: "Proyecto al que pertenece." },
      { nombre: "title", tipo: "string", minimo: 1, maximo: 200, obligatorio: true, descripcion: "Título." },
      { nombre: "type", tipo: "enum", valores: DELIVERABLE_TYPES, obligatorio: true, descripcion: "Tipo (RF-142)." },
      { nombre: "source", tipo: "enum", valores: ["file", "link"], obligatorio: true, descripcion: "Archivo o enlace." },
      {
        nombre: "visibility",
        tipo: "enum",
        valores: VISIBILITY,
        defecto: "internal",
        descripcion: "Por defecto `internal`: un entregable a medias no puede quedar visible.",
      },
      {
        nombre: "file",
        tipo: "objeto",
        descripcion: "Obligatorio si `source = file`.",
        campos: [
          { nombre: "filename", tipo: "string", minimo: 1, maximo: 200, obligatorio: true, descripcion: "Nombre del archivo." },
          { nombre: "mime_type", tipo: "string", minimo: 1, maximo: 120, obligatorio: true, descripcion: "Tipo MIME." },
          { nombre: "size_bytes", tipo: "integer", minimo: 1, maximo: 52_428_800, obligatorio: true, descripcion: "Tamaño." },
          {
            nombre: "checksum_sha256",
            tipo: "string",
            maximo: 64,
            forma: /^[0-9a-f]{64}$/,
            descripcion: "Suma de comprobación, opcional.",
          },
        ],
      },
      { nombre: "external_url", tipo: "string", maximo: 2000, descripcion: "Obligatorio si `source = link`. Solo http(s)." },
      { nombre: "family_id", tipo: "string", maximo: 200, descripcion: "Familia de versiones. Ausente: versión 1." },
    ],
    codigos: [201, 400, 404, 413, 415, 422],
  },
  {
    metodo: "POST",
    ruta: "/api/v1/deliverables/{id}/publish",
    accion: "deliverable.publish",
    resumen: "Publica un entregable ya creado. Publicar es un acto separado de crear.",
    cuerpo: [],
    codigos: [200, 400, 404, 409, 415],
  },
  {
    metodo: "GET",
    ruta: "/api/v1/projects/{id}/deliverables",
    accion: "deliverable.read",
    resumen: "Entregables de un proyecto. Nunca devuelve URL de descarga.",
    query: [
      { nombre: "type", tipo: "enum", valores: DELIVERABLE_TYPES, descripcion: "Tipo." },
      { nombre: "published", tipo: "boolean", descripcion: "Publicados o no publicados." },
      { nombre: "only_latest", tipo: "boolean", defecto: false, descripcion: "Solo la última versión de cada familia." },
      LIMIT,
      CURSOR,
    ],
    codigos: [200, 400, 404, 422],
  },
  {
    metodo: "POST",
    ruta: "/api/v1/announcements",
    accion: "announcement.publish",
    resumen: "Aviso dirigido a una empresa.",
    cuerpo: [
      { nombre: "organization_id", tipo: "string", maximo: 200, obligatorio: true, descripcion: "Empresa destinataria." },
      { nombre: "title", tipo: "string", minimo: 1, maximo: 200, obligatorio: true, descripcion: "Título." },
      { nombre: "body_md", tipo: "string", minimo: 1, maximo: 20_000, obligatorio: true, descripcion: "Markdown, se guarda tal cual." },
      {
        nombre: "publish",
        tipo: "boolean",
        obligatorio: true,
        descripcion: "Obligatorio y SIN defecto: que un cliente vea o no un mensaje no se olvida.",
      },
      { nombre: "locale", tipo: "enum", valores: ["es", "en"], defecto: "es", descripcion: "Idioma en que está escrito (RF-72)." },
    ],
    codigos: [201, 400, 404, 413, 415, 422],
  },
  {
    metodo: "POST",
    ruta: "/api/v1/events",
    accion: "event.write",
    resumen: "Actividad del agente. `kind` es enumerado abierto (RF-146).",
    cuerpo: [
      {
        nombre: "kind",
        tipo: "string",
        maximo: 100,
        obligatorio: true,
        forma: /^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/,
        descripcion: "Forma `<recurso>.<acción>`. No hay lista cerrada.",
      },
      { nombre: "organization_id", tipo: "string", maximo: 200, descripcion: "Empresa, si la hay." },
      { nombre: "payload", tipo: "objeto", obligatorio: true, campos: [], descripcion: "Objeto JSON con el contenido del evento." },
    ],
    codigos: [201, 400, 404, 413, 415, 422],
  },
  {
    metodo: "GET",
    ruta: "/api/v1/openapi.json",
    accion: null,
    resumen: "La especificación. Responde a cualquier clave válida; sin clave, 401.",
    codigos: [200],
  },
];

/** El alcance que habilita una ruta, **leído de B.3**. Nunca de otra lista. */
export function alcanceDe(ruta: RutaDeApi): ApiScope | null {
  if (ruta.accion === null) return null;
  return MATRIZ_B3[ruta.accion].alcanceDeAgente;
}

/**
 * La ruta declarada, por método y plantilla. **Lanza si no existe**: una ruta de
 * `app/` que no esté en el catálogo es una ruta que la especificación no
 * describe, y el fallo tiene que salir al arrancar, no al auditar.
 */
export function buscarRuta(metodo: "GET" | "POST", plantilla: string): RutaDeApi {
  const encontrada = RUTAS.find((r) => r.metodo === metodo && r.ruta === plantilla);
  if (!encontrada) throw new Error(`ruta no declarada en el catálogo: ${metodo} ${plantilla}`);
  return encontrada;
}

/** Solo para el freno: que ninguna ruta declare una acción que no existe. */
export const ACCIONES_CONOCIDAS: readonly string[] = ACCIONES;
