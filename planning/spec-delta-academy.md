---
type: planning
title: Spec Delta — Academy y centro de mando
project: slg_website
status: propuesta — espera aprobación de Ricardo (Planning Gate, AGENTS.md Regla 1)
timestamp: 2026-09-18
sources:
  - "Ricardo, 2026-09-18: qué es la intranet (HQ = centro de mando de una Company of One; portal = Academy que el cliente quiera abrir cada día)"
  - "planning/scope.md §2 (fronteras a–e), §3 (HQ), §4 (portal)"
  - "START_PROJECT.md §Previsto: «programas Phoenix con progreso por participante» y «Hermes como validador» siguen en previsto"
  - "design_docs/data_model.md §3.6, §3.10, §5"
---

## Spec Delta — 2026-09-18 — new feature (milestone nuevo **M6 · Academy**)

**Decisión que lo enmarca (D-160).** La intranet **no** es un proyecto aparte: HQ y portal siguen en
`slg_website`, sobre la identidad, el aislamiento por empresa, las invitaciones y la API v1 que ya
existen. Un segundo repositorio duplicaría los cuatro y añadiría SSO entre dominios; para una Company
of One es un segundo producto que mantener. Si un día crece, se extrae con la misma separación
motor/piel del objetivo «plantilla» (`docs/plantilla-de-sitios.md`).

**Lo que Ricardo pidió, en sus palabras, y en qué se convierte aquí.**

| Petición | Qué es en este sistema | Unidad |
|---|---|---|
| Cliente: noticias del día por importancia, con comentario IA **para su caso** | Entidad `news_item` por empresa; la escribe un agente por la API (o SLG desde HQ) | FU-15 · DU-26 · DU-29 · DU-30 |
| Cliente: su programación según el servicio | **Hitos del proyecto** con fecha y estado | FU-15 · DU-27 |
| Cliente: avance y pendientes, «cero incertidumbre» | Hitos + **pendientes del cliente** (lo que el cliente tiene que hacer y para cuándo) | FU-15 · DU-27 |
| Cliente: documentación y biblioteca de sus proyectos | Entregables + materiales | **Existe** (DU-19, DU-20) |
| Cliente: clases pregrabadas | Materiales de programa con enlace a vídeo, agrupados por programa | DU-28 |
| HQ: ver/administrar el CRM, hablar con Hermes, chatbots, fábrica de contenidos, estudio, asistente | **Conexiones**: un lanzador. Cada producto se abre en el suyo; HQ no los reconstruye | DU-29 |
| HQ: los agentes entregan dashboards y análisis | `POST /api/v1/deliverables` con visibilidad `internal` → visor. **Existe** (DU-23, DU-19); HQ lo enseña filtrado | DU-29 (mod. DU-15) |

**Lo que NO cambia, y es la mitad importante.**

- **Frontera (b) «No es un LMS» se mantiene.** Un hito es entrega de proyecto, no una lección; un
  pendiente del cliente es una obligación contractual, no una tarea evaluable. No hay lecciones,
  progreso por persona, evaluaciones ni certificados. `check:alcance` sigue vigilando. «Programas
  Phoenix con progreso por participante» **sigue en Previsto** (START_PROJECT §Previsto).
- **Frontera (d) «No hay chat».** Las noticias van en un solo sentido. Conversar con Hermes vive en
  el asistente, no aquí.
- **Frontera (e)** Phoenix Academy sigue fuera.
- Las clases **no se incrustan**: el visor aislado prohíbe orígenes externos (`test:visor`,
  `check:terceros`) y eso no se relaja por un vídeo. Se abren en pestaña nueva (tipo `link`) o, si
  el archivo cabe en el límite de subida (RNF-25), como archivo del bucket. Incrustar = v1.1 con
  decisión propia sobre CSP.

### ADDED

**Requisitos nuevos.**

| # | Requisito | Origen |
|---|---|---|
| RF-149 | El inicio del portal («Hoy») muestra, para la empresa del usuario: las noticias del día ordenadas por importancia con su comentario, el próximo hito de cada proyecto activo, los pendientes del cliente abiertos, los últimos entregables y los avisos. Cada bloque tiene estado vacío redactado. | Ricardo 18-09 |
| RF-150 | Una noticia pertenece a **una** empresa (`organization_id`), lleva título, fuente (URL), resumen, comentario para esa empresa, importancia (1–3) y fecha; la escriben un agente con alcance `news:write` o un usuario de SLG desde HQ. Nunca se lista fuera de la empresa. | Ricardo 18-09 |
| RF-151 | Cada proyecto puede tener hitos (título, fecha, estado `pending\|done`, orden) y pendientes del cliente (título, fecha límite, estado `open\|done`, quién lo cierra: `client` o `slg`). El portal los muestra en «Programa»; el cliente puede marcar `done` **solo** los pendientes cuyo `closes_by` es `client`. | Ricardo 18-09 |
| RF-152 | HQ permite crear y editar hitos, pendientes y noticias de una empresa sin necesitar un agente. | Literacy (DoD #9) |
| RF-153 | La API v1 expone `POST /organizations/{id}/news` (`news:write`), `POST /projects/{id}/milestones`, `PATCH /milestones/{id}`, `POST /projects/{id}/action-items`, `PATCH /action-items/{id}` (`milestones:write`), con las mismas reglas de clave, alcance, límite y auditoría de DU-22/23, y descritos en `openapi.json`. | B.5 |
| RF-154 | HQ tiene una pantalla «Conexiones» con los productos externos de SLG (nombre, descripción, URL), leída de un archivo del repo; añadir uno es editar un archivo. | Ricardo 18-09, D-11 |
| RF-155 | El portal tiene una pantalla «Clases»: los materiales de programa agrupados por proyecto, con los de vídeo distinguidos y abiertos en pestaña nueva. Pasa por `materialesPorProyecto()` (DU-20, criterio 2). | Ricardo 18-09 |
| RF-156 | Toda escritura de noticia, hito o pendiente —por API o por HQ— queda en `audit_log` con su actor. | RNF-29 |

**Unidades nuevas — milestone M6 · Academy.** *Condición de cierre: DoD #5 (aislamiento) sobre las
tres entidades nuevas + revisión visual de Ricardo.*

---

#### FU-15 · Modelo de datos de la Academy: noticias, hitos y pendientes

| Campo | Contenido |
|---|---|
| **Tipo** | FU |
| **Milestone** | M6 |
| **Depende de** | FU-04, FU-13 |

**Qué produce.** Migración `0018_academy.sql`: tablas `news_item`, `milestone`, `action_item`, las
tres con `organization_id`, **con la misma política de fila** de las ocho tablas de 0001/0015, y
`FORCE ROW LEVEL SECURITY`. Alcances nuevos `news:write` y `milestones:write` en el CHECK de
`api_key.scopes`. `data_model.md` §3.6, §3.10 y §5 actualizados.

**Requisitos que cubre.** RF-150, RF-151 (modelo), RF-153 (alcances).

**Criterios de aceptación.**
1. `test:isolation` cubre las tres tablas: sin contexto → 0 filas; otra empresa → 0 filas; escritura
   cruzada → rechazada.
2. Los enumerados (`importance`, `status`, `closes_by`) son `text + CHECK` (data_model §2.3).
3. `check:migrations` y `check:alcance` en verde: ningún identificador de la lista prohibida.
4. `data_model.md` cuenta 22 tablas y lo dice en §1.1.

**Gates.** D9 · `check:migrations` · `check:alcance`.

---

#### DU-30 · API v1 para noticias, hitos y pendientes

| Campo | Contenido |
|---|---|
| **Tipo** | DU |
| **Milestone** | M6 |
| **Depende de** | FU-15, DU-23 |

**Qué produce.** Los cinco endpoints de RF-153 en `lib/api`, con el catálogo de parámetros que
genera `openapi.json`. Es lo primero después del modelo porque es por donde entra Hermes.

**Requisitos que cubre.** RF-153, RF-156.

**Criterios de aceptación.**
1. Una clave sin `news:write` recibe 403 al crear noticia; con él, 201 y la fila lleva
   `author_type = api_key`.
2. Una clave de empresa no puede escribir en otra empresa (404, nunca 403 — D-38).
3. `PATCH /milestones/{id}` solo admite `status` y `due_at`; cualquier otro campo, 400.
4. `openapi.json` describe los cinco y la prueba lee el máximo anunciado y pide uno más.
5. Toda llamada, incluida la rechazada, deja fila en `audit_log` con `request_id`.
6. `test:api` sube en al menos 40 comprobaciones.

**Gates.** `QG` · D9 · DoD #6.

---

#### DU-29 · HQ: Conexiones, y escritura de hitos, pendientes y noticias

| Campo | Contenido |
|---|---|
| **Tipo** | DU |
| **Milestone** | M6 |
| **Depende de** | FU-15, DU-14, DU-15 |

**Qué produce.** (a) `/hq/conexiones`: el lanzador, leído de `content/conexiones.json` (nombre,
descripción, URL, icono opcional). (b) En `/hq/proyectos/{id}`: hitos y pendientes, crear/editar/
cerrar. (c) `/hq/noticias`: crear noticia para una empresa. (d) **Modifica DU-15**: `/hq/entregables`
filtra «publicados por agentes» y abre el visor desde HQ.

**Requisitos que cubre.** RF-152, RF-154, RF-156.

**Criterios de aceptación.**
1. `slg_operator` puede escribir hitos y pendientes de **sus** proyectos y no de otros (RF-86); los
   intentos se auditan como `.denied`.
2. Añadir una conexión es añadir un objeto al JSON; `check:cadenas` sigue en verde (el texto visible
   del lanzador sale del archivo, no de código).
3. Cada formulario tiene error de validación redactado y estado de éxito; nada se guarda con fecha
   inválida o título vacío.
4. `test:gestion` cubre hitos, pendientes y noticias.

**Gates.** `QG` · D9.

---

#### DU-26 · Portal «Hoy»: el inicio que el cliente quiere abrir cada día

| Campo | Contenido |
|---|---|
| **Tipo** | DU |
| **Milestone** | M6 |
| **Depende de** | FU-15, DU-18, DU-29 |

**Qué produce.** `/portal` rediseñado (**modifica DU-18**): cinco bloques en este orden — noticias
del día por importancia con comentario · próximo hito por proyecto · pendientes abiertos ·
últimos entregables · avisos. Estados vacíos redactados en `content/ui`.

**Requisitos que cubre.** RF-149, RF-150 (lectura), RF-88 (se conserva).

**Criterios de aceptación.**
1. Un `client_*` ve solo lo de su empresa en los cinco bloques; `test:aislamiento` lo cubre.
2. Sin noticias del día, el bloque enseña las últimas tres con su fecha, no un hueco.
3. El comentario se sanea antes de renderizar (RNF-31).
4. Wayfinding: cada bloque enlaza a su pantalla completa (Programa, Biblioteca, Avisos).
5. Estados resueltos: vacío · error de carga · sesión caducada.

**Gates.** `QG` · D9 · DoD #5.

---

#### DU-27 · Portal «Programa»: hitos y pendientes, cero incertidumbre

| Campo | Contenido |
|---|---|
| **Tipo** | DU |
| **Milestone** | M6 |
| **Depende de** | FU-15, DU-19, DU-29 |

**Qué produce.** `/portal/programa`: por proyecto, la línea de hitos (hechos, próximo, futuros) y
la lista de pendientes con «marcar como hecho» donde `closes_by = client`.

**Requisitos que cubre.** RF-151, RF-156.

**Criterios de aceptación.**
1. El cliente no puede cerrar un pendiente con `closes_by = slg` ni un hito: el servidor lo rechaza
   y lo audita.
2. Cada proyecto activo muestra **siempre** «qué sigue» — el próximo hito o «sin hitos programados:
   contacta a SLG» — nunca nada.
3. `test:materiales`/`test:aislamiento` extendidos a hitos y pendientes.

**Gates.** `QG` · D9 · DoD #5.

---

#### DU-28 · Portal «Clases»

| Campo | Contenido |
|---|---|
| **Tipo** | DU |
| **Milestone** | M6 |
| **Depende de** | DU-20 |

**Qué produce.** `/portal/clases`: materiales por proyecto, con los de vídeo (por `url`) marcados
y abiertos en pestaña nueva. **Sin cambio de CSP ni de visor.** Modifica DU-20 solo en presentación.

**Requisitos que cubre.** RF-155.

**Criterios de aceptación.**
1. Pasa por `materialesPorProyecto()`; `check:alcance` en verde.
2. Sin materiales de vídeo, estado vacío redactado.

**Gates.** `QG` · `check:alcance`.

---

### MODIFIED

- **DU-18** (inicio del portal): deja de ser «avisos» para ser «Hoy» (DU-26). Los avisos siguen en
  el quinto bloque y en su pantalla.
- **DU-15** (entregables en HQ): filtro «publicados por agentes» + abrir visor (DU-29 d).
- **DU-20** (materiales): pantalla «Clases» encima, sin tocar la puerta única (DU-28).
- **DU-23** (API v1 de escritura): cinco endpoints y dos alcances más (DU-30).
- **`scripts/ci/check-alcance.ts`**: sin cambio de reglas. Se **añade una prueba negativa** con
  `progress_pct` en `milestone` para demostrar que el freno sigue vivo sobre las tablas nuevas.
- **Navegación** (`content/ui`, `lib/app/navegacion.ts`, `check:shell`): portal pasa a **Hoy ·
  Programa · Biblioteca · Clases · Avisos · Miembros · Perfil**; HQ añade **Conexiones · Noticias**.

### REMOVED

Nada. El paso «Agenda tu Sesión Cero» (DU-21) se conserva dentro de «Hoy».

### Affected design docs / knowledge

- `design_docs/data_model.md` §1.1, §3.6, §3.10, §5 (tres tablas).
- `design_docs/api_contracts.md` §2 (cinco endpoints, dos alcances).
- `design_docs/ui_wireframes.md` §6 (Conexiones, Noticias) y §7 (Hoy, Programa, Clases).
- `planning/requirements.md` RF-149…RF-156. `planning/scope.md` §3 y §4 (una línea cada uno).
- `knowledge/index.md`: fila nueva para M6.
- `docs/decision_log.md`: D-160 (misma app), D-161 (importancia editorial, no algorítmica: la fija
  quien escribe la noticia).

### Fuera de este repositorio (dependencia externa, como D-46)

**El agente que escribe las noticias** —busca, filtra, redacta el comentario por cliente— vive en
Hermes y consume `POST /organizations/{id}/news`. Aquí solo existe la puerta y la pantalla. Sin
agente, las noticias las escribe Ricardo desde HQ (RF-152): la Academy funciona el primer día.

### Regression risk

**Medio.** Lo que puede romperse y por qué no debería:
- Migración con tres tablas RLS: `test:isolation` las cubre antes de la primera pantalla (FU-15 va
  primero, como FU-13 fue antes del portal).
- Inicio del portal cambia: `test:shell` y `check:shell` tienen que actualizarse **con el motivo al
  lado**, no en silencio (precedente DU-21).
- Navegación: `check:armazon` no aplica (es de la capa pública); `check:shell` y `check:hq` sí.
- API: `test:api` crece; el cursor de DU-23 (D-141) se reutiliza tal cual.

### Orden y tamaño

FU-15 → DU-30 → DU-29 → DU-26 → DU-27 → DU-28. Seis unidades. Cada una se cierra con sus pruebas
antes de empezar la siguiente (AGENTS.md: una unidad a la vez).
