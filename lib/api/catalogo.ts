/**
 * catalogo.ts — **Las diecinueve rutas de `/api/v1`, como DATOS** (DU-22 · DU-23 ·
 * DU-30 · D-162 · D-163 · `api_contracts` §2, §3 y §4).
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
  ACTION_ITEM_CLOSER,
  DELIVERABLE_TYPES,
  LEAD_SOURCES,
  ORG_STATUS,
  ORG_TYPES,
  PROJECT_SERVICES,
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
 * Las diecinueve rutas: nueve de DU-22/DU-23, seis de la Academy (DU-30),
 * tres del proyecto que nace en el CRM (D-162) y una de la empresa que el
 * CRM crea o encuentra por su identificador (D-163)
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

  /* ── M6 · Academy (DU-30 · RF-153): noticias, hitos y pendientes ──────────
   *
   * Las seis son `POST`: la matriz B.3 no da alcance de agente a `news.read`
   * ni a `milestone.read`, así que no hay lectura que una clave pueda hacer, y
   * una ruta que ninguna clave puede llamar sería una mentira en la
   * especificación. Las sub-acciones `done` y `reopen` son `POST`, como
   * `/deliverables/{id}/publish`: un acto con nombre, no un campo que se
   * parchea. Las tres son idempotentes a propósito —repetir `done` no mueve
   * `done_at` ni falla—: un agente que reintenta una llamada cortada no tiene
   * que preguntar antes.
   */
  {
    metodo: "POST",
    ruta: "/api/v1/organizations/{id}/news",
    accion: "news.write",
    resumen: "Noticia con comentario para una empresa. Ajena o inexistente, 404.",
    cuerpo: [
      { nombre: "title", tipo: "string", minimo: 1, maximo: 200, obligatorio: true, descripcion: "Título." },
      { nombre: "source_url", tipo: "string", maximo: 2000, descripcion: "Fuente de la noticia. Solo http(s)." },
      {
        nombre: "summary_md",
        tipo: "string",
        minimo: 1,
        maximo: 20_000,
        obligatorio: true,
        descripcion: "La noticia, en Markdown. Se guarda tal cual.",
      },
      {
        nombre: "comment_md",
        tipo: "string",
        minimo: 1,
        maximo: 20_000,
        obligatorio: true,
        descripcion: "Lo que la noticia significa PARA esa empresa, en Markdown.",
      },
      {
        nombre: "importance",
        tipo: "integer",
        minimo: 1,
        maximo: 3,
        obligatorio: true,
        descripcion: "Importancia editorial (D-161): 1 es lo primero. La fija quien escribe.",
      },
      {
        nombre: "publish",
        tipo: "boolean",
        obligatorio: true,
        descripcion: "Obligatorio y SIN defecto, como en los avisos: que un cliente lo vea no se olvida.",
      },
    ],
    codigos: [201, 400, 404, 413, 415, 422],
  },
  {
    metodo: "POST",
    ruta: "/api/v1/projects/{id}/milestones",
    accion: "milestone.write",
    resumen: "Hito de entrega de un proyecto. Nace pendiente; la empresa sale del proyecto.",
    cuerpo: [
      { nombre: "title", tipo: "string", minimo: 1, maximo: 200, obligatorio: true, descripcion: "Título." },
      { nombre: "due_at", tipo: "datetime", obligatorio: true, descripcion: "Fecha de entrega." },
      { nombre: "position", tipo: "integer", minimo: 0, maximo: 10_000, descripcion: "Orden manual. Ausente: 0." },
    ],
    codigos: [201, 400, 404, 413, 415, 422],
  },
  {
    metodo: "POST",
    ruta: "/api/v1/milestones/{id}/done",
    accion: "milestone.write",
    resumen: "Marca un hito como hecho y pone `done_at`. Repetirlo no mueve la fecha.",
    cuerpo: [],
    codigos: [200, 400, 404, 415, 422],
  },
  {
    metodo: "POST",
    ruta: "/api/v1/milestones/{id}/reopen",
    accion: "milestone.write",
    resumen: "Devuelve un hito a pendiente y quita `done_at`.",
    cuerpo: [],
    codigos: [200, 400, 404, 415, 422],
  },
  {
    metodo: "POST",
    ruta: "/api/v1/projects/{id}/action-items",
    accion: "action_item.write",
    resumen: "Pendiente de un proyecto. `closes_by` dice quién puede cerrarlo.",
    cuerpo: [
      { nombre: "title", tipo: "string", minimo: 1, maximo: 200, obligatorio: true, descripcion: "Título." },
      { nombre: "due_at", tipo: "datetime", descripcion: "Fecha límite, opcional." },
      {
        nombre: "closes_by",
        tipo: "enum",
        valores: ACTION_ITEM_CLOSER,
        obligatorio: true,
        descripcion: "Quién lo cierra: `client` o `slg`. Sin defecto: es una decisión.",
      },
    ],
    codigos: [201, 400, 404, 413, 415, 422],
  },
  {
    metodo: "POST",
    ruta: "/api/v1/action-items/{id}/done",
    accion: "action_item.write",
    resumen: "Cierra un pendiente, sea de quien sea, con el actor de la clave. Repetirlo no cambia nada.",
    cuerpo: [],
    codigos: [200, 400, 404, 415, 422],
  },

  /* ── D-162 · El proyecto nace en el CRM; este sitio lo recibe ─────────────
   *
   * El CRM (o Hermes por él) crea aquí la carpeta del cliente y deja al lado
   * su identificador. **Idempotente por `crm_project_id`**: un reintento tras
   * una llamada cortada devuelve 200 con el proyecto que ya existe, ni crea
   * otro ni responde 409 — un agente no tiene que preguntar antes de repetir.
   * Cerrar y reabrir son sub-acciones `POST`, como los hitos: el catálogo no
   * conoce `PATCH`, y un acto con nombre se lee en `audit_log` sin abrir el
   * cuerpo. Nada comercial viaja en el cuerpo: frontera (a) de `scope.md`.
   */
  {
    metodo: "POST",
    ruta: "/api/v1/organizations/{id}/projects",
    accion: "project.write",
    resumen:
      "Crea la carpeta del cliente que el CRM acaba de abrir. Mismo `crm_project_id`: 200 con la existente. Ajena o inexistente, 404.",
    cuerpo: [
      { nombre: "name", tipo: "string", minimo: 1, maximo: 200, obligatorio: true, descripcion: "Nombre del proyecto." },
      {
        nombre: "service",
        tipo: "enum",
        valores: PROJECT_SERVICES,
        obligatorio: true,
        // La lista es la de la ficha del sitio (D-166): desde 0024 la base ya no
        // la contiene, así que esta es la primera validación y no un espejo.
        descripcion: "Servicio, literal e intraducible (RF-14). Fuera de la lista, 422.",
      },
      {
        nombre: "crm_project_id",
        tipo: "string",
        minimo: 1,
        maximo: 200,
        obligatorio: true,
        descripcion: "Identificador del proyecto en el CRM. Si el CRM manda, dice cuál es. Repetirlo devuelve 200 con el existente.",
      },
      { nombre: "starts_at", tipo: "datetime", descripcion: "Fecha de inicio, opcional." },
      { nombre: "ends_at", tipo: "datetime", descripcion: "Fecha de fin prevista, opcional." },
      {
        nombre: "status",
        tipo: "enum",
        valores: PROJECT_STATUS,
        defecto: "active",
        descripcion: "Estado inicial. Ausente: `active`.",
      },
    ],
    codigos: [200, 201, 400, 404, 413, 415, 422],
  },
  {
    metodo: "POST",
    ruta: "/api/v1/projects/{id}/close",
    accion: "project.write",
    resumen: "Cierra un proyecto (`status: closed`). Repetirlo no cambia nada.",
    cuerpo: [],
    codigos: [200, 400, 404, 415, 422],
  },
  {
    metodo: "POST",
    ruta: "/api/v1/projects/{id}/reopen",
    accion: "project.write",
    resumen: "Devuelve un proyecto a `active`. Idempotente sobre uno ya activo.",
    cuerpo: [],
    codigos: [200, 400, 404, 415, 422],
  },

  /* ── D-163 · La empresa se relaciona con la del CRM por su identificador ──
   *
   * D-162 dejó que el CRM creara aquí la carpeta del cliente, pero no sabía
   * qué `{id}` de empresa usar: las empresas de aquí y las del CRM no estaban
   * relacionadas. Esta ruta es la puerta: crea o encuentra la empresa por su
   * `crm_company_id`. **Idempotente**: repetirlo devuelve 200 con la que ya
   * existe. Sin `{id}` en la ruta no hay 404 que dar; una clave acotada a una
   * empresa responde 403, porque crear otra está fuera de su universo. Nada
   * comercial viaja en el cuerpo: frontera (a) de `scope.md`.
   */
  {
    metodo: "POST",
    ruta: "/api/v1/organizations",
    accion: "org.write",
    resumen:
      "Crea o encuentra la empresa por su `crm_company_id`. Mismo identificador: 200 con la existente. Clave acotada a una empresa: 403.",
    cuerpo: [
      { nombre: "name", tipo: "string", minimo: 1, maximo: 200, obligatorio: true, descripcion: "Nombre de la empresa." },
      {
        nombre: "crm_company_id",
        tipo: "string",
        minimo: 1,
        maximo: 200,
        obligatorio: true,
        descripcion: "Identificador de la empresa en el CRM. Si el CRM manda, dice cuál es. Repetirlo devuelve 200 con la existente.",
      },
      {
        nombre: "slug",
        tipo: "string",
        maximo: 60,
        descripcion: "Identificador legible, en minúsculas y con guiones. Ausente: se deriva del nombre. Ya usado por otra empresa: 422.",
      },
    ],
    codigos: [200, 201, 400, 413, 415, 422],
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
