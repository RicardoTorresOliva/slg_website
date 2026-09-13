/**
 * openapi.ts — **La especificación se GENERA del catálogo** (DU-23, criterio 5 ·
 * `api_contracts` §3.9 · RF-106).
 *
 * POR QUÉ NO ESTÁ ESCRITA A MANO. El contrato lo dice con todas las letras y no
 * hay que mejorarlo: *una especificación mantenida aparte se desincroniza en la
 * segunda semana, y una especificación que miente es peor que no tenerla*. Un
 * agente que lee `openapi.json` y descubre que `limit` admite 500 hace una
 * llamada que el servidor rechaza, y el fallo parece del servidor.
 *
 * Así que aquí no se describe nada: se **traduce** `catalogo.ts`, que es lo
 * mismo que valida las peticiones. Añadir un parámetro sin que aparezca en la
 * especificación es imposible porque son el mismo objeto.
 *
 * **NO ES PÚBLICA.** Describe la superficie de escritura de la aplicación, así
 * que RF-106 exige clave —cualquiera, sea cual sea su alcance—. Tampoco hay
 * página de documentación interactiva servida desde el dominio: sería un script
 * de terceros en la capa pública, contra RF-35 y el gate D1.
 */
import { alcanceDe, CODIGOS_COMUNES, RUTAS, type Declaracion, type RutaDeApi } from "./catalogo.ts";
import { CODIGOS, MENSAJES, type EstadoDeError } from "./errores.ts";

type Esquema = Record<string, unknown>;

function esquemaDe(d: Declaracion): Esquema {
  switch (d.tipo) {
    case "enum":
      return { type: "string", enum: [...d.valores], ...(d.defecto ? { default: d.defecto } : {}) };
    case "datetime":
      return { type: "string", format: "date-time" };
    case "boolean":
      return { type: "boolean", ...(d.defecto !== undefined ? { default: d.defecto } : {}) };
    case "integer":
      return {
        type: "integer",
        minimum: d.minimo,
        maximum: d.maximo,
        ...(d.defecto !== undefined ? { default: d.defecto } : {}),
      };
    case "string":
      return {
        type: "string",
        ...(d.minimo !== undefined ? { minLength: d.minimo } : {}),
        maxLength: d.maximo,
        // El patrón se sirve **tal cual valida**: si el agente lo lee, lee la
        // regla de verdad y no una aproximación.
        ...(d.forma ? { pattern: d.forma.source } : {}),
      };
    case "objeto":
      return d.campos.length === 0
        ? { type: "object", additionalProperties: true }
        : {
            type: "object",
            additionalProperties: false,
            required: d.campos.filter((c) => c.obligatorio).map((c) => c.nombre),
            properties: Object.fromEntries(
              d.campos.map((c) => [c.nombre, { ...esquemaDe(c), description: c.descripcion }]),
            ),
          };
    case "opaco":
      return { type: "string" };
  }
}

function respuestasDe(ruta: RutaDeApi): Esquema {
  const codigos = [...new Set([...ruta.codigos, ...CODIGOS_COMUNES])].sort((a, b) => a - b);
  const salida: Esquema = {};
  for (const codigo of codigos) {
    const esError = codigo >= 400;
    salida[String(codigo)] = {
      description: esError
        ? `${CODIGOS[codigo as EstadoDeError]} — ${MENSAJES[codigo as EstadoDeError]}`
        : "Correcto.",
      content: {
        "application/json": {
          schema: esError ? { $ref: "#/components/schemas/Error" } : { type: "object" },
        },
      },
    };
  }
  return salida;
}

export function documentoOpenApi(origen: string): Esquema {
  const paths: Esquema = {};

  for (const ruta of RUTAS) {
    // OpenAPI usa `{id}` igual que el contrato: la plantilla no se traduce.
    const clave = ruta.ruta;
    const alcance = alcanceDe(ruta);
    const operacion: Esquema = {
      summary: ruta.resumen,
      operationId: `${ruta.metodo.toLowerCase()}${clave.replace(/[^A-Za-z0-9]+/g, "_")}`,
      security: [{ claveDeApi: [] }],
      // El alcance exigido, **leído de B.3** (`alcanceDe`). `null` es
      // `openapi.json`: cualquier clave válida.
      "x-alcance-exigido": alcance,
      parameters: [
        ...(clave.includes("{id}")
          ? [
              {
                name: "id",
                in: "path",
                required: true,
                schema: { type: "string", maxLength: 200 },
                description: "Identificador opaco. Fuera del universo de la clave: 404.",
              },
            ]
          : []),
        ...(ruta.query ?? []).map((d) => ({
          name: d.nombre,
          in: "query",
          required: Boolean(d.obligatorio),
          schema: esquemaDe(d),
          description: d.descripcion,
        })),
      ],
      responses: respuestasDe(ruta),
    };

    if (ruta.metodo === "POST") {
      operacion.requestBody = {
        required: (ruta.cuerpo ?? []).some((c) => c.obligatorio),
        content: {
          "application/json": {
            schema: {
              type: "object",
              additionalProperties: false,
              required: (ruta.cuerpo ?? []).filter((c) => c.obligatorio).map((c) => c.nombre),
              properties: Object.fromEntries(
                (ruta.cuerpo ?? []).map((c) => [c.nombre, { ...esquemaDe(c), description: c.descripcion }]),
              ),
            },
          },
        },
      };
    }

    const existentes = (paths[clave] as Esquema) ?? {};
    existentes[ruta.metodo.toLowerCase()] = operacion;
    paths[clave] = existentes;
  }

  return {
    openapi: "3.1.0",
    info: {
      title: "slg_website · API v1",
      version: "1.0.0",
      description:
        "API de lectura y escritura para agentes. Autenticación por clave con " +
        "`Authorization: Bearer`. La versión va en la ruta: un cambio incompatible " +
        "abriría `/api/v2` en vez de romper `/api/v1`.",
    },
    servers: [{ url: origen }],
    components: {
      securitySchemes: {
        claveDeApi: { type: "http", scheme: "bearer", description: "Clave de API (RF-97)." },
      },
      schemas: {
        Error: {
          type: "object",
          required: ["error"],
          properties: {
            error: {
              type: "object",
              required: ["code", "message", "request_id", "details"],
              properties: {
                code: { type: "string", enum: Object.values(CODIGOS) },
                message: { type: "string" },
                request_id: {
                  type: "string",
                  description: "El `audit_log.id` de esta llamada. Opaco: no filtra nada.",
                },
                details: {
                  type: "array",
                  description: "Solo con contenido en 422. Nunca lleva el valor recibido.",
                  items: {
                    type: "object",
                    required: ["field", "code"],
                    properties: { field: { type: "string" }, code: { type: "string" } },
                  },
                },
              },
            },
          },
        },
      },
    },
    security: [{ claveDeApi: [] }],
    paths,
  };
}
