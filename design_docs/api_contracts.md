---
type: api_contracts
title: api_contracts
project: slg_website
description: Contratos de las tres superficies de interfaz de slg_website — la API v1 para agentes (nueve rutas, seis alcances), la integración saliente con el CRM Softlanding Global (adaptador de dos modos de D-19) y los nueve webhooks salientes firmados — con forma exacta de petición y respuesta, códigos de estado, reglas transversales y el inventario de variables de entorno sin valores.
tags: [slg, slg_website, design-doc, api-contracts, rest, webhooks, hmac, crm, openapi, okf, software-app]
status: design
level: HIGH
timestamp: 2026-09-08
sources:
  - "START_PROJECT.md v1.1 — §1 Constraints, §4 (DoD #1, #4, #5, #6, #8, #10), §5.1, §5.2, §7, §9, Anexos A.4, A.5, B.1, B.3, B.5, B.6, B.7, B.8, D (D1, D7, D9, D10, D11), F.2, G"
  - "planning/requirements.md — RF-31…RF-57, RF-95…RF-119, RF-123, RF-129, RF-141…RF-148, RNF-20, RNF-25, RNF-26, RNF-32, RNF-33, RNF-35, RNF-40"
  - "planning/scope.md — Fronteras (a) (c) (d) (g)"
  - "planning/risks.md — R-04, R-07, R-09, R-11, R-12, R-14, R-23, R-24, R-26, R-28, R-37"
  - "docs/decision_log.md — D-15, D-16, D-19, D-21, D-22, D-23, D-24 · P-3, P-4 · incidencia S-01"
  - "design_docs/data_model.md — §2.4, §2.6, §3.6, §3.8, §3.10, §3.11, §5.8…§5.19, §6.5, §7"
  - "implementation/user_units.md — FU-08, FU-09, FU-11, DU-09, DU-12, DU-13, DU-16, DU-22, DU-23"
  - "profiles/software-app/profile.md — design_docs (api_contracts: HIGH), quality_gate"
---

# Contratos de interfaz — slg_website

Documento de diseño del paso 6 de `init-project`, nivel **HIGH** declarado por el perfil
`software-app`. Es el documento que leen **FU-09** (no puede empezar sin él: aquí se fija RNF-20),
**DU-09**, **DU-12**, **DU-13**, **DU-16**, **DU-22** y **DU-23**.

Su compañero obligatorio es `design_docs/data_model.md`: **ningún nombre de tabla ni de columna se
inventa aquí**. Cuando este documento nombra `lead_capture.crm_mode` o `deliverable.family_id`, es el
nombre exacto que ya existe allí. Cuando un contrato exigiría una columna que allí no está, no se
escribe: se declara como hueco (§11.2).

---

## 0. Cómo se lee este documento

### 0.1 Qué decide y qué no

| Decide aquí | Vive en otro documento |
|---|---|
| Rutas, métodos, alcance exigido, parámetros y **forma exacta** de petición y respuesta en JSON | Qué tablas y columnas existen → `data_model` |
| Códigos de estado, catálogo de errores y qué **no** se dice en un error | Qué pantalla muestra cada dato → `ui_wireframes` |
| Cabeceras: autenticación, límite de peticiones, firma de webhooks, correlación | Cómo se despliegan los servicios → `architecture` |
| **Caducidad de las URLs firmadas en minutos** (cierra RNF-20) | Tamaño máximo de subida (ya cerrado en `data_model` §2.6) |
| La secuencia exacta de llamadas al CRM en cada uno de los dos modos de D-19 | El esquema de `lead_capture` y `crm_delivery` que las persiste |
| El texto exacto de la nota que viaja al CRM | El copy de las páginas → FU-01 |
| Los nueve eventos salientes con su cuerpo completo y su firma | La tabla `webhook_delivery` que los reintenta |
| Los **nombres** de las variables de entorno y su propósito | Sus **valores**, que no viven en el repositorio (RNF-26, R-09) |

### 0.2 Notación de orígenes

`§N` secciones del brief · `§10-N` decisiones HITL · `A.N` / `B.N` / `C.N` / `F.N` anexos ·
`D1`…`D12` y `D2b` los gates del Anexo D · `DoD #N` las pruebas del §4 · `D-14`…`D-24` el
`decision_log` · `RF-` / `RNF-` los requisitos · `R-` los riesgos.

Marca **[PENDIENTE: …]** cuando el dato no existe todavía y este documento no puede inventarlo.
Marca **[DECISIÓN DE ESTE DOCUMENTO]** cuando el brief no lo fija y el contrato no puede existir sin
ello; todas esas decisiones están recogidas en §11.3 para su registro en `docs/decision_log.md`.

### 0.3 Reglas duras que gobiernan las tres superficies

1. **El repositorio es público** (§10-6). Aquí no hay un solo valor de credencial, ni una URL con
   token, ni un ejemplo con una clave real. Solo **nombres** de variables (§10) y marcadores del tipo
   `<clave>`.
2. **Los errores no cuentan nada de dentro** (RF-108, RNF-32): ni traza, ni nombre de tabla, ni
   consulta, ni versión de dependencia, ni qué alcance faltaba.
3. **El `organization_id` sale siempre del contexto autenticado, nunca del parámetro** (RF-71,
   `data_model` §6.2). Un identificador en la ruta se **verifica**, no se usa para filtrar
   (`data_model` §6.5).
4. **Toda llamada a `/api/v1` deja una fila en `audit_log`** (RF-107), incluidas las que terminan en
   401, 403 y 429.
5. **La versión va en la ruta** (RF-109). Un cambio incompatible abre `/api/v2`; `/api/v1` no se
   rompe.
6. **Nada se borra** (`data_model` §2.5). Por eso en `/api/v1` **no existe `DELETE`** y no existe
   `PATCH`: v1 solo lee, crea y publica.
7. **La API no expone leads ni pipeline** (RF-110, frontera (a) de `scope.md`). `GET /captures` es
   evidencia en solo lectura.

---

## 1. Las tres superficies, y por qué se documentan separadas

| Superficie | Dirección | Quién habla | Quién autentica a quién | Sección |
|---|---|---|---|---|
| **A · API v1 para agentes** | **entrante** | Un agente Hermes llama a `softlandingglobal.com/api/v1` | El agente presenta una `api_key` **nuestra** | §2…§4 |
| **B · Integración con el CRM** | **saliente** | La web llama a `crm.softlandingglobal.com/api/v1` | La web presenta una clave **del CRM** | §5…§7 |
| **C · Webhooks salientes** | **saliente** | La web llama al suscriptor (n8n u otro) | La web **firma** el cuerpo; el suscriptor verifica | §8 |

La distinción no es cosmética: son tres relaciones de confianza distintas, con tres credenciales
distintas, y confundirlas es exactamente el fallo que produce una fuga. La regla del método
(§7, «MCP vs API») se aplica aquí sin excepción: **MCP es para construir; API con clave en variable
de entorno es para operar en producción. Nunca se mezclan.**

---

# PARTE A — API v1 para agentes (B.5)

## 2. Reglas transversales de `/api/v1`

### 2.1 Base, versión y forma

| Aspecto | Valor |
|---|---|
| Base de producción | `https://softlandingglobal.com/api/v1` |
| Base de staging | `https://staging.softlandingglobal.com/api/v1` (además tras autenticación básica, RF-122) |
| Versionado | En la **ruta** (RF-109). `v1` no se rompe; un cambio incompatible abre `/api/v2` |
| Formato | `application/json; charset=utf-8` en petición y respuesta. Otro `Content-Type` en un `POST` → **415** |
| Fechas | RFC 3339 en **UTC**, con `Z` explícita: `2026-09-08T14:31:07Z`. Coherente con `timestamptz` (`data_model` §2.2) |
| Identificadores | Cadenas opacas (`text`, `data_model` §2.1). Un cliente **no debe** derivar significado de su forma |
| Métodos | Solo `GET` y `POST` en v1. **No hay `PATCH`, `PUT` ni `DELETE`** en rutas propias (§0.3-6). El único `PUT` del sistema va a la URL firmada de subida, que **no es una ruta nuestra** (§3.4) |
| Rutas | **Nueve** bajo `/api/v1` (§4). Cualquier otra → **404** |

**Nueve rutas, contadas del B.5:** `GET /captures` · `GET /organizations` ·
`GET /organizations/{id}/projects` · `POST /deliverables` · `POST /deliverables/{id}/publish` ·
`GET /projects/{id}/deliverables` · `POST /announcements` · `POST /events` · `GET /openapi.json`.

### 2.2 Autenticación por clave (RF-97)

```
Authorization: Bearer <clave>
```

La clave se compara por **hash** contra `api_key.key` (`data_model` §5.8), que es único y está
indexado precisamente porque esta comparación ocurre en **cada** petición.

Una petición se rechaza con **401** —con el mismo cuerpo y el mismo tiempo de respuesta en los cinco
casos— cuando:

| Caso | Comprobación |
|---|---|
| No hay cabecera `Authorization` | — |
| El esquema no es `Bearer` | — |
| La clave no corresponde a ninguna fila | `api_key.key` |
| La clave está deshabilitada o revocada | `api_key.enabled = false` **o** `api_key.revoked_at IS NOT NULL` |
| La clave ha caducado | `api_key.expires_at <= now()` |

> **Por qué el mismo cuerpo en los cinco casos.** Distinguir «clave inexistente» de «clave revocada»
> le dice a quien prueba credenciales cuáles existieron alguna vez. El 401 es uno solo y no explica
> nada (RNF-32).

Toda petición autenticada actualiza `api_key.last_request` y `api_key.request_count`. La cabecera
`WWW-Authenticate: Bearer` acompaña al 401.

### 2.3 Alcances por clave (RF-98, RF-147)

Los **seis** alcances son exactamente los de `data_model` §3.6, sin implicación entre ellos: una
clave con `events:write` **no** puede crear un entregable, y que pudiera sería un defecto de
seguridad, no una comodidad (RF-147).

| Alcance | Rutas que habilita |
|---|---|
| `captures:read` | `GET /captures` |
| `orgs:read` | `GET /organizations` · `GET /organizations/{id}/projects` |
| `deliverables:read` | `GET /projects/{id}/deliverables` |
| `deliverables:write` | `POST /deliverables` · `POST /deliverables/{id}/publish` |
| `announcements:write` | `POST /announcements` |
| `events:write` | `POST /events` |
| *(ninguno)* | `GET /openapi.json` — responde a **cualquier** clave válida (RF-106) |

Alcance insuficiente → **403** con `code: "insufficient_scope"` y **sin decir qué alcance faltaba**
(RF-98, gate D9). El mensaje es siempre el mismo, para cualquier ruta y cualquier alcance.

**Acotación por empresa.** Una clave puede llevar `api_key.organization_id`. Si lo lleva, su universo
es **esa** empresa: toda ruta que devuelva o escriba datos de cliente se resuelve con ese
`organization_id` tomado de la clave, nunca del parámetro (RF-71). Si `organization_id` es nulo, la
clave es de SLG y ve todas las empresas.

### 2.4 Límite de peticiones (RF-99)

El límite es **por clave** y vive en la propia fila: `api_key.rate_limit_max` peticiones por
`api_key.rate_limit_time_window` milisegundos (`data_model` §5.8). Ambas columnas son `NOT NULL` sin
defecto: **crear una clave obliga a decidir su límite** (mitigación de R-14).

Toda respuesta —incluidas 4xx— lleva:

```
RateLimit-Limit: 120
RateLimit-Remaining: 87
RateLimit-Reset: 43
```

`RateLimit-Reset` en **segundos** hasta que la ventana se renueva. Al excederlo:

```
HTTP/1.1 429 Too Many Requests
Retry-After: 43
RateLimit-Limit: 120
RateLimit-Remaining: 0
RateLimit-Reset: 43
```

```json
{
  "error": {
    "code": "rate_limited",
    "message": "Has superado el límite de peticiones de esta clave. Reintenta más tarde.",
    "request_id": "aud_01J9Z7Q3H8K2M4N6P8R0S2T4V6"
  }
}
```

El mensaje **no revela el umbral** (RF-34 lo exige para los formularios públicos y aquí se aplica la
misma disciplina); el umbral solo viaja en las cabeceras estándar, que son las que un cliente
correcto lee para autorregularse.

### 2.5 Catálogo de errores

**Un solo sobre para todos los errores**, sin excepción:

```json
{
  "error": {
    "code": "<identificador estable en snake_case>",
    "message": "<una frase en español, sin datos internos>",
    "request_id": "<identificador de correlación>",
    "details": []
  }
}
```

- `code` es **estable** y es lo que un agente debe leer. Cambiarlo es un cambio incompatible (→ `v2`).
- `message` es una frase en español, apta para un registro humano. **Nunca** contiene traza, nombre de
  tabla, consulta, versión de dependencia ni fragmento de la petición (RF-108, RNF-32).
- `request_id` es el **`audit_log.id`** de la fila que esa misma llamada acaba de escribir (RF-107).
  Es un identificador opaco: no filtra nada y permite que Ricardo encuentre la llamada en HQ sin que
  el agente tenga que describirla. **[DECISIÓN DE ESTE DOCUMENTO]**
- `details` solo aparece con contenido en **422**, y solo con `{ "field": "<ruta del campo>",
  "code": "<motivo>" }`. Nunca lleva el valor recibido: repetir el valor es repetir el dato personal.

| Código HTTP | `code` | Cuándo | Cuerpo `details` |
|---|---|---|---|
| **400** | `malformed_request` | JSON ilegible, parámetro de consulta no analizable, cursor corrupto | vacío |
| **401** | `unauthorized` | Los cinco casos de §2.2 | vacío |
| **403** | `insufficient_scope` | La clave es válida y el recurso es suyo, pero le falta el alcance (§2.3) | vacío |
| **404** | `not_found` | El recurso no existe **o no pertenece al universo de la clave** (§2.6) | vacío |
| **409** | `conflict` | Publicar un entregable ya publicado; subir sobre un objeto ya subido | vacío |
| **413** | `payload_too_large` | Cuerpo por encima del tope duro de 50 MB (`data_model` §2.6) | vacío |
| **415** | `unsupported_media_type` | `Content-Type` distinto de `application/json` en un `POST` | vacío |
| **422** | `validation_failed` | El cuerpo se analiza pero no valida contra el esquema (RNF-33) | lista de campos |
| **429** | `rate_limited` | §2.4 | vacío |
| **500** | `internal_error` | Fallo no previsto | vacío |
| **503** | `dependency_unavailable` | Una dependencia interna no responde. **Nunca** dice cuál | vacío |

> **404 y no 403 cuando el recurso es de otra empresa.** Un 403 confirmaría que esa empresa existe, y
> confirmar la existencia de un cliente ajeno ya es una fuga (`data_model` §6.5, RF-71, RNF-32). El
> 403 se reserva para el caso en que el recurso **sí** es del actor pero le falta alcance de clave.

### 2.6 Verificación del identificador en la ruta

Tres rutas llevan identificador: `/organizations/{id}/projects`, `/projects/{id}/deliverables` y
`/deliverables/{id}/publish`. En las tres:

1. El identificador **no entra jamás en un `WHERE`** (`data_model` §6.5).
2. Se resuelve el recurso con el `organization_id` del contexto (el de la clave, o todos si la clave
   es de SLG).
3. Si el recurso no aparece bajo ese contexto → **404**, con el mismo cuerpo que si no existiera.

### 2.7 Paginación, filtros y orden

**[DECISIÓN DE ESTE DOCUMENTO]** — el brief fija los filtros de `GET /captures` (`since`, `source`)
pero no la paginación. Se elige **cursor opaco**, no `offset`:

| Parámetro | Tipo | Defecto | Máximo |
|---|---|---|---|
| `limit` | entero | `50` | `200` (por encima → 422) |
| `cursor` | cadena opaca | — | del campo `next_cursor` de la respuesta anterior |

Todas las colecciones responden con el mismo envoltorio:

```json
{
  "data": [ { "...": "..." } ],
  "page": {
    "limit": 50,
    "next_cursor": "eyJjIjoiMjAyNi0wOS0wOFQxNDozMTowN1oiLCJpIjoiY2FwXzAxSjkifQ",
    "has_more": true
  }
}
```

`next_cursor` es `null` y `has_more` es `false` en la última página. El cursor codifica
`(created_at, id)` del último elemento; un cursor corrupto o de otra colección → **400**.

> **Por qué cursor y no `offset`.** Las tres colecciones se ordenan por `created_at DESC` y reciben
> inserciones constantes: con `offset`, una captura nueva desplaza la página y el agente lee dos veces
> el mismo elemento o se salta uno. Además, los índices que ya existen
> (`idx_lead_capture_created_at`, `idx_deliverable_project`, `idx_project_org_status`) sirven el
> recorrido por cursor sin tocar el resto de la tabla.

Orden por defecto en las cuatro colecciones: **`created_at DESC`**. No hay parámetro de ordenación en
v1: ninguna unidad lo pide (Regla 4 de `AGENTS.md`).

### 2.8 Auditoría de toda llamada (RF-107)

Cada petición a `/api/v1` —**incluidas las de 401, 403 y 429**— escribe una fila en `audit_log` con:

| Columna | Valor |
|---|---|
| `actor_type` | `api_key` (o `system` si la clave no se resolvió; nunca `user`) |
| `actor_id` | `api_key.id`, o la cadena `unknown` cuando el 401 impide resolverla |
| `actor_label` | `api_key.name` en el momento del hecho |
| `action` | `<recurso>.<acción>`, p. ej. `deliverable.create`, `capture.list` |
| `entity_type` | Recurso afectado, p. ej. `deliverable` |
| `entity_id` | Fila afectada; nulo en listados |
| `organization_id` | Empresa afectada, si la hay |
| `ip` | IP de origen (`inet`) |
| `metadata` | Contexto **saneado**: código de estado, alcance exigido, ruta. **Nunca** el cuerpo completo, nunca la clave, nunca el valor de un campo personal (RNF-26, RNF-32) |

La fila se escribe **antes** de responder, porque su `id` es el `request_id` que viaja en el cuerpo
del error y en la cabecera `X-Request-Id` de **toda** respuesta.

### 2.9 Cabeceras de respuesta comunes

| Cabecera | En qué respuestas | Contenido |
|---|---|---|
| `X-Request-Id` | Todas | El `audit_log.id` de la llamada |
| `RateLimit-Limit` / `RateLimit-Remaining` / `RateLimit-Reset` | Todas | §2.4 |
| `Retry-After` | 429, 503 | Segundos |
| `WWW-Authenticate` | 401 | `Bearer` |
| `Cache-Control` | Todas | `no-store` — ninguna respuesta de esta API es cacheable por un intermediario |
| `Location` | 201 | Ruta del recurso creado, cuando existe ruta de lectura |

---

## 3. Los nueve endpoints

### 3.1 `GET /api/v1/captures` — evidencia de capturas web

**Alcance:** `captures:read` · **RF-100, RF-110** · **DU-22**

Evidencia en **solo lectura** del embudo de captura y de su estado de entrega al CRM. No es gestión
de leads: el lead se trabaja en el CRM por su propio MCP (frontera (a) de `scope.md`).

**Parámetros de consulta**

| Parámetro | Tipo | Defecto | Significado |
|---|---|---|---|
| `since` | fecha-hora RFC 3339 | — | `created_at >= since` |
| `until` | fecha-hora RFC 3339 | — | `created_at < until` |
| `source` | `download` · `contact` · `doctrine-request` | todas | `lead_capture.source` (`data_model` §3.7) |
| `crm_sync_status` | `pending` · `delivered` · `failed` | todos | `lead_capture.crm_sync_status` (§3.8) |
| `doc_code` | `D-01` … `D-11` | todos | Filtra por el documento a través de `download.doc_code` |
| `limit` · `cursor` | §2.7 | | |

Un valor fuera de vocabulario → **422**. `since` posterior a `until` → **422**.

**Respuesta 200**

```json
{
  "data": [
    {
      "id": "cap_01J9Z7Q3H8K2M4N6P8R0S2T4V6",
      "created_at": "2026-09-08T14:31:07Z",
      "source": "download",
      "email": "director@empresa.com",
      "email_domain": "empresa.com",
      "name": "Nombre Apellido",
      "company": "Empresa S.A.",
      "job_title": "Director de Operaciones",
      "locale": "es",
      "page_path": "/ai/academy/phoenix-peex",
      "utm": {
        "source": "linkedin",
        "medium": "social",
        "campaign": "peex-septiembre",
        "term": null,
        "content": null
      },
      "consent_at": "2026-09-08T14:31:06Z",
      "privacy_version": "2026-09-01",
      "download": {
        "id": "dl_01J9Z7...",
        "doc_code": "D-01",
        "slug": "director-implementacion-ia",
        "title": "Lo que un Director debe saber sobre Implementación IA",
        "status": "published"
      },
      "delivery": {
        "signed_url_issued_at": "2026-09-08T14:31:07Z",
        "completed_at": "2026-09-08T14:33:41Z"
      },
      "crm": {
        "sync_status": "delivered",
        "mode": "contact_note",
        "contact_id": "3412",
        "company_id": null,
        "opportunity_id": null,
        "attempts": 1,
        "delivered_at": "2026-09-08T14:32:09Z",
        "last_error": null,
        "contact_url": "https://crm.softlandingglobal.com/contacts/3412"
      }
    }
  ],
  "page": { "limit": 50, "next_cursor": null, "has_more": false }
}
```

**Notas de contrato, una por una**

- `email_domain` es columna **generada** (`data_model` §5.9): se sirve, no se calcula aquí.
- `download` es `null` cuando `source` no es `download` (restricción
  `lead_capture_download_required`).
- `delivery` es `null` mientras no se haya emitido URL firmada — el caso de un documento
  `coming-soon`, que **captura el correo igual y no emite firma** (RF-40).
- `crm.company_id` y `crm.opportunity_id` son **siempre `null` en modo `contact_note`**: la clave del
  CRM no puede crear empresa ni oportunidad hoy (R-04), y la restricción
  `lead_capture_contact_note_shape` lo impide en la base. No es una carencia de esta respuesta: es el
  hecho.
- `crm.last_error` viaja **saneado** tal como está persistido (RNF-32): sin cabeceras, sin credencial,
  sin traza.
- `crm.contact_url` se construye con la plantilla de `CRM_CONTACT_URL_TEMPLATE` (§7.3); es `null` si
  no hay `contact_id` o la plantilla no está configurada.
- **Lo que esta respuesta no tiene y no tendrá:** etapa, propietario, valor, moneda, próximo paso,
  puntuación. RF-57 y la frontera (a) lo prohíben. Enumerarlo aquí es lo que permite que una revisión
  lo verifique.

### 3.2 `GET /api/v1/organizations` — empresas

**Alcance:** `orgs:read` · **RF-101** · **DU-22**

**Parámetros:** `status` (`active` · `archived`, defecto `active`), `type` (`client` · `slg`, defecto
`client`), `limit`, `cursor`.

**Respuesta 200**

```json
{
  "data": [
    {
      "id": "org_01J9Z7...",
      "name": "Cliente Demo",
      "slug": "cliente-demo",
      "type": "client",
      "status": "active",
      "primary_contact": { "id": "usr_01J9Z7...", "name": "Nombre Apellido" },
      "created_at": "2026-08-14T09:12:00Z",
      "updated_at": "2026-09-02T17:40:11Z"
    }
  ],
  "page": { "limit": 50, "next_cursor": null, "has_more": false }
}
```

`primary_contact` es `null` cuando `organization.primary_contact_user_id` es nulo. **No se expone el
correo del contacto**: un agente que lista empresas no necesita datos personales para hacerlo
(minimización, principio de Responsabilidad de C.6).

Si la clave lleva `organization_id`, la colección tiene **exactamente un elemento**: el suyo. No es un
filtro que el agente pueda ampliar.

> `organization.status = 'archived'` no se oculta: se puede pedir explícitamente. Lo que cambia con el
> archivado es el **acceso de sus miembros al portal** (`data_model` §4.3), no la visibilidad para una
> clave de SLG que audita.

### 3.3 `GET /api/v1/organizations/{id}/projects` — proyectos de una empresa

**Alcance:** `orgs:read` · **RF-101** · **DU-22**

`{id}` se **verifica** contra el contexto (§2.6). Empresa ajena o inexistente → **404**.

**Parámetros:** `status` (`active` · `completed` · `archived`; defecto: los tres), `service` (uno de
los once literales de `data_model` §3.13), `limit`, `cursor`.

**Respuesta 200**

```json
{
  "data": [
    {
      "id": "prj_01J9Z7...",
      "organization_id": "org_01J9Z7...",
      "name": "Implementación Phoenix PEEx — Cohorte 1",
      "service": "Phoenix PEEx",
      "status": "active",
      "owner": { "id": "usr_01J9Z7...", "name": "Ricardo Torres Oliva" },
      "starts_at": "2026-09-15",
      "ends_at": "2026-12-15",
      "created_at": "2026-08-14T09:20:00Z",
      "updated_at": "2026-09-01T11:02:00Z"
    }
  ],
  "page": { "limit": 50, "next_cursor": null, "has_more": false }
}
```

`service` viaja **literal e intraducible** (RF-14): `Phoenix PEEx`, `SLG_Readiness`,
`CoO as a Service`… Un agente que reciba `SLG Readiness` sin guion bajo está leyendo un dato
corrupto, y la base lo habría rechazado antes (`project_service_literal`).

`starts_at` y `ends_at` son fechas de calendario (`date`), sin hora y sin huso — se serializan
`YYYY-MM-DD`, no como instante.

### 3.4 `POST /api/v1/deliverables` — crear metadatos y obtener URL firmada de subida

**Alcance:** `deliverables:write` · **RF-102, RF-111** · **DU-23**

Es el primero de los **tres pasos** del ciclo de publicación: crear → subir → publicar. El endpoint
**no recibe el archivo**: devuelve una URL firmada contra la que el agente hace el `PUT`.

**Petición**

```json
{
  "project_id": "prj_01J9Z7...",
  "title": "Informe SLG_Readiness — v2",
  "type": "html",
  "source": "file",
  "visibility": "client",
  "file": {
    "filename": "readiness-cliente-demo.html",
    "mime_type": "text/html",
    "size_bytes": 2874113,
    "checksum_sha256": "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
  },
  "family_id": "dlv_01J9Z7..."
}
```

| Campo | Obligatorio | Reglas |
|---|---|---|
| `project_id` | sí | Debe existir bajo el contexto de la clave; si no → **404** |
| `title` | sí | 1…200 caracteres |
| `type` | sí | `pdf` · `html` · `md` · `link` · `material` (`data_model` §3.10) |
| `source` | sí | `file` · `link` |
| `visibility` | **no** | `client` · `internal`. **Defecto `internal`**, igual que la columna |
| `file` | si `source = "file"` | `filename`, `mime_type`, `size_bytes` obligatorios; `checksum_sha256` opcional |
| `external_url` | si `source = "link"` | `https://…`. Excluyente con `file` |
| `family_id` | no | Identificador de la familia de versiones. Ausente = versión 1 y familia nueva |

**Validaciones que devuelven 422** (todas ya expresadas como restricción en `data_model`, aquí como
contrato):

| Regla | Origen |
|---|---|
| `source = "file"` con `external_url`, o `source = "link"` con `file` | `deliverable_payload_coherent` |
| `source = "link"` con `type` distinto de `link` o `material` | `deliverable_link_not_file_type` |
| `mime_type` fuera de lo permitido para el `type` | `data_model` §2.6 |
| `size_bytes` por encima del tope del `type`: **50 MB** `pdf`/`material`, **5 MB** `html`, **1 MB** `md` | `data_model` §2.6 |
| `family_id` que no existe, o que pertenece a otro proyecto | `deliverable.family_id` |

**Respuesta 201**

```
HTTP/1.1 201 Created
Location: /api/v1/projects/prj_01J9Z7.../deliverables
```

```json
{
  "data": {
    "id": "dlv_01J9Z8...",
    "project_id": "prj_01J9Z7...",
    "organization_id": "org_01J9Z7...",
    "family_id": "dlv_01J9Z7...",
    "version": 2,
    "title": "Informe SLG_Readiness — v2",
    "type": "html",
    "source": "file",
    "visibility": "client",
    "mime_type": "text/html",
    "size_bytes": 2874113,
    "checksum_sha256": "9f86d081...",
    "published_at": null,
    "published_by": null,
    "created_at": "2026-09-08T15:02:11Z"
  },
  "upload": {
    "method": "PUT",
    "url": "https://<origen-de-archivos>/<objeto>?<firma>",
    "headers": {
      "Content-Type": "text/html",
      "Content-Length": "2874113"
    },
    "expires_at": "2026-09-08T15:32:11Z",
    "max_bytes": 5242880
  }
}
```

- El recurso nace **no publicado** (`published_at: null`) y, si no se indicó `visibility`,
  **`internal`**: un entregable a medias no puede quedar visible para el cliente.
- `version` se calcula del `family_id`: `MAX(version) + 1` dentro de la familia. Sin `family_id`,
  `version = 1` y `family_id = id` (`data_model` §5.14).
- El bloque `upload` **no aparece** cuando `source = "link"`.
- La URL firmada de subida **no es una ruta de esta API**: apunta al origen de archivos. Nunca se
  registra en `audit_log.metadata` ni en ningún log (contiene la firma) — solo se registra que se
  emitió (RNF-26).

**Paso 2 · `PUT <upload.url>`** — lo hace el agente contra el origen de archivos, con exactamente las
cabeceras devueltas. El servidor de archivos valida **tipo MIME y tamaño antes de aceptar el archivo**
(RNF-25, FU-09). Respuestas posibles: `200`/`204` correcto · `403` firma caducada o alterada · `413`
por encima del límite. Una subida que no llega nunca deja el entregable creado y **no publicado**, que
es el estado seguro (§3.5, caso «subida abortada a medias», criterio 8 de DU-23).

**Paso 3 · publicar** → §3.5.

### 3.5 `POST /api/v1/deliverables/{id}/publish` — publicar

**Alcance:** `deliverables:write` · **RF-102, RF-111** · **DU-23**

**Petición:** cuerpo vacío o `{}`.

**Respuesta 200**

```json
{
  "data": {
    "id": "dlv_01J9Z8...",
    "project_id": "prj_01J9Z7...",
    "organization_id": "org_01J9Z7...",
    "family_id": "dlv_01J9Z7...",
    "version": 2,
    "title": "Informe SLG_Readiness — v2",
    "type": "html",
    "source": "file",
    "visibility": "client",
    "published_at": "2026-09-08T15:10:44Z",
    "published_by": {
      "actor_type": "api_key",
      "actor_id": "key_01J9Z7...",
      "actor_label": "Hermes — publicador"
    },
    "created_at": "2026-09-08T15:02:11Z"
  }
}
```

`published_by` es el **actor polimórfico** de `data_model` §2.4 y lleva su `actor_type` explícito:
una publicación hecha por una clave es **distinguible de una hecha por una persona** (RF-111). Esa
distinción no es decorativa: es lo que HQ muestra y lo que el registro de auditoría conserva.

| Situación | Código |
|---|---|
| Ya estaba publicado | **409** `conflict` |
| `source = "file"` y el objeto no está subido | **409** `conflict` |
| No existe bajo el contexto de la clave | **404** |
| Alcance insuficiente | **403** |

Al publicar se emite el webhook **`deliverable.published`** (§8.4.7) y se escribe `audit_log` con
`action: "deliverable.publish"`.

> **Publicar es un acto explícito y separado de crear.** Es lo que permite que la subida falle sin
> que un cliente vea un archivo roto en su portal, y lo que hace que el criterio 8 de DU-23 («subida
> abortada a medias») tenga una respuesta y no un estado indefinido.

### 3.6 `GET /api/v1/projects/{id}/deliverables` — entregables de un proyecto

**Alcance:** `deliverables:read` · **RF-103** · **DU-22**

`{id}` se **verifica** contra el contexto (§2.6).

**Parámetros:** `type` (los cinco de §3.10 del `data_model`), `published` (`true` · `false`),
`only_latest` (booleano, defecto `false`: devuelve todas las versiones), `limit`, `cursor`.

**Respuesta 200:** colección de objetos con la misma forma que §3.5, más `file` cuando
`source = "file"`:

```json
{
  "data": [
    {
      "id": "dlv_01J9Z8...",
      "project_id": "prj_01J9Z7...",
      "organization_id": "org_01J9Z7...",
      "family_id": "dlv_01J9Z7...",
      "version": 2,
      "title": "Informe SLG_Readiness — v2",
      "type": "html",
      "source": "file",
      "visibility": "client",
      "file": {
        "mime_type": "text/html",
        "size_bytes": 2874113,
        "checksum_sha256": "9f86d081..."
      },
      "external_url": null,
      "published_at": "2026-09-08T15:10:44Z",
      "published_by": {
        "actor_type": "api_key",
        "actor_id": "key_01J9Z7...",
        "actor_label": "Hermes — publicador"
      },
      "created_at": "2026-09-08T15:02:11Z"
    }
  ],
  "page": { "limit": 50, "next_cursor": null, "has_more": false }
}
```

**La API nunca devuelve una URL de descarga del archivo.** Devuelve `checksum_sha256` y `size_bytes`.
Quien tiene que abrir el archivo es el portal, con su propia URL firmada y su visor aislado (RF-90,
RNF-21). Emitir aquí una URL firmada convertiría cada respuesta en una credencial de lectura con vida
propia, imposible de revocar y fácil de registrar por error en el log de un agente (R-11, R-14).

**Ruta de entrega del visor de HTML, desde origen separado (D-45).** El entregable de `type = 'html'`
**no** se entrega desde `softlandingglobal.com`: se sirve desde un **origen separado propio**
—un subdominio dedicado, `[PENDIENTE: nombre del subdominio del visor, se fija en M4]`—, y el portal
lo incrusta desde ahí. Reglas del contrato:

1. **La ruta de entrega vive en ese origen, no en `/api/v1`.** No es un endpoint de agentes: ninguna
   de las nueve rutas del §3 la expone, y ninguna clave de API la alcanza.
2. **Verifica pertenencia antes de responder** —empresa, proyecto, `visibility` y `published_at`, con
   las mismas reglas de la tabla de visibilidad de arriba— y **pone sus propias cabeceras**, entre
   ellas la **CSP estricta**. No se enlaza el objeto del bucket directamente: entonces las cabeceras
   las pondría el almacenamiento y no nosotros (`architecture` §11.3).
3. **El origen separado es la barrera principal**: parte de los entregables HTML los generan agentes
   Hermes, y con origen propio un script hostil dentro del entregable no puede leer cookies de sesión
   ni datos de la aplicación. El **`iframe sandbox` sin `allow-same-origin`** y la CSP estricta
   **se mantienen** como defensa en profundidad, no como alternativa.
4. **La URL firmada del entregable sigue caducando** con `SIGNED_URL_TTL_DELIVERABLE_MINUTES` (§11.9);
   el cambio de origen no crea ninguna URL permanente.

Se construye en **DU-19**. Cierra el conflicto **CF-4** de `design_docs/design_summary.md` §2.

**Regla de visibilidad. [DECISIÓN DE ESTE DOCUMENTO]**

| Tipo de clave | Qué ve |
|---|---|
| Clave **de SLG** (`api_key.organization_id IS NULL`) | Todos los entregables del proyecto, `client` e `internal`, publicados y no publicados |
| Clave **acotada a una empresa** (`organization_id` relleno) | **Solo** `visibility = 'client'` **y** `published_at IS NOT NULL` |

Razón: una clave acotada a una empresa es, por definición, una clave que puede acabar operada desde el
lado del cliente; darle lo `internal` reproduciría por API la fuga que RF-89 prohíbe por interfaz. Y
la restricción cuesta cero de mantener: el índice parcial `idx_deliverable_portal` ya sirve
exactamente esa consulta.

### 3.7 `POST /api/v1/announcements` — aviso a una empresa

**Alcance:** `announcements:write` · **RF-104, RF-111** · **DU-23**

**Petición**

```json
{
  "organization_id": "org_01J9Z7...",
  "title": "Sesión de cierre de la cohorte 1",
  "body_md": "La sesión de cierre queda fijada para el **22 de octubre**.\n\nMateriales en tu portal.",
  "publish": true
}
```

| Campo | Obligatorio | Reglas |
|---|---|---|
| `organization_id` | sí | Se **verifica** contra el contexto (§2.6). Ajena o inexistente → **404** |
| `title` | sí | 1…200 caracteres |
| `body_md` | sí | Markdown, 1…20 000 caracteres. Se guarda **tal cual** y se sanea **al renderizar** (`data_model` §5.15, RNF-31) |
| `publish` | **sí** | Booleano. **Sin defecto, a propósito** |

> **`publish` es obligatorio y no tiene defecto.** Es la misma disciplina que `api_key.expires_at` en
> el `data_model`: un defecto convierte una decisión con consecuencias —que un cliente vea o no vea un
> mensaje— en algo que se puede olvidar. Aquí el agente declara qué quiere, siempre.

**Respuesta 201**

```json
{
  "data": {
    "id": "ann_01J9Z9...",
    "organization_id": "org_01J9Z7...",
    "title": "Sesión de cierre de la cohorte 1",
    "body_md": "La sesión de cierre queda fijada para el **22 de octubre**.\n\nMateriales en tu portal.",
    "published_at": "2026-09-08T15:22:03Z",
    "author": {
      "actor_type": "api_key",
      "actor_id": "key_01J9Z7...",
      "actor_label": "Hermes — publicador"
    },
    "created_at": "2026-09-08T15:22:03Z"
  }
}
```

Con `publish: false`, `published_at` y `author` son `null` (restricción
`announcement_published_needs_author`) y el aviso **no aparece en el portal**.
Con `publish: true` se emite **`announcement.published`** (§8.4.8) y el aviso es visible en el portal
de esa empresa — que es literalmente lo que DoD #6 exige comprobar.

### 3.8 `POST /api/v1/events` — actividad del agente

**Alcance:** `events:write` · **RF-105, RF-146** · **DU-23**

**Petición**

```json
{
  "kind": "review.verdict",
  "organization_id": "org_01J9Z7...",
  "payload": {
    "unit": "DU-19",
    "verdict": "pass",
    "checks": [
      { "id": "aislamiento", "result": "pass" },
      { "id": "visor-sandbox", "result": "pass" }
    ],
    "notes": "Sin hallazgos."
  }
}
```

| Campo | Obligatorio | Reglas |
|---|---|---|
| `kind` | sí | Debe cumplir la **forma** `^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$` (`agent_event_kind_shape`). **No hay lista cerrada** (RF-146) |
| `organization_id` | no | Se verifica contra el contexto si viene |
| `payload` | sí | Objeto JSON. Se **valida contra el esquema resuelto por `kind`** en la escritura |

**Catálogo inicial de `kind` en v1** (`data_model` §3.11), derivado de las escrituras que la propia
API permite: `deliverable.created`, `deliverable.published`, `announcement.created`,
`event.recorded`. Un `kind` **fuera del catálogo se acepta** con un esquema permisivo y queda marcado
como tal en HQ: es exactamente lo que RF-146 pide para que un agente validador registre un veredicto
estructurado **sin migrar el esquema**.

Un `kind` que no cumple la forma → **422** con `details: [{ "field": "kind", "code": "shape" }]`.

**Respuesta 201**

```json
{
  "data": {
    "id": "evt_01J9ZA...",
    "kind": "review.verdict",
    "organization_id": "org_01J9Z7...",
    "api_key": { "id": "key_01J9Z7...", "name": "Hermes — validador" },
    "payload": { "...": "..." },
    "schema_known": false,
    "created_at": "2026-09-08T15:31:00Z"
  }
}
```

`schema_known: false` le dice al agente que su `kind` se aceptó con esquema permisivo. Es información
honesta y sin coste: sin ella, un agente que se equivoca escribiendo `kind` no se entera nunca.

El evento aparece en el tablero de HQ («actividad reciente de agentes», RF-76, DoD #4) a través de
`idx_agent_event_recent`.

### 3.9 `GET /api/v1/openapi.json` — especificación

**Alcance:** ninguno; **cualquier clave válida** (RF-106) · **DU-23**

- Sin clave → **401**. Con clave válida, sea cual sea su alcance → **200**.
- `Content-Type: application/json`, `Cache-Control: no-store`.
- Documento **OpenAPI 3.1** que describe **las nueve rutas** con sus parámetros, esquemas de petición
  y respuesta, alcance exigido y **todos** los códigos de estado de §2.5.
- **[DECISIÓN DE ESTE DOCUMENTO]** El documento se **genera a partir de los mismos esquemas que
  validan las peticiones** (RNF-33), no se escribe a mano. Una especificación mantenida aparte se
  desincroniza en la segunda semana, y una especificación que miente es peor que no tenerla. La
  prueba de DU-23 comprueba que las nueve rutas y sus alcances aparecen.

> **No es público.** `/api/v1/openapi.json` describe la superficie de escritura de la aplicación; RF-106
> exige clave. No hay página de documentación pública, ni interfaz interactiva servida desde el
> dominio (sería un script de terceros en la capa pública, contra RF-35 y el gate D1).

---

## 4. Matriz de referencia y las tres pruebas del DoD #6

### 4.1 Ruta × alcance × códigos

| Ruta | Alcance | 200/201 | 400 | 401 | 403 | 404 | 409 | 422 | 429 |
|---|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| `GET /captures` | `captures:read` | ✔ | ✔ | ✔ | ✔ | — | — | ✔ | ✔ |
| `GET /organizations` | `orgs:read` | ✔ | ✔ | ✔ | ✔ | — | — | ✔ | ✔ |
| `GET /organizations/{id}/projects` | `orgs:read` | ✔ | ✔ | ✔ | ✔ | ✔ | — | ✔ | ✔ |
| `POST /deliverables` | `deliverables:write` | ✔ | ✔ | ✔ | ✔ | ✔ | — | ✔ | ✔ |
| `POST /deliverables/{id}/publish` | `deliverables:write` | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | — | ✔ |
| `GET /projects/{id}/deliverables` | `deliverables:read` | ✔ | ✔ | ✔ | ✔ | ✔ | — | ✔ | ✔ |
| `POST /announcements` | `announcements:write` | ✔ | ✔ | ✔ | ✔ | ✔ | — | ✔ | ✔ |
| `POST /events` | `events:write` | ✔ | ✔ | ✔ | ✔ | ✔ | — | ✔ | ✔ |
| `GET /openapi.json` | *cualquiera* | ✔ | — | ✔ | — | — | — | — | ✔ |

`413` y `415` aplican a las cuatro rutas `POST`. `500` y `503` a todas.

### 4.2 Las tres pruebas que el DoD #6 exige demostrar

| # | Prueba | Esperado | Requisito |
|---|---|---|---|
| 1 | Petición **sin cabecera `Authorization`** a cada una de las nueve rutas | **401** `unauthorized`, cuerpo idéntico en las nueve, `WWW-Authenticate: Bearer` | RF-97 |
| 2 | Clave con **solo `captures:read`** contra `POST /announcements`, `POST /deliverables`, `POST /events` y `GET /projects/{id}/deliverables` | **403** `insufficient_scope`, **sin nombrar el alcance que faltaba**, mensaje idéntico en las cuatro | RF-98, RF-147 |
| 3 | Superar `rate_limit_max` de la clave dentro de su ventana | **429** `rate_limited` con `Retry-After` y las tres cabeceras `RateLimit-*` | RF-99 |

Las tres dejan su fila en `audit_log` (RF-107): un 401, un 403 y un 429 son exactamente los hechos que
más interesa poder consultar después (R-14). La prueba comprueba también **eso**, no solo el código.

Prueba complementaria del gate D9, ya listada en `data_model` §6.7: una clave acotada a la empresa A
que pide un proyecto de la empresa B recibe **404**, no 403.

---

# PARTE B — Integración saliente con el CRM Softlanding Global (B.6 + D-19)

## 5. El adaptador de dos modos

### 5.1 La variable que selecciona el modo

| Variable | Valores admitidos | Defecto | Efecto |
|---|---|---|---|
| `CRM_MODE` | `contact_note` · `lead_admission` | `contact_note` | Cómo se entregará la **próxima** captura |

Son exactamente los dos valores del vocabulario `lead_capture.crm_mode` (`data_model` §3.8). Un valor
distinto **impide arrancar la aplicación**: un modo desconocido que se degradara en silencio a
`contact_note` es la forma más rápida de creer que se está entregando algo que no se entrega.

**La variable dice cómo se entregará la próxima; la fila dice cómo se entregó esta.** Esa distinción
—desarrollada en `data_model` §7.2— es la que impide que, el día que se active `lead_admission`, todo
el histórico parezca haberse entregado en el modo nuevo.

### 5.2 Qué se guarda de cada intento

Cada episodio HTTP contra el CRM deja una fila en `crm_delivery` con `request_summary` **saneado**:
sin cabecera `Authorization`, sin clave, sin token (RNF-26, RNF-32), y con `response_excerpt` acotado.

| Modo | Filas por intento | `endpoint` de cada fila |
|---|---|---|
| `contact_note` | **dos** | La de resolución del contacto (`GET /contacts` si ya existía, `POST /contacts` si hubo que crearlo) + `POST /notes` |
| `lead_admission` | **una** | `POST /api/v1/leads` |

> **Por qué la búsqueda no produce siempre su propia fila.** `crm_delivery_attempt_unique` es
> `UNIQUE (lead_capture_id, attempt, endpoint)`, y `data_model` §7.1 fija «dos filas por intento» en
> `contact_note`. Si el contacto **no** existe, el intento hace tres llamadas (`GET`, `POST /contacts`,
> `POST /notes`) pero registra dos filas: el resultado del `GET` se resume dentro del
> `request_summary` de la fila `POST /contacts`. Si el contacto **sí** existe, no hay `POST /contacts`
> y la primera fila es el `GET /contacts`. En los dos caminos: exactamente dos filas, `endpoint`
> distintos, restricción satisfecha.

### 5.3 Contrato de degradación — el que sostiene DoD #1

> **Si el CRM no responde, el visitante nunca espera y el PDF se entrega igual.**

En orden, y sin excepción:

1. La web valida el envío (correo corporativo RF-31, honeypot RF-33, límite RF-34) y **escribe
   `lead_capture` con `crm_sync_status = 'pending'` antes de responder** (RF-37).
2. **Responde al visitante**: `/gracias` con su enlace de descarga firmado (RF-42), o el estado
   «disponible próximamente» si el documento no tiene archivo (RF-40).
3. **Solo después**, y **fuera de la petición del visitante**, la cola entrega al CRM.

Consecuencias que son parte del contrato:

- **Un fallo del CRM no puede producir un error visible para el visitante.** Ni un aviso, ni un
  reintento en pantalla, ni un tiempo de espera. La página no sabe que el CRM existe.
- **Un fallo del correo de aviso no revierte nada** (RF-119, criterio 11 de DU-09): la captura sigue
  entregada y el documento, entregado.
- **La cola vive en PostgreSQL, no en memoria del contenedor** (R-23): `lead_capture` +
  `crm_delivery`. Sobrevive a un despliegue y a un reinicio, y el barrido puede lanzarse desde fuera
  del proceso web.
- El tiempo máximo que la web espera al CRM en cada episodio es `CRM_TIMEOUT_MS`; agotado, el intento
  se registra con `response_code` nulo y `error` clasificado como agotamiento de tiempo.

---

## 6. Modo `contact_note` — lo único que la clave permite hoy

**Estado: activo.** Es el modo con el que se entrega en v1 (D-19, R-04).

**Base:** `CRM_BASE_URL` (el brief la fija en `https://crm.softlandingglobal.com/api/v1`).
**Clave:** `CRM_API_KEY_CAPTURE`, con los alcances mínimos `contacts:write`, `activities:write`,
`crm:read` (RF-56, F.2-5).
**Cabecera:** `Authorization: Bearer <clave>` — nunca un login de persona como cuenta de servicio
(RNF-40).

### 6.1 Paso 1 · Buscar el contacto por correo

```
GET {CRM_BASE_URL}/contacts?q=director@empresa.com
Authorization: Bearer <CRM_API_KEY_CAPTURE>
Accept: application/json
```

| Respuesta | Qué hace la web |
|---|---|
| Coincidencia exacta de correo | Toma su identificador → paso 3 (no crea nada) |
| Sin coincidencia | Paso 2 |
| `4xx` distinto de 404, `5xx`, o sin respuesta | El intento falla completo → cola (§6.4) |

La coincidencia se decide **por igualdad de correo en minúsculas**, no por el orden del resultado: un
buscador que devuelve parecidos no puede decidir a qué persona se le atribuye una descarga.

### 6.2 Paso 2 · Crear el contacto si no existe

```
POST {CRM_BASE_URL}/contacts
Authorization: Bearer <CRM_API_KEY_CAPTURE>
Content-Type: application/json
```

```json
{
  "name": "Nombre Apellido",
  "email": "director@empresa.com",
  "job_title": "Director de Operaciones",
  "company": "Empresa S.A.",
  "source": "web"
}
```

Los cinco campos son los que el brief enumera literalmente en B.6-2: «nombre, email, cargo, empresa
como texto, `source: web`». `company` viaja **como texto libre**, no como referencia: en modo
`contact_note` la clave **no puede crear empresas** (R-04).

> **[PENDIENTE: nombres exactos de los campos del CRM.]** Los cinco de arriba son los del brief, no
> necesariamente los identificadores del cuerpo que el CRM espera. El adaptador mantiene un **mapa de
> campos en un solo lugar** (`nuestro nombre → nombre del CRM`), que se confirma contra
> `~/Dev/crm_slg/docs/integrations.md` y `~/Dev/crm_slg/design/api_contracts.md` —o contra el MCP del
> CRM (Anexo G)— **antes de empezar DU-09**. Cierra: Claude con Ricardo, en M2. Este documento fija la
> **semántica** y el **orden de llamadas**, que es lo que no cambia; el nombre de un campo es un dato
> del otro repositorio y no se inventa aquí.

De la respuesta se guarda el identificador en `lead_capture.crm_contact_id`.
`crm_company_id` y `crm_opportunity_id` **quedan nulos**: la restricción
`lead_capture_contact_note_shape` lo exige, y si algún día aparecen rellenos en este modo no es un
dato, es un error que la base rechaza en la inserción.

### 6.3 Paso 3 · Añadir la nota con el contexto

```
POST {CRM_BASE_URL}/notes
Authorization: Bearer <CRM_API_KEY_CAPTURE>
Content-Type: application/json
```

```json
{
  "contact_id": "3412",
  "body": "Descargó D-01 «Lo que un Director debe saber sobre Implementación IA» desde /ai/academy/phoenix-peex (ES) · UTM: source=linkedin, medium=social, campaign=peex-septiembre"
}
```

**Formato exacto de la nota. [DECISIÓN DE ESTE DOCUMENTO]** — el brief da el ejemplo en B.6-2; aquí se
convierte en plantilla verificable, una por `lead_capture.source`:

| `source` | Plantilla |
|---|---|
| `download` | `Descargó {doc_code} «{título}» desde {page_path} ({LOCALE}){· UTM}` |
| `contact` | `Envió el formulario de contacto desde {page_path} ({LOCALE}){· UTM}{· Mensaje: …}` |
| `doctrine-request` | `Solicitó el documento completo de Doctrina desde {page_path} ({LOCALE}){· UTM}` |

Reglas de composición, sin excepción:

1. **`{doc_code}`** es `download.doc_code` (`D-01` … `D-11`), no el `slug` ni el `id`. Es el código que
   Ricardo reconoce (A.4, D-17).
2. **`{título}`** es el título del documento **en el idioma de la captura**: `download.title_es` si
   `locale = 'es'`, `download.title_en` si `locale = 'en'`. Entre comillas angulares.
3. **`{page_path}`** es la ruta exacta de origen (`lead_capture.page_path`), sin dominio y sin
   parámetros de consulta: `/ai/academy/phoenix-peex`.
4. **`{LOCALE}`** es `ES` o `EN` en mayúsculas, entre paréntesis.
5. **El bloque UTM aparece solo si hay al menos un valor.** Se compone con los presentes, en el orden
   fijo `source, medium, campaign, term, content`, como `clave=valor` separados por `, `, precedido de
   ` · UTM: `. **Nunca se escribe `null`, ni `-`, ni un bloque vacío.** Una nota que dice `UTM: null`
   es ruido que un comercial aprende a ignorar, y el día que importe ya no la leerá.
6. **Sin correo ni datos personales en el cuerpo de la nota**: el contacto ya los tiene en su ficha.
   Repetirlos multiplica las copias del dato sin añadir información (minimización).
7. La nota es **una sola línea**, sin saltos: es como se lee en el listado de actividad del CRM.

Ejemplo sin UTM y en inglés:

```
Descargó D-06 «<título EN del documento>» desde /en/ai/enterprise/readiness (EN)
```

### 6.4 Éxito, y qué se persiste

Con las dos escrituras aceptadas, **en una sola transacción**:

| Columna | Valor |
|---|---|
| `crm_sync_status` | `'delivered'` |
| `crm_mode` | `'contact_note'` |
| `crm_contact_id` | El del CRM |
| `crm_delivered_at` | `now()` |
| `crm_company_id` · `crm_opportunity_id` · `crm_idempotency_key` | **`NULL`** |

La restricción `lead_capture_delivered_coherent` exige que `crm_contact_id`, `crm_mode` y
`crm_delivered_at` estén los tres rellenos: «entregada» sin identificador de contacto es una mentira
que se descubre meses después.

Al marcar `delivered` se emite el webhook **`lead.delivered_to_crm`** (§8.4.2) y se envía el correo de
aviso a `support@softlandingglobal.com` (RF-53, `email_delivery.kind = 'capture_notice'`) con el
enlace profundo a la ficha (§7.3).

---

## 7. Modo `lead_admission` — **este endpoint todavía NO EXISTE**

> ## ⚠ Estado: **inactivo. El endpoint no existe en el CRM.**
>
> `POST /api/v1/leads` y el alcance `leads:write` son un **spec-delta pendiente en otro repositorio**
> (`~/Dev/crm_slg`), **fuera del alcance de este proyecto** (B.6, «Dependencia»; D-19).
> Este proyecto **no lo construye, no lo planifica y no depende de él**: construye el adaptador que lo
> usará el día que exista. Mientras tanto, `CRM_MODE` vale `contact_note` y todo funciona (RF-48).
>
> Lo que sigue es el contrato **que la web enviará**, escrito ahora para que el día del cambio sea
> **una variable de entorno y ninguna línea de código** (RF-46, criterio 2 de DU-09). Si el CRM acaba
> exponiendo una forma distinta, el que se ajusta es el adaptador, no el resto del sistema.

### 7.1 La llamada prevista

```
POST {CRM_BASE_URL}/leads
Authorization: Bearer <CRM_API_KEY_CAPTURE>   ← con alcance leads:write, que hoy no existe
Content-Type: application/json
Idempotency-Key: <lead_capture.crm_idempotency_key>
```

```json
{
  "email": "director@empresa.com",
  "name": "Nombre Apellido",
  "job_title": "Director de Operaciones",
  "company_name": "Empresa S.A.",
  "company_domain": "empresa.com",
  "source": "web",
  "document_code": "D-01",
  "page_path": "/ai/academy/phoenix-peex",
  "locale": "es",
  "utm": {
    "source": "linkedin",
    "medium": "social",
    "campaign": "peex-septiembre",
    "term": null,
    "content": null
  },
  "note": "Descargó D-01 «Lo que un Director debe saber sobre Implementación IA» desde /ai/academy/phoenix-peex (ES) · UTM: source=linkedin, medium=social, campaign=peex-septiembre"
}
```

**Qué se espera que haga el endpoint** (B.6, «Dependencia», literal):

1. Es **idempotente por correo + documento** (RF-48). La clave de idempotencia se calcula sobre ese
   par y se persiste en `lead_capture.crm_idempotency_key` **antes** de la llamada, para que un
   reintento tras un fallo de red no duplique nada.
2. **Crea o vincula la empresa por el dominio del correo** (`company_domain`).
3. **Crea el contacto.**
4. **Crea la oportunidad en la primera etapa** del pipeline, con fuente `web`.
5. **Añade la nota** de contexto — el mismo texto de §6.3, que por eso viaja en el campo `note`.

**Respuesta esperada:** identificadores de las tres entidades, que se persisten en
`crm_contact_id`, `crm_company_id` y `crm_opportunity_id`, con `crm_mode = 'lead_admission'`.

**[PENDIENTE]** Forma exacta de la petición y de la respuesta, nombres de campo y códigos de estado:
los fija el spec-delta del CRM. Cierra: el `/iterate` del repositorio del CRM, cuando Ricardo lo
decida (B.6 lo deja abierto, D-19 lo desacopla de M2).

### 7.2 La elevación de lo ya entregado

El día que el endpoint exista, las capturas entregadas en `contact_note` **no se migran ni se
reescriben**: se elevan, con la consulta y los cuatro pasos de `data_model` §7.3, apoyados en el
índice `idx_lead_capture_pending_upgrade`. `crm_contact_id` no se toca —es el mismo contacto— y
`crm_delivery` conserva los **dos** episodios, de forma que «¿cuándo se elevó esta captura?» tiene
respuesta.

**Contra la deuda silenciosa (R-24).** Mientras `lead_admission` no exista:

- HQ muestra **permanentemente** el recuento de capturas que hoy exigen crear la oportunidad **a mano**
  en el CRM (`COUNT(*)` sobre ese índice).
- El **modo activo se muestra en el tablero**, derivado del `crm_mode` de la última captura entregada
  —no de la variable de entorno, que la interfaz no puede leer— y en el README operativo (criterio 10
  de DU-09).

---

## 8. Cola, reintentos, lectura del tablero y enlace profundo

### 8.1 La cola y su espera creciente (RF-50)

**Cinco intentos y cinco esperas**, en correspondencia uno a uno:

| `crm_delivery.attempt` | Se ejecuta tras esperar | Acumulado desde la captura |
|:--:|---|---|
| 1 | **1 min** | 1 min |
| 2 | **10 min** | 11 min |
| 3 | **1 h** | 1 h 11 min |
| 4 | **6 h** | 7 h 11 min |
| 5 | **24 h** | 31 h 11 min |
| — | tras fallar el 5.º → `crm_sync_status = 'failed'` | |

`crm_next_attempt_at` se fija al inscribir la captura (`now() + 1 min`) y se recalcula tras cada
fallo. El barrido usa `idx_lead_capture_queue`:
`WHERE crm_sync_status = 'pending' AND crm_next_attempt_at <= now() ORDER BY crm_next_attempt_at`.

> **[DECISIÓN DE ESTE DOCUMENTO] · Por qué las cinco esperas preceden a los cinco intentos.**
> B.6-3 y RF-50 enumeran **cinco** esperas (1 min, 10 min, 1 h, 6 h, 24 h) y dicen «tras el quinto
> fallo, `failed`». El `data_model` acota los intentos a **cinco**
> (`lead_capture_attempts_bounded`, `crm_delivery_attempt_bounded`). Las dos cosas solo encajan si
> cada espera precede a un intento. La alternativa —primer intento inmediato y cuatro esperas—
> obligaría a **descartar la espera de 24 h**, es decir, a contradecir el texto del brief para
> conservar un minuto de latencia que **no afecta al visitante** (§5.3: el PDF ya se entregó). Se
> conserva el brief. Coste asumido: el contacto aparece en el CRM y el aviso llega a `support@`
> alrededor de un minuto después de la captura, no al instante.

Tras el quinto fallo, en la misma transacción: `crm_sync_status = 'failed'`, **alerta en HQ**
(`idx_lead_capture_failed`) y **correo a `support@softlandingglobal.com`** con
`email_delivery.kind = 'capture_failed_alert'` (`data_model` §3.12).

### 8.2 Reintento manual desde HQ (RF-52) — y un conflicto que hay que resolver antes

**Contrato de la acción:** en HQ, sobre una captura `pending` o `failed`, `slg_admin` o
`slg_operator` fuerzan el reintento. El resultado:

- vuelve a `crm_sync_status = 'pending'` con `crm_next_attempt_at = now()`;
- **el reintento queda auditado** (`audit_log`, `action: "capture.retry"`, actor la persona);
- si tiene éxito, la captura pasa a `delivered` con el modo con el que se entregó.

> ### Conflicto declarado — exige spec-delta del `data_model` antes de DU-16
>
> Sobre una captura ya `failed` (cinco intentos consumidos), las tres reglas siguientes **no pueden
> cumplirse a la vez**:
>
> 1. RF-52 exige que el reintento manual exista;
> 2. `crm_delivery_attempt_bounded` acota `attempt` a `1…5`;
> 3. `crm_delivery_attempt_unique` es `UNIQUE (lead_capture_id, attempt, endpoint)`.
>
> Un sexto episodio no cabe (2) y reutilizar los números 1…5 colisiona (3).
>
> **Resolución mínima propuesta**, a decidir y registrar antes de DU-16: añadir a `crm_delivery` una
> columna `cycle integer NOT NULL DEFAULT 1`, llevar la restricción a
> `UNIQUE (lead_capture_id, cycle, attempt, endpoint)`, y que el reintento manual abra un ciclo nuevo
> (`cycle + 1`) poniendo `crm_attempts = 0`. Conserva íntegra la traza del ciclo anterior —que es el
> punto de `crm_delivery`— y mantiene el tope de cinco intentos **por ciclo**.
>
> **Este documento no usa esa columna en ninguna forma normativa**: divergir del `data_model` sería un
> defecto. La declara como hueco (§11.2-1) para que se cierre donde corresponde.

### 8.3 Lectura para el tablero de HQ (RF-55, RF-74)

**Clave:** `CRM_API_KEY_READ`, alcance **`crm:read`** y nada más (RF-56, RNF-40). Es una clave
distinta de la de captura: una clave por integración.

| Llamada | Uso en HQ |
|---|---|
| `GET {CRM_BASE_URL}/dashboard/metrics` | Métricas del pipeline |
| `GET {CRM_BASE_URL}/reports/funnel` | Embudo |
| `GET {CRM_BASE_URL}/reports/sources?currency=USD` | Fuentes, en dólares |

**Caché de 5 minutos** (300 s), obligatoria (RF-55). Contrato de la caché:

1. Clave de caché = ruta + parámetros. Una entrada por llamada, no una global.
2. HQ muestra **siempre** la **marca de tiempo** del dato y la etiqueta de que es **dato del CRM**
   (RF-74). Un número sin fecha en un tablero se lee como si fuera de ahora.
3. **Si el CRM no responde, se sirve la última copia con su marca de tiempo y un aviso visible.**
   Nunca se muestra un cero, nunca un hueco, nunca un error de página: un cero es un dato falso, y en
   un tablero de dirección un dato falso es peor que ningún dato.
4. Si no hay copia previa, la sección muestra su **estado vacío redactado** y el botón «Abrir CRM»
   (RF-75), que sigue funcionando porque es un enlace.

**[PENDIENTE: forma exacta de las tres respuestas del CRM.]** Se confirma contra el MCP de solo
lectura del CRM (Anexo G) antes de DU-13. El adaptador las trata como **opacas** y las normaliza a
una vista interna declarada; ninguna pantalla de HQ lee directamente la forma del CRM, para que un
cambio allí sea un cambio en el adaptador y no en el tablero.

### 8.4 Enlace profundo a la ficha de contacto (RF-54)

```
CRM_CONTACT_URL_TEMPLATE = https://crm.softlandingglobal.com/contacts/{contact_id}
```

- Es **plantilla configurable por variable de entorno, jamás codificada** (RF-54): la ruta real del
  frontend del CRM está **[PENDIENTE: confirmar]** (B.6, F.2-5).
- Único marcador admitido: `{contact_id}`. Cualquier otro se deja tal cual y se registra como aviso de
  configuración al arrancar.
- Si la variable no está configurada o no hay `crm_contact_id`, el enlace **no se pinta**; no se
  inventa una ruta ni se enlaza a la portada del CRM.
- El enlace aparece en tres sitios: la lista de capturas de HQ (RF-73), el correo de aviso a
  `support@` (RF-53) y el campo `crm.contact_url` de `GET /api/v1/captures` (§3.1).

---

# PARTE C — Webhooks salientes (B.7)

## 9. Contrato de emisión

### 9.1 Envoltorio común

Todo envío es un `POST` con `Content-Type: application/json; charset=utf-8` y este cuerpo:

```json
{
  "id": "whd_01J9ZB...",
  "event": "post.published",
  "occurred_at": "2026-09-08T16:02:00Z",
  "api_version": "v1",
  "data": { "...": "..." }
}
```

| Campo | Significado |
|---|---|
| `id` | `webhook_delivery.id`. **Estable entre reintentos**: es la clave de deduplicación del suscriptor |
| `event` | Uno de los **nueve** de §10 (`webhook_event_valid`) |
| `occurred_at` | Instante del hecho, no del envío. Un reintento a las 6 h conserva el instante original |
| `api_version` | `v1`. Cambia solo si cambia la forma del cuerpo |
| `data` | Cuerpo del evento, §10 |

### 9.2 Cabeceras

```
POST <target_url>
Content-Type: application/json; charset=utf-8
User-Agent: slg-website-webhooks/1
X-SLG-Event: post.published
X-SLG-Delivery: whd_01J9ZB...
X-SLG-Timestamp: 1789056120
X-SLG-Signature: sha256=<hex de 64 caracteres>
```

### 9.3 Firma HMAC-SHA256 (RF-113)

**[DECISIÓN DE ESTE DOCUMENTO]** — el brief exige «firma HMAC-SHA256 en cabecera» y no fija el nombre
ni la cadena firmada. Se fijan aquí, porque un suscriptor no puede verificar lo que no está escrito.

| Elemento | Valor |
|---|---|
| **Cabecera** | `X-SLG-Signature` |
| **Formato del valor** | `sha256=<hex en minúsculas, 64 caracteres>` |
| **Algoritmo** | HMAC-SHA256 |
| **Secreto** | **Uno por suscriptor**, en `WEBHOOK_<NOMBRE>_SECRET` (§12). Nunca en la base de datos: `webhook_delivery` **no tiene columna de firma ni de secreto** y no la tendrá (`data_model` §5.18, R-09) |
| **Cadena firmada** | `<X-SLG-Timestamp>` + `.` + **cuerpo crudo, byte a byte** |

> **Se firma el timestamp junto al cuerpo, no el cuerpo solo.** Firmar solo el cuerpo permite reenviar
> una captura antigua indefinidamente: la firma seguiría siendo válida para siempre. Incluir el
> instante en la cadena firmada hace que el suscriptor pueda rechazar lo viejo sin dejar de verificar
> lo auténtico.
>
> **Se firma el cuerpo crudo, no el JSON reserializado.** Dos serializaciones del mismo objeto
> difieren en espacios y en orden de claves, y esa diferencia invalida la firma. El suscriptor **debe**
> calcular el HMAC sobre los bytes recibidos, antes de analizar el JSON.

### 9.4 Cómo se verifica, del lado del suscriptor

1. Leer el **cuerpo crudo** y las cabeceras `X-SLG-Timestamp` y `X-SLG-Signature`.
2. Rechazar si `|ahora − X-SLG-Timestamp| > 300 s` (**cinco minutos** de tolerancia). Protege del
   reenvío.
3. Componer `<timestamp>.<cuerpo crudo>` y calcular `HMAC-SHA256(secreto_del_suscriptor, cadena)`.
4. Comparar en **tiempo constante** con el valor tras `sha256=`. Una comparación de cadenas normal
   filtra información por el tiempo que tarda en fallar.
5. **Deduplicar por `X-SLG-Delivery`**: un reintento repite el mismo identificador. Un suscriptor que
   no deduplica publicará dos veces el mismo artículo el día que una respuesta llegue tarde.
6. Responder **`2xx` en menos de 10 s**. Cualquier otra cosa —o el silencio— cuenta como fallo.

### 9.5 Reintentos y `webhook_delivery` (RF-114)

**La misma escalera que la cola del CRM**, deliberadamente: `data_model` §5.18 dice «el barrido de la
cola, idéntico en forma al de `lead_capture`». Un solo patrón mental, un solo vocabulario de estado
(`pending` · `delivered` · `failed`), una sola forma de consulta.

| Intento | Espera previa |
|:--:|---|
| 1 | inmediato |
| 2 | 1 min |
| 3 | 10 min |
| 4 | 1 h |
| 5 | 6 h |
| 6 | 24 h |
| — | tras el sexto fallo → `status = 'failed'` y aviso en HQ (`idx_webhook_failed`) |

> Aquí **sí** hay primer intento inmediato, y la diferencia con §8.1 es deliberada: `webhook_delivery`
> **no acota `attempts`** con ninguna restricción (`data_model` §5.18), mientras que `lead_capture` sí
> (`crm_attempts BETWEEN 0 AND 5`). Cada cola usa la forma que su esquema admite, y esa es exactamente
> la razón por la que las esperas se documentan por separado en lugar de suponerlas iguales.

Cada intento actualiza `attempts`, `next_attempt_at`, `response_code` y `last_error` **saneado**. Al
lograrlo: `status = 'delivered'` y `delivered_at` (restricción `webhook_delivered_coherent`).

### 9.6 Sin suscriptor configurado (RF-115)

**Ningún flujo externo es requisito de la v1.** Si `WEBHOOK_SUBSCRIBERS` está vacío:

- los eventos **se siguen registrando** en `webhook_delivery` con `subscriber` y `target_url` a la
  entrada declarada `none` y `status = 'delivered'` sin salida de red, o simplemente no se crea fila
  —lo decide FU/DU-12— pero **en ningún caso** falla la operación de negocio que los origina;
- publicar un artículo, un entregable o un aviso funciona igual;
- el criterio 4 de DU-12 es exactamente esta prueba.

Un webhook es una **consecuencia** de un hecho, nunca una condición suya.

---

## 10. Los nueve eventos y su cuerpo

Los nueve de B.7, en el orden del brief, y son los mismos nueve que el `CHECK webhook_event_valid`
admite (RF-112). Un décimo evento exige migración, que es donde se decide si de verdad existe.

En todos, el bloque `data` **excluye** cualquier campo de estado comercial (frontera (a)) y va
**minimizado**: solo lo que un suscriptor necesita para actuar.

### 10.1 `lead.captured`

Se emite al persistir `lead_capture`, **antes** de cualquier intento contra el CRM.

```json
{
  "id": "whd_...", "event": "lead.captured", "occurred_at": "2026-09-08T14:31:07Z", "api_version": "v1",
  "data": {
    "capture_id": "cap_01J9Z7...",
    "source": "download",
    "email_domain": "empresa.com",
    "company": "Empresa S.A.",
    "job_title": "Director de Operaciones",
    "locale": "es",
    "page_path": "/ai/academy/phoenix-peex",
    "document": { "code": "D-01", "slug": "director-implementacion-ia" },
    "utm": { "source": "linkedin", "medium": "social", "campaign": "peex-septiembre", "term": null, "content": null },
    "created_at": "2026-09-08T14:31:07Z"
  }
}
```

> **Sin `email` y sin `name`.** El webhook viaja a un sistema de automatización que la aplicación no
> controla y cuyos registros no audita. Va el **dominio**, que basta para segmentar y para saber si es
> corporativo, y no el correo, que es el dato personal. Quien necesita el correo es el CRM, y lo
> recibe por el canal §6, autenticado y auditado en los dos lados. **[DECISIÓN DE ESTE DOCUMENTO]**

### 10.2 `lead.delivered_to_crm`

```json
{
  "data": {
    "capture_id": "cap_01J9Z7...",
    "crm_mode": "contact_note",
    "crm_contact_id": "3412",
    "crm_company_id": null,
    "crm_opportunity_id": null,
    "attempts": 1,
    "delivered_at": "2026-09-08T14:32:09Z",
    "contact_url": "https://crm.softlandingglobal.com/contacts/3412"
  }
}
```

`crm_company_id` y `crm_opportunity_id` son `null` en modo `contact_note` **por definición** (§6.4).
Su presencia es el indicador de que el modo `lead_admission` está activo.

### 10.3 `download.completed`

Se emite cuando `download_event.completed_at` se rellena — **no** al emitir la URL firmada, y **nunca**
para un documento en `coming-soon`, que no emite firma (RF-40).

```json
{
  "data": {
    "capture_id": "cap_01J9Z7...",
    "document": { "code": "D-01", "slug": "director-implementacion-ia", "title": "Lo que un Director debe saber sobre Implementación IA" },
    "locale": "es",
    "email_domain": "empresa.com",
    "signed_url_issued_at": "2026-09-08T14:31:07Z",
    "completed_at": "2026-09-08T14:33:41Z"
  }
}
```

**La URL firmada no viaja nunca en un webhook.** Sería entregar una credencial de lectura a un sistema
externo (R-11, gate D10).

### 10.4 `contact.submitted`

```json
{
  "data": {
    "capture_id": "cap_01J9Z8...",
    "email_domain": "empresa.com",
    "company": "Empresa S.A.",
    "job_title": "Director de Operaciones",
    "locale": "es",
    "page_path": "/contacto",
    "utm": { "source": null, "medium": null, "campaign": null, "term": null, "content": null },
    "created_at": "2026-09-08T16:40:00Z"
  }
}
```

**Sin el texto del mensaje**: es contenido escrito por una persona que espera que lo lea SLG, no un
sistema de terceros. El mensaje viaja al CRM en la nota (§6.3) y al correo de aviso.

### 10.5 `doctrine.requested`

Misma forma que §10.4 con `page_path: "/doctrina"` (o `/en/doctrine`) y `source: "doctrine-request"`.

### 10.6 `invitation.sent`

```json
{
  "data": {
    "invitation_id": "inv_01J9ZC...",
    "organization": { "id": "org_01J9Z7...", "name": "Cliente Demo", "slug": "cliente-demo" },
    "role": "client_admin",
    "email_domain": "clientedemo.com",
    "expires_at": "2026-09-11T16:45:00Z",
    "sent_at": "2026-09-08T16:45:00Z"
  }
}
```

**Sin el correo del invitado y, sobre todo, sin el token ni el enlace de invitación.** El enlace es una
credencial de un solo uso (RF-60); un enlace de acceso en el registro de un sistema de automatización
es exactamente el fallo que `data_model` §5.19 describe al negarse a persistirlo.

### 10.7 `deliverable.published`

```json
{
  "data": {
    "deliverable_id": "dlv_01J9Z8...",
    "project": { "id": "prj_01J9Z7...", "name": "Implementación Phoenix PEEx — Cohorte 1", "service": "Phoenix PEEx" },
    "organization": { "id": "org_01J9Z7...", "name": "Cliente Demo", "slug": "cliente-demo" },
    "family_id": "dlv_01J9Z7...",
    "version": 2,
    "title": "Informe SLG_Readiness — v2",
    "type": "html",
    "visibility": "client",
    "published_at": "2026-09-08T15:10:44Z",
    "published_by": { "actor_type": "api_key", "actor_id": "key_01J9Z7...", "actor_label": "Hermes — publicador" }
  }
}
```

Se emite también cuando `visibility` es `internal`: el hecho ocurrió. El suscriptor decide qué hacer
con él; ese es su trabajo, no el nuestro.

### 10.8 `announcement.published`

```json
{
  "data": {
    "announcement_id": "ann_01J9Z9...",
    "organization": { "id": "org_01J9Z7...", "name": "Cliente Demo", "slug": "cliente-demo" },
    "title": "Sesión de cierre de la cohorte 1",
    "published_at": "2026-09-08T15:22:03Z",
    "author": { "actor_type": "api_key", "actor_id": "key_01J9Z7...", "actor_label": "Hermes — publicador" }
  }
}
```

**Sin `body_md`.** El cuerpo es una comunicación a un cliente concreto; el suscriptor que la necesite
la lee por API autenticada, no la recibe empujada.

### 10.9 `post.published` — el evento con restricción de extensibilidad (RF-145)

**Es el único evento cuyo cuerpo está fijado por un requisito**, y por eso es el más explícito de los
nueve: `data_model` §5.18 lo dice de la columna `payload`, y RF-145 lo exige entero —
*«un suscriptor debe poder publicar sin leer de vuelta el repositorio»*.

```json
{
  "id": "whd_01J9ZD...",
  "event": "post.published",
  "occurred_at": "2026-09-08T17:00:00Z",
  "api_version": "v1",
  "data": {
    "slug": "destruccion-creativa-y-el-directorio",
    "lang": "es",
    "title": "Destrucción Creativa y el directorio",
    "description": "Por qué la conversación sobre IA en un directorio no empieza por la tecnología.",
    "date": "2026-09-08",
    "tags": ["Agentic Mindset", "AI Literacy"],
    "author": "Ricardo Torres Oliva",
    "cover": "https://softlandingglobal.com/<ruta de la imagen de portada>",
    "canonical_url": "https://softlandingglobal.com/blog/destruccion-creativa-y-el-directorio",
    "alternates": [
      { "lang": "en", "canonical_url": "https://softlandingglobal.com/en/blog/creative-destruction-and-the-board" }
    ],
    "social": {
      "hook": "La pregunta no es qué IA usar. Es qué deja de tener sentido hacer.",
      "linkedin": "<extracto redactado para LinkedIn, tal como está en el frontmatter>",
      "x": "<extracto redactado para X, tal como está en el frontmatter>"
    }
  }
}
```

**Las cinco reglas que hacen cumplir RF-145:**

1. `social.hook`, `social.linkedin` y `social.x` viajan **completos y literales**, tal como están en el
   frontmatter `social: { hook, linkedin, x }` del artículo (A.5, RF-138). No se recortan, no se
   reescriben, no se resumen.
2. `canonical_url` es **absoluta y del idioma del artículo**: raíz para `es`, prefijo `/en` para `en`
   (RF-03). No es un identificador, no es una ruta relativa.
3. `alternates` lleva el **par en el otro idioma** cuando existe (`pair` del frontmatter), también con
   su URL canónica absoluta. Es `[]` cuando el artículo solo existe en un idioma — la paridad ES/EN es
   obligatoria en páginas, **no en artículos** (A.5, RF-16).
4. **`cover` es una URL absoluta**, no una ruta del repositorio: un suscriptor no puede resolver
   `/images/…` sin conocer el sitio.
5. El evento se dispara del campo **`status`** del frontmatter, **nunca de la existencia del archivo**
   (RF-141): pasar un borrador a `published` es lo que lo emite, y volver a `draft` no emite nada.

> **Es la prueba de que la extensibilidad está construida, no prometida.** El flujo de n8n que publica
> extractos en LinkedIn está en «Previsto» de `scope.md`, no en v1. Que este cuerpo lleve ya todo lo
> necesario es lo que hace que ese flujo sea, el día que se haga, **un flujo** — y no una reapertura
> del blog. Criterio 5 de DU-12.

---

# PARTE D — Variables de entorno

## 11. Inventario (RF-129, RNF-26)

> **Solo NOMBRES y propósito. Ningún valor, ni de ejemplo.** El repositorio es público (§10-6) y un
> secreto publicado está quemado: el historial de git no se borra (R-09). Los valores viven **solo** en
> las variables de entorno de Easypanel; sus copias, en el gestor de contraseñas de Ricardo (R-28).
> Este inventario se refleja en un `.env.example` con **los mismos nombres y ningún valor**, que es lo
> que hace el entorno reproducible si se pierde el acceso al panel.

### 11.1 Aplicación e identidad

| Variable | Propósito | Consume |
|---|---|---|
| `APP_BASE_URL` | URL pública de la instancia; base de todo enlace absoluto (canónicos, invitaciones, webhooks) | toda la app |
| `DATABASE_URL` | Cadena de conexión a PostgreSQL | FU-04 |
| `BETTER_AUTH_SECRET` | Secreto de firma de sesiones y testigos | FU-06 |
| `BETTER_AUTH_URL` | URL base que Better Auth usa para construir sus rutas de retorno | FU-06 |
| `PRIVACY_VERSION` | Versión vigente del texto de privacidad, que se persiste en `lead_capture.privacy_version` | DU-08 |
| `STAGING_BASIC_AUTH_USER` · `STAGING_BASIC_AUTH_PASSWORD` | Autenticación básica de `staging.softlandingglobal.com` (RF-122) | FU-05 |

### 11.2 Proveedores OAuth (F.2-2, F.2-3)

| Variable | Propósito |
|---|---|
| `GOOGLE_CLIENT_ID` | Identificador de cliente OAuth de Google |
| `GOOGLE_CLIENT_SECRET` | Secreto de cliente de Google |
| `MICROSOFT_CLIENT_ID` | Identificador de aplicación registrada en Microsoft Entra ID |
| `MICROSOFT_CLIENT_SECRET` | Secreto de cliente de Entra. **Tiene caducidad**: su fecha se anota fuera del repo y se vigila (R-03) |
| `MICROSOFT_TENANT_ID` | Tenant de Entra. Valor previsto: el `common` del brief (§7). **D-23 permite reutilizar el registro existente** del tenant de M365, que se queda |

### 11.3 Correo transaccional — Resend por SMTP (D-22, D-24)

> D-22 fija **Resend** y exige que el adaptador **hable SMTP estándar, no el SDK propietario**, para
> que cambiar de proveedor cueste **tres variables y ninguna línea de código**. Por eso las variables
> son de transporte, no de marca: Resend se configura poniendo su servidor en `MAIL_SMTP_HOST` y su
> clave de API como `MAIL_SMTP_PASSWORD`. **No hay `RESEND_API_KEY` como tal**, y esa ausencia es la
> decisión.

| Variable | Propósito |
|---|---|
| `MAIL_SMTP_HOST` | Servidor SMTP del proveedor (hoy, el de Resend) |
| `MAIL_SMTP_PORT` | Puerto SMTP |
| `MAIL_SMTP_USERNAME` | Usuario SMTP del proveedor |
| `MAIL_SMTP_PASSWORD` | Contraseña SMTP; con Resend, su clave de API |
| `MAIL_FROM_ADDRESS` | Remitente efectivo. **Vive en el subdominio de envío dedicado de D-24**, no en la raíz. Se persiste en `email_delivery.from_email`. Depende de **[PENDIENTE: P-3 y P-4]** |
| `MAIL_FROM_NAME` | Nombre visible del remitente |
| `MAIL_REPLY_TO` | Dirección de respuesta; previsiblemente `support@softlandingglobal.com` (P-3). Se persiste en `email_delivery.reply_to` |
| `MAIL_ALERTS_TO` | Destinatario de los avisos de captura y de fallo: `support@softlandingglobal.com` (RF-53, RF-50) |

> **Seguimiento de aperturas y clics: DESACTIVADO** por dominio en el panel del proveedor (D-22,
> privacy-first). No hay variable que lo active y el esquema **no tiene dónde guardarlo**
> (`data_model` §5.19): la ausencia de columna es la garantía.
>
> **Cualquier documento que afirme que el remitente es exactamente `support@softlandingglobal.com`
> está desactualizado respecto a D-24** —incluidos RF-117 y §5.1 del brief—. `support@` es el
> **destinatario** de los avisos y, previsiblemente, el `Reply-To`.

### 11.4 Archivos de la aplicación — MinIO (FU-09)

| Variable | Propósito |
|---|---|
| `FILES_S3_ENDPOINT` | Punto de acceso S3 del servicio de archivos |
| `FILES_S3_REGION` | Región declarada por el servicio |
| `FILES_S3_ACCESS_KEY_ID` · `FILES_S3_SECRET_ACCESS_KEY` | Credencial de la aplicación sobre los buckets |
| `FILES_BUCKET_DOWNLOADS` | Bucket **privado** de los documentos D-01…D-11 |
| `FILES_BUCKET_DELIVERABLES` | Bucket **privado** de los entregables de cliente |
| `SIGNED_URL_TTL_DOWNLOAD_MINUTES` | **Cierra RNF-20** · §11.6 |
| `SIGNED_URL_TTL_DELIVERABLE_MINUTES` | **Cierra RNF-20** · §11.6 |
| `SIGNED_URL_TTL_UPLOAD_MINUTES` | **Cierra RNF-20** · §11.6 |

Ninguna ruta de la aplicación lista el contenido de un bucket (RF-123, gate D10).

### 11.5 CRM Softlanding Global (§5–§8)

| Variable | Propósito |
|---|---|
| `CRM_BASE_URL` | Base de la API del CRM |
| `CRM_MODE` | `contact_note` · `lead_admission` (D-19, §5.1). Un valor distinto impide arrancar |
| `CRM_API_KEY_CAPTURE` | Clave «Website — captura»: `contacts:write`, `activities:write`, `crm:read` (RF-56) |
| `CRM_API_KEY_READ` | Clave «Website — tablero»: solo `crm:read` (RF-56) |
| `CRM_CONTACT_URL_TEMPLATE` | Plantilla del enlace profundo con `{contact_id}` (RF-54). Ruta real **[PENDIENTE]** |
| `CRM_TIMEOUT_MS` | Tiempo máximo por episodio HTTP contra el CRM (§5.3) |

Dos claves y no una: **una clave por integración, alcances mínimos, rotación anual, revocación
inmediata ante sospecha** (RNF-40, B.6). Nunca un login de persona como cuenta de servicio.
Antes de cargar estas variables en producción se aplica la verificación de higiene de credenciales
descrita en `planning/risks.md` R-08 (S-01).

### 11.6 Copias de seguridad — Cloudflare R2 (D-21, R-12, R-37)

| Variable | Propósito |
|---|---|
| `BACKUP_S3_ENDPOINT` | Punto de acceso S3 de R2 |
| `BACKUP_S3_REGION` | Región declarada |
| `BACKUP_S3_BUCKET` | Bucket dedicado a copias, sin ningún otro uso |
| `BACKUP_S3_WRITE_ACCESS_KEY_ID` · `BACKUP_S3_WRITE_SECRET_ACCESS_KEY` | Credencial del proceso de copia: **solo escritura, sin permiso de borrado ni de lectura global** |
| `BACKUP_S3_PRUNE_ACCESS_KEY_ID` · `BACKUP_S3_PRUNE_SECRET_ACCESS_KEY` | Credencial **distinta**, usada solo por el proceso de purga de generaciones antiguas, y que **no vive en el VPS que se respalda** |
| `BACKUP_RETENTION_GENERATIONS` | Número de generaciones conservadas |
| `BACKUP_ENCRYPTION_RECIPIENT` | Identidad pública con la que se **cifra la copia en el VPS antes de subirla**; la clave privada se custodia fuera del VPS y fuera del repo (R-12) |

> **Por qué dos credenciales y no una.** **R2 no ofrece Object Lock por API estándar** (D-21, R-37):
> la inmutabilidad no se puede exigir al proveedor. Se compensa **separando poderes** — quien escribe
> no puede borrar, quien borra no está en la máquina que puede quedar comprometida— y **conservando
> generaciones**. No equivale a Object Lock y no se presenta como si lo fuera: es la mitigación
> disponible, y así está registrada.
>
> **El egreso de R2 es $0 a cualquier volumen** (D-21): restaurar nunca genera factura, que es
> justamente lo que importa en una emergencia. La partida medida son las **operaciones**: el cliente de
> copia se configura para no dispararlas.
>
> El script de copia y restauración se escribe contra **API S3 genérica**: cambiar de proveedor es
> endpoint más credenciales, nada más (D-21). Un backup no restaurado no cuenta como backup
> (RF-125, DoD #8).

### 11.7 Webhooks salientes (§9)

| Variable | Propósito |
|---|---|
| `WEBHOOK_SUBSCRIBERS` | Lista de nombres de suscriptor separados por coma. **Vacía es un valor válido** (RF-115) |
| `WEBHOOK_<NOMBRE>_URL` | Destino de ese suscriptor; se persiste en `webhook_delivery.target_url` |
| `WEBHOOK_<NOMBRE>_SECRET` | Secreto HMAC **de ese suscriptor** (§9.3). Nunca en la base de datos |
| `WEBHOOK_TIMEOUT_MS` | Tiempo máximo de espera de la respuesta del suscriptor |

### 11.8 Anti-abuso propio y analítica (D-16, FU-11)

| Variable | Propósito |
|---|---|
| `PUBLIC_FORM_RATE_LIMIT_MAX` · `PUBLIC_FORM_RATE_LIMIT_WINDOW_MS` | Umbral y ventana del límite de los formularios públicos, por IP y por correo (RF-34). El umbral **no se revela** en la respuesta |
| `FREE_EMAIL_DOMAINS_SOURCE` | Dónde vive la lista de dominios de correo gratuito, que debe ser **dato editable sin desplegar** (RF-32). **[PENDIENTE: si acaba siendo tabla, se declara en `data_model`]** |
| `UMAMI_SCRIPT_URL` · `UMAMI_WEBSITE_ID` | Analítica autoalojada. **Cero scripts de terceros** en la capa pública (RF-35, RF-127, gate D1) |

**No hay variable de desafío anti-bot de terceros, y esa ausencia es D-16**: la protección es propia
—límite, honeypot y lista de dominios— para no cargar un solo script ajeno en la capa pública.

### 11.9 Caducidad de las URLs firmadas — **cierra RNF-20** [DECISIÓN DE ESTE DOCUMENTO]

RNF-20 dejó el número abierto y mandó fijarlo aquí; FU-09 no puede empezar sin él, y el criterio 3 de
FU-09 exige además que el valor **se lea de configuración, no se repita en el código**. Por eso son
tres variables y no tres constantes.

| Uso | Variable | Valor | Razón del número |
|---|---|---|---|
| Descarga de documento D-01…D-11 desde `/gracias` | `SIGNED_URL_TTL_DOWNLOAD_MINUTES` | **15 min** | El visitante pulsa en segundos. 15 minutos cubren un móvil con mala cobertura desde LinkedIn (DoD #1) y una pestaña dejada abierta un rato, y siguen siendo demasiado poco para que un enlace reenviado por correo sirva mañana. |
| Entregable abierto desde el portal | `SIGNED_URL_TTL_DELIVERABLE_MINUTES` | **10 min** | Aquí el usuario **ya está autenticado** y puede pedir otra firma con un clic: la firma no tiene que sobrevivir a nada. Cuanto más corta, menos vale un enlace copiado del historial del navegador (gate D10). |
| Subida por API (`POST /deliverables` → `PUT`) | `SIGNED_URL_TTL_UPLOAD_MINUTES` | **30 min** | Es la única que atraviesa una transferencia real: 50 MB por una conexión mala tardan minutos. 30 dan margen sin dejar abierta una escritura durante horas. |

Reglas que acompañan al número, y que valen tanto como él:

1. **Toda URL de archivo caduca. Sin excepción** (RNF-20). No existe URL permanente ni «enlace
   público» de ningún objeto.
2. El instante resultante se persiste como evidencia en `download_event.signed_url_expires_at`
   (`data_model` §5.11); el **número de minutos** vive aquí, el **instante** vive allí.
3. **Ninguna URL firmada se escribe en un log, en `audit_log.metadata`, en un webhook ni en una
   respuesta de la API v1** (§3.6, §10.3). Solo se registra que se emitió.
4. **Ninguna ruta lista el contenido de un bucket** (RF-123). Una firma caducada y una firma alterada
   devuelven lo mismo.

---

## 12. Trazabilidad

### 12.1 Requisitos que este documento cierra o condiciona

| Requisito | Dónde queda resuelto |
|---|---|
| RF-97 (401), RF-98 (403 sin filtrar alcance), RF-99 (429 con cabecera) | §2.2, §2.3, §2.4, §4.2 |
| RF-100 (captures) · RF-110 (sin leads ni pipeline en la API) | §3.1 |
| RF-101 (organizations y projects) | §3.2, §3.3 |
| RF-102 (crear + URL de subida + publicar) | §3.4, §3.5 |
| RF-103 (entregables de un proyecto) | §3.6 |
| RF-104 (aviso a una empresa) · RF-105 (eventos) | §3.7, §3.8 |
| RF-106 (openapi.json solo autenticado) | §3.9 |
| RF-107 (toda llamada en `audit_log`) | §2.8 |
| RF-108 · RNF-32 (errores sin detalles internos) | §2.5 |
| RF-109 (versión en la ruta) | §2.1 |
| RF-111 (atribución de la escritura a la clave) | §3.5, §3.7, §10.7, §10.8 |
| RF-146 (`kind` abierto, `payload` validado) · RF-147 (alcances sin implicación) | §3.8, §2.3, §4.2 |
| RF-46, RF-47, RF-48, RF-49 (los dos modos de D-19) | §5, §6, §7 |
| RF-45 (página, idioma y UTM viajan en la nota) | §6.3 |
| RF-50 (backoff 1 min…24 h y quinto fallo) · RF-51 (fila por intento) · RF-52 (reintento manual) | §8.1, §5.2, §8.2 |
| RF-53 (aviso a `support@` con enlace profundo) · RF-54 (plantilla por variable) | §6.4, §8.4 |
| RF-55 (tres lecturas con caché de 5 min) · RF-56 (dos claves) | §8.3, §11.5 |
| RF-39 (el visitante no espera al CRM) · RF-119 (no se pierde el hecho de negocio) | §5.3 |
| RF-112 (nueve eventos) · RF-113 (HMAC-SHA256) · RF-114 (reintentos) · RF-115 (sin suscriptor) | §9, §10 |
| RF-145 (payload de `post.published` con `social.*` y canónico por idioma) | §10.9 |
| RF-123 (buckets privados, sin listado) | §11.4, §11.9 |
| RF-129 (variables documentadas sin valores) | §11 completo |
| **RNF-20 (caducidad de la URL firmada: cerrada aquí)** | §11.9 |
| RNF-25 (tamaño máximo, ya cerrado en `data_model`) → expresado como validación de la API | §3.4 |
| RNF-33 (validación contra esquema de toda entrada externa) | §2.5, §2.7, §3.4, §3.8, §3.9 |
| RNF-26 · R-09 (cero secretos en el repo) | §0.3-1, §11 |
| DoD #6 (401 · 403 · 429 · auditoría · clave de solo lectura) | §4.2 |
| DoD #1 (CRM apagado, PDF entregado, reintento con éxito) | §5.3, §8.1 |
| Gate D7 (conversión E2E) · D9 (alcances y aislamiento) · D10 (archivos) | §5.3, §4, §11.9 |

### 12.2 Criterios de aceptación que este documento habilita

| Unidad | Criterios que dependen de este documento |
|---|---|
| **FU-09** | 1 (firma caducada denegada), 3 (**la caducidad es exactamente la fijada aquí**, leída de configuración), 4 (tipo y tamaño validados en el servidor) |
| **DU-09** | 2 (dos modos, cambiar es una variable), 3 (nota con documento, ruta, idioma y UTM), 4 (columnas de sincronización), 6 (CRM apagado), 7 (quinto fallo), 8 (fila por intento), 9 (dos claves), 10 (modo activo visible) |
| **DU-12** | 1 (nueve eventos), 2 (firma HMAC verificable), 3 (reintentos con traza), 4 (sin suscriptor), 5 (**payload de `post.published`**), 7 (secretos solo en variables) |
| **DU-13** | Lectura del CRM con caché de 5 min y marca de tiempo; modo activo en el tablero |
| **DU-16** | Detalle de intentos y **reintento manual** — bloqueado por el conflicto de §8.2 |
| **DU-22** | 1…10 completos |
| **DU-23** | 1 (ciclo crear→PUT→publicar), 2 (aviso visible en el portal), 3 (evento en el tablero), 4 (`kind` no previsto), 5 (`openapi.json` autenticado), 6 (atribución a la clave), 8 (estados de error, incluida la subida abortada) |

---

## 13. Huecos declarados y decisiones que exigen registro

### 13.1 `[PENDIENTE]` que este documento **no** puede cerrar

| # | Hueco | Quién y cuándo lo cierra |
|---|---|---|
| 1 | **Nombres exactos de los campos del CRM** en `POST /contacts` y `POST /notes` (§6.2). El adaptador mantiene el mapa en un solo lugar | Claude con Ricardo, contra `~/Dev/crm_slg` o el MCP del CRM, **antes de DU-09** |
| 2 | **Forma exacta de `POST /api/v1/leads`** y de su respuesta (§7.1): el endpoint **no existe** | El `/iterate` del repositorio del CRM, fuera de este proyecto |
| 3 | **Forma exacta de `/dashboard/metrics`, `/reports/funnel` y `/reports/sources`** (§8.3) | Antes de DU-13, contra el MCP de solo lectura del CRM |
| 4 | **Ruta real de la ficha de contacto** en el frontend del CRM (§8.4), hoy supuesta en la plantilla | Ricardo, F.2-5 |
| 5 | **P-3 y P-4**: dirección remitente visible y nombre del subdominio de envío (§11.3) | Ricardo, en M0 |
| 6 | **Dónde vive la lista de dominios de correo gratuito** (§11.8, RF-32). Si acaba siendo tabla, se declara en `data_model` | FU-11 |
| 7 | **Persistencia del límite de peticiones** de los formularios públicos (RF-34): tabla o almacén en memoria | FU-11 |
| 8 | **MIME aceptados para `deliverable.type = 'material'`** (§3.4); el tamaño ya está fijado en `data_model` §2.6 | FU-09 |
| 9 | **Nombre del subdominio del visor de entregables HTML** (§3.6). El origen separado ya es normativo por **D-45**; falta solo el nombre | Ricardo, en **M4**; se construye en DU-19 |

### 13.2 Conflictos que exigen spec-delta antes de construir

| # | Conflicto | Bloquea | Resolución propuesta |
|---|---|---|---|
| 1 | **Reintento manual sobre una captura `failed`** contra `crm_delivery_attempt_bounded` + `crm_delivery_attempt_unique` (§8.2) | **DU-16** | Columna `cycle` en `crm_delivery` y restricción única ampliada. **Spec-delta del `data_model`**, no una divergencia silenciosa de este documento |

### 13.3 Decisiones de este documento que exigen entrada en `docs/decision_log.md`

Ninguna está en el brief; sin todas ellas, el contrato no puede existir.

| # | Decisión | Sección |
|---|---|---|
| 1 | **Caducidad de las URLs firmadas: 15 / 10 / 30 minutos** (cierra RNF-20) | §11.9 |
| 2 | Sobre de error único con `code` estable, `message` sin internos y `request_id` = `audit_log.id` | §2.5 |
| 3 | Paginación por **cursor opaco**, no `offset`; `limit` 50 por defecto, 200 máximo | §2.7 |
| 4 | **Las cinco esperas preceden a los cinco intentos** en la cola del CRM, para conservar los cinco números del brief dentro del tope de cinco intentos del `data_model` | §8.1 |
| 5 | Una clave **acotada a una empresa** ve solo entregables `client` y publicados; una clave de SLG lo ve todo | §3.6 |
| 6 | Cabecera `X-SLG-Signature`, cadena firmada `<timestamp>.<cuerpo crudo>`, tolerancia de 5 min, dedupe por `X-SLG-Delivery` | §9.3, §9.4 |
| 7 | Los webhooks **no transportan correo, nombre, token, cuerpo de aviso ni URL firmada** | §10.1, §10.3, §10.4, §10.6, §10.8 |
| 8 | `publish` **obligatorio y sin defecto** en `POST /announcements` | §3.7 |
| 9 | Plantillas exactas de la nota del CRM, una por `source`, con las siete reglas de composición | §6.3 |
| 10 | `openapi.json` **generado** de los mismos esquemas que validan las peticiones, no escrito a mano | §3.9 |
| 11 | En `/api/v1` **no existen `PATCH`, `PUT` ni `DELETE`**, por coherencia con «nada se borra» | §2.1 |
| 12 | El adaptador de correo **habla SMTP**: no hay variable de SDK propietario (materializa D-22) | §11.3 |

### 13.4 Verificaciones obligatorias antes de dar por buena la API (R-26)

1. **Prueba negativa de las tres del DoD #6**: comprobar que la batería **falla** si se le quita el
   control de alcance, si se desactiva el límite y si se acepta una petición sin clave. Un verde que
   no se ha visto ponerse rojo no es verde (R-26).
2. **Prueba negativa de la firma de webhooks**: alterar un byte del cuerpo y comprobar que la
   verificación rechaza; reenviar una entrega de hace una hora y comprobar que la tolerancia de 5 min
   la rechaza.
3. **Barrido de los errores**: recorrer las nueve rutas provocando cada código de §2.5 y comprobar que
   **ninguna respuesta** contiene traza, nombre de tabla, consulta ni versión (RF-108, RNF-32).
4. **Barrido de secretos**: comprobar que ninguna URL firmada, ninguna clave y ningún secreto de
   webhook aparece en `audit_log.metadata`, en `crm_delivery.request_summary`, en un cuerpo de webhook
   ni en un log (RNF-26, RNF-32).
5. **Confirmar el mapa de campos del CRM** (§13.1-1) contra el repositorio del CRM antes de la primera
   llamada real, y registrar el resultado en `work_log`.

---

## Registro

- `2026-09-08` — Creado en el paso 6 de `init-project`, nivel **HIGH** del perfil `software-app`, a
  partir de `START_PROJECT.md` v1.1 (B.5, B.6, B.7, B.8, B.1, B.3, A.4, A.5, §4 DoD #1/#4/#6/#8/#10,
  §5.1, §7, §9, Anexo D, F.2, G), `planning/requirements.md` (RF-31…RF-57, RF-95…RF-119, RF-123,
  RF-129, RF-141…RF-148, RNF-20, RNF-25, RNF-26, RNF-32, RNF-33, RNF-35, RNF-40),
  `planning/scope.md` (fronteras (a) (c) (d) (g)), `planning/risks.md` (R-04, R-07, R-09, R-11, R-12,
  R-14, R-23, R-24, R-26, R-28, R-37), `docs/decision_log.md` (D-15, D-16, D-19, D-21, D-22, D-23,
  D-24, P-3, P-4, S-01), `design_docs/data_model.md` (§2.4, §2.6, §3.6, §3.8, §3.10, §3.11,
  §5.8…§5.19, §6.5, §7) e `implementation/user_units.md` (FU-08, FU-09, FU-11, DU-09, DU-12, DU-13,
  DU-16, DU-22, DU-23).
  **Tres superficies**: **9 rutas** de `/api/v1` con **6 alcances**, el **adaptador de dos modos** del
  CRM y los **9 webhooks** firmados. **Cierra RNF-20** (15 / 10 / 30 minutos). Deja **8 huecos
  declarados** (§13.1), **1 conflicto** que exige spec-delta del `data_model` (§13.2) y **12
  decisiones** pendientes de registro en `docs/decision_log.md` (§13.3).
- `2026-09-08` — **D-45** cierra CF-4: el §3.6 declara la **ruta de entrega del visor de HTML desde
  origen separado**, con el `sandbox` sin `allow-same-origin` y la CSP estricta como defensa en
  profundidad. El §13.1 pasa a **9 huecos**: el nuevo es solo el **nombre del subdominio del visor**,
  que se fija en M4.
