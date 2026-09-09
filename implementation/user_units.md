---
type: implementation
title: user_units
project: slg_website
description: Descomposición del trabajo de slg_website v1 en Foundation Units (FU) y Deliverable Units (DU), agrupadas por los milestones del Anexo E, con qué produce cada una, requisitos que cubre, dependencias, criterios de aceptación verificables, gates aplicables y trazabilidad inversa completa.
tags: [slg, slg_website, implementation, work-units, fu, du, milestones, okf, software-app]
status: planning
timestamp: 2026-09-08
sources:
  - "START_PROJECT.md v1.1 — §1 Constraints, §4 (DoD #1…#10), §5.1, §7, §10, Anexos A, B, C, D, E, F"
  - "AGENTS.md v4.1 — Reglas 1 a 8, Work Units, Quality Gate"
  - "profiles/software-app/profile.md — deliverable_unit_completeness, quality_gate"
  - "planning/requirements.md — RF-01…RF-148, RNF-01…RNF-46"
  - "planning/scope.md — Dentro de v1 · Fuera de v1 · Previsto · Fronteras"
  - "planning/risks.md — R-01…R-38"
  - "docs/decision_log.md — D-14 … D-45, P-1 … P-5, S-01"
  - "design_docs/data_model.md — §2.6 (RNF-25), §5.12 (crm_delivery)"
  - "design_docs/api_contracts.md — §8.1, §8.2, §11.9 (RNF-20)"
  - "design_docs/ui_wireframes.md — §1…§12"
  - "design_docs/architecture.md — §10.3, §11.3, §15"
  - "design_docs/style_guide.md — §2.3, §4.2, §11"
  - "design_docs/design_summary.md — §2 (conflictos CF-1 … CF-8), §3 (huecos consolidados)"
  - "skills/inventory.md — skills aprobadas para instalar en M0"
---

# Unidades de trabajo — slg_website v1

Paso 7 del playbook `init-project`. Descompone **todo** el trabajo de la v1 en **14 Foundation Units**
y **25 Deliverable Units** (39 unidades), agrupadas por los milestones del Anexo E.

Este documento **no se ejecuta hasta que el plan esté aprobado** (AGENTS.md Regla 1).

---

## 0. Cómo se lee este documento

### 0.1 Definiciones del perfil activo (`software-app`)

| Tipo | Definición |
|---|---|
| **FU** | Trabajo fundacional **sin salida directamente consumible**, necesario para que las DU funcionen. Se hace antes. |
| **DU** | Algo **completo que un consumidor puede usar de punta a punta**. Es la unidad principal. |

**Una DU no está hecha hasta que se cumplen las seis condiciones del perfil**
(`deliverable_unit_completeness`, recogidas en RNF-34):

1. El backend la soporta.
2. El frontend la expone al consumidor.
3. El consumidor puede completar la acción de punta a punta.
4. El `quality_gate` del perfil pasa para **todo** el código nuevo.
5. Los **estados vacíos** y los **estados de error** están resueltos (catálogo en `ui_wireframes` §8).
6. Existen **pruebas automatizadas de los caminos críticos**: autenticación, mutaciones de datos e
   integraciones.

Estas seis condiciones **no se repiten** en los criterios de aceptación de cada DU: se dan por
exigidas en todas. Lo que sí se escribe unidad por unidad es lo que es **específico** de esa unidad.

### 0.2 Notación de origen (idéntica a `planning/requirements.md`)

| Token | Qué es |
|---|---|
| `§N` | Sección del brief `START_PROJECT.md` |
| `§10-N` | Decisión HITL de Ricardo, fila N de la tabla §10 |
| `A.N` `B.N` `C.N` `F.N` | Sección de anexo del brief |
| `D1`…`D12`, `D2b` | Gate del Anexo D (sin guion) |
| `DoD #N` | Prueba N del §4 |
| `D-14`…`D-23` | Decisión registrada en `docs/decision_log.md` |
| `R-NN` | Riesgo de `planning/risks.md` |
| `perfil …` | Bloque del Asset Profile `software-app` |

`D-01`…`D-11` en el **texto** son los once documentos de descarga (D-17), nunca un origen.

### 0.3 Gate del perfil (`quality_gate`), aplicable a toda unidad

Se abrevia como **`QG`** en la fila «gates» de cada unidad. Son once comprobaciones:
cero secretos codificados · cero datos sensibles en logs, errores o interfaz · validación de toda
entrada externa · comprobación de autenticación en rutas protegidas · comprobación de autorización
(nadie accede a recursos ajenos) · rutas privilegiadas con verificación de privilegio · consultas
parametrizadas · contenido renderizado escapado · respuestas de API sin detalles internos ·
subidas validadas por tipo y tamaño · dependencias de fuentes confiables.

`QG` se aplica **después de cada FU y de cada DU**, y de nuevo en la auditoría final (AGENTS.md
Regla 3). Cuando una unidad además cierra o alimenta un gate del Anexo D, ese gate se nombra aparte.

### 0.4 Regla de secuencia: las tres compuertas

Tres requisitos **no se cierran con una unidad: ordenan las unidades**. Una DU de página construida
antes de su compuerta se rechaza aunque funcione.

| Compuerta | Requisito | Unidad que la abre y la cierra | Qué bloquea |
|---|---|---|---|
| **Copy maestro bilingüe** | RF-132 | **FU-01** | Ninguna DU de página se declara construible hasta su aprobación. Antes se construye contra el **esquema de contenido** con texto `[PENDIENTE: …]`, visible en staging y prohibido en `main` (RNF-18). |
| **Orden de los nueve componentes C.5 con prototipo interactivo** | RF-133 | **FU-10** | Ninguna DU de página se construye antes de que los nueve prototipos estén aprobados. Prototipo = componente real, navegable con teclado y con gesto; una imagen no cierra la compuerta. |
| **Formulario de descarga primero** | RF-134 | **FU-10** (primer componente del orden) | Es el CTA único de toda página de servicio (RF-07) y «el componente que paga el proyecto» (C.5). Se prototipa y valida **antes** que los otros ocho. |

### 0.5 Requisitos dependientes de confirmación

**Tres** requisitos están etiquetados `asumido` en `planning/requirements.md` §3-5. Las unidades que los
contienen quedan marcadas **[dependiente de confirmación]**. Si Ricardo los corrige, se resuelven por
spec-delta vía `/iterate` **sin rehacer la unidad**.

| Requisito | Asunción | Unidad |
|---|---|---|
| RF-32 | La lista de dominios de correo gratuito vive como dato editable, no en código | FU-11 |
| RF-54 | La plantilla del enlace profundo al CRM es configurable por variable de entorno | DU-13, DU-16 |
| RF-94 | El paso «Agenda tu Sesión Cero» tolera la ausencia de URL sin romper la pantalla | DU-21 |

**RF-118 ya no está en esta lista.** `requirements.md` §3-5 lo pasó de `asumido` a `explícito`: D-22
fija expresamente el adaptador SMTP tras variable de entorno, así que dejó de ser una asunción de la
planificación para ser una condición de diseño decidida. **FU-08 deja de estar marcada
[dependiente de confirmación]** por este motivo.

### 0.6 Dos umbrales ya fijados por los `design_docs`

Ambos entraron en el paso 7 como `[PENDIENTE]`. Los dos están **cerrados**: el número lo fijaron los
`design_docs` del paso 6, y aquí se recoge tal cual, sin reinterpretarlo.

| Requisito | Umbral | Dónde quedó fijado | Valor | Unidad que lo usa |
|---|---|---|---|---|
| RNF-20 | Caducidad de la URL firmada, en minutos | `design_docs/api_contracts.md` **§11.9** | **15 min** descarga de documento · **10 min** entregable abierto desde el portal · **30 min** subida por API | FU-09 |
| RNF-25 | Tamaño máximo de subida, en MB | `design_docs/data_model.md` **§2.6** | **25 MB** en `downloads` · **50 MB** en `deliverables` (`pdf` y `material`) · **5 MB** `html` · **1 MB** `md` · **tope duro de 50 MB** | FU-04, FU-09 |

Los tres valores de RNF-20 viven en configuración —`SIGNED_URL_TTL_DOWNLOAD_MINUTES`,
`SIGNED_URL_TTL_DELIVERABLE_MINUTES`, `SIGNED_URL_TTL_UPLOAD_MINUTES`— y no se repiten en el código:
es lo que exige el criterio de aceptación 3 de FU-09.

> **Los cinco `design_docs` que el perfil `software-app` exige existen**: `data_model` (nivel HIGH),
> `api_contracts` (HIGH), `ui_wireframes` (MEDIUM), `architecture` (MEDIUM) y `style_guide` (LIGHT).
> Con ellos **queda levantado** el bloqueo que este documento declaraba sobre **FU-04, FU-09, DU-22 y
> DU-23**: existían por los dos umbrales de arriba, y los dos están cerrados.

### 0.7 Los elementos de stack que faltaban por elegir (AGENTS.md Regla 7)

Las dos categorías que este documento dejó abiertas **ya tienen producto elegido por Ricardo**.
La Regla 7 prohíbe nombrar productos que Ricardo **no** haya elegido; estos los eligió, así que
nombrarlos es lo correcto y callarlos sería lo que desinforma. **D-43 añade una tercera categoría,
cerrada como categoría pero todavía sin producto**: por eso su fila dice qué tiene que cumplir el
servicio, y no un nombre comercial.

| Elemento | Categoría decidida | Producto elegido | Adaptador |
|---|---|---|---|
| Correo transaccional | *servicio transaccional dedicado con dominio verificado (SPF/DKIM/DMARC)* — **D-15** | **Resend** — **D-22**, sobre **subdominio de envío dedicado** (**D-24**) | **FU-08** |
| Destino externo de copias de seguridad | *object storage S3-compatible externo, en proveedor distinto del que aloja el VPS* — **D-20** | **Cloudflare R2** — **D-21** | **FU-14** |
| Monitorización externa de disponibilidad | *servicio de uptime dedicado con tramo gratuito, ejecutado **fuera del VPS**, que vigila al menos `softlandingglobal.com` y `staging.softlandingglobal.com` y avisa por un canal que no depende del VPS* — **D-43** (cierra P-5, RF-130, gate D11 y resuelve R-29) | `[PENDIENTE: producto concreto; se elige con 2–3 candidatos antes de FU-05 y **no bloquea el arranque**]` | **FU-05** (configuración) · **DU-25** (verificación) |

**La cláusula de adaptador se conserva intacta**, que es lo que hace reversible la elección: FU-08
habla **SMTP estándar** y no el SDK propietario del proveedor; FU-14 se escribe contra **API S3
genérica**. En ambos casos cambiar de producto cuesta variables de entorno y **ninguna línea de
código**. La monitorización es externa por definición: no vive en el código del activo, así que
cambiar de proveedor no toca el repositorio. **n8n queda como monitor secundario y nunca como
principal**, porque corre en el mismo VPS (`167.88.42.76`) que debería vigilar.

---

## 1. Dependencias externas (no son unidades)

El Anexo F.2 lista seis pre-requisitos externos que **corren en paralelo a M0** y que **no son
unidades de trabajo**: nadie los «construye», se gestionan en paneles de terceros con Ricardo como
aprobador. Se listan aquí con la unidad que cada uno bloquea, para que el bloqueo sea visible en
`task_tracker` en vez de descubrirse tarde.

| # | Pre-requisito externo | Resultado esperado | Unidad(es) que bloquea | Riesgo |
|---|---|---|---|---|
| **F.2-1** | Texto legal de privacidad y términos publicado | URLs válidas para las pantallas de consentimiento OAuth | **DU-06** (páginas legales) y la **activación de todo formulario público en producción** (DU-08, DU-10, DU-25) | R-13 |
| **F.2-2** | Pantalla de consentimiento OAuth de Google + credencial de aplicación web | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` en la plataforma de despliegue | **DU-01** (método Google) · cierre del gate **D8** | R-03 |
| **F.2-3** | Registro de aplicación en Microsoft Entra ID (`tenantId: common`), reutilizando el registro existente del CRM si lo hay | `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` | **DU-01** (método Microsoft) · **DoD #5** (DU-21, FU-13) | R-03, R-06, R-22 |
| **F.2-4** | Dominio de correo verificado (SPF/DKIM/DMARC) en el proveedor de correo transaccional, **sin romper el registro SPF ni los MX existentes** | Correos de invitación entregados en bandeja | **FU-08** (entrega real), y con ella **FU-07**, **DU-01**, **DU-09** | R-01, R-38 |
| **F.2-5** | Dos claves de API en el CRM: «Website — captura» (`contacts:write`, `activities:write`, `crm:read`) y «Website — tablero» (`crm:read`); ruta de la ficha de contacto; decisión sobre `POST /leads` | `CRM_API_KEY_CAPTURE` / `CRM_API_KEY_READ` en la plataforma de despliegue | **DU-09**, **DU-13**, **DU-16** | R-04, R-24 |
| **F.2-6** | URL del calendario para «Agenda tu Sesión Cero» | URL en `content/ui` | **DU-21** (el paso degrada a «próximamente» si falta) | — |

**Dependencias externas adicionales, fuera del Anexo F.2:**

| Dependencia | Origen | Unidad(es) que bloquea | Riesgo |
|---|---|---|---|
| Los **11 documentos de descarga** (D-01…D-11) y el **copy maestro** se producen en el proyecto **SLG_Overhauling**, no en este repositorio | §10-12 corregido por D-17; Anexo H-10 | **FU-01** (copy) · **DU-08** (los documentos sin archivo publican «disponible próximamente» y capturan el correo igual, así que **no bloquean el go-live**) | R-02, R-15, R-18 |
| **Logo de SLG Agency (SVG + PNG), favicon e imagen Open Graph**; mientras falten, wordmark tipográfico | Anexo I-5, C.3 | **FU-02** (wordmark provisional), **DU-07** (Open Graph) | R-35 |
| ~~**Elección del producto** dentro de la categoría de correo transaccional~~ — **cerrada**: **Resend** (D-22) | Elección de Ricardo, D-22 | **FU-08**, ya no bloqueada por esto | R-05 |
| ~~**Elección del producto** dentro de la categoría de object storage externo de backups~~ — **cerrada**: **Cloudflare R2** (D-21) | Elección de Ricardo, D-21 | **FU-14**, ya no bloqueada por esto | R-05, R-37 |
| **Elección del producto** dentro de la categoría de **monitorización externa** — la **categoría está cerrada** (D-43); falta el producto, que se elige con 2–3 candidatos | Elección de Ricardo, D-43 | **FU-05** (no puede cerrarse sin él) · **DU-25** (verificación). **No bloquea el arranque del proyecto ni la aprobación del plan** | R-27, R-29 |

### Acción previa de Ricardo — no es una unidad

**S-01 — higiene de credenciales (ver `decision_log`).** Es una acción de Ricardo **anterior** al
arranque de la ejecución, no trabajo de ninguna unidad. Consiste en verificar que **cada integración
estrena credencial propia con alcance mínimo** (Anexo G) antes de que FU-05 cargue variables de
entorno de producción. El seguimiento se lleva **fuera de este repositorio**, que es público (§10-6):
aquí solo consta que la verificación existe y que precede a la carga de variables.

---

## 2. Unidades por milestone

**Orden comercial (Anexo E):** M0 → M1 → M2 **salen a producción antes de empezar M3**. La web ya
vende mientras se construyen las intranets; `/hq` y `/portal` permanecen inaccesibles tras el login
hasta su milestone (RF-87).

**Nota sobre la subdivisión de milestones.** La instrucción de agrupación es de 3 a 6 unidades por
milestone. **M0 salía con 9 unidades y M1 con 8**, así que ambos se subdividen en dos, sin cambiar su
contenido ni el orden comercial del Anexo E:

- **M0** → **M0-A Plataforma y contenido** (4 unidades) + **M0-B Identidad y servicios compartidos**
  (5 unidades). La condición de cierre del Anexo E («staging sirve una página con login funcional por
  los tres métodos») se cumple al cerrar **M0-B**, no antes.
- **M1** → **M1-A Compuertas, componentes y armazón** (4 unidades) + **M1-B Páginas públicas**
  (4 unidades). Los gates D1–D6 se dan en verde al cerrar **M1-B**.

Dentro de cada milestone las unidades están **ordenadas por dependencia**: se pueden ejecutar de
arriba abajo.

---

### M0-A — Fundaciones: plataforma, contenido y despliegue

---

#### FU-02 · Andamiaje del repositorio, tokens de marca y skills aprobadas

| Campo | Contenido |
|---|---|
| **Tipo** | FU |
| **Milestone** | M0-A |
| **Depende de** | — (primera unidad del proyecto) |

**Qué produce.** El esqueleto ejecutable del activo: proyecto Next.js App Router con TypeScript,
Tailwind y Motion; los grupos de ruta `(public)`, `(auth)`, `(hq)`, `(portal)` y `api/v1` de B.1
creados y vacíos; **todos** los tokens del Anexo C.1 expresados como variables CSS (color, radio,
sombra, difuminado), incluido el **token del anillo de foco de dos capas** que fija **D-44** —capa
exterior `--cyan` (#50B4DC), capa interior `--blue-primary` (#2878B4) o `--ink`—; Montserrat
autoalojada en `woff2` (400/600/700), subconjunto latino,
`font-display: swap`; wordmark tipográfico provisional «SLG Agency» mientras no exista el logo;
`.gitignore` endurecido (`.env*`, `.mcp.json`, `*.key`, `*.pem`); versiones de dependencias fijadas
sin rangos; y la **instalación de las tres skills aprobadas** de `skills/inventory.md`
(`apple-design`, `review-animations`, `prototype`), verificando qué archivos añaden **antes** de
commitear, porque el repositorio es público.

**Requisitos que cubre.** RF-16 (parcial: base sin literales de negocio) · RNF-03 ·
RNF-05 (parcial: **token** del anillo de foco de dos capas, D-44; su verificación cierra en FU-10) ·
RNF-13 · RNF-14 · RNF-15 · RNF-26 · RNF-27 · RNF-28.

**Criterios de aceptación.**
1. `npm run build` produce una compilación `standalone` y el servidor arranca sirviendo una ruta vacía.
2. Cada color, radio, sombra y difuminado del Anexo C.1 existe como variable CSS; **cero valores de
   color literales** en componentes. Un `grep` de `#` hexadecimal fuera del archivo de tokens da cero
   resultados.
3. Montserrat se sirve desde el propio dominio: **cero peticiones** a servicios de fuentes de
   terceros en la pestaña de red (RNF-14).
4. Cero verde, amarillo o naranja en los tokens definidos (RNF-13, gate D2b).
5. **El anillo de foco existe como token de dos capas (D-44)**: capa exterior `--cyan` (#50B4DC) y
   capa interior `--blue-primary` (#2878B4) o `--ink`. No se define ningún anillo de foco de una sola
   capa en `--cyan`: medido da 2,4:1 sobre `--paper` y no cumpliría RNF-05 ni el gate D2. El token es
   **uno solo y se usa en todo elemento interactivo**; un foco escrito a mano en un componente rechaza
   la unidad en revisión. Su verificación de contraste no se cierra aquí, se cierra en FU-10.
6. `git check-ignore` confirma que `.env`, `.mcp.json`, `*.key` y `*.pem` están ignorados; no existe
   ningún valor de credencial en el árbol ni en el historial.
7. Las tres skills quedan instaladas y sus archivos añadidos están listados en `work_log`; ninguna
   escribió un secreto ni un archivo fuera de lo esperado.
8. `package.json` no contiene ningún rango de versión (`^`, `~`) en dependencias de producción.

**Gates.** `QG` (secretos, dependencias) · **D2b** (marca: tokens sin verde/amarillo/naranja,
Montserrat autoalojada) · **D1** (base del presupuesto de JS inicial).

---

#### FU-03 · Capa de contenido OKF, i18n y scripts de verificación

| Campo | Contenido |
|---|---|
| **Tipo** | FU |
| **Milestone** | M0-A |
| **Depende de** | FU-02 |

**Qué produce.** El contenido como datos y su policía. Las **seis colecciones** de B.4 en sus rutas
(`page`, `service`, `download`, `post`, `doctrine`, `ui`) con validación de frontmatter **en tiempo
de build** — un frontmatter inválido rompe el build, nunca se degrada en silencio. El enrutado
bilingüe: español en la raíz, inglés bajo `/en`, sin ninguna redirección automática por idioma del
navegador. Y los **cuatro scripts de CI**: frontmatter válido · `pair` existente en `page` y
`service` (no en `post`) · nomenclatura literal e intraducible · cero `[PENDIENTE]` en `main`.

**Requisitos que cubre.** RF-02 (esqueleto de las 27 rutas) · RF-03 · RF-14 · RF-15 · RF-16 · RF-18 ·
RF-19 · RF-20 · RF-26 · RF-128 · RF-135 · RF-136 · RF-137 · RF-138 · RF-139 · RF-140 · RF-141
(parcial: frontmatter `post` completo desde el primer artículo) · RNF-16 · RNF-18.

**Criterios de aceptación.**
1. Cada una de las seis colecciones valida su frontmatter mínimo de B.4 y **rechaza** un registro
   incompleto rompiendo el build, con mensaje que nombra archivo, campo y motivo.
2. Un registro `service` sin uno de los **seis bloques con encabezado fijo** del contrato A.3, o con
   un encabezado alterado, es rechazado **antes** de que la página llegue a renderizarse (RF-135).
3. El script de paridad falla si un `pair` apunta a un archivo inexistente o si falta el par en
   `page` o `service`, y **no** se aplica a `post` (RF-26).
4. El script de nomenclatura falla ante cualquier variante traducida o alterada de `SLG_AI`,
   `SLG_Holdings`, `SLG_Academy`, `SLG_Enterprise`, `SLG_Factory`, `SLG_Readiness`, `SLG_Implement`,
   `APP_Building`, `AGE_Building`, `CoO as a Service`, `Phoenix PEEx`, `Phoenix TEAx`,
   `Phoenix RETx`; y ante cualquier expansión de la «D» de DAL OS que no sea **Destrucción Creativa**.
5. Una clave presente en `content/ui/es.json` y ausente en `content/ui/en.json` rompe el build;
   **nunca** se degrada a cadena vacía en pantalla (RF-140).
6. **Prueba negativa obligatoria de cada script** (mitigación de R-26): cada uno se ejecuta contra un
   caso preparado que **debe fallar**, y el resultado se registra en `work_log`. Un script que nunca
   se ha visto en rojo no se acepta como gate verde.
7. Pedir `/en/ai` no redirige a `/ai` ni al revés, con cualquier `Accept-Language` (RF-03).

**Gates.** `QG` · **D4** (paridad ES/EN por script) · **D5** (fidelidad de contenido) · alimenta
**D12**.

---

#### FU-04 · Capa de datos: PostgreSQL, Drizzle, migraciones y modelo B.2

| Campo | Contenido |
|---|---|
| **Tipo** | FU |
| **Milestone** | M0-A |
| **Depende de** | FU-02 · **`design_docs/data_model.md`** (fija RNF-25) |

**Qué produce.** Las dieciséis entidades de B.2 con sus migraciones y datos de ejemplo, y **una única
capa de acceso a datos** que aplica el `organization_id` del contexto autenticado, sin excepciones
por endpoint (mitigación de R-10). Incluye las cuatro restricciones de extensibilidad que la v1 debe
tener «con la forma correcta» aunque no construya lo previsto: `deliverable.version` desde el primer
día · `deliverable.type` como **valor de datos**, nunca rama de código · `material` colgando siempre
de un proyecto · `agent_event.kind` abierto con `payload_json` validado contra esquema en la
escritura. Y las dos ausencias deliberadas: `lead_capture` **sin ningún campo de estado comercial**, y
`membership` **sin semántica de matrícula**.

**Requisitos que cubre.** RF-37 (persistencia) · RF-49 (columnas de sincronización con el CRM) ·
RF-57 · RF-69 · RF-71 (capa de acceso) · RF-142 · RF-143 · RF-144 · RF-146 · RNF-25 · RNF-29 ·
RNF-30 · RNF-33 (base de esquemas).

**Criterios de aceptación.**
1. Existen y migran las entidades de B.2: `user`, `account`/`session`/`verification`, `organization`,
   `membership`, `invitation`, `api_key`, `lead_capture`, `download`, `download_event`, `project`,
   `deliverable`, `announcement`, `agent_event`, `audit_log`, `webhook_delivery`, `crm_delivery`.
2. `lead_capture` **no tiene** etapa, propietario, valor de oportunidad ni próximo paso. Una revisión
   del esquema lo confirma (RF-57, frontera (a) de `scope.md`).
3. `audit_log` es inmutable desde la aplicación: no existe camino de código que actualice o borre una
   fila, **ni siquiera para `slg_admin`**; una prueba lo demuestra intentándolo (RNF-29).
4. Toda consulta se emite con sentencias parametrizadas; **cero** concatenación de entrada de usuario
   en SQL (RNF-30).
5. La capa de acceso **no admite** un `organization_id` recibido por parámetro: la firma de la función
   lo toma del contexto. Una prueba que intenta pasarlo por parámetro no compila o falla (RF-71).
6. `deliverable.type` se resuelve por un mapa de renderizadores declarados; añadir un tipo es añadir
   una entrada, no un `if` nuevo. Una revisión que encuentre la decisión de tipo repartida por el
   código rechaza la unidad (RF-142).
7. `agent_event` acepta un `kind` no enumerado y un `payload_json` arbitrario **validado contra
   esquema en la escritura**, sin migración de esquema (RF-146).
8. El tamaño máximo de subida (RNF-25) está fijado como número en el `data_model` y referenciado
   desde el código, no repetido a mano.

**Gates.** `QG` (consultas parametrizadas, validación) · base de **D9** (aislamiento).

---

#### FU-05 · Despliegue, CI, DNS y documentación de entorno

| Campo | Contenido |
|---|---|
| **Tipo** | FU |
| **Milestone** | M0-A |
| **Depende de** | FU-02, FU-03, FU-04 · **S-01 cerrada** · **producto de monitorización externa elegido** (categoría cerrada por D-43; la elección del producto no bloquea el arranque, pero sí el cierre de esta unidad) |

**Qué produce.** Los **cinco servicios** en la plataforma de despliegue sobre el VPS: web de
producción, PostgreSQL, almacenamiento de archivos, analítica autoalojada y web de staging. Despliegue
automático: `main` → producción, `develop` → staging. Staging con autenticación básica y excluido de
indexación. Los registros DNS **nuevos** de raíz, `www` y `staging`, añadidos con la lista de «no
tocar» delante (`crm`, `n8n`, `evolution`, `academy` y los MX) y con la zona previa copiada a `docs/`
como estado anterior. El pipeline de CI: lint, pruebas, los cuatro scripts de contenido de FU-03,
análisis de secretos y **gate D1 por Lighthouse verificado en cada push** (D-50). Un `.env.example` con
todos los nombres y **ningún valor**. Cabeceras de seguridad. El **monitor de caída externo al VPS**
que fija **D-43**: un servicio de uptime dedicado con tramo gratuito, contratado y configurado **fuera
del VPS**, vigilando al menos `softlandingglobal.com` y `staging.softlandingglobal.com` y avisando por
un canal que **no dependa del VPS**; n8n queda como monitor **secundario** para incidencias parciales,
nunca como principal, porque corre en la misma máquina que debería vigilar.
`[PENDIENTE: producto concreto de la categoría; se elige con 2–3 candidatos antes de esta unidad y no
bloquea el arranque del proyecto]`. Y `docs/run_metadata.md` listo para registrar tokens por milestone.

**Requisitos que cubre.** RF-56 (alojamiento de las dos claves del CRM como variables) · RF-120 ·
RF-121 · RF-122 · RF-128 (pipeline) · RF-129 · RF-130 · RF-131 · RF-148 (gates escritos como script o
checklist, no como prosa) · RNF-01 · RNF-02 (gate D1, por Lighthouse — D-50; ~~RNF-03~~ retirada) ·
RNF-22 · RNF-26 · RNF-28 · RNF-40 (custodia de claves) · RNF-42.

**Criterios de aceptación.**
1. Los cinco servicios arrancan y `staging.softlandingglobal.com` responde por HTTPS, pide
   autenticación básica y devuelve `noindex`.
2. Un push a `develop` publica staging y un push a `main` publica producción, sin intervención
   manual; y **ningún despliegue llega a `main` sin haber pasado por staging** (R-20).
3. Tras el cambio DNS, `crm`, `n8n`, `evolution`, `academy` y los MX **siguen resolviendo igual**;
   se verifica nombre por nombre y se registra en `work_log` (R-25).
4. El pipeline **falla** —no avisa— ante: frontmatter inválido, `pair` roto, nomenclatura alterada,
   un `[PENDIENTE]` en `main`, un patrón de secreto, o Lighthouse móvil por debajo de 90 en alguna
   de las cuatro categorías, o LCP ≥ 2,5 s, en Home (gate D1, RNF-01/RNF-02 — D-50).
5. Cada uno de esos frenos tiene su **prueba negativa** ejecutada y registrada (R-26).
6. `.env.example` lista **todos** los nombres de variable con su propósito y su servicio consumidor,
   y **cero valores** (RF-129, RNF-26).
7. CSP, HSTS y `frame-ancestors` están activas y verificadas por prueba automatizada en staging
   (RNF-22).
8. El monitor de caída avisa cuando producción deja de responder; se comprueba provocando la
   condición una vez (RF-130). El monitor **se ejecuta fuera del VPS** (D-43) y vigila al menos
   `softlandingglobal.com` y `staging.softlandingglobal.com`; el aviso llega por un canal que **no
   depende del VPS**, y eso se demuestra en la misma prueba: se provoca la caída y el aviso llega.
   Un monitor alojado dentro del VPS —n8n incluido— **no cierra este criterio**: n8n solo puede quedar
   configurado como señal **secundaria** de incidencias parciales.
9. El **producto de monitorización externa está elegido y registrado en `decision_log`** antes de
   ejecutar esta unidad, dentro de la categoría ya cerrada por D-43 y tras comparar 2–3 candidatos.
   Su elección **no bloquea el arranque del proyecto**, pero sí el cierre de esta unidad.

**Gates.** `QG` · **D11** (operación, cerrado en categoría por D-43) · alimenta **D1** (Lighthouse,
D-50) y **D5**.

---

### M0-B — Fundaciones: identidad y servicios compartidos

---

#### FU-06 · Módulo de identidad y autorización

| Campo | Contenido |
|---|---|
| **Tipo** | FU |
| **Milestone** | M0-B |
| **Depende de** | FU-04, FU-05 |

**Qué produce.** Better Auth con los plugins `organization`, `admin` y `apiKey`, **con versión exacta
fijada** y encapsulado en un **módulo propio** que es el único punto del código que sabe de sesión,
rol, `organization_id` y verificación de clave de API (mitigación de R-19: si mañana hay que
sustituirlo, no se tocan páginas ni endpoints). Los cinco roles. La **matriz de permisos B.3 aplicada
en el servidor** para cada acción. El middleware que resuelve idioma en `(public)`, exige sesión y rol
en `(hq)` y `(portal)`, y exige clave válida con alcance en `api/v1`. Los alcances de clave
**granulares y sin implicación entre ellos** desde el primer día. Y el bloqueo de `/hq` y `/portal`
tras el login mientras sus milestones no estén cerrados.

**Requisitos que cubre.** RF-62 (ancla de identidad `oid` en el módulo) · RF-67 · RF-68 · RF-69 ·
RF-70 · RF-71 · RF-72 · RF-86 (rechazo en servidor de acciones de `slg_operator`) · RF-87 · RF-147 ·
RNF-32.

**Criterios de aceptación.**
1. Cero lógica de sesión, rol o `organization_id` escrita dentro de una página o de un endpoint: toda
   pasa por el módulo. Una revisión que encuentre una excepción rechaza la unidad (R-19).
2. La matriz B.3 se comprueba **en el servidor** en cada acción; ocultar un botón no autoriza nada.
   Una prueba invoca la acción sin pasar por la interfaz y recibe 403 (RF-68).
3. Un `client_*` que pide una ruta de `/hq` recibe 404 o 403, **nunca** datos ni una pista de que la
   ruta existe.
4. Ninguna clave de API con `events:write` puede crear un entregable: los alcances no se implican
   entre sí. Probado explícitamente (RF-147).
5. Con los milestones M3 y M4 aún abiertos, `/hq` y `/portal` no aparecen enlazados en ninguna
   superficie y devuelven denegación por rol incluso con sesión válida (RF-87).
6. La versión de Better Auth está fijada sin rango y no se actualiza dentro de un milestone (R-19).
7. Los mensajes de error de autorización no revelan qué alcance faltaba ni qué recurso existe
   (RNF-32).

**Gates.** `QG` (autenticación, autorización, rutas privilegiadas) · base de **D9**.

---

#### FU-07 · Servicio de invitaciones

| Campo | Contenido |
|---|---|
| **Tipo** | FU |
| **Milestone** | M0-B |
| **Depende de** | FU-06, FU-08 |

**Qué produce.** La emisión de invitaciones (enlace de **un solo uso**, caducidad **72 horas**,
ligada a empresa y rol), la ruta de aceptación `/invitacion/[token]` que admite **cualquiera de los
tres métodos**, la revocación de invitaciones no aceptadas y el reenvío. Es FU y no DU porque en M0-B
su **superficie de emisión** todavía no existe: llega en **DU-14** (HQ) y **DU-21** (portal, para
`client_admin`). Aquí la emisión se ejerce por semilla y por prueba.

**Requisitos que cubre.** RF-60 · RF-61 · RF-63 · RF-119 (parcial: la invitación queda creada y
reenviable aunque falle el correo).

**Criterios de aceptación.**
1. Un enlace usado deja de servir; un enlace de más de 72 horas deja de servir. Ambos casos
   verificados por prueba, con mensaje que no revela si la invitación existió.
2. La misma invitación se acepta correctamente por contraseña, por Google y por Microsoft Entra ID, y
   en los tres casos la cuenta resultante queda ligada **a la empresa y al rol de la invitación**
   (RF-61).
3. Si el proveedor **no** entrega correo verificable, la aceptación exige **coincidencia explícita de
   correo**; sin ella, se rechaza (RF-63). Nunca se vincula por un correo no verificado (R-22).
4. Si el envío del correo falla, la invitación **queda creada** y aparece como reenviable; el hecho de
   negocio no se pierde (RF-119).
5. La revocación de una invitación no aceptada la inutiliza de inmediato.

**Gates.** `QG` · alimenta **D8** (identidad E2E, que cierra en M3).

---

#### FU-08 · Adaptador de correo transaccional

| Campo | Contenido |
|---|---|
| **Tipo** | FU |
| **Milestone** | M0-B |
| **Depende de** | FU-05 · **F.2-4** · resolución de **P-3 y P-4** (dirección remitente y nombre del subdominio de envío) |

**Qué produce.** El envío de correo detrás de **una interfaz propia** que habla **SMTP estándar** y no
el SDK propietario, con servidor, credencial y remitente en variables de entorno, de modo que cambiar
de servicio cueste variables de entorno y **ninguna línea de código** (AGENTS.md Regla 7, R-05, RF-118).
El producto está elegido: **Resend** (**D-22**), dentro de la categoría fijada por D-15 —*servicio
transaccional dedicado con dominio verificado (SPF/DKIM/DMARC)*— y verificado sobre un **subdominio de
envío dedicado** (**D-24**), no sobre la raíz. Los tres tipos de correo de la v1 —invitación,
recuperación de contraseña y aviso de captura a SLG— salen **con remitente en ese subdominio de envío**
y con **`Reply-To` a `support@softlandingglobal.com`**, para que toda respuesta del destinatario siga
llegando ahí (RF-117). El valor exacto del `From` y el nombre exacto del subdominio quedan
`[PENDIENTE: P-3 y P-4, se fijan en M0]`; `from_email` y `reply_to` son configuración por variable de
entorno y se persisten en cada envío, nunca constantes en el código. El seguimiento de aperturas y
clics queda **desactivado** por dominio (promesa privacy-first).

**Requisitos que cubre.** RF-116 · RF-117 · RF-118 · RF-119 · RF-53 (mecanismo del aviso).

**Criterios de aceptación.**
1. Ningún caso de uso importa el cliente del proveedor: todos hablan con la interfaz propia. Una
   revisión que encuentre una importación directa rechaza la unidad.
2. Cambiar de proveedor se demuestra en la práctica: se ejecuta la suite contra un segundo destino
   configurado solo por variables de entorno, sin editar código.
3. Los tres tipos de correo salen con **remitente en el subdominio de envío dedicado** y con
   **`Reply-To` a `support@softlandingglobal.com`** —valor exacto `[PENDIENTE: P-3 y P-4, se fijan en
   M0]`, leído de variable de entorno y persistido en cada envío— y llegan a bandeja de entrada en
   pruebas contra **tres buzones de proveedores distintos**, con el resultado registrado en `work_log`
   (RF-117, D-24, R-01).
4. El correo transaccional se verifica sobre un **subdominio de envío dedicado** (D-24): el registro
   SPF de la raíz **no se toca** y sigue autorizando solo al correo corporativo, y los MX existentes
   no se tocan. Publicar los registros del subdominio **no puede romper** el correo humano, porque son
   entradas DNS distintas (R-38). El correo corporativo permanece en **Microsoft 365** y no se migra
   (D-23). El nombre exacto del subdominio queda `[PENDIENTE: P-4]` y se fija en M0.
   4b. **Sub-decisión abierta (P-3)**: con subdominio dedicado, la dirección remitente deja de ser
   exactamente `support@softlandingglobal.com` como fija el brief §5.1, que queda desactualizado en
   ese punto. La resolución del `From` es condición de entrada de esta unidad y se registra en
   `decision_log` antes de construirla; `support@softlandingglobal.com` se conserva como `Reply-To`.
5. Un fallo de envío **no** pierde el hecho de negocio: se registra, se reintenta y la operación de
   negocio que lo originó queda completa y recuperable (RF-119).
6. El seguimiento de aperturas y clics está desactivado, verificado en el panel del proveedor.
7. Cero valores de credencial en el repositorio; solo nombres de variable.

**Gates.** `QG` (secretos, no filtración) · alimenta **D8** y **D7**.

---

#### FU-09 · Almacenamiento de archivos y URLs firmadas

| Campo | Contenido |
|---|---|
| **Tipo** | FU |
| **Milestone** | M0-B |
| **Depende de** | FU-05 · **`design_docs/api_contracts.md`** (fija RNF-20) |

**Qué produce.** Los dos buckets **privados** (`downloads` y `deliverables`) y el servicio de
**URLs firmadas con caducidad** para emisión y para subida, con validación de tipo MIME y tamaño **en
el servidor antes de aceptar el archivo**. Ninguna ruta de la aplicación lista el contenido de un
bucket. Ningún archivo gated vive en el repositorio.

**Requisitos que cubre.** RF-38 (mecanismo) · RF-123 · RNF-20 · RNF-25 · RNF-27.

**Criterios de aceptación.**
1. Una petición directa a la ruta de un objeto **sin firma** devuelve denegación; con firma caducada,
   también. Ambas probadas.
2. **No existe** ningún endpoint que devuelva el listado de un bucket (RF-123, gate D10).
3. La caducidad de la firma es exactamente el valor fijado en `api_contracts` (RNF-20) y está leída de
   configuración, no repetida en el código.
4. Una subida con tipo MIME no permitido o por encima del tamaño máximo se rechaza **en el servidor**,
   antes de escribir un solo byte (RNF-25).
5. Un `grep` del repositorio confirma cero PDF de descarga y cero entregables de cliente en control de
   versiones (RNF-27).

**Gates.** `QG` (subidas validadas) · **D10** (archivos).

---

#### DU-01 · Acceso, sesión y recuperación de contraseña por los tres métodos

| Campo | Contenido |
|---|---|
| **Tipo** | **DU** |
| **Milestone** | M0-B |
| **Depende de** | FU-06, FU-07, FU-08 · **F.2-2**, **F.2-3** |

**Qué produce.** La pantalla `/acceder` (`/en/sign-in`) con los tres métodos —correo y contraseña,
Google y Microsoft Entra ID con `tenantId: common`—, **sin registro público**, con la recuperación de
contraseña, la vinculación de cuentas por correo verificado, la sesión con cookies seguras y
expiración deslizante de 7 días, y «cerrar sesión en todos los dispositivos».
**Es la primera cosa que un consumidor puede hacer de punta a punta**, y es la condición de cierre que
el Anexo E pide para M0.

**Requisitos que cubre.** RF-58 · RF-59 · RF-62 · RF-63 · RF-64 · RF-65 · RF-66 · RNF-23 · RNF-24 ·
RNF-35 (parcial: pruebas de autenticación) · RNF-37.

**Criterios de aceptación.**
1. Un usuario existente entra por los **tres** métodos y llega a la superficie que le corresponde por
   rol.
2. Un correo que no corresponde a ningún usuario ni a ninguna invitación vigente recibe **el mismo
   mensaje neutro** que un correo existente con contraseña equivocada: la respuesta **no revela** si
   la cuenta existe (RF-59).
3. Si el correo verificado del proveedor coincide con un usuario existente, la cuenta **se vincula**;
   no se duplica. Para Entra el ancla es `oid`, con `preferred_username`/`upn` como respaldo, y
   **nunca** se vincula por un correo no verificado (RF-62, R-22).
4. Una contraseña de menos de 12 caracteres se rechaza; el alta por contraseña exige verificación de
   correo; la recuperación llega por enlace de un solo uso (RF-64).
5. Intentos fallidos repetidos activan bloqueo progresivo, y **el mismo mecanismo protege la
   recuperación** (RNF-24).
6. Las cookies de sesión llevan `Secure`, `HttpOnly` y `SameSite`; la expiración deslizante es de 7
   días (RNF-23, RF-65).
7. «Cerrar sesión en todos los dispositivos» invalida **todas** las sesiones del usuario de inmediato,
   verificado con dos navegadores (RF-66).
8. Estados resueltos: cargando · credenciales inválidas · proveedor no disponible · cuenta sin acceso ·
   enlace de recuperación caducado.
9. Existen pruebas automatizadas de los tres métodos, de la vinculación y del cierre global.

**Gates.** `QG` · **D8** (identidad E2E — se alimenta aquí y **cierra en M3**, cuando existe la
emisión de invitaciones desde HQ) · perfil `deliverable_unit_completeness`.

---

### M1-A — Capa pública: compuertas, componentes y armazón

---

#### FU-01 · Copy maestro bilingüe — compuerta única de aprobación

| Campo | Contenido |
|---|---|
| **Tipo** | FU |
| **Milestone** | M1-A |
| **Depende de** | FU-03 (esquema de contenido contra el que se redacta) · producción en SLG_Overhauling |

> **Por qué lleva el número 01.** El Anexo E la nombra literalmente «FU-01 copy maestro bilingüe
> (compuerta de aprobación)» y la sitúa en M1. Se conserva su identificador tal como el contrato lo
> escribe. Su **producción arranca en paralelo a M0** por ser dependencia externa (R-02, R-15); lo que
> pertenece a M1 es su **compuerta de aprobación**.

**Qué produce.** Todo el texto visible de la capa pública en español e inglés, redactado **contra el
contrato A.3** sección por sección y no en blanco: las seis secciones de cada una de las once páginas
de servicio, Home, los cuatro overviews de rama, Doctrina, Nosotros, las cadenas de interfaz de
`content/ui`, los mensajes de error y los textos de estado vacío. Orden de redacción por prioridad
comercial: Home → `SLG_AI` → las tres ramas → el resto. **Una sola compuerta de aprobación**: una
segunda ronda es cambio de alcance, no un paso del plan.

**Requisitos que cubre.** RF-11 · RF-96 (la Sesión Cero no aparece como llamada a la acción en ningún
texto público) · RF-132 · RNF-18 · RNF-44.

**Criterios de aceptación.**
1. Cada registro `page` y `service` tiene su par ES/EN completo y el script de paridad de FU-03 pasa
   en verde con **cero huérfanos**.
2. La nomenclatura obligatoria aparece **literal** en los dos idiomas; el script de nomenclatura pasa.
3. Toda mención de mentorías, premios, cifras, casos o nombres de cliente está **respaldada por dato
   verificado y autorización explícita**, o marcada `[PENDIENTE: …]`. Cero cifras sin fuente (RF-11,
   RNF-18).
4. Ningún texto público ofrece «Sesión Cero» ni agenda: el único llamado a la acción de una página de
   servicio es su descarga (RF-96, RF-07).
5. Cada viewport de la capa pública sostiene **una idea**; cero lorem ipsum, cero fotografía de stock,
   cero clichés visuales de IA (RNF-44).
6. **La compuerta se cierra con una aprobación explícita de Ricardo registrada en `work_log`**, con
   fecha. Mientras siga abierta, ninguna DU de página se declara construible; las páginas existen en
   staging con `[PENDIENTE: …]` visible y **bloqueado en `main`**.

**Gates.** **D5** (fidelidad de contenido) · **D4** (paridad) · alimenta **D2b** y **D6**.

---

#### FU-10 · Sistema de componentes C.5 con prototipo interactivo aprobado

| Campo | Contenido |
|---|---|
| **Tipo** | FU |
| **Milestone** | M1-A |
| **Depende de** | FU-02 (tokens) |

**Qué produce.** Los **nueve componentes de C.5, en este orden exacto**, cada uno con **prototipo
interactivo aprobado antes de construir ninguna DU de página**:

1. **Formulario de descarga** — se prototipa y valida **antes que los otros ocho** (RF-134): es el CTA
   único de toda página de servicio y «el componente que paga el proyecto».
2. Barra de navegación translúcida + sheet móvil arrastrable.
3. Hero tipográfico.
4. Tarjeta de rama/servicio.
5. Bloque «Qué incluye».
6. Tarjeta de artículo.
7. Pie.
8. Shell de app (barra lateral, tabla, ficha, estado vacío, estado de error).
9. Visor de entregables.

Incluye las reglas duras de motion de C.4, las tres preferencias del sistema
(`prefers-reduced-motion`, `prefers-reduced-transparency`, `prefers-contrast`) y la lente de revisión
de los ocho principios de C.6.

> El orden literal de C.5 empieza por la barra de navegación; RF-134 impone que el **formulario de
> descarga** se prototipe y valide primero. Aquí se cumplen los dos: el formulario se valida antes, y
> el resto sigue el orden de C.5. Esta reordenación se declara y se registra en `decision_log`.

**Requisitos que cubre.** RF-133 · RF-134 · RNF-04 · RNF-05 · RNF-06 · RNF-07 · RNF-08 · RNF-09 ·
RNF-10 · RNF-11 · RNF-12 · RNF-13 · RNF-43 · RNF-45 · RNF-46.

**Criterios de aceptación.**
1. Los nueve prototipos son **componentes reales, navegables con teclado y con gesto**. Una imagen no
   cierra esta compuerta (RF-133).
2. El prototipo del formulario de descarga demuestra el **camino completo del visitante**: validación
   de correo corporativo con mensaje en el idioma de la página, error en línea, estado de envío,
   estado «disponible próximamente» y estado de error del servidor (RF-134).
3. Contraste AA en todas las combinaciones; `#50B4DC` y `#78B4DC` **nunca** como color de texto sobre
   fondo claro; `#2878B4` sobre blanco roto solo a **≥ 24 px** (RNF-04, gate D2). El anillo de foco de
   D-44 no contradice esta regla: allí `--cyan` es **capa exterior de un anillo**, no color de texto, y
   el contraste lo aporta la capa interior.
4. Navegación completa por teclado con foco visible en todo elemento interactivo; `alt` en toda imagen
   informativa; formularios con etiqueta asociada y error en línea (RNF-05).
   **El anillo de foco de dos capas de D-44 se verifica aquí contra el gate D2**: los nueve
   componentes usan el token producido en FU-02 —capa exterior `--cyan` (#50B4DC), capa interior
   `--blue-primary` (#2878B4) o `--ink`— y **la combinación medida cumple el contraste que exige
   RNF-05**, sobre `--paper` y sobre las demás superficies donde aparezca. Se mide, no se afirma, y la
   medición se registra en `work_log`. Un anillo de una sola capa en `--cyan` —2,4:1 sobre `--paper`—
   **rechaza la unidad**, aunque el Anexo C.1 liste ese color entre los usos de anillo de foco: D-44
   es una **precisión** del kit, no una contradicción, y conserva su intención cromática.
5. Con `prefers-reduced-motion: reduce`, toda transición degrada a cross-fade de 200 ms, sin
   desplazamientos ni rebotes. Con `prefers-reduced-transparency`, toda superficie translúcida se
   vuelve sólida. Con `prefers-contrast: more`, bordes definidos y fondos casi sólidos.
6. Springs con `damping` 1.0 y `response` 0.3–0.4 s por defecto; rebote (~0.8) **solo** tras un gesto
   con momentum (RNF-09).
7. Feedback visual en `pointerdown` (`scale(0.97)`, 100 ms) y **cero retardos artificiales** en la
   ruta de entrada (RNF-10).
8. **Solo** `transform` y `opacity` animados; nada que provoque reflow durante la animación;
   `will-change` únicamente donde el movimiento es inminente (RNF-11).
9. Toda animación gestual se reanuda **desde el valor presentado**, nunca desde el objetivo; cero
   `@keyframes` en interacciones agarrables (RNF-12).
10. El sheet móvil cumple sus cuatro cláusulas —seguimiento 1:1 con `setPointerCapture`, proyección de
    momentum (`d ≈ 0.998`), rubber-band en el límite y velocidad transferida al spring de cierre— y se
    verifica **cuadro a cuadro**, no por inspección del código (RNF-45).
11. Los reveals al scroll son opacidad + **8 px**, **una sola vez** por elemento, `damping 1.0`; sin
    parallax, sin fondos en movimiento, sin bucles lentos (RNF-46).
12. Cada componente pasa la lente de los ocho principios de C.6 y responde: dónde estoy, a dónde puedo
    ir, cómo salgo (RNF-43).
13. **La compuerta se cierra con aprobación explícita registrada en `work_log`.** Ninguna DU de página
    empieza antes.

**Gates.** **D2** (accesibilidad) · **D2b** (marca) · **D3** (motion, con revisión cuadro a cuadro
del sheet y del hero) · alimenta **D1**.

---

#### DU-02 · Armazón público: navegación, sheet móvil, pie y conmutador de idioma

| Campo | Contenido |
|---|---|
| **Tipo** | **DU** |
| **Milestone** | M1-A |
| **Depende de** | FU-03, FU-10 |

**Qué produce.** La navegación principal con **exactamente cinco destinos** (`SLG_AI`,
`SLG_Holdings`, Doctrina, Blog, Nosotros) más el botón «Acceder», el logo llevando a Home, el sheet
móvil arrastrable en producción, el pie y el conmutador de idioma que lleva a **la misma página** en
el otro idioma. Es el marco por el que se navega todo lo demás.

**Requisitos que cubre.** RF-01 · RF-03 · RF-04 · RF-87 (el acceso a `/hq` y `/portal` no se enlaza) ·
RNF-45.

**Criterios de aceptación.**
1. El menú expone **cinco** destinos más «Acceder»; **ninguna** etiqueta genérica tipo «Inicio/Home»
   es destino de menú; el logo lleva a Home (RF-01).
2. Desde cualquiera de las 27 rutas, el conmutador lleva a **esa misma página** en el otro idioma —no
   a la portada— y conserva la posición de navegación (RF-04, DoD #2).
3. Español en la raíz, inglés bajo `/en`; **ninguna** redirección automática por idioma del navegador
   sobrescribe la ruta pedida (RF-03).
4. El sheet móvil cumple en producción las cuatro cláusulas de RNF-45, verificado cuadro a cuadro.
5. Ni la navegación ni el pie enlazan `/hq` ni `/portal` mientras M3 y M4 sigan abiertos (RF-87).
6. Estados resueltos: navegación en carga, sheet abierto sin conexión, ruta sin par de idioma.
7. Todo el texto de la navegación y del pie se lee de `content/ui`: cero literales en `.tsx` (RF-16).

**Gates.** `QG` · **D2** · **D3** · **D4** · alimenta **D1**.

---

#### DU-03 · Portada (Home) ES/EN

| Campo | Contenido |
|---|---|
| **Tipo** | **DU** |
| **Milestone** | M1-A |
| **Depende de** | FU-01 *(compuerta cerrada)*, FU-10 *(compuerta cerrada)*, DU-02 |

**Qué produce.** `/` y `/en` con el **orden fijo** de A.3: hero tipográfico de una idea → las dos
ramas como dos puertas (`SLG_AI` · `SLG_Holdings`) → tres tarjetas de `SLG_AI` (Academy · Enterprise ·
Factory) → franja Doctrina con pull-quote y enlace → últimos artículos → descarga destacada → pie.

**Requisitos que cubre.** RF-02 (parcial) · RF-09 · RNF-38 (parcial) · RNF-44.

**Criterios de aceptación.**
1. Los siete bloques aparecen en el orden exacto de RF-09; falta o desorden de uno = página rechazada.
2. El bloque «últimos artículos» y el de «descarga destacada» resuelven su **estado vacío** con
   redacción propia, no con un hueco (todavía no hay blog ni descargas en M1).
3. La página existe completa en ES y EN con `pair` recíproco y el script de paridad en verde.
4. Cero cadena de negocio en componentes: todo texto sale de `content/` (RF-16).
5. Una idea por viewport; cero fotografía de stock (RNF-44).
6. Lighthouse móvil se mide **aquí, ya**, no al final: es la primera medición del proyecto y su
   resultado se registra en `work_log` (mitigación de R-21).

**Gates.** `QG` · **D1** (primera medición) · **D2** · **D2b** · **D4** · **D5** · alimenta **D6**.

---

### M1-B — Capa pública: páginas

---

#### DU-04 · Overviews de rama (`/ai`, `/ai/academy`, `/ai/enterprise`, `/ai/factory`)

| Campo | Contenido |
|---|---|
| **Tipo** | **DU** |
| **Milestone** | M1-B |
| **Depende de** | DU-03 |

**Qué produce.** Las cuatro páginas de overview en ES y EN: `SLG_AI` como puerta a las tres ramas, y
`SLG_Academy`, `SLG_Enterprise` y `SLG_Factory` como índices de sus servicios. `SLG_Academy` incluye
el **enlace externo** a Phoenix Academy.

**Requisitos que cubre.** RF-02 (parcial) · RF-13.

**Criterios de aceptación.**
1. Las cuatro páginas existen en los dos idiomas con `pair` recíproco.
2. Cada overview enlaza a **todos** sus servicios y a ninguno que no le corresponda: `SLG_Academy` a
   cinco, `SLG_Enterprise` a dos, `SLG_Factory` a tres.
3. El enlace a `academy.softlandingglobal.com` es **externo y señalado como tal**: sin integración,
   sin sesión compartida y sin contenido embebido (RF-13, frontera (e) de `scope.md`).
4. Nomenclatura literal en ambos idiomas; el script pasa.
5. Estado resuelto: un servicio cuyo registro de contenido aún no existe no rompe el índice.

**Gates.** `QG` · **D2** · **D4** · **D5** · alimenta **D1** y **D6**.

---

#### DU-05 · Las once páginas de servicio (contrato A.3)

| Campo | Contenido |
|---|---|
| **Tipo** | **DU** |
| **Milestone** | M1-B |
| **Depende de** | DU-04 |

**Qué produce.** Las once páginas de servicio en ES y EN —`Phoenix PEEx`, `Phoenix TEAx`,
`Phoenix RETx`, Customize Programs, AI Coaching for Directors, `SLG_Readiness`, `SLG_Implement`,
`APP_Building`, `AGE_Building`, `CoO as a Service` y `SLG_Holdings`— cada una renderizando las **seis
secciones del contrato A.3 en orden fijo**. En M1 la sección 5 muestra el bloque de descarga; su
**máquina** (formulario, entrega, captura) llega en DU-08.

**Requisitos que cubre.** RF-02 (parcial) · RF-06 · RF-07 · RF-08 · RF-96.

**Criterios de aceptación.**
1. Las seis secciones aparecen en el orden fijo: para quién y qué problema · qué es · qué incluye ·
   cómo trabajamos · descarga · siguiente paso. **Falta o desorden de una sección = página rechazada**
   (RF-06).
2. La sección 5 es el **único** llamado a la acción de la página: no hay segundo CTA, ni agenda
   embebida, ni formulario de contacto en la misma página (RF-07, §10-8).
3. La sección 6 enlaza a `/contacto` con texto sin venta y **no incrusta** calendario ni widget de
   terceros (RF-08).
4. Ninguna página ofrece «Sesión Cero» (RF-96).
5. Las 22 páginas (11 × 2 idiomas) tienen `pair` recíproco; paridad en verde.
6. Cero scripts de terceros cargados por estas páginas (frontera (h) de `scope.md`).
7. Estados resueltos: servicio sin documento de descarga asociado · bloque «Qué incluye» vacío.

**Gates.** `QG` · **D2** · **D4** · **D5** · alimenta **D1**, **D2b**, **D6**.

---

#### DU-06 · Autoridad y legales: Doctrina, Nosotros y `/legal/*`

| Campo | Contenido |
|---|---|
| **Tipo** | **DU** |
| **Milestone** | M1-B |
| **Depende de** | DU-04 · **F.2-1** (texto legal) |

**Qué produce.** `/doctrina` con el resumen ejecutivo de The Phoenix Doctrine, los tres pilares de
DAL OS y el bloque «documento completo a solicitud» (cuyo **formulario** llega en DU-10);
`/nosotros` con SLG Agency Inc. (Florida) y Ricardo Torres Oliva; y `/legal/privacidad` y
`/legal/terminos` con sus pares en inglés, **públicas y sin autenticación**, porque las pantallas de
consentimiento OAuth las exigen.

**Requisitos que cubre.** RF-02 (parcial) · RF-10 (superficie) · RF-11 · RF-12.

**Criterios de aceptación.**
1. Toda aparición de DAL OS expande la «D» como **Destrucción Creativa**; el script de FU-03 lo
   verifica (RF-15).
2. En `/nosotros`, cualquier mención de mentorías, premios o cifras está respaldada o marcada
   `[PENDIENTE]`; **cero cifras sin fuente** llegan a `main` (RF-11).
3. `/legal/privacidad` y `/legal/terminos` responden 200 **sin sesión**, tienen URL estables y están
   enlazadas desde el pie y desde todo formulario público (RF-12, R-13).
4. Doctrina muestra el bloque «documento completo a solicitud» con su estado vacío redactado mientras
   DU-10 no exista.
5. Los cuatro documentos legales (2 × 2 idiomas) tienen `pair` recíproco.

**Gates.** `QG` · **D4** · **D5** · alimenta **D6**. **Bloquea el go-live de cualquier formulario
público sin F.2-1 resuelto** (R-13).

---

#### DU-07 · SEO técnico, páginas 404 y 500, y cierre de los gates D1–D6

| Campo | Contenido |
|---|---|
| **Tipo** | **DU** |
| **Milestone** | M1-B |
| **Depende de** | DU-03, DU-04, DU-05, DU-06 |

**Qué produce.** Metadatos únicos por página e idioma, Open Graph con imagen de marca, `sitemap.xml`,
`robots.txt`, `schema.org` `Organization` + `Service`, `canonical` propio por idioma y `hreflang`
recíproco ES↔EN; páginas **404 y 500 propias, bilingües, con navegación de vuelta**. Y la verificación
de que **D1 a D6 están en verde en staging**, que es la condición de cierre de M1 en el Anexo E.

**Requisitos que cubre.** RF-05 · RF-17 · RNF-01 · RNF-02 · RNF-17.

**Criterios de aceptación.**
1. Cada página emite `hreflang` **recíproco** y `canonical` propio por idioma, verificado por script
   sobre las 27 rutas (RF-05, gate D4).
2. Metadatos únicos por página e idioma —cero títulos o descripciones duplicados—, Open Graph con
   imagen de marca, `sitemap.xml` con las rutas de ambos idiomas, `robots.txt`, y `schema.org`
   `Organization` + `Service` validados (RNF-17).
3. 404 y 500 propias, en los dos idiomas, con navegación de vuelta (RF-17).
4. **Lighthouse móvil ≥ 90 en Performance, Accessibility, Best Practices y SEO** en Home, una página
   de servicio y —cuando exista, en M2— un artículo (RNF-01, gate D1).
5. **LCP < 2,5 s** en 4G simulado en esas páginas (RNF-02).
6. ~~JS inicial de la capa pública < 150 KB comprimido~~ — **retirado por D-50** (RNF-03 retirada):
   el gate D1 queda definido solo por los criterios 4 y 5, ya verificados en CI por Lighthouse desde
   FU-05, extendidos aquí a las tres páginas.
7. Los gates D1, D2, D2b, D3, D4, D5 y D6 se declaran en verde **con su evidencia registrada en
   `work_log`**, y cada uno con su prueba negativa hecha (R-26).

**Gates.** **D1** · **D2** · **D2b** · **D3** · **D4** · **D5** · **D6** — cierre de M1.

---

### M2 — Conversión y contenido

*Condición de cierre (Anexo E): gate **D7**; **DoD #1, #2 y #3**.*

---

#### FU-11 · Anti-abuso propio: límite de peticiones, honeypot y dominios de correo gratuito

| Campo | Contenido |
|---|---|
| **Tipo** | FU |
| **Milestone** | M2 |
| **Depende de** | FU-04, FU-05 |
| **Marca** | **[dependiente de confirmación]** — RF-32 |

**Qué produce.** La protección de todo formulario público **sin ningún desafío anti-bot de terceros**
(D-16): límite de peticiones por IP y por dirección de correo con umbral configurable, campo trampa
invisible, y validación contra una **lista de dominios de correo gratuito mantenida como dato
editable** —contenido o configuración—, ampliable **sin desplegar**.

**Requisitos que cubre.** RF-31 · RF-32 · RF-33 · RF-34 · RF-35 · RNF-33 (parcial).

**Criterios de aceptación.**
1. Un correo de dominio gratuito se rechaza con **mensaje explícito en el idioma de la página** («usa
   tu correo corporativo»), nunca con un error genérico (RF-31, DoD #1).
2. Ampliar la lista de dominios **no requiere despliegue**: se demuestra añadiendo un dominio y
   comprobando el rechazo sin reconstruir (RF-32).
3. Un envío con el campo trampa relleno se descarta **silenciosamente** y **no crea** `lead_capture`
   (RF-33).
4. Superar el umbral devuelve **429 sin revelar el umbral** (RF-34).
5. La capa pública **no carga ningún script de terceros**, verificado en la pestaña de red de las 27
   rutas (RF-35, frontera (h)).
6. Toda entrada del formulario se valida contra esquema **antes** de usarse (RNF-33).

**Gates.** `QG` (validación de entrada, no filtración) · alimenta **D1** (cero scripts de terceros) y
**D7**.

---

#### DU-08 · Biblioteca de descargas, formulario de captura y entrega por URL firmada

| Campo | Contenido |
|---|---|
| **Tipo** | **DU** |
| **Milestone** | M2 |
| **Depende de** | FU-09, FU-11, DU-05 |

**Qué produce.** La máquina que paga el proyecto: `/descargas` (biblioteca con estado), la página
propia de cada uno de los **once** documentos con su formulario de captura, la persistencia del
`lead_capture` **antes de responder al visitante**, la entrega inmediata por **URL firmada con
caducidad**, el `download_event`, la página `/gracias` (`/en/thank-you`) y el estado «disponible
próximamente» para los documentos cuyo archivo todavía no existe.

**Requisitos que cubre.** RF-02 (parcial) · RF-07 (cierre) · RF-27 · RF-28 · RF-29 · RF-30 · RF-36 ·
RF-37 · RF-38 · RF-39 (parcial) · RF-40 · RF-41 · RF-42 · RF-45 (parcial).

**Criterios de aceptación.**
1. Existen los **once** registros de descarga (D-01…D-11) en ES y EN, uno por página de servicio
   (RF-28, D-17).
2. `/descargas` lista los documentos con su estado (`published` / `coming-soon`); los `draft`
   **no se listan** (RF-29).
3. Añadir un documento es **añadir su registro de contenido y subir el archivo al bucket privado**:
   ningún cambio de código, ningún despliegue manual. Se demuestra haciéndolo (RF-27, DoD #9).
4. El envío registra `consent_at` con marca de tiempo **y enlace a la política de privacidad
   vigente** (RF-36).
5. El `lead_capture` persiste con correo, dominio, nombre, empresa, cargo, `source`, `download_id`,
   página, `locale` y UTM **antes** de responder al visitante (RF-37).
6. El archivo se entrega **solo** por URL firmada con caducidad; **nunca** desde una ruta pública ni
   desde el repositorio (RF-38).
7. Un documento sin archivo muestra «disponible próximamente», **captura el correo igual**, no emite
   URL firmada y **no dispara** `download.completed` (RF-40, R-18).
8. Cada entrega registra el instante de emisión de la URL y el de finalización de la descarga
   (RF-41).
9. `/gracias` y `/en/thank-you` reciben al visitante con el enlace de descarga y el siguiente paso
   (RF-42).
10. Estados resueltos: biblioteca vacía · documento inexistente · correo rechazado por dominio ·
    error del servidor al emitir la firma · enlace de descarga caducado.
11. Pruebas automatizadas del camino completo del visitante, incluido el caso «sin archivo».

**Gates.** `QG` · **D10** (archivos) · alimenta **D7** y **DoD #1**.

---

#### DU-09 · Captura al CRM: adaptador de dos modos, cola de reintentos y aviso por correo

| Campo | Contenido |
|---|---|
| **Tipo** | **DU** |
| **Milestone** | M2 |
| **Depende de** | FU-08, DU-08 · **F.2-5** · **S-01 cerrada** |

**Qué produce.** La entrega de cada captura al CRM Softlanding Global, que es el **sistema de registro
de leads**. Adaptador de **dos modos** seleccionable por variable de entorno (D-19): modo
`contact_note` —buscar contacto por correo, crearlo si no existe, añadir nota con el contexto— y modo
`lead_admission` —`POST /api/v1/leads` con alcance `leads:write`, idempotente por correo + documento,
inactivo mientras el CRM no exponga el endpoint—. La **cola de reintentos en tabla de PostgreSQL**
(nunca en memoria del contenedor, R-23), con espera creciente 1 min → 10 min → 1 h → 6 h → 24 h y paso
a `failed` tras el quinto fallo. Y el aviso por correo a `support@softlandingglobal.com` con el enlace
profundo a la ficha del CRM.

**Requisitos que cubre.** RF-39 · RF-45 · RF-46 · RF-47 · RF-48 · RF-49 · RF-50 · RF-51 · RF-53 ·
RF-56 · RF-119 (parcial) · RNF-35 (parcial) · RNF-36 · RNF-40.

**Criterios de aceptación.**
1. **El visitante nunca espera al CRM**: la entrega del documento es inmediata y la sincronización
   ocurre en segundo plano (RF-39).
2. Los **dos modos** están implementados y **ambos probados**: `contact_note` contra el CRM real y
   `lead_admission` contra un doble del endpoint. Cambiar de modo es cambiar una variable de entorno y
   **no exige migrar datos ni tocar la unidad** (RF-46, R-24).
3. En `contact_note`, la nota transporta documento, ruta, idioma y UTM en su texto (RF-47, RF-45).
4. La captura persiste `crm_contact_id`, `crm_company_id`, `crm_opportunity_id`, `crm_sync_status`,
   `crm_attempts` y `crm_last_error` (RF-49).
5. La cola **sobrevive a un reinicio del contenedor**: se prueba reiniciando con capturas pendientes y
   comprobando que se entregan (R-23).
6. Con el CRM apagado: la captura queda en cola, **el documento se entrega igual**, y al volver el CRM
   el reintento tiene éxito. Es la prueba del gate **D7** y de DoD #1 (RNF-36).
7. Tras cinco fallos, la captura pasa a `failed`, **genera alerta en HQ** y envía correo a
   `support@softlandingglobal.com` (RF-50).
8. Cada intento deja una fila `crm_delivery` con petición, código de respuesta y número de intento
   (RF-51).
9. Se usan **dos claves distintas** con alcances mínimos, ambas solo en variables de entorno; **nunca**
   un login de persona como cuenta de servicio (RF-56, RNF-40).
10. El **modo activo es visible**, no solo en una variable de entorno: se expone en el tablero de HQ y
    en el README operativo (R-24).
11. Un fallo del correo de aviso **no** revierte la entrega al CRM ni la del documento (RF-119).

**Gates.** `QG` · **D7** (conversión E2E) · perfil `deliverable_unit_completeness` · **DoD #1**.

---

#### DU-10 · Contacto y solicitud del documento completo de Doctrina

| Campo | Contenido |
|---|---|
| **Tipo** | **DU** |
| **Milestone** | M2 |
| **Depende de** | DU-06, DU-09 |

**Qué produce.** `/contacto` (`/en/contact`) y el formulario de «documento completo a solicitud» de
Doctrina. Ambos producen un `lead_capture` —con `source: contact` y `source: doctrine-request`— y
recorren **exactamente el mismo camino** de validación, cola y aviso que una descarga: una sola
máquina, tres puertas de entrada.

**Requisitos que cubre.** RF-02 (parcial) · RF-08 (destino) · RF-10 (cierre) · RF-43 · RF-44.

**Criterios de aceptación.**
1. El envío de `/contacto` crea un `lead_capture` con `source: contact` y entra en la misma cola de
   entrega al CRM (RF-43).
2. La solicitud de Doctrina crea un `lead_capture` con `source: doctrine-request` y el mismo camino
   (RF-44).
3. Ambos formularios aplican FU-11 completo: dominios gratuitos rechazados, honeypot, límite de
   peticiones (RF-31 a RF-34).
4. Ambos registran `consent_at` y enlazan la política de privacidad vigente (RF-36).
5. La sección 6 de toda página de servicio llega aquí y **no incrusta agenda** (RF-08).
6. Estados resueltos: envío correcto · error del servidor · correo rechazado · reenvío duplicado.
7. `/gracias` distingue la variante *contacto* de la variante *descarga*.

**Gates.** `QG` · alimenta **D7** · **D5**.

---

#### DU-11 · Blog: índice, artículo, etiquetas, RSS y borradores

| Campo | Contenido |
|---|---|
| **Tipo** | **DU** |
| **Milestone** | M2 |
| **Depende de** | FU-03, DU-02 |

**Qué produce.** `/blog`, `/blog/[slug]`, `/blog/etiqueta/[tag]` y sus pares en inglés, más el canal
RSS por idioma. **Publicar un artículo es añadir un `.md` con frontmatter OKF y hacer push**: sin
tocar código, sin build manual y sin ningún paso en HQ. El frontmatter A.5 se implementa **completo
desde el primer artículo** —aunque en v1 se escriba a mano— y la publicación se dispara del campo
`status`, **nunca** de la existencia del archivo.

**Requisitos que cubre.** RF-02 (parcial) · RF-21 · RF-22 · RF-23 · RF-24 · RF-26 · RF-141.

**Criterios de aceptación.**
1. Añadir un `.md` y hacer push publica el artículo en `/blog` **en minutos**, sin ningún otro paso.
   Se demuestra en la práctica y se registra (RF-21, DoD #3).
2. Un `post` con `status: draft` **no se sirve** en ninguna ruta pública ni en RSS (su aparición en HQ
   llega en DU-13) (RF-22).
3. El RSS publica **solo los artículos publicados del idioma correspondiente** (RF-23).
4. Existen índice y página por etiqueta en los dos idiomas (RF-24).
5. Un artículo **solo en español** no rompe el script de paridad (RF-26).
6. El frontmatter A.5 está completo desde el primer artículo —`type`, `title`, `description`, `lang`,
   `pair`, `date`, `tags`, `status`, `cover`, `social{hook,linkedin,x}`, `author`— y la publicación
   depende de `status`, no del archivo (RF-141, RF-138).
7. Estados resueltos: blog sin artículos · etiqueta sin artículos · artículo inexistente.
8. Lighthouse se mide sobre un artículo, que es la tercera página que el gate D1 exige.

**Gates.** `QG` · **D1** (tercera página) · **D4** · **D5** · **D6** · **DoD #3**.

---

#### DU-12 · Webhooks salientes firmados y analítica privacy-first

| Campo | Contenido |
|---|---|
| **Tipo** | **DU** |
| **Milestone** | M2 |
| **Depende de** | DU-09, DU-11 |

**Qué produce.** Los **nueve eventos** de B.7 emitidos con firma HMAC-SHA256 sobre el cuerpo y secreto
por suscriptor, con reintentos de espera creciente y traza en `webhook_delivery`. **Ningún flujo
externo es requisito de la v1**: sin suscriptor configurado, los eventos se registran y el sistema
funciona igual. Y la analítica autoalojada sobre la capa pública, sin scripts de terceros ni cookies
de seguimiento.

**Requisitos que cubre.** RF-35 (cierre: analítica sin terceros) · RF-112 · RF-113 · RF-114 · RF-115 ·
RF-127 · RF-145.

**Criterios de aceptación.**
1. Los nueve eventos se emiten: `lead.captured`, `lead.delivered_to_crm`, `download.completed`,
   `contact.submitted`, `doctrine.requested`, `invitation.sent`, `deliverable.published`,
   `announcement.published`, `post.published` (RF-112).
2. Cada envío lleva firma HMAC-SHA256 calculada sobre el cuerpo, con secreto **por suscriptor**;
   un cuerpo alterado invalida la firma. Probado (RF-113).
3. Los envíos fallidos se reintentan con espera creciente y cada intento queda en `webhook_delivery`
   con estado, intentos y último error (RF-114).
4. **Sin suscriptor configurado, el sistema funciona igual** y los eventos quedan registrados
   (RF-115).
5. El payload de `post.published` transporta `social.hook`, `social.linkedin`, `social.x` **y el
   enlace canónico del artículo en su idioma** —no solo un identificador—, de modo que un suscriptor
   pueda publicar **sin leer de vuelta el repositorio** (RF-145).
6. La analítica es autoalojada; la capa pública no carga **ningún** script de terceros ni cookie de
   seguimiento (RF-127, RF-35).
7. Los secretos de firma viven solo en variables de entorno.

**Gates.** `QG` · **D1** (cero terceros) · cierre de M2 con **DoD #1, #2, #3**.

---

### M3 — HQ (intranet SLG)

*Condición de cierre (Anexo E): **DoD #4**; gates **D8**, **D9**, **D10**.*
*M0 → M1 → M2 ya están en producción cuando M3 empieza.*

---

#### FU-12 · Shell de aplicación para HQ y portal

| Campo | Contenido |
|---|---|
| **Tipo** | FU |
| **Milestone** | M3 |
| **Depende de** | FU-06, FU-10 (componente 8 prototipado) |

**Qué produce.** La implementación del octavo componente de C.5: barra lateral, tabla, ficha, estado
vacío y estado de error, más los **seis estados canónicos** que toda pantalla autenticada debe
resolver (cargando · vacío inicial · vacío por filtro · error de carga · error de acción ·
permiso/no encontrado), el wayfinding de C.6 y la interfaz en el idioma de preferencia del usuario
**sin conmutador de idioma**.

**Requisitos que cubre.** RF-72 · RNF-34 (mecanismo) · RNF-43.

**Criterios de aceptación.**
1. Los seis estados canónicos existen como componentes reutilizables; ninguna pantalla de M3 o M4
   inventa el suyo.
2. Toda pantalla responde las tres preguntas de wayfinding: dónde estoy, a dónde puedo ir, cómo salgo
   (RNF-43, C.6).
3. La interfaz se muestra en ES o EN según la **preferencia del usuario**; HQ y portal **no llevan
   conmutador de idioma** (RF-72).
4. El contenido entregado (entregables, avisos) se muestra **tal como se entregó**, sin traducir
   (RF-72).
5. El shell no expone acciones que el rol del usuario no puede ejecutar, y la comprobación real está
   en el servidor (RF-68).

**Gates.** `QG` · **D2** · **D3** · alimenta **D9**.

---

#### DU-13 · Tablero de HQ

| Campo | Contenido |
|---|---|
| **Tipo** | **DU** |
| **Milestone** | M3 |
| **Depende de** | FU-12, DU-09, DU-11 · **F.2-5** |
| **Marca** | **[dependiente de confirmación]** — RF-54 |

**Qué produce.** `/hq/tablero`: las capturas web filtrables por documento, página y fecha con su
estado de entrega al CRM y **enlace directo al contacto en el CRM**; las **métricas del pipeline
leídas del CRM** (`/dashboard/metrics`, `/reports/funnel`, `/reports/sources?currency=USD`) con clave
de solo lectura y caché de 5 minutos, identificadas como dato del CRM y con marca de tiempo de la
caché; empresas activas; proyectos y entregables recientes; artículos publicados y borradores **con
sus extractos sociales listos para copiar**; actividad reciente de agentes; últimos eventos de
auditoría; y el botón **«Abrir CRM»**. Muestra además el **modo activo del adaptador de captura**
(R-24).

**Requisitos que cubre.** RF-22 (borradores visibles en HQ) · RF-25 · RF-54 · RF-55 · RF-56 (clave de
tablero) · RF-73 · RF-74 · RF-75 · RF-76 · RF-85.

**Criterios de aceptación.**
1. Las capturas del día se listan con su estado de entrega al CRM y **enlace directo a cada contacto**
   (RF-73, DoD #4).
2. El enlace profundo se construye desde una **plantilla configurable por variable de entorno**, nunca
   codificada, porque la ruta del frontend del CRM está sin confirmar (RF-54).
3. Las métricas vienen del CRM, están **marcadas como dato del CRM** y llevan la marca de tiempo de la
   caché de 5 minutos (RF-55, RF-74).
4. El tablero muestra los seis bloques restantes de RF-76 y el botón «Abrir CRM» (RF-75).
5. Los artículos aparecen con sus extractos `social.hook`, `social.linkedin` y `social.x` listos para
   copiar, y los borradores marcados como tales (RF-25, RF-22).
6. **HQ no incluye gestión de leads, etapas, oportunidades ni pipeline**: una revisión del tablero lo
   confirma. Un requisito futuro que lo pida se trata como cambio de alcance (RF-85, frontera (a)).
7. El modo activo del adaptador de captura es visible sin abrir el panel de despliegue, y mientras
   siga en `contact_note` el tablero indica **cuántas capturas exigen crear la oportunidad a mano**
   (R-04, R-24).
8. Estados resueltos: sin capturas hoy · CRM no responde (el tablero se degrada mostrando lo propio y
   señalando el fallo, no una pantalla en blanco) · caché vencida · sin permiso.
9. `slg_admin` y `slg_operator` ven el tablero; `client_*` recibe denegación.

**Gates.** `QG` · **D9** · **DoD #4**.

---

#### DU-14 · Empresas, proyectos, usuarios e invitaciones

| Campo | Contenido |
|---|---|
| **Tipo** | **DU** |
| **Milestone** | M3 |
| **Depende de** | FU-07, DU-13 |

**Qué produce.** `/hq/empresas` (crear y editar empresas cliente con nombre, slug, tipo, estado y
contacto principal), `/hq/proyectos` (crear y editar proyectos ligados a una empresa, con servicio en
**nomenclatura literal**, estado, responsable y fechas) y `/hq/usuarios` (alta de usuarios SLG,
emisión de invitaciones a empresas cliente y revocación de las no aceptadas). **Es la superficie que
convierte FU-07 en algo consumible** y la que permite cerrar el gate D8.

**Requisitos que cubre.** RF-77 · RF-78 · RF-79 · RF-86 · RNF-37 (cierre).

**Criterios de aceptación.**
1. Ricardo crea la empresa «Cliente Demo» e invita a un usuario desde HQ; la invitación llega por
   correo (DoD #5, primer tramo).
2. El campo `service` de un proyecto solo admite nomenclatura literal; el script de FU-03 lo verifica
   (RF-79).
3. Una invitación no aceptada se revoca y deja de servir de inmediato (RF-78).
4. **`slg_operator` opera solo sobre los proyectos asignados** y **no puede** crear claves de API,
   invitar usuarios SLG ni ver auditoría: los intentos se **rechazan en el servidor** y **se auditan**
   (RF-86, gate D9).
5. **Gate D8 cerrado**: login por los tres métodos · invitación aceptada por **cada uno** de los tres
   métodos · vinculación por correo verificado · recuperación de contraseña · cierre de sesión global,
   todos probados de punta a punta (RNF-37).
6. Estados resueltos: sin empresas · sin proyectos · invitación caducada · correo de invitación
   fallido (la invitación sigue creada y reenviable, RF-119).

**Gates.** `QG` · **D8** (cierre) · **D9**.

---

#### DU-15 · Entregables y avisos

| Campo | Contenido |
|---|---|
| **Tipo** | **DU** |
| **Milestone** | M3 |
| **Depende de** | FU-09, DU-14 |

**Qué produce.** `/hq/entregables`: publicación de entregables por proyecto en los cuatro tipos
(`pdf`, `html`, `md`, `link`) más `material`, por **subida de archivo o por enlace**, con visibilidad
`client` o `internal` y **control de versión desde el primer día**. Y `/hq/avisos`: publicación de un
aviso dirigido a **una empresa concreta**, con cuerpo en Markdown.

**Requisitos que cubre.** RF-80 · RF-81 · RF-143 · RNF-31 (parcial: Markdown saneado).

**Criterios de aceptación.**
1. Se publican los cinco tipos, por archivo y por enlace, con visibilidad `client` o `internal`
   (RF-80).
2. **Reemitir un entregable crea una versión nueva y no destruye la anterior**; ambas quedan
   consultables (RF-143).
3. La subida valida tipo MIME y tamaño **en el servidor** antes de aceptar el archivo (RNF-25) y el
   objeto queda en el bucket privado (RF-123).
4. El aviso se dirige a **una empresa** y su Markdown se **sanea antes de renderizarse** (RF-81,
   RNF-31).
5. Un entregable `internal` **no** es visible ni alcanzable desde el portal, ni siquiera por enlace
   directo — se verifica aquí y se vuelve a verificar en DU-19 (RF-89).
6. La atribución distingue si publicó una persona o una clave de API (RF-111).
7. Estados resueltos: proyecto sin entregables · subida fallida a medias · enlace externo roto ·
   empresa sin avisos.

**Gates.** `QG` · **D10** (archivos) · alimenta **D9**.

---

#### DU-16 · Capturas web: lista, detalle de intentos y reintento manual

| Campo | Contenido |
|---|---|
| **Tipo** | **DU** |
| **Milestone** | M3 |
| **Depende de** | DU-09, DU-13 · **spec-delta del `data_model` aprobado** (conflicto del reintento manual, `design_summary` §2 **CF-1**) |
| **Marca** | **[dependiente de confirmación]** — RF-54 |

**Condición de entrada.** El reintento manual de RF-52 **no cabe hoy en el esquema**: `data_model`
acota `crm_delivery.attempt` a 1…5 y hace único `(lead_capture_id, attempt, endpoint)`, así que un
sexto episodio no entra y reutilizar 1…5 colisiona (`design_summary` §2, CF-1). Esta unidad **no se
empieza** hasta que el spec-delta del `data_model` esté aprobado y aplicado. La vía está unificada:
**el spec-delta primero, DU-09 lo consume**, y no se resuelve dentro de DU-09 como decía
`architecture` C-2.

**Qué produce.** `/hq/capturas`: la lista de capturas web con su estado de sincronización, el
**detalle de cada intento** leído de `crm_delivery` (petición, código de respuesta, número de intento)
y la acción de **reintento manual** de una captura no entregada, cuyo resultado queda auditado.

**Requisitos que cubre.** RF-51 (superficie) · RF-52 · RF-54 · RF-84.

**Criterios de aceptación.**
1. La lista muestra estado (`pending` / `delivered` / `failed`), número de intentos y último error de
   cada captura (RF-84).
2. El detalle de intentos es consultable desde HQ y refleja exactamente las filas de `crm_delivery`
   (RF-51).
3. El **reintento manual** funciona sobre una captura `failed` y **su resultado queda auditado** con
   actor, acción y momento (RF-52).
4. Las capturas que exigen crear la oportunidad a mano en el CRM están **señaladas como tales**
   mientras el adaptador opere en modo `contact_note` (R-04).
5. El enlace a la ficha del CRM usa la plantilla configurable de RF-54.
6. Estados resueltos: sin capturas · sin capturas fallidas · CRM no responde durante el reintento ·
   reintento sobre una captura ya entregada (idempotente).

**Gates.** `QG` · alimenta **D7** y **D9**.

---

#### DU-17 · Claves de API y registro de auditoría

| Campo | Contenido |
|---|---|
| **Tipo** | **DU** |
| **Milestone** | M3 |
| **Depende de** | FU-06, DU-14 |

**Qué produce.** `/hq/claves`: creación y revocación de claves de API con nombre, propietario,
**alcances granulares**, límite de peticiones y caducidad —los tres **obligatorios en el momento de
crearla**—, mostrando la clave en claro **una sola vez**. Y `/hq/auditoria`: el registro de auditoría
consultable y filtrable, accesible **solo para `slg_admin`**.

**Requisitos que cubre.** RF-82 · RF-83 · RF-147 (superficie) · RNF-29 (cierre).

**Criterios de aceptación.**
1. No se puede crear una clave sin alcances, sin límite de peticiones y sin caducidad: el formulario y
   el servidor lo impiden (RF-82, R-14).
2. La clave en claro se muestra **una sola vez** y no se puede volver a recuperar; una segunda visita
   a la ficha no la muestra (RF-82).
3. La revocación es **inmediata**: una llamada con la clave revocada devuelve 401 en la siguiente
   petición (RF-97).
4. Los alcances son granulares y **ninguno implica a otro** (RF-147).
5. La auditoría es visible **solo** para `slg_admin`; `slg_operator` recibe denegación **auditada**
   (RF-83, RF-86).
6. El registro de auditoría **no se puede editar ni borrar desde la interfaz**, ni siquiera siendo
   `slg_admin`; una prueba lo intenta y falla (RNF-29).
7. Estados resueltos: sin claves · sin eventos de auditoría · filtro sin resultados · clave caducada.

**Gates.** `QG` · **D9** (aislamiento y alcances) · cierre de M3 con **DoD #4**.

---

### M4 — Portal de clientes

*Condición de cierre (Anexo E): **DoD #5**.*

---

#### FU-13 · Batería de pruebas de aislamiento entre empresas

| Campo | Contenido |
|---|---|
| **Tipo** | FU |
| **Milestone** | M4 |
| **Depende de** | FU-04, FU-06, DU-15 |

**Qué produce.** Las pruebas automatizadas que **demuestran** —no que sugieren— que un `client_*` no
lee recursos de otra empresa ni ninguna ruta de `/hq`. Se escribe **antes** que las pantallas del
portal, no después: es la red bajo el trapecio (`superpowers:test-driven-development`,
`deliverable_unit_completeness`). Se ejecuta en **cada** pipeline.

**Requisitos que cubre.** RF-71 (verificación) · RF-95 · RNF-19 · RNF-35 (parcial).

**Criterios de aceptación.**
1. Existe una prueba por cada recurso del portal que intenta leerlo desde una empresa ajena y espera
   **404 o 403, nunca datos** (RF-71, RF-95).
2. Existe una prueba que intenta alcanzar cada grupo de rutas de `/hq` con un `client_*` y espera
   denegación.
3. Un parámetro de organización ajena **en la petición** no cambia el resultado: el
   `organization_id` sale siempre del contexto autenticado (RF-71).
4. La batería corre **en cada pipeline** y su fallo bloquea el despliegue (RNF-19).
5. **Prueba negativa registrada**: se introduce a propósito una consulta que acepta
   `organization_id` por parámetro y la batería la detecta (R-26).
6. Ninguna prueba de esta batería puede marcarse «pendiente» ni saltarse para cerrar un DU (R-10).

**Gates.** `QG` (autorización) · **D9** · alimenta **DoD #5**.

---

#### DU-18 · Inicio del portal con avisos

| Campo | Contenido |
|---|---|
| **Tipo** | **DU** |
| **Milestone** | M4 |
| **Depende de** | FU-12, FU-13, DU-15 |

**Qué produce.** `/portal`: los avisos de SLG **dirigidos a la empresa del usuario**, con estado vacío
redactado cuando no hay ninguno.

**Requisitos que cubre.** RF-88.

**Criterios de aceptación.**
1. El usuario ve **solo** los avisos de su empresa; los de otras no aparecen ni por enlace directo
   (RF-88, FU-13).
2. El estado vacío está **redactado** —no es un hueco— y sale de `content/ui` (RF-88, RF-16).
3. El Markdown del aviso se sanea antes de renderizarse (RNF-31).
4. Estados resueltos: sin avisos · error de carga · sesión caducada · sin permiso.
5. Wayfinding resuelto: dónde estoy, a dónde puedo ir, cómo salgo (RNF-43).

**Gates.** `QG` · **D9** · alimenta **DoD #5**.

---

#### DU-19 · Proyectos, entregables y visor aislado

| Campo | Contenido |
|---|---|
| **Tipo** | **DU** |
| **Milestone** | M4 |
| **Depende de** | DU-18 · **origen separado del visor disponible (D-45)**: `[PENDIENTE: nombre del subdominio del visor, se fija en M4]` |

**Qué produce.** `/portal/proyectos` y `/portal/proyectos/[id]` con los entregables de visibilidad
`client`, y `/portal/entregables/[id]`: el visor que abre cada entregable **según su tipo** —PDF
descargable por URL firmada, HTML autocontenido en `iframe` con `sandbox` y CSP estricta, Markdown OKF
renderizado, y enlace externo señalado como tal—. El tipo es un **valor de datos**, no una rama de
código.

Produce además el **origen separado del visor** que **D-45** fija como **norma**: el HTML autocontenido
se sirve desde un **subdominio propio**, distinto del de la aplicación, con su propia CSP.
`[PENDIENTE: nombre del subdominio del visor, se fija en M4]`. El `iframe sandbox` **sin**
`allow-same-origin` y la CSP estricta **no se sustituyen**: se mantienen como **defensa en
profundidad**, no como alternativa al origen separado. La razón es que parte de los entregables HTML
los generan **agentes Hermes**: con origen separado, un script hostil dentro del entregable no puede
leer cookies de sesión ni datos de la aplicación, porque el navegador lo aísla por política de origen.

**Requisitos que cubre.** RF-89 · RF-90 · RF-95 (superficie) · RF-142 · RNF-21 · RNF-31.

**Criterios de aceptación.**
1. Se listan los proyectos de la empresa del usuario y, dentro de cada uno, **solo** los entregables
   `client`; los `internal` **no aparecen ni por enlace directo** (RF-89).
2. El HTML autocontenido se sirve **desde un origen separado** —**subdominio propio, la norma que fija
   D-45**—, en `iframe sandbox` **sin** `allow-same-origin`, con CSP que prohíbe scripts y recursos
   externos y `frame-ancestors` propio, y **sin recibir cookies de sesión** (RF-90, RNF-21, R-11).
   **El origen separado se verifica como tal, no se da por hecho**: el documento del `iframe` se sirve
   desde un host distinto del de la aplicación, y una comprobación explícita demuestra que desde dentro
   del entregable **no** se alcanzan ni las cookies de sesión ni ningún dato de la aplicación. Servir el
   HTML desde el mismo origen **rechaza la unidad**, aunque el `sandbox` y la CSP estén bien puestos:
   son defensa en profundidad, no la alternativa (D-45).
3. Se prueba con un **HTML malicioso de laboratorio** antes de cerrar la unidad: no roba sesión, no
   exfiltra datos, no carga recursos externos (R-11, gate D10). La prueba se ejecuta contra el visor
   **servido desde su origen separado definitivo**, no contra una versión local en el mismo origen.
4. Añadir un tipo de entregable es **añadir un registro y su renderizador declarado**, no reescribir
   el visor. Una decisión de tipo repartida por la interfaz **rechaza la unidad en revisión** (RF-142).
5. El PDF se sirve por URL firmada con caducidad; una firma caducada no abre nada (RNF-20).
6. El Markdown se sanea antes de renderizarse (RNF-31).
7. La batería de FU-13 pasa en verde sobre esta superficie (RF-95).
8. Estados resueltos: empresa sin proyectos · proyecto sin entregables · entregable de otra empresa
   (404) · firma caducada · error del visor.

**Gates.** `QG` · **D9** · **D10** · **DoD #5**.

---

#### DU-20 · Materiales de programa

| Campo | Contenido |
|---|---|
| **Tipo** | **DU** |
| **Milestone** | M4 |
| **Depende de** | DU-19 |

**Qué produce.** `/portal/materiales`: los entregables de tipo `material`, **separados** de los
entregables de proyecto en la presentación pero **colgando siempre de un proyecto** en el modelo.

**Requisitos que cubre.** RF-91 · RF-144.

**Criterios de aceptación.**
1. La pantalla separa «Materiales de programa» de los entregables de proyecto (RF-91).
2. **No existe ruta ni entidad que liste materiales fuera del proyecto que los contiene**: un
   material siempre se alcanza a través de su proyecto (RF-144, frontera (b) de `scope.md`).
3. `membership` **no se usa como matrícula**: en v1 un usuario pertenece a una sola empresa cliente y
   la restricción es explícita en el modelo (RF-69, RF-144).
4. No hay lecciones, progreso, evaluaciones ni certificados: **no es un LMS** (frontera (b)).
5. Estados resueltos: sin materiales · material de otra empresa (404).

**Gates.** `QG` · **D9** · alimenta **DoD #5**.

---

#### DU-21 · Miembros, perfil y paso «Agenda tu Sesión Cero»

| Campo | Contenido |
|---|---|
| **Tipo** | **DU** |
| **Milestone** | M4 |
| **Depende de** | FU-07, DU-18 · **F.2-6** |
| **Marca** | **[dependiente de confirmación]** — RF-94 |

**Qué produce.** `/portal/miembros` (`client_admin` invita miembros de **su** empresa y ve la lista;
`client_member` solo ve la lista), `/portal/perfil` (nombre, idioma de interfaz, cambio de contraseña
si usa ese método) y el paso **«Agenda tu Sesión Cero»** con enlace a calendario tomado de
`content/ui`. **Cierra M4 y DoD #5.**

**Requisitos que cubre.** RF-92 · RF-93 · RF-94 · RF-96 (cierre: la Sesión Cero solo vive aquí).

**Criterios de aceptación.**
1. `client_admin` invita a un miembro **de su propia empresa** y no puede invitar a ninguna otra; el
   intento se rechaza **en el servidor** y se audita (RF-92).
2. `client_member` ve la lista de miembros y **no** puede invitar (RF-92).
3. Cada usuario edita su nombre y su idioma de interfaz, y cambia su contraseña **solo si usa el
   método de contraseña** (RF-93).
4. Mientras la URL del calendario no exista, el paso se muestra en estado **«próximamente» y no rompe
   la pantalla** (RF-94).
5. La Sesión Cero **no** aparece en ninguna superficie pública: solo aquí, tras ingreso (RF-96,
   §10-8).
6. **DoD #5 completo**: Ricardo crea «Cliente Demo», invita a un usuario, ese usuario acepta **con
   Microsoft 365** y ve **solo** los proyectos y entregables de su empresa; la batería de FU-13
   demuestra que no puede leer recursos de otra empresa ni rutas de HQ.
7. Estados resueltos: empresa con un solo miembro · invitación pendiente · URL de calendario ausente ·
   sin permiso para invitar.

**Gates.** `QG` · **D8** · **D9** · **DoD #5** — cierre de M4.

---

### M5 — API para agentes y go-live

*Condición de cierre (Anexo E): **DoD completo** y `/review` final.*

---

#### DU-22 · API v1 de lectura: autenticación por clave, alcances, límites y auditoría

| Campo | Contenido |
|---|---|
| **Tipo** | **DU** |
| **Milestone** | M5 |
| **Depende de** | FU-06, DU-17, DU-19 · **`design_docs/api_contracts.md`** |

**Qué produce.** El armazón de `/api/v1` y sus endpoints de lectura: `Authorization: Bearer <clave>`,
alcance exigido por endpoint, límite de peticiones por clave, versión en la ruta, auditoría de toda
llamada y errores sin detalles internos. Endpoints: `GET /captures`, `GET /organizations`,
`GET /organizations/{id}/projects`, `GET /projects/{id}/deliverables`.

**Requisitos que cubre.** RF-97 · RF-98 · RF-99 · RF-100 · RF-101 · RF-103 · RF-107 · RF-108 ·
RF-109 · RF-110 · RF-111 (parcial) · RF-147 (verificación) · RNF-32 · RNF-33 (parcial) · RNF-35
(parcial).

**Criterios de aceptación.**
1. Sin clave, o con clave revocada o caducada: **401** (RF-97, DoD #6).
2. Con alcance insuficiente: **403**, y la respuesta **no filtra qué alcance faltaba** (RF-98, D9).
3. Superado el límite de la clave: **429 con cabecera de reintento** (RF-99, DoD #6).
4. `GET /captures?since=&source=` entrega **evidencia en solo lectura** con `captures:read`; **no**
   expone leads ni pipeline y no admite ninguna mutación (RF-100, RF-110, frontera (a)).
5. `GET /organizations` y `GET /organizations/{id}/projects` responden con `orgs:read`; una clave sin
   ese alcance recibe 403 (RF-101).
6. **Toda** llamada deja una entrada en `audit_log` con actor (clave), acción, entidad, identificador
   e IP (RF-107).
7. Los errores **no revelan** trazas, nombres de tabla, consultas ni versiones de dependencias
   (RF-108, RNF-32).
8. La versión va en la ruta; un cambio incompatible abriría `/api/v2` en lugar de romper `/api/v1`
   (RF-109).
9. Toda entrada externa —parámetros de consulta y de ruta incluidos— se valida contra esquema antes de
   usarse (RNF-33).
10. Existen pruebas automatizadas de 401, 403, 429 y de la granularidad de alcances (RNF-35, D9).

**Gates.** `QG` · **D9** · **DoD #6** (primer tramo).

---

#### DU-23 · API v1 de escritura y especificación OpenAPI

| Campo | Contenido |
|---|---|
| **Tipo** | **DU** |
| **Milestone** | M5 |
| **Depende de** | DU-22 |

**Qué produce.** Los endpoints de escritura: `POST /deliverables` (crea metadatos y devuelve **URL
firmada de subida**; el archivo se sube por `PUT` y se publica con `POST /deliverables/{id}/publish`),
`POST /announcements`, `POST /events`; y `GET /openapi.json` con la especificación completa,
**solo para peticiones autenticadas** con cualquier clave válida.

**Requisitos que cubre.** RF-102 · RF-104 · RF-105 · RF-106 · RF-111 · RF-146 (superficie).

**Criterios de aceptación.**
1. `POST /deliverables` con `deliverables:write` crea los metadatos y devuelve la URL firmada de
   subida; el ciclo `PUT` + `publish` funciona de punta a punta (RF-102).
2. `POST /announcements` con `announcements:write` crea un aviso dirigido a una empresa, y ese aviso
   aparece en el portal de esa empresa (RF-104).
3. `POST /events` con `events:write` registra actividad del agente, **y esa actividad aparece en el
   tablero de HQ** (RF-105, DoD #4).
4. `agent_event` acepta un `kind` no previsto con un `payload_json` estructurado **validado contra
   esquema**, sin cambiar el esquema de base de datos (RF-146).
5. `GET /openapi.json` responde **solo** a peticiones autenticadas y describe **todos** los endpoints
   con sus alcances y códigos (RF-106).
6. Toda escritura por clave queda **atribuida en el recurso creado** (`published_by`, `author`) como
   clave, **distinguible de un usuario** (RF-111).
7. **DoD #6 completo**: un agente con clave lista los proyectos de «Cliente Demo» y crea un aviso en
   su portal; una clave de solo lectura **no puede crear nada**; el exceso devuelve 429; todo queda en
   auditoría.
8. Estados y errores resueltos: cuerpo inválido · alcance insuficiente · empresa inexistente · subida
   abortada a medias.

**Gates.** `QG` · **D9** · **D10** · **DoD #6**.

---

#### FU-14 · Copias de seguridad cifradas a destino externo y restauración probada

| Campo | Contenido |
|---|---|
| **Tipo** | FU |
| **Milestone** | M5 |
| **Depende de** | FU-05 |

**Qué produce.** Copia de seguridad **diaria** de la base de datos y de los volúmenes de archivos
hacia **Cloudflare R2** (**D-21**), dentro de la categoría fijada por D-20: *object storage
S3-compatible externo, en un proveedor distinto del que aloja el VPS*. Escrito contra **API S3
genérica**: cambiar de proveedor es endpoint + credenciales en variables de entorno, ninguna línea de
código. El backup se **cifra en el VPS antes de subirlo**, con la clave de cifrado custodiada fuera del
VPS y fuera del repositorio.

**R2 no ofrece Object Lock por API estándar** (R-37), así que la inmutabilidad se sustituye por cuatro
mitigaciones que esta unidad construye, no da por supuestas: credenciales **de solo escritura y sin
permiso de borrado** para el proceso de copia · **borrado de copias antiguas ejecutado por un proceso
distinto con otras credenciales** · retención **por generaciones** (diaria, semanal, mensual), no un
único destino sobrescrito · y **restauración verificada desde una copia ANTIGUA, no solo desde la
última**. La restauración se ejecuta y se verifica en staging: un backup no restaurado no cuenta como
backup. R2 se factura por operaciones, así que el cliente de copia se configura para no dispararlas
(D-21).

**Requisitos que cubre.** RF-124 · RF-125.

**Criterios de aceptación.**
1. La copia diaria de base de datos **y** de volúmenes se ejecuta sin intervención y su resultado se
   registra; un fallo avisa (RF-124, R-27).
2. El destino está **fuera del proveedor que aloja el VPS** (RF-124, D-20).
3. **El backup se cifra antes de salir de la máquina**; la clave de cifrado no vive ni en el VPS ni en
   el repositorio (R-12).
4. La credencial del proceso de backup es de **solo escritura, sin permiso de borrado**; la purga de
   copias antiguas la ejecuta un proceso distinto con otras credenciales (R-12, R-37).
5. Existen **al menos tres generaciones** de copia (diaria, semanal, mensual), no un único destino
   sobrescrito (R-37).
6. **La restauración se ejecuta en staging y se verifica**: datos y archivos vuelven íntegros, y se
   restaura **desde una copia antigua, no solo desde la última** (RF-125, DoD #8, R-37).
7. Antes de aplicar cualquier migración de esquema se ejecuta un backup automático (R-20).
8. Cero valores de credencial en el repositorio; solo nombres de variable.

**Gates.** `QG` (secretos) · **D11** (operación) · **DoD #8**.

---

#### DU-24 · README operativo y prueba de Literacy

| Campo | Contenido |
|---|---|
| **Tipo** | **DU** |
| **Milestone** | M5 |
| **Depende de** | DU-11, DU-14, DU-17, FU-14 |

**Qué produce.** El **README operativo para una persona no programadora**, que permite hacer **siete
tareas**: cambiar un texto · publicar un artículo · añadir una descarga · crear un cliente e invitar ·
crear una clave de API · desplegar · restaurar un backup. Más el enlazado de **cada documento de
diseño desde `knowledge/index.md`** y el registro de montajes en `knowledge/log.md`. El consumidor de
esta DU es Ricardo, y la prueba de aceptación la ejecuta él.

**Requisitos que cubre.** RF-126 · RNF-39 · RNF-41.

**Criterios de aceptación.**
1. El README cubre las **siete** tareas con pasos literales, sin dar por sabido nada técnico
   (RF-126).
2. **Ricardo ejecuta sin ayuda técnica** al menos tres de ellas —cambiar un texto, añadir una descarga
   y crear un cliente— siguiendo solo el README. **Cada fallo del README es un defecto** que se
   corrige antes de cerrar la unidad (RNF-39, DoD #9).
3. El README documenta **de dónde sale cada valor** de variable de entorno y **quién puede
   regenerarlo**, sin escribir ningún valor (R-28).
4. Documenta el **modo activo del adaptador de captura al CRM** y el paso manual de creación de
   oportunidad mientras siga en `contact_note` (R-04, R-24).
5. Documenta el procedimiento de **vuelta a la imagen anterior** tras un despliegue fallido, probado
   una vez (R-20).
6. Documenta la **rotación del secreto de cliente de Entra** y su fecha de caducidad vive en
   `docs/project_memory.md` (R-03).
7. **Cada documento de diseño está enlazado desde `knowledge/index.md`** y cada montaje queda en
   `knowledge/log.md` (RNF-41, gate D12).

**Gates.** `QG` · **D12** (literacy) · **DoD #9**.

---

#### DU-25 · Go-live: contenido de producción, DNS raíz, monitor y auditoría final

| Campo | Contenido |
|---|---|
| **Tipo** | **DU** |
| **Milestone** | M5 |
| **Depende de** | **todas las anteriores** |

**Qué produce.** La puesta en producción: contenido definitivo **sin ningún `[PENDIENTE]`**, DNS del
dominio raíz apuntando a producción sin tocar los registros protegidos, **monitor de caída externo al
VPS** activo y probado (D-43), los
**doce gates del Anexo D en verde con evidencia**, las **diez pruebas del DoD** pasadas en producción,
el consumo de tokens por milestone registrado y la **auditoría holística final** del perfil.

**Requisitos que cubre.** RF-130 (verificación) · RF-131 (verificación) · RF-148 · RNF-01 (cierre) ·
RNF-18 · RNF-34 (auditoría holística) · RNF-38 · RNF-42.

**Criterios de aceptación.**
1. El script de CI **bloquea el despliegue** ante cualquier `[PENDIENTE]`, lorem ipsum, cifra sin
   fuente o nombre de cliente sin autorización en `main`; y se comprueba con una prueba negativa
   (RNF-18, DoD #10, gate D5).
2. El dominio raíz y `www` apuntan a producción por HTTPS, y `crm`, `n8n`, `evolution`, `academy` y
   los MX **siguen intactos**, verificados nombre por nombre (RF-131, R-25).
3. El monitor de caída está activo y probado (RF-130). Se verifica lo que D-43 exige: **corre fuera
   del VPS**, vigila al menos `softlandingglobal.com` y `staging.softlandingglobal.com`, y su aviso
   llega por un canal que **no depende del VPS** — se comprueba provocando la caída de producción con
   el VPS entero fuera de servicio, no solo el servicio web. Si n8n está configurado, consta
   explícitamente como monitor **secundario**.
4. **Cada gate del Anexo D (D1…D12, D2b) está escrito como checklist verificable o script, no como
   prosa**, de modo que extraerlos a un perfil propio sea mover texto (RF-148).
5. **Los doce gates en verde con evidencia en `work_log`**, cada uno con su prueba negativa hecha
   (R-26).
6. **Las diez pruebas del DoD pasan en producción**, cada una con evidencia registrada.
7. **RNF-38**: al menos una prueba con **una persona real** —un ejecutivo llegando desde móvil—
   confirma que entiende qué es `SLG_AI` y qué es `SLG_Holdings` en **menos de 3 minutos**, y el
   resultado se registra en `work_log` (DoD #1).
8. El consumo de tokens de cada milestone está en `docs/run_metadata.md` (RNF-42).
9. Se ejecuta el `/review` final con contexto limpio y se documentan hallazgos y riesgos residuales en
   `work_log` (AGENTS.md, «Before delivery»).

**Gates.** **Todos**: `QG` holístico · **D1**…**D12** y **D2b** · **DoD #1**…**#10**.

---

## 3. Trazabilidad inversa — requisito → unidad

**Regla de cierre (`requirements.md` §3):** cada requisito mapea a **al menos una** FU o DU. Un
requisito sin unidad es alcance perdido; una unidad sin requisito es alcance inventado
(AGENTS.md Regla 4).

**Universo verificado:** RF-01 … RF-148 (148 requisitos funcionales) y RNF-01 … RNF-46 (46 no
funcionales) = **194 requisitos**.

> **Corrección de cifra declarada.** El encargo de este paso hablaba de «175 requisitos
> (RF-01…RF-131, RNF-01…RNF-44)». Ese era el estado **anterior** a la reparación adversarial de
> `planning/requirements.md` del 2026-09-08, que añadió RF-132…RF-148 y RNF-45…RNF-46. Esta tabla
> cubre el documento **reparado**, que es el vigente.

### 3.1 Requisitos funcionales

| Requisito | Unidad(es) |
|---|---|
| RF-01 | DU-02 |
| RF-02 | FU-03, DU-03, DU-04, DU-05, DU-06, DU-08, DU-10, DU-11 |
| RF-03 | FU-03, DU-02 |
| RF-04 | DU-02 |
| RF-05 | DU-07 |
| RF-06 | DU-05 |
| RF-07 | DU-05, DU-08 |
| RF-08 | DU-05, DU-10 |
| RF-09 | DU-03 |
| RF-10 | DU-06, DU-10 |
| RF-11 | FU-01, DU-06 |
| RF-12 | DU-06 |
| RF-13 | DU-04 |
| RF-14 | FU-03 |
| RF-15 | FU-03, DU-06 |
| RF-16 | FU-02, FU-03 |
| RF-17 | DU-07 |
| RF-18 | FU-03 |
| RF-19 | FU-03 |
| RF-20 | FU-03 |
| RF-21 | DU-11 |
| RF-22 | DU-11, DU-13 |
| RF-23 | DU-11 |
| RF-24 | DU-11 |
| RF-25 | DU-13 |
| RF-26 | FU-03, DU-11 |
| RF-27 | DU-08 |
| RF-28 | DU-08 |
| RF-29 | DU-08 |
| RF-30 | DU-08 |
| RF-31 | FU-11 |
| RF-32 *(asumido)* | FU-11 |
| RF-33 | FU-11 |
| RF-34 | FU-11 |
| RF-35 | FU-11, DU-12 |
| RF-36 | DU-08, DU-10 |
| RF-37 | FU-04, DU-08 |
| RF-38 | FU-09, DU-08 |
| RF-39 | DU-08, DU-09 |
| RF-40 | DU-08 |
| RF-41 | DU-08 |
| RF-42 | DU-08 |
| RF-43 | DU-10 |
| RF-44 | DU-10 |
| RF-45 | DU-08, DU-09 |
| RF-46 | DU-09 |
| RF-47 | DU-09 |
| RF-48 | DU-09 |
| RF-49 | FU-04, DU-09 |
| RF-50 | DU-09 |
| RF-51 | DU-09, DU-16 |
| RF-52 | DU-16 |
| RF-53 | FU-08, DU-09 |
| RF-54 *(asumido)* | DU-13, DU-16 |
| RF-55 | DU-13 |
| RF-56 | FU-05, DU-09, DU-13 |
| RF-57 | FU-04 |
| RF-58 | DU-01 |
| RF-59 | DU-01 |
| RF-60 | FU-07 |
| RF-61 | FU-07 |
| RF-62 | FU-06, DU-01 |
| RF-63 | FU-07, DU-01 |
| RF-64 | DU-01 |
| RF-65 | DU-01 |
| RF-66 | DU-01 |
| RF-67 | FU-06 |
| RF-68 | FU-06, FU-12 |
| RF-69 | FU-04, FU-06, DU-20 |
| RF-70 | FU-06 |
| RF-71 | FU-04, FU-06, FU-13 |
| RF-72 | FU-06, FU-12 |
| RF-73 | DU-13 |
| RF-74 | DU-13 |
| RF-75 | DU-13 |
| RF-76 | DU-13 |
| RF-77 | DU-14 |
| RF-78 | DU-14 |
| RF-79 | DU-14 |
| RF-80 | DU-15 |
| RF-81 | DU-15 |
| RF-82 | DU-17 |
| RF-83 | DU-17 |
| RF-84 | DU-16 |
| RF-85 | DU-13 |
| RF-86 | FU-06, DU-14, DU-17 |
| RF-87 | FU-06, DU-02 |
| RF-88 | DU-18 |
| RF-89 | DU-15, DU-19 |
| RF-90 | DU-19 |
| RF-91 | DU-20 |
| RF-92 | DU-21 |
| RF-93 | DU-21 |
| RF-94 *(asumido)* | DU-21 |
| RF-95 | FU-13, DU-19 |
| RF-96 | FU-01, DU-05, DU-21 |
| RF-97 | DU-17, DU-22 |
| RF-98 | DU-22 |
| RF-99 | DU-22 |
| RF-100 | DU-22 |
| RF-101 | DU-22 |
| RF-102 | DU-23 |
| RF-103 | DU-22 |
| RF-104 | DU-23 |
| RF-105 | DU-23 |
| RF-106 | DU-23 |
| RF-107 | DU-22 |
| RF-108 | DU-22 |
| RF-109 | DU-22 |
| RF-110 | DU-22 |
| RF-111 | DU-15, DU-22, DU-23 |
| RF-112 | DU-12 |
| RF-113 | DU-12 |
| RF-114 | DU-12 |
| RF-115 | DU-12 |
| RF-116 | FU-08 |
| RF-117 | FU-08 |
| RF-118 *(asumido)* | FU-08 |
| RF-119 | FU-07, FU-08, DU-09, DU-14 |
| RF-120 | FU-05 |
| RF-121 | FU-05 |
| RF-122 | FU-05 |
| RF-123 | FU-09, DU-15 |
| RF-124 | FU-14 |
| RF-125 | FU-14 |
| RF-126 | DU-24 |
| RF-127 | DU-12 |
| RF-128 | FU-03, FU-05 |
| RF-129 | FU-05 |
| RF-130 | FU-05, DU-25 |
| RF-131 | FU-05, DU-25 |
| RF-132 *(compuerta)* | FU-01 |
| RF-133 *(compuerta)* | FU-10 |
| RF-134 *(compuerta)* | FU-10 |
| RF-135 | FU-03 |
| RF-136 | FU-03 |
| RF-137 | FU-03 |
| RF-138 | FU-03, DU-11 |
| RF-139 | FU-03 |
| RF-140 | FU-03 |
| RF-141 | FU-03, DU-11 |
| RF-142 | FU-04, DU-19 |
| RF-143 | FU-04, DU-15 |
| RF-144 | FU-04, DU-20 |
| RF-145 | DU-12 |
| RF-146 | FU-04, DU-23 |
| RF-147 | FU-06, DU-17, DU-22 |
| RF-148 | FU-05, DU-25 |

### 3.2 Requisitos no funcionales

Los RNF **no se reparten por unidad: se aplican como gate** (`requirements.md` §3-4). La columna
«unidad» indica dónde se **implementa y se verifica primero**; todos se vuelven a comprobar en la
auditoría final (DU-25).

| Requisito | Unidad(es) donde se implementa/verifica | Gate que lo ancla |
|---|---|---|
| RNF-01 | DU-07, DU-11, DU-25 | D1 |
| RNF-02 | DU-07 | D1 |
| RNF-03 | FU-02, FU-05 | D1 |
| RNF-04 | FU-10 | D2 |
| RNF-05 | FU-02 *(token del anillo de foco de dos capas, D-44)*, FU-10 *(verificación)* | D2 |
| RNF-06 | FU-10 | D3 |
| RNF-07 | FU-10 | D2b / C.3 |
| RNF-08 | FU-10 | D3 |
| RNF-09 | FU-10 | D3 |
| RNF-10 | FU-10 | D3 |
| RNF-11 | FU-10 | D3 |
| RNF-12 | FU-10 | D3 |
| RNF-13 | FU-02, FU-10 | D2b |
| RNF-14 | FU-02 | D2b / D1 |
| RNF-15 | FU-02 | D2b |
| RNF-16 | FU-03, FU-01 | D4 |
| RNF-17 | DU-07 | D6 |
| RNF-18 | FU-03, FU-01, DU-25 | D5 |
| RNF-19 | FU-13 | D9 |
| RNF-20 | FU-09, DU-19 | D10 |
| RNF-21 | DU-19 | D10 |
| RNF-22 | FU-05 | `QG` / B.8 |
| RNF-23 | DU-01 | D8 |
| RNF-24 | DU-01 | D8 |
| RNF-25 | FU-04, FU-09, DU-15 | D10 / `QG` |
| RNF-26 | FU-02, FU-05 | `QG` |
| RNF-27 | FU-02, FU-09 | `QG` |
| RNF-28 | FU-02, FU-05 | `QG` |
| RNF-29 | FU-04, DU-17 | `QG` / B.8 |
| RNF-30 | FU-04 | `QG` |
| RNF-31 | DU-15, DU-18, DU-19 | `QG` |
| RNF-32 | FU-06, DU-22 | `QG` / D9 |
| RNF-33 | FU-04, FU-11, DU-22 | `QG` |
| RNF-34 | **todas las DU** | perfil `deliverable_unit_completeness` |
| RNF-35 | DU-01, DU-09, FU-13, DU-22 | D7 / D8 / D9 |
| RNF-36 | DU-09 | D7 |
| RNF-37 | DU-01, DU-14 | D8 |
| RNF-38 | DU-03, DU-25 | DoD #1 |
| RNF-39 | DU-24 | D12 |
| RNF-40 | FU-05, DU-09 | `QG` / B.6 |
| RNF-41 | DU-24 | D12 |
| RNF-42 | FU-05, DU-25 | AGENTS.md |
| RNF-43 | FU-10, FU-12 | D3 / C.6 |
| RNF-44 | FU-01, DU-03 | D2b |
| RNF-45 | FU-10, DU-02 | D3 |
| RNF-46 | FU-10 | D3 |

### 3.3 Requisitos huérfanos

**Ninguno.** Los 148 requisitos funcionales y los 46 no funcionales tienen al menos una unidad
asignada. La verificación se hizo requisito por requisito sobre `planning/requirements.md` en su
versión reparada del 2026-09-08.

**Tampoco hay unidades sin requisito**: las 39 unidades citan al menos un `RF-` o `RNF-` existente, y
ninguna introduce funcionalidad sin requisito que la respalde (AGENTS.md Regla 4).

### 3.4 Requisitos que ordenan en vez de cerrarse

RF-132, RF-133 y RF-134 aparecen en la tabla asignados a FU-01 y FU-10, pero **no se cierran con una
unidad: ordenan las unidades**. Su efecto está declarado en §0.4 y se repite en la fila «Depende de»
de cada DU de página: `DU-03` en adelante depende de que **ambas compuertas estén cerradas**.

### 3.5 Requisitos de extensibilidad

RF-141 a RF-148 **no construyen nada** de `scope.md` § «Previsto»: **restringen cómo** se construye la
v1. Se verifican en la revisión de la unidad que toca la entidad o el evento afectado —FU-03, FU-04,
FU-05, FU-06, DU-11, DU-12, DU-15, DU-17, DU-19, DU-20, DU-22, DU-23, DU-25— y **de nuevo en la
auditoría final** (DU-25).

---

## 4. Resumen de conteos

| Milestone | FU | DU | Total | Unidades (en orden de ejecución) |
|---|---:|---:|---:|---|
| **M0-A** Fundaciones: plataforma y contenido | 4 | 0 | **4** | FU-02, FU-03, FU-04, FU-05 |
| **M0-B** Fundaciones: identidad y servicios | 4 | 1 | **5** | FU-06, FU-07, FU-08, FU-09, DU-01 |
| **M1-A** Pública: compuertas y componentes | 2 | 2 | **4** | FU-01, FU-10, DU-02, DU-03 |
| **M1-B** Pública: páginas | 0 | 4 | **4** | DU-04, DU-05, DU-06, DU-07 |
| **M2** Conversión y contenido | 1 | 5 | **6** | FU-11, DU-08, DU-09, DU-10, DU-11, DU-12 |
| **M3** HQ | 1 | 5 | **6** | FU-12, DU-13, DU-14, DU-15, DU-16, DU-17 |
| **M4** Portal | 1 | 4 | **5** | FU-13, DU-18, DU-19, DU-20, DU-21 |
| **M5** API + go-live | 1 | 4 | **5** | DU-22, DU-23, FU-14, DU-24, DU-25 |
| **Total** | **14** | **25** | **39** | |

---

## 5. Huecos y desviaciones declarados

Ninguno se resuelve inventando. Todos son visibles y ninguno se esconde.

**Los números de la columna `#` son identificadores estables, no un contador.** Los huecos **5**
(«dos categorías de stack sin producto nombrado») y **6** («umbrales `[PENDIENTE]`») **se han
retirado por estar cerrados** —D-21 y D-22 nombran producto, y `api_contracts` §11.9 y `data_model`
§2.6 fijan los umbrales— y sus números **no se reasignan**, para que las referencias externas de tipo
`§5-7` o `§5-13` sigan apuntando a la misma fila. El hueco **1** dejó de serlo por la misma razón y se
conserva como fila informativa.

| # | Hueco o desviación | Efecto | Ref. |
|---|---|---|---|
| 1 | **Los cinco `design_docs` que el perfil exige están producidos**: `data_model` (nivel HIGH), `api_contracts` (HIGH), `ui_wireframes` (MEDIUM), `architecture` (MEDIUM) y `style_guide` (LIGHT). | **Deja de ser un hueco.** El bloqueo que este documento declaraba sobre **FU-04, FU-09, DU-22 y DU-23** queda **levantado**: existía porque faltaban `data_model` y `api_contracts`, y son justo los que fijaron RNF-25 y RNF-20. | perfil `design_docs`, §0.6 |
| 2 | **M0 y M1 subdivididos** en M0-A/M0-B y M1-A/M1-B | Salían con 9 y 8 unidades, por encima del máximo de 6. No cambia contenido ni orden comercial del Anexo E. | §2 |
| 3 | **FU-01 no es la primera unidad en ejecutarse** | El Anexo E la nombra literalmente «FU-01» y la sitúa en M1; se conserva su identificador. Su **producción** arranca en paralelo a M0 como dependencia externa; su **compuerta** pertenece a M1-A. | Anexo E, R-02, R-15 |
| 4 | **RF-134 reordena el orden literal de C.5** | C.5 empieza por la barra de navegación; RF-134 exige el formulario de descarga primero. FU-10 cumple los dos: formulario validado antes, resto en el orden de C.5. Se registra en `decision_log`. | C.5, RF-134 |
| 7 | **Tres requisitos `asumido`** (**RF-32, RF-54 y RF-94**) | Sus unidades quedan marcadas **[dependiente de confirmación]**: FU-11 (RF-32), DU-13 y DU-16 (RF-54), DU-21 (RF-94). Una corrección de Ricardo se resuelve por spec-delta **sin rehacer la unidad**. **RF-118 no está en la lista**: `requirements.md` §3-5 lo pasó de `asumido` a `explícito` porque D-22 fija el adaptador SMTP, así que FU-08 deja de llevar la marca. | §0.5, `requirements.md` §3-5 |
| 8 | **Los 11 documentos de descarga y el copy se producen fuera de este repositorio** | No bloquean el go-live: una página sin archivo publica «disponible próximamente» y captura el correo igual. Sí bloquean la compuerta FU-01. | D-17, R-02, R-18 |
| 9 | **S-01** | Verificación de higiene de credenciales, previa y de Ricardo, no unidad; se sigue fuera del repo. Hasta cerrarla, **FU-05 no carga variables de integración y DU-09 no se conecta al CRM**. | S-01, R-08 |
| 10 | **Sin fecha de go-live** | Ninguna unidad tiene plazo. El orden es por dependencia, no por calendario. | Anexo I-1 |
| 11 | **El brief todavía dice «9 u 11» descargas** (nota de A.2) | D-17 lo resolvió en **11**. Este documento sigue D-17. El brief queda desactualizado en ese punto. | A.2, D-17 |
| 12 | **`risks.md` declara 38 riesgos, no 36** | Las referencias `R-NN` de este documento apuntan al archivo vigente, que llega hasta R-38. | `planning/risks.md` |
| 13 | **El remitente `support@softlandingglobal.com` que fija el brief §5.1 y RF-117 entra en conflicto con el subdominio de envío dedicado de D-24** | Condición de entrada de **FU-08**: la dirección remitente definitiva es la sub-decisión **P-3** y el nombre del subdominio la **P-4**; ambas siguen abiertas, se fijan en **M0** y se registran en `decision_log` **antes** de construir la unidad. El `Reply-To` sí es `support@softlandingglobal.com`, y `support@` sigue siendo el **destinatario** de los avisos (RF-53). | §5.1, RF-117, D-24, R-38, P-3, P-4 |
| 14 | **CF-3 — anillo de foco: RESUELTO por D-44.** El Anexo C.1 lista `--cyan` entre los usos de anillo de foco, pero medido da 2,4:1 sobre `--paper` y no cumple RNF-05 ni el gate D2. | **Deja de ser conflicto.** El anillo es de **dos capas**: exterior `--cyan` (#50B4DC), interior `--blue-primary` (#2878B4) o `--ink`. Es una **precisión** del kit, no una contradicción: conserva su intención cromática y añade el contraste que faltaba. **Token en FU-02, verificación en FU-10** contra el gate D2. Ningún componente define un anillo de una sola capa en `--cyan`. | D-44, `design_summary` §2 CF-3, C.1, RNF-05, D2 |
| 15 | **CF-4 — origen del visor de entregables HTML: RESUELTO por D-45.** `data_model` §3.10 y `ui_wireframes` §7.3 prometían origen separado; `architecture` §11.3 especificaba solo `iframe sandbox` + CSP. | **Deja de ser conflicto, a favor del origen separado como NORMA**: el HTML se sirve desde un **subdominio propio**. El `iframe sandbox` sin `allow-same-origin` y la CSP estricta **se mantienen** como defensa en profundidad, no como alternativa. Razón: parte de los entregables los generan agentes Hermes, y con origen separado un script hostil no puede leer cookies de sesión ni datos de la aplicación. **Se construye en DU-19.** Queda `[PENDIENTE: nombre del subdominio del visor, se fija en M4]`. | D-45, `design_summary` §2 CF-4, RF-90, RNF-21, R-11, D10 |
| 16 | **Monitorización externa: categoría CERRADA por D-43, producto abierto** | La categoría —servicio de uptime dedicado con tramo gratuito, ejecutado **fuera del VPS**— cierra P-5, RF-130 y el gate D11, y resuelve R-29. **Ya no bloquea la aprobación del plan.** Lo único abierto es el **producto concreto**, que se elige con 2–3 candidatos **antes de FU-05** y no bloquea el arranque; afecta a **FU-05** y **DU-25**, ambas fuera de M0-A. n8n queda como monitor **secundario** por correr en el mismo VPS que debería vigilar. | D-43, P-5, R-29, RF-130, D11 |

---

## Registro

- `2026-09-08` — Creado en el paso 7 de `init-project` sobre `START_PROJECT.md` v1.1 (§1 Constraints,
  §4, §5.1, §7, §10, Anexos A, B, C, D, E, F), `AGENTS.md` v4.1, `profiles/software-app/profile.md`,
  `planning/requirements.md` reparado (RF-01…RF-148, RNF-01…RNF-46), `planning/scope.md`,
  `planning/risks.md` (R-01…R-38), `docs/decision_log.md` (D-14…D-24, S-01),
  `design_docs/ui_wireframes.md` y `skills/inventory.md`. **14 FU + 25 DU = 39 unidades** en 8
  milestones (M0 y M1 subdivididos). Trazabilidad inversa completa: **cero requisitos huérfanos** y
  cero unidades sin requisito. Doce huecos y desviaciones declarados en §5. Sin nombrar producto en
  las dos categorías abiertas (AGENTS.md Regla 7).
- `2026-09-08` — Sincronizado con el **cierre de la fase de diseño** (los cinco `design_docs`
  producidos: `data_model` HIGH, `api_contracts` HIGH, `ui_wireframes` MEDIUM, `architecture` MEDIUM,
  `style_guide` LIGHT) y con `docs/decision_log.md` **D-21…D-24** (AGENTS.md Regla 6). Cambios:
  **§0.5** pasa de cuatro requisitos `asumido` a los **tres reales** (RF-32, RF-54, RF-94) y **FU-08
  pierde la marca [dependiente de confirmación]**, porque RF-118 dejó de ser `asumido`;
  **§0.6** recoge los dos umbrales **ya fijados** (RNF-20 en `api_contracts` §11.9, RNF-25 en
  `data_model` §2.6) y **levanta el bloqueo** declarado sobre FU-04, FU-09, DU-22 y DU-23;
  **§0.7** y **§1** nombran el producto elegido por Ricardo en cada categoría —**Resend** (D-22) y
  **Cloudflare R2** (D-21)— conservando la cláusula de adaptador (SMTP estándar y API S3 genérica);
  **FU-08** escribe el remitente en el **subdominio de envío** (D-24) con `Reply-To` a
  `support@softlandingglobal.com` y el valor exacto como `[PENDIENTE: P-3 y P-4, se fijan en M0]`;
  **FU-14** nombra R2 e incorpora las mitigaciones de **R-37**; **DU-16** suma como condición de
  entrada el **spec-delta del `data_model`** (CF-1 de `design_summary` §2). En **§5** se retiran los
  huecos **5** y **6** por estar cerrados y el **1** deja de ser hueco; quedan **diez** declarados.
  Ninguna unidad se reabre y ningún conteo cambia: siguen 14 FU + 25 DU = 39 unidades.
- `2026-09-08` — Sincronizado con `docs/decision_log.md` **D-43, D-44 y D-45** (AGENTS.md Regla 6).
  **D-44 (anillo de foco de dos capas):** **FU-02** produce el token —capa exterior `--cyan` (#50B4DC),
  capa interior `--blue-primary` (#2878B4) o `--ink`— como criterio de aceptación propio, y **FU-10 lo
  verifica contra el gate D2** midiendo el contraste y registrándolo en `work_log`; el criterio 3 de
  FU-10 aclara que ahí `--cyan` es capa de anillo, no color de texto, de modo que no colisiona con
  RNF-04. **D-45 (visor desde origen separado):** **DU-19** suma a «qué produce» el **origen separado
  (subdominio propio)** como norma, con `[PENDIENTE: nombre del subdominio del visor, se fija en M4]`
  como condición de entrada, y sus criterios exigen verificarlo —servir el HTML desde el mismo origen
  rechaza la unidad— manteniendo `iframe sandbox` sin `allow-same-origin` y CSP estricta como **defensa
  en profundidad**; la prueba con HTML malicioso se ejecuta contra el origen separado definitivo.
  **D-43 (monitorización externa):** **§0.7** pasa de dos a **tres** categorías, la tercera con
  categoría cerrada y **producto abierto**; **§1** añade esa elección de producto como dependencia
  externa que condiciona el cierre de FU-05 pero **no el arranque**; **FU-05** describe y prueba el
  monitor **fuera del VPS** (nuevo criterio 9: producto elegido y registrado antes de ejecutar la
  unidad) y **DU-25** verifica que corre fuera del VPS y avisa por un canal independiente, con n8n
  constando como **secundario**. En **§5** se añaden los huecos **14** (CF-3 resuelto por D-44),
  **15** (CF-4 resuelto por D-45) y **16** (monitorización: categoría cerrada, producto abierto);
  quedan **trece** declarados. Ninguna unidad se reabre y ningún conteo cambia: siguen 14 FU + 25 DU =
  39 unidades.
