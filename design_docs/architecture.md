---
type: architecture
title: architecture
project: slg_website
description: Arquitectura de slg_website — una aplicación con tres superficies y una API, orden exacto de las comprobaciones del middleware, estrategia de renderizado por ruta, i18n, capa de contenido, ejecución de los trabajos en segundo plano sin orquestador externo, servicios de Easypanel, puertos y adaptadores, copias de seguridad y restauración, correo sobre subdominio de envío dedicado, seguridad, modos de fallo de las integraciones y registros DNS.
tags: [slg, slg_website, design-doc, arquitectura, nextjs, easypanel, colas, puertos-adaptadores, backups, dns, okf, software-app]
status: design
level: MEDIUM
timestamp: 2026-09-08
sources:
  - "START_PROJECT.md v1.1 — §0, §4 (DoD #1…#10), §5.1, §5.2, §5.3, §7, §9, Anexos A.2, A.4, B.1–B.8, C.4, D (D1…D12), F.1, F.2"
  - "planning/requirements.md — RF-01…RF-148, RNF-01…RNF-46"
  - "planning/scope.md — Dentro de v1 · Fronteras (a)…(j)"
  - "planning/risks.md — R-01, R-04, R-12, R-20, R-23, R-24, R-25, R-27, R-37, R-38"
  - "docs/decision_log.md — D-14 … D-24 · incidencia S-01 · sub-decisiones P-3, P-4"
  - "design_docs/data_model.md — §2.6, §3.8, §5.9, §5.10, §5.12, §5.18, §5.19, §6, §7"
  - "design_docs/ui_wireframes.md — §1.2, §1.3, §1.4"
  - "implementation/user_units.md — FU-03, FU-04, FU-05, FU-06, FU-08, FU-09, FU-11, FU-14, DU-08, DU-09, DU-10"
  - "profiles/software-app/profile.md — design_docs (architecture: MEDIUM), quality_gate"
---

# Arquitectura — slg_website

Documento de diseño del paso 6 de `init-project`, nivel **MEDIUM** declarado por el perfil
`software-app`. Define **qué componentes existen, cómo se comunican y cómo se despliegan**. Es el
documento que se abre cuando la pregunta es *«¿dónde vive esto y quién lo ejecuta?»*.

---

## 0. Cómo se lee este documento

### 0.1 Qué decide y qué no

| Decide aquí | Vive en otro documento |
|---|---|
| Qué grupos de rutas existen y por qué son un solo despliegue | Tablas, columnas, índices y `ON DELETE` → `data_model` |
| El orden exacto de las comprobaciones del middleware y el fallo de cada una | Códigos de estado por endpoint, formas de petición y respuesta, y la caducidad de la URL firmada (RNF-20) → `api_contracts` |
| Qué se renderiza estático, qué dinámico y con qué justificación | Qué bloques tiene cada pantalla y sus estados → `ui_wireframes` |
| Cómo se ejecutan los trabajos en segundo plano y qué pasa si el proceso muere | Tokens, tipografía, motion → `style_guide` |
| Qué servicios se despliegan y cómo se comunican | El copy y las cadenas de interfaz → `content/` |
| Qué puertos aíslan a los proveedores externos y qué operación expone cada uno | El texto de cada correo → `content/` (claves de plantilla, `data_model` §5.19) |
| Qué se copia, a dónde y cómo se restaura | Qué requisito cubre cada unidad y su criterio de aceptación → `implementation/user_units.md` |

### 0.2 Notación de orígenes

Se usa la notación disjunta declarada en `planning/requirements.md`:

- `§N` — sección del brief · `§10-N` — decisión HITL de Ricardo (fila N de §10).
- `A.N` / `B.N` / `C.N` / `F.N` — sección de anexo del brief (`B.1` = las tres superficies,
  `B.6-2` = paso 2 del flujo del CRM, `F.2-4` = pre-requisito externo 4).
- `D1` … `D12`, `D2b` — gates del Anexo D, sin guion.
- `DoD #N` — prueba N de la Definition of Done (§4).
- `D-14` … `D-24` — decisiones de `docs/decision_log.md`; `P-3`, `P-4` sus sub-decisiones abiertas.
- `D-01` … `D-11` — los once documentos de descarga (A.4, D-17). Nunca son origen: son dato.
- `R-NN` — riesgo de `planning/risks.md` · `RF-NN` / `RNF-NN` — requisito.
- `FU-NN` / `DU-NN` — unidad de `implementation/user_units.md`.

### 0.3 Reglas duras que gobiernan toda la arquitectura

1. **Nada inventado.** Donde el brief y las decisiones no fijan un valor, aquí aparece
   `[PENDIENTE: …]` o una **decisión de este documento** con su razón y su obligación de quedar
   registrada en `docs/decision_log.md` (§15). No hay terceros valores.
2. **El repositorio es público** (§10-6). En este documento hay **nombres** de variables de entorno
   y **cero valores**; ningún detalle operativo de incidencias de seguridad.
3. **Un solo sistema de registro comercial**: el CRM (§10-13, frontera (a)). La web captura, entrega
   y guarda evidencia.
4. **MCP para construir, API para operar** (frontera (i)). Ningún componente desplegado llama a un
   MCP; ninguna clave de producción se usa desde una sesión de agente.
5. **La configuración cambia; el hecho ocurrido no.** Todo lo que un proveedor decida (remitente,
   modo del CRM, destino de copias) viaja por variable de entorno y **se persiste en la fila** que
   documenta el hecho, para que cambiar la configuración no reescriba la historia (`data_model` §7.2,
   §5.19).

---

## 1. Una aplicación, tres superficies

### 1.1 Por qué un solo despliegue y no tres

B.1 lo fija y §2 explica la razón de negocio: *«las tres comparten identidad, base de datos, diseño y
despliegue»*. La arquitectura lo sostiene con cuatro argumentos concretos, y conviene enunciarlos
porque la tentación de separar aparece en cuanto HQ crece:

| Argumento | Qué costaría separarlas |
|---|---|
| **Una sola sesión** | Better Auth emite una cookie de sesión (RF-65). Con tres despliegues en dominios distintos habría que federar sesión entre orígenes o duplicar el login: tres veces la superficie de identidad, que es justo donde vive el riesgo crítico R-10. |
| **Un solo modelo de datos** | Las 19 tablas de `data_model` son un grafo conectado: `deliverable` lo escribe HQ y lo lee el portal; `lead_capture` lo escribe la capa pública y lo lee HQ; `audit_log` lo escriben las tres. Separar despliegues exigiría una API interna entre ellos, que es una segunda API que mantener y auditar. |
| **Un solo presupuesto de operación** | §9 registra «un solo VPS» como riesgo asumido. Tres servicios web no lo mitigan (siguen en la misma máquina) y triplican despliegues, certificados, variables y puntos de fallo. |
| **Una sola disciplina de despliegue** | RF-121 exige `main` → producción y `develop` → staging sin intervención. Un solo servicio hace que «desplegado» sea un estado único y verificable; tres hacen posible la combinación incoherente. |

**Lo que sí está separado, y es lo que importa:** el *aislamiento* no lo da el despliegue, lo dan las
cinco capas de `data_model` §6 (contexto como única fuente del `organization_id`, seguridad a nivel de
fila, repositorio con alcance, verificación —no uso— del parámetro de la petición, y la prueba que
recorre el catálogo). Separar procesos habría dado una sensación de aislamiento sin ninguna de esas
cinco capas.

### 1.2 El árbol de grupos de rutas

```
softlandingglobal.com                      (un solo servicio: slg-web)
│
├── (public)      ES en la raíz · EN bajo /en · 27 rutas por idioma (A.2, RF-02)
│   ├── /                                  Home
│   ├── /ai · /ai/academy/** · /ai/enterprise/** · /ai/factory/**
│   ├── /holdings · /doctrina · /nosotros
│   ├── /blog · /blog/[slug] · /blog/etiqueta/[tag]
│   ├── /descargas · /descargas/[slug] · /gracias
│   ├── /contacto · /legal/privacidad · /legal/terminos
│   ├── /en/**                             el par completo en inglés
│   └── sistema: /sitemap.xml · /robots.txt · /blog/rss.xml (uno por idioma) · 404 · 500
│
├── (auth)        sin sesión previa; nunca indexadas
│   ├── /acceder            (/en/sign-in)   tres métodos (RF-58)
│   ├── /invitacion/[token]                 un solo uso, 72 h (RF-60)
│   └── /recuperar                          enlace de un solo uso (RF-64)
│
├── (hq)          /hq/**       roles slg_admin · slg_operator
│   └── tablero · empresas · usuarios e invitaciones · proyectos · entregables ·
│       avisos · capturas web · claves de API · auditoría
│
├── (portal)      /portal/**   roles client_admin · client_member
│   └── inicio y avisos · proyectos y entregables · materiales · miembros ·
│       perfil · Sesión Cero
│
└── api/
    ├── /api/v1/**            agentes por clave (B.5) — captures · organizations ·
    │                         projects · deliverables · announcements · events · openapi.json
    ├── /api/auth/**          rutas del módulo de identidad (callbacks OAuth de F.2-2 y F.2-3)
    └── /api/internal/**      endpoints propios de la aplicación (formularios, visor de
                              entregables, disparador del barrido). Nunca aceptan clave de agente.
```

**Tres precisiones que evitan errores de construcción:**

1. `/hq/**` y `/portal/**` **existen desde M0** pero no se enlazan desde ninguna pantalla pública
   hasta que cierre su milestone (`ui_wireframes` §1.3, RF-87). Existir sin enlazar no es ocultar:
   la autorización es del servidor, no de la ausencia de enlace.
2. `api/v1` y `api/internal` son **espacios distintos con autenticación distinta**. Una clave de
   agente no abre `api/internal`; una cookie de sesión no abre `api/v1`. Mezclarlos convertiría cada
   endpoint interno en superficie de agente sin que nadie lo hubiera decidido.
3. Los grupos de rutas son una convención de organización, no un límite de seguridad. **El límite es
   la comprobación del servidor** (RF-68): ocultar un botón, o no enlazar una ruta, no autoriza nada.

### 1.3 Qué comparten las tres superficies y qué no

| Comparten | No comparten |
|---|---|
| Proceso, base de datos, esquema y capa de acceso con alcance (`data_model` §6.4) | **Estrategia de renderizado**: la pública es estática; HQ y portal, servidor por petición (§3) |
| Módulo de identidad y sesión (FU-06) | **Presupuesto de JavaScript**: el gate D1 (< 150 KB gz) obliga solo a la capa pública (RNF-03) |
| Tokens de marca y sistema de componentes (FU-02, FU-10) | **Idioma**: la pública se resuelve por ruta; HQ y portal, por preferencia del usuario (RF-72) |
| Capa de contenido: todo texto visible sale de `content/` (RF-16) | **Conmutador de idioma**: solo la pública lo tiene (`ui_wireframes` §1.2) |
| Auditoría, correo, almacenamiento de archivos, colas | **Indexación**: la pública se indexa; el resto, `noindex` |

---

## 2. Middleware: orden exacto de las comprobaciones

### 2.1 Qué hace y qué no hace el middleware

El middleware es un **clasificador barato en el borde de la petición**, no la autorización. Hace tres
cosas: resolver el idioma en `(public)`, exigir *presencia y forma* de credencial en `(hq)`,
`(portal)` y `api/v1`, y aplicar las cabeceras comunes de respuesta.

**Lo que deliberadamente NO hace:**

- **No decide permisos finos.** La matriz B.3 se aplica en el servidor, en cada acción (RF-68). Un
  middleware que autorizara sería un único punto que, al fallar, abre todo.
- **No es la única puerta.** Cada layout de `(hq)` y `(portal)` y cada manejador de `api/v1` repite
  la verificación autoritativa contra la base de datos. La duplicación es intencionada: si mañana una
  ruta escapa al emparejado del middleware, sigue protegida.
- **No consulta el `organization_id` para filtrar.** El alcance por organización se aplica en la capa
  de acceso a datos (`data_model` §6.2–§6.4), no aquí.

### 2.2 `(public)` — resolución de idioma

| # | Comprobación | Si falla |
|---|---|---|
| 1 | ¿La ruta empieza por `/en`? | No es fallo: **`es`** si no empieza, **`en`** si empieza. Nada más decide el idioma |
| 2 | ¿Existe la ruta en el árbol del idioma resuelto? | **404 propia y bilingüe** en ese idioma (RF-17). Nunca redirección al otro idioma ni a la portada |
| 3 | Cabeceras de respuesta comunes (§11.1) | — |

**La regla dura:** ninguna redirección automática por idioma del navegador sobrescribe la ruta pedida
(RF-03, criterio 7 de FU-03). Pedir `/en/ai` con `Accept-Language: es` devuelve `/en/ai`. El idioma es
una propiedad de la URL, no una negociación: una URL compartida en LinkedIn debe abrir para todos la
misma página, y el `hreflang` (RF-05) le dice al buscador lo demás.

### 2.3 `(auth)` — sin sesión previa

| # | Comprobación | Si falla |
|---|---|---|
| 1 | ¿Trae cookie de sesión válida en forma? | No es fallo: se sirve la pantalla |
| 2 | Si la trae, ¿la sesión resuelve a un usuario con rol? | Si resuelve, **redirección a la superficie de su rol** (`/hq/tablero` o `/portal`), para no ofrecer un login a quien ya entró |
| 3 | `noindex` en todas las rutas del grupo | — |

`/invitacion/[token]` es la excepción: se sirve **siempre**, con o sin sesión, porque aceptar una
invitación puede exigir cambiar de identidad (RF-61, RF-63).

### 2.4 `(hq)` y `(portal)` — sesión, rol y pertenencia

El orden importa porque cada paso decide **qué se le cuenta al que llama**:

| # | Comprobación | Si falla |
|---|---|---|
| 1 | ¿Hay cookie de sesión y su firma es válida? | **Redirección a `/acceder`** con la ruta de retorno. No es una fuga: cualquiera sabe que hay un login |
| 2 | ¿La sesión existe, no ha expirado y no fue revocada (RF-66)? | **Redirección a `/acceder`** y borrado de la cookie |
| 3 | ¿El rol del usuario corresponde a esta superficie? `slg_*` → `(hq)`, `client_*` → `(portal)` | **404**, nunca 403 (`ui_wireframes` §1.4, RF-95). Un 403 confirmaría que la ruta existe, y el mapa de HQ no es información pública |
| 4 | Solo `(portal)`: ¿el usuario tiene pertenencia activa a una organización de tipo `client`? | **404**. Un usuario cliente sin empresa activa no tiene portal que ver |
| 5 | Solo rutas de `slg_admin` (`/hq/claves`, `/hq/auditoria`): ¿el rol es `slg_admin`? | **404** para `slg_operator` (`ui_wireframes` §6.8, §6.9, RF-86) |
| 6 | El layout del grupo repite 2–5 **contra la base de datos** y publica el contexto de sesión | Si discrepa del middleware, manda el layout: se cierra la sesión y se redirige |

**El `organization_id` nunca sale de aquí.** Sale del contexto de sesión que publica el layout, y la
capa de acceso lo aplica sola (`data_model` §6.2). Un `organization_id` que llegue por parámetro se
**verifica** contra el del contexto y, si no coincide, la respuesta es 404 (`data_model` §6.5,
RF-71).

### 2.5 `api/v1` — clave, cuota y alcance

| # | Comprobación | Si falla | Por qué en este orden |
|---|---|---|---|
| 1 | ¿Hay cabecera `Authorization: Bearer`? | **401** (RF-97) | Sin identidad no hay nada que medir ni que autorizar |
| 2 | ¿La clave existe, no está revocada y no ha caducado? | **401** (RF-97) | Igual que 1; el mensaje no distingue «no existe» de «revocada» |
| 3 | ¿La clave está dentro de su límite de peticiones? | **429** con cabecera de reintento (RF-99) | **Antes** del alcance a propósito: si el 403 fuera primero, una clave podría martillear endpoints prohibidos sin consumir cuota, y el límite dejaría de ser un límite |
| 4 | ¿La clave tiene el alcance que exige **este** endpoint? | **403 sin decir qué alcance faltaba** (RF-98) | Decir el alcance que falta es entregar el mapa de alcances a quien todavía no ha demostrado tenerlo |
| 5 | ¿El cuerpo o los parámetros validan contra el esquema? | **400** (RNF-33) | Se valida después de autorizar: un no autorizado no merece un análisis de su cuerpo |
| 6 | Ejecuta el manejador con el alcance por organización aplicado | 404 si el recurso no pertenece al ámbito de la clave | — |
| 7 | Escribe en `audit_log` actor, acción, entidad, identificador e IP | — | **Los siete resultados se auditan**, también el 401 y el 429 (RF-107): un intento rechazado es exactamente lo que hay que poder mirar después |

Ningún error de la API revela trazas, nombres de tabla, consultas ni versiones (RF-108, RNF-32).

### 2.6 Resumen de fallos, en una tabla

| Situación | Respuesta | Origen |
|---|---|---|
| Ruta pública inexistente | 404 bilingüe propia | RF-17 |
| `(hq)`/`(portal)` sin sesión | Redirección a `/acceder` | RF-70 |
| `client_*` pidiendo `/hq/**` | **404** | RF-95, `ui_wireframes` §1.4 |
| `slg_operator` pidiendo `/hq/claves` | **404** | RF-86 |
| Recurso de otra empresa | **404** | RF-71 |
| API sin clave o clave revocada | 401 | RF-97 |
| API sobre el límite | 429 + cabecera de reintento | RF-99 |
| API con alcance insuficiente | 403 sin nombrar el alcance | RF-98 |
| Entrada que no valida | 400 | RNF-33 |

---

## 3. Estrategia de renderizado

### 3.1 El principio

**Lo que no depende de quién mira, se calcula una vez en el despliegue. Lo que depende de quién mira,
se calcula en el servidor en cada petición y no se guarda en ninguna caché compartida.**

De ahí salen las dos mitades del sistema: la capa pública es un sitio prerenderizado que debe pasar el
gate D1; HQ y portal son una aplicación con render en servidor donde la corrección del aislamiento
manda sobre la latencia.

### 3.2 Tabla por ruta

| Ruta / grupo | Estrategia | Justificación |
|---|---|---|
| Home, `SLG_AI`, las once páginas de servicio, `SLG_Holdings`, Doctrina, Nosotros, Legal (ES y EN) | **Estático, prerenderizado en el build** | Su contenido son archivos del repositorio (B.4). No hay fuente externa que pueda cambiar entre despliegues: revalidar sería revalidar contra sí mismo |
| `/blog`, `/blog/[slug]`, `/blog/etiqueta/[tag]` (ES y EN) | **Estático, prerenderizado en el build**; los `status: draft` no se generan | RF-21 pide que un artículo aparezca «en minutos» tras el push: los minutos los da el despliegue automático desde `main` (RF-121), no una revalidación. RF-22: un borrador no se sirve en ninguna ruta pública ni en RSS |
| `/descargas` y `/descargas/[slug]` (ES y EN) | **Estático** el marco y la ficha; **dinámico** solo el envío del formulario | El estado del documento (`published` / `coming-soon`) es contenido (RF-29, RF-137). El envío es una acción, no una página |
| `/gracias` (`/en/thank-you`) | **Dinámico por petición, `no-store`, `noindex`** | Muestra el enlace firmado de descarga, que es un secreto de un solo destinatario y caduca (RF-38, RF-42) |
| `/sitemap.xml`, `/robots.txt`, RSS | **Generados en el build** | Se derivan del mismo índice de contenido; regenerarlos por petición sería recalcular algo inmutable entre despliegues |
| 404 y 500 | **Estáticas, bilingües** | RF-17 |
| `(auth)` | **Dinámico, `no-store`, `noindex`** | Depende de la sesión y de la validez del testigo |
| `(hq)`, `(portal)` | **Render en servidor por petición, `no-store`, `private`, `noindex`** | Cada byte depende de la sesión y del `organization_id` del contexto. **Ninguna respuesta de estas superficies entra en caché compartida**: una caché compartida es exactamente el mecanismo por el que un cliente ve datos de otro (R-10) |
| `api/v1`, `api/internal` | **Dinámico, `no-store`** | — |
| Objetos de los buckets | **Nunca renderizados**: se entregan por URL firmada con caducidad (RF-38) | La caducidad la fija `api_contracts` (RNF-20) |

### 3.3 Por qué la capa pública puede ser estática entera

Porque el contenido **es el repositorio** (frontera (c): no hay CMS). Publicar es hacer push; el
despliegue automático reconstruye y publica (RF-121). Esto tiene tres consecuencias buenas y una
condición:

- **Buena 1:** el gate D1 se vuelve alcanzable por construcción — HTML servido sin trabajo de
  servidor, sin consulta a base de datos en la ruta de renderizado, sin scripts de terceros
  (frontera (h), RF-35, RF-127).
- **Buena 2:** el CRM, el correo y hasta la base de datos pueden estar caídos y **la capa pública
  sigue sirviéndose**. Solo se degradan los envíos de formulario, que es lo que las colas absorben
  (§6).
- **Buena 3:** el LCP (RNF-02) no depende de ninguna integración.
- **Condición:** el tiempo entre «push» y «visible» es el tiempo de build más el de despliegue.
  Es el precio de no tener CMS y está aceptado por §10-11 y por DoD #3, que pide «minutos», no
  «segundos».

### 3.4 Las tres excepciones dinámicas de la capa pública

Son tres, están acotadas y ninguna carga JavaScript adicional en las páginas estáticas:

1. **Envío de formulario** (descarga, contacto, solicitud de Doctrina) → endpoint de `api/internal`
   que aplica FU-11 completo (honeypot, límite, dominios gratuitos), persiste el `lead_capture`
   **antes de responder** (RF-37) y devuelve el destino de `/gracias`.
2. **Emisión de la URL firmada** → endpoint que verifica la captura, emite la firma y registra el
   `download_event` (RF-41). Si el documento no tiene archivo, no emite firma y no dispara
   `download.completed` (RF-40).
3. **Visor de entregables HTML** (solo dentro del portal, no en la capa pública) → §11.3.

### 3.5 El presupuesto de JavaScript es una verificación, no una intención

RNF-03 fija < 150 KB comprimidos de JS inicial en la capa pública, y FU-05 lo convierte en un freno
del pipeline: un push que lo supere **falla**, no avisa (criterio 4 de FU-05). La arquitectura ayuda
en tres puntos: componentes de servidor por defecto (solo se envía JS donde hay gesto: barra de
navegación, sheet móvil, formulario, carrusel de artículos), Montserrat autoalojada sin peticiones a
servicios de fuentes de terceros (RNF-14), y Umami cargado de forma diferida y no bloqueante (§12.3).

### 3.6 La única caché de la capa autenticada: las métricas del CRM

RF-55 pide leer `GET /dashboard/metrics`, `GET /reports/funnel` y
`GET /reports/sources?currency=USD` con la clave de solo lectura y servirlas **desde una caché de
5 minutos**. `data_model` no declara ninguna tabla de caché, y no hay que inventarla: la caché vive
**en memoria del proceso**, con su marca de tiempo, y esa marca se muestra en el tablero (RF-74). Un
reinicio solo provoca una lectura de más. Es la única caché del sistema y **no contiene datos de
cliente**: son agregados del pipeline, que la web no gestiona (frontera (a)).

---

## 4. i18n

### 4.1 Cómo se resuelve el idioma

| Superficie | Fuente del idioma | Regla |
|---|---|---|
| `(public)` | **La ruta, y solo la ruta**: raíz = `es`, prefijo `/en` = `en` | Ninguna redirección por `Accept-Language` (RF-03) |
| `(auth)` | La ruta con la que se entró (`/acceder` ↔ `/en/sign-in`) | — |
| `(hq)`, `(portal)` | **Preferencia del usuario** (`user.locale`), editable en el perfil (RF-93) | Sin conmutador de idioma en pantalla (`ui_wireframes` §1.2) |
| Contenido entregado (entregables, avisos) | **Tal como se entregó**, sin traducir (RF-72) | — |
| Correo transaccional | `locale` de la fila de `email_delivery`, persistido al enviar | `data_model` §5.19 |

### 4.2 Pares por slug, no por sustitución de cadenas

Los slugs difieren entre idiomas (`/descargas/x` ↔ `/en/downloads/x`), así que el conmutador **no**
manipula la URL: lee el campo `pair` del registro de contenido (RF-20, `ui_wireframes` §1.2). Si el
par no existe —caso posible solo en `post`, donde la paridad no es obligatoria (RF-26)— el conmutador
se muestra **deshabilitado con explicación** y un enlace al índice del otro idioma.

### 4.3 `hreflang` y `canonical`

Cada página pública emite `canonical` propio de su idioma y `hreflang` **recíproco** ES↔EN (RF-05),
construidos desde el mismo `pair`: una sola fuente para el enlace visible y para el metadato, de modo
que no puedan divergir. Un artículo sin par emite `canonical` y ningún `hreflang` alternativo, porque
declarar una alternativa inexistente es peor que no declararla.

### 4.4 Cómo se verifica la paridad por script

FU-03 entrega cuatro scripts de CI; dos son de i18n y **fallan el pipeline**, no avisan (RF-128):

| Script | Qué recorre | Falla si |
|---|---|---|
| Paridad `pair` | Colecciones `page` y `service` (**no** `post`, RF-26) | Falta el par, o `pair` apunta a un archivo inexistente (RF-20, RNF-16) |
| Paridad de cadenas de interfaz | `content/ui/es.json` y `content/ui/en.json` | Una clave existe en un idioma y falta en el otro. **Nunca** se degrada a cadena vacía en pantalla (RF-140) |

Cada script tiene su **prueba negativa obligatoria** (criterio 6 de FU-03, mitigación de R-26): se
ejecuta contra un caso preparado que debe fallar, y el resultado se registra. *Un script que nunca se
ha visto en rojo no cuenta como gate verde.*

---

## 5. Capa de contenido

### 5.1 Cómo se leen los archivos

Las seis colecciones de B.4 (`page`, `service`, `download`, `post`, `doctrine`, `ui`) se leen **en
tiempo de build**, no en tiempo de petición. El resultado es un índice en memoria del proceso de
build con el que se generan las rutas estáticas (§3.2), el sitemap, el RSS y los pares de idioma. En
producción, servir una página pública **no toca el sistema de archivos ni la base de datos**.

```
content/                                  →  build  →  rutas estáticas + sitemap + RSS + índice de pares
├── pages/<lang>/<slug>.md                          │
├── services/<lang>/<slug>.md   (6 bloques A.3)     ├─ validación de frontmatter (RF-19)
├── downloads/<lang>/<slug>.md                      ├─ resolución de pares (RF-20)
├── blog/<lang>/<slug>.md       (social, status)    ├─ exclusión de borradores (RF-22)
├── doctrine/<lang>/*.md                            └─ sincronización de la tabla `download` (§5.3)
└── ui/<lang>.json
```

### 5.2 Cuándo se validan los frontmatter

**En el build, y romper el build es el comportamiento correcto** (RF-19, criterio 1 de FU-03). Un
frontmatter inválido no se degrada en silencio: el mensaje nombra archivo, campo y motivo. Un registro
`service` al que le falte uno de los **seis bloques con encabezado fijo** del contrato A.3, o que
tenga un encabezado alterado, se rechaza **antes** de que la página llegue a renderizarse (RF-135) —
porque una página de servicio sin su sección 5 es una página sin CTA, y el CTA es el proyecto.

### 5.3 El puente entre contenido y base de datos

`data_model` §5.10 lo fija: la fuente de verdad de un documento de descarga es su registro de
contenido; la tabla `download` es el **ancla de identidad estable** que permite que `lead_capture` y
`download_event` apunten a él con clave foránea real. La sincronización es un **paso del despliegue**
que recorre `content/downloads/**` y actualiza el espejo (`slug`, `doc_code`, `service`, `title_es`,
`title_en`, `status`). Reglas:

- Si contenido y tabla discrepan, **manda el contenido**.
- El paso **nunca borra** filas: una descarga retirada del contenido pasa a `draft`, porque borrarla
  rompería la trazabilidad de todas las capturas anteriores (§2.5 de `data_model`: nada se borra).
- `file_key`, `mime_type` y `size_bytes` **no** vienen del contenido: los escribe el proceso que sube
  el archivo al bucket (FU-09), y la restricción `download_published_needs_file` impide publicar un
  documento sin archivo.

### 5.4 El script de CI de B.4

B.4 exige un script que verifique cuatro cosas antes de `main`. FU-03 lo entrega como **cuatro
scripts**, todos bloqueantes (RF-128, criterio 4 de FU-05):

| # | Verifica | Falla si | Origen |
|---|---|---|---|
| 1 | **Frontmatter válido** en las seis colecciones | Falta un campo mínimo de B.4 o tiene tipo incorrecto | RF-19 |
| 2 | **`pair` existente** en `page` y `service` | Par ausente o roto | RF-20, RNF-16 |
| 3 | **Nomenclatura literal** | Aparece cualquier variante traducida o alterada de `SLG_AI`, `SLG_Holdings`, `SLG_Academy`, `SLG_Enterprise`, `SLG_Factory`, `SLG_Readiness`, `SLG_Implement`, `APP_Building`, `AGE_Building`, `CoO as a Service`, `Phoenix PEEx`, `Phoenix TEAx`, `Phoenix RETx`; o la «D» de DAL OS se expande como algo distinto de **Destrucción Creativa** | RF-14, RF-15 |
| 4 | **Cero `[PENDIENTE]` en `main`** | Aparece `[PENDIENTE]` o lorem ipsum en la rama de producción; en `develop` es visible y legítimo | RF-128, RNF-18, DoD #10 |

Los cuatro corren en cada push y **además** en el pipeline de `main`, junto con el análisis de
secretos y el presupuesto de JS (FU-05).

---

## 6. Trabajos en segundo plano

Es la parte más difícil del documento y la que más se estropea al construir. El requisito de negocio
es corto y duro: **el visitante no espera al CRM** (RF-39) y **ninguna captura se pierde** (DoD #1,
gate D7).

### 6.1 Tres colas, una sola forma

`data_model` da la buena noticia: las tres colas ya tienen la misma forma, con el mismo vocabulario y
el mismo índice parcial. No hay tres mecanismos que mantener, hay **uno aplicado tres veces**:

| Cola | Tabla | Estado | Próximo intento | Índice del barrido |
|---|---|---|---|---|
| Entrega al CRM | `lead_capture` | `crm_sync_status` (`pending`/`delivered`/`failed`) | `crm_next_attempt_at` | `idx_lead_capture_queue` |
| Webhooks salientes | `webhook_delivery` | `status` | `next_attempt_at` | `idx_webhook_queue` |
| Correo transaccional | `email_delivery` | `status` | `next_attempt_at` | `idx_email_queue` |

Cada intento deja traza: `crm_delivery` una fila por intento y endpoint (`data_model` §5.12), y las
otras dos, sus contadores y su último error saneado.

### 6.2 Dónde se ejecutan, sin orquestador externo

**Decisión de este documento (A-01, §15.2): el ejecutor de colas vive dentro del propio servicio
`slg-web`**, arrancado con él, y no como servicio aparte ni como tarea de un orquestador externo.

| Opción | Por qué no se elige en v1 |
|---|---|
| Orquestador externo (n8n disparando el barrido) | n8n es **suscriptor opcional** y explícitamente *no es requisito de la v1* (§7, RF-115). Hacer depender la entrega de leads de un sistema opcional convierte lo opcional en crítico |
| Servicio de trabajador aparte en Easypanel | Es viable (misma imagen, otro punto de entrada) y sigue siendo la salida de escape si el barrido compite con el tráfico. Cuesta un servicio más que desplegar, vigilar y versionar en sincronía, para un volumen v1 que son unas pocas capturas al día |
| Disparador externo por HTTP (servicio de cron de terceros) | Añade un tercero al camino crítico de la conversión y una URL disparable desde fuera. Frontera (h) y R-09 |

**Cómo se ejecuta, en concreto.** Al arrancar el proceso se registra un **barrendero** por cola: un
bucle temporizado que, en cada vuelta, reclama un lote pequeño de filas vencidas y las procesa. Nada
vive en memoria salvo el temporizador: **la cola es la tabla** (R-23, criterio 5 de DU-09).

Dos condiciones de diseño que hacen que esto sea correcto y no un apaño:

1. **El intervalo del barrido es menor que el escalón de espera más corto** (1 minuto, RF-50). Si
   fuera mayor, la espera real no sería la especificada y el gate D7 mediría otra cosa.
   `[PENDIENTE: valor exacto del intervalo — se fija en DU-09 y se registra en decision_log; la
   restricción dura es < 60 s]`.
2. **El barrido está acotado por lote**, ordenado por `next_attempt_at` ascendente. Un lote sin tope
   convierte una caída larga del CRM en una avalancha en el minuto en que vuelve.

Además, el mismo ejecutor se puede disparar a mano desde HQ para una captura concreta (RF-52,
reintento manual) a través de `api/internal`, con auditoría del resultado.

### 6.3 Cómo se reclama trabajo: reserva con plazo

Reclamar una fila y procesarla son dos cosas distintas, y entre ellas puede morir el proceso. Por eso
la reclamación es **una transacción corta que reserva**, no que ejecuta:

```
1. TRANSACCIÓN
     SELECT ... FROM <cola>
      WHERE estado = 'pending' AND próximo_intento <= now()
      ORDER BY próximo_intento
      LIMIT <lote>
      FOR UPDATE SKIP LOCKED            ← dos barridos nunca toman la misma fila
     UPDATE esas filas
        SET próximo_intento = now() + <plazo de reserva>   ← la fila queda "en curso"
   FIN TRANSACCIÓN                                            sin estado nuevo que mantener
2. Para cada fila reservada, FUERA de la transacción:
     llamada al sistema externo (CRM, suscriptor de webhook, proveedor de correo)
3. TRANSACCIÓN corta de resultado:
     éxito  → estado = 'delivered', identificadores del proveedor, fecha de entrega,
              y en el caso del CRM: crm_mode con el modo REALMENTE usado (data_model §7.2)
     fallo  → intentos += 1, último error saneado, próximo_intento = now() + escalón siguiente,
              y si intentos alcanza el tope → estado = 'failed' + alerta en HQ + correo a support@
     y en el CRM, además: una fila en crm_delivery por endpoint llamado
   FIN TRANSACCIÓN
```

**Por qué la reserva se expresa empujando `next_attempt_at` y no con un estado nuevo:** porque
`data_model` no tiene un estado «en curso» y añadirlo obligaría a limpiarlo tras cada caída. Empujar
la fecha usa el mecanismo que ya existe: si el proceso muere con la fila reservada, la fila
**vuelve sola** a la cola cuando vence el plazo. Nadie tiene que reparar nada.
`[PENDIENTE: duración exacta del plazo de reserva — se fija en DU-09; la restricción dura es que sea
mayor que el tiempo máximo de espera de la llamada externa, para que no se reintente una llamada que
todavía está viva]`.

### 6.4 Qué ocurre si el proceso se reinicia a mitad

Un despliegue, un reinicio del contenedor o una caída pueden ocurrir en cinco momentos. Este es el
comportamiento exacto de cada uno:

| Momento del reinicio | Estado en la base de datos | Qué pasa al arrancar |
|---|---|---|
| **1. Antes de reclamar** | Fila `pending`, `next_attempt_at` vencido | El primer barrido la toma. Nada se pierde |
| **2. Reclamada, antes de llamar** | Fila `pending` con `next_attempt_at` empujado | Vuelve a la cola al vencer el plazo. **Coste: un retraso, nunca una pérdida** |
| **3. Llamada enviada, respuesta no recibida** | Igual que 2 | Vuelve al vencer el plazo y **se reintenta**. Es el único caso que puede duplicar en el sistema externo → §6.5 |
| **4. Respuesta recibida, resultado no escrito** | Igual que 2 | Idéntico al 3: el sistema externo ya hizo el trabajo y nosotros no lo sabemos. Se reintenta |
| **5. Resultado escrito** | `delivered` o `failed` con su traza | El barrido ya no la mira: el índice es parcial sobre `pending` |

La lectura de la tabla es la conclusión: **el único daño posible de un reinicio es un retraso o un
duplicado en el sistema externo. Nunca una pérdida.** Y el duplicado tiene respuesta propia.

### 6.5 Idempotencia: la respuesta a los momentos 3 y 4

| Cola | Cómo se evita el duplicado | Riesgo residual |
|---|---|---|
| CRM, modo `lead_admission` | El endpoint es **idempotente por correo + documento** (RF-48) y la web envía `crm_idempotency_key` persistida en la fila (`data_model` §5.9) | Ninguno del lado de la web |
| CRM, modo `contact_note` | El primer paso es **buscar el contacto por correo** (`GET /contacts?q=`, RF-47): si el intento anterior lo creó, el reintento lo encuentra y no lo duplica | **La nota sí puede duplicarse.** Es un duplicado visible, benigno y auditable (dos filas en `crm_delivery` con el mismo `attempt` no pueden existir: lo impide `crm_delivery_attempt_unique`). Se asume y se declara, en vez de fingir una idempotencia que el CRM no ofrece hoy (B.6, R-04) |
| Webhooks | La firma HMAC y el cuerpo son deterministas; el suscriptor recibe el mismo evento dos veces | El contrato de webhooks es **al menos una vez**, y así debe documentarlo `api_contracts`. n8n es opcional (RF-115) |
| Correo | Un reintento puede reenviar un correo ya aceptado por el proveedor | Un correo duplicado es molesto, no dañino. Lo contrario —una invitación que no llega— sí lo es (RF-119) |

### 6.6 Por qué no se pierde una captura: la cadena completa

1. El visitante envía el formulario. La captura se persiste **antes de responderle** (RF-37,
   criterio 5 de DU-08), en la misma transacción que valida el consentimiento (`consent_at`,
   `privacy_version`).
2. Si esa transacción no confirma, **el visitante recibe un error** y no hay descarga entregada: no
   existe el caso «lead perdido en silencio con documento entregado».
3. Confirmada la transacción, la fila está en Postgres con `crm_sync_status = 'pending'` y
   `crm_next_attempt_at = now()`. **Desde ese instante, la entrega al CRM ya no depende de que este
   proceso siga vivo.**
4. La entrega del documento (URL firmada) y el aviso por correo van por caminos distintos: un fallo
   del correo **no** revierte la entrega al CRM ni la del documento (criterio 11 de DU-09, RF-119).
5. Si el CRM está apagado: la captura queda en cola, el documento se entrega igual y el reintento
   tiene éxito al volver. Es literalmente la prueba del gate D7 y de DoD #1 (RNF-36).
6. Tras agotar los intentos: `failed`, alerta en HQ y correo a `support@` (RF-50), con reintento
   manual disponible (RF-52). **Rendirse es un estado visible, no un silencio.**

### 6.7 Qué pasa si algún día hay más de una réplica

Hoy `slg-web` corre con **una réplica** y el diseño no lo exige. `FOR UPDATE SKIP LOCKED` ya hace que
dos barridos concurrentes —dos réplicas, o un barrido lento solapado con el siguiente— **no tomen la
misma fila**. Lo que sí conviene fijar antes de escalar: un cerrojo de aplicación por cola, de modo
que solo un barrendero por cola esté activo a la vez, para que el lote y los escalones de espera
sigan significando lo que dicen. `[PENDIENTE: si se activa el cerrojo desde v1 o solo al escalar —
decisión de operación, se registra en decision_log]`.

### 6.8 Lo que este diseño deliberadamente NO hace

- **No hay cola en memoria.** Nunca (R-23). Si algo está en memoria y no en una tabla, se pierde en
  el próximo despliegue.
- **No hay intermediario de mensajes.** Añadir uno serían un servicio más, un modo de fallo más y una
  segunda fuente de verdad sobre qué está pendiente, para un volumen de unas pocas capturas al día.
- **No hay reintentos dentro de la petición del visitante.** Un solo intento síncrono ya haría al
  visitante esperar al CRM, que es exactamente lo que RF-39 prohíbe.
- **No hay borrado de filas entregadas.** Son evidencia (B.2) y alimentan el tablero y `GET /captures`.

---

## 7. Servicios de Easypanel y despliegue

### 7.1 Los cinco servicios (RF-120)

| Servicio | Qué es | Notas de arquitectura |
|---|---|---|
| `slg-web` | Aplicación Next.js, imagen construida con Dockerfile y salida `standalone` | Sirve las tres superficies y las dos APIs, y **aloja el ejecutor de colas** (§6.2). Dominios `softlandingglobal.com` y `www`, HTTPS Let's Encrypt |
| `slg-db` | PostgreSQL | Única fuente de verdad transaccional. No expuesto a internet: solo red interna |
| `slg-files` | MinIO (API S3), buckets **`downloads`** y **`deliverables`**, ambos **privados** | Ninguna ruta de la aplicación lista un bucket (RF-123, gate D10). Acceso solo por URL firmada |
| `slg-analytics` | Umami autoalojado | Privacy-first, sin cookies de seguimiento ni scripts de terceros (RF-127, frontera (h)) |
| `slg-web-staging` | La misma imagen desde `develop`, en `staging.softlandingglobal.com` | Autenticación básica y `noindex` (RF-122). **Ningún despliegue llega a `main` sin haber pasado por staging** (criterio 2 de FU-05, R-20) |

### 7.2 Diagrama de despliegue

```
                                   Internet
                                       │
                 ┌─────────────────────┼──────────────────────┐
                 │ softlandingglobal   │ staging.             │  crm. · n8n. · evolution. · academy.
                 │ + www               │ softlandingglobal    │  (NO SE TOCAN — §13)
                 ▼                     ▼                      ▼
       ╔═════════════════════════════════════════════════════════════════════════╗
       ║  VPS Hostinger 167.88.42.76 · Easypanel · Let's Encrypt                  ║
       ║                                                                          ║
       ║   proyecto "website"                          proyecto "clientes"        ║
       ║   ┌──────────────────────────┐                ┌──────────────────────┐   ║
       ║   │ slg-web        (main)    │                │ CRM Softlanding      │   ║
       ║   │  ├─ (public)(auth)       │   API + clave  │ Global (compose slg) │   ║
       ║   │  ├─ (hq)(portal)         │───────────────▶│ crm.softlandingglobal│   ║
       ║   │  ├─ api/v1 · api/internal│  captura       │                      │   ║
       ║   │  └─ ejecutor de colas ───┼──┐ tablero     └──────────────────────┘   ║
       ║   └────────┬─────────┬───────┘  │                                        ║
       ║            │         │          │             ┌──────────────────────┐   ║
       ║            │         │          └────────────▶│ n8n (OPCIONAL)       │   ║
       ║            │         │            webhooks    │ nunca requisito v1   │   ║
       ║            ▼         ▼            firmados    └──────────────────────┘   ║
       ║   ┌────────────┐ ┌─────────────┐                                         ║
       ║   │ slg-db     │ │ slg-files   │   ┌───────────────┐                     ║
       ║   │ PostgreSQL │ │ MinIO       │   │ slg-analytics │                     ║
       ║   │ 19 tablas  │ │ downloads   │   │ Umami         │                     ║
       ║   │ 3 colas    │ │ deliverables│   └───────────────┘                     ║
       ║   └─────┬──────┘ └──────┬──────┘                                         ║
       ║         │               │        ┌──────────────────────────────┐        ║
       ║   ┌─────▼───────────────▼─────┐  │ slg-web-staging  (develop)   │        ║
       ║   │ proceso de copia (§9)     │  │ auth básica · noindex        │        ║
       ║   │ cifra en el VPS y sube    │  └──────────────────────────────┘        ║
       ║   └───────────┬───────────────┘                                          ║
       ╚═══════════════╪══════════════════════════════════════════════════════════╝
                       │ solo escritura, sin borrado (R-37)
                       ▼
            ┌────────────────────────┐          ┌──────────────────────────┐
            │ Cloudflare R2  (D-21)  │          │ Resend  (D-22)           │
            │ copias cifradas        │          │ SMTP · subdominio de     │
            │ diaria/semanal/mensual │          │ envío dedicado (D-24)    │
            └────────────────────────┘          └──────────────────────────┘

     GitHub (repo PÚBLICO)  ──push main──▶ slg-web          ──push develop──▶ slg-web-staging
```

### 7.3 Flujo de despliegue

1. Push a `develop` → CI (lint, pruebas, los cuatro scripts de contenido, análisis de secretos,
   presupuesto de JS) → build de imagen → `slg-web-staging`.
2. Verificación en staging: gates que correspondan al milestone.
3. Merge a `main` → el mismo CI → build → `slg-web`. **Antes de aplicar cualquier migración de
   esquema se ejecuta una copia de seguridad automática** (criterio 7 de FU-14, R-20).
4. Migraciones de Drizzle versionadas en el repositorio, aplicadas en el despliegue.
5. Sincronización del espejo de `download` desde `content/` (§5.3).
6. Monitor de caída activo sobre producción (RF-130).

---

## 8. Puertos y adaptadores

### 8.1 Por qué, aunque los productos ya estén elegidos

D-21 y D-22 no eligieron solo un producto: fijaron una **condición de diseño**. D-22 dice textualmente
que el DU de correo se construye como adaptador tras variable de entorno hablando SMTP, «así cambiar
de proveedor cuesta tres variables de entorno y ninguna línea de código». D-21 dice que el script de
copias se escribe contra API S3 genérica, «cambiar de proveedor es endpoint + credenciales». La regla
7 de AGENTS.md queda satisfecha no por callar el nombre del producto —Ricardo lo eligió y nombrarlo es
correcto— sino porque **el nombre no aparece en ninguna decisión de código**.

### 8.2 Puerto de correo — una operación

| | |
|---|---|
| **Operación** | `enviar(tipo, destinatario, plantilla, idioma, datos) → identificador de mensaje del proveedor` |
| **Contrato** | Devuelve identificador si el proveedor **aceptó** el mensaje; lanza error clasificado (red, autenticación, rechazo, tiempo agotado) si no. **No promete entrega en bandeja**: eso no es observable en el momento del envío |
| **Protocolo** | **SMTP estándar** (D-22), nunca el SDK propietario. Ningún caso de uso importa el cliente del proveedor (criterio 1 de FU-08) |
| **Configuración** | Nombres de variable: servidor, puerto, usuario, contraseña, remitente (`From`), `Reply-To`. **Cero valores en el repositorio** |
| **Efecto colateral obligatorio** | Escribe la fila de `email_delivery` con `from_email`, `reply_to`, `template_key`, `subject_key`, `locale` y `provider_message_id` — evidencia propia, porque el proveedor retiene registros 30 días (`data_model` §5.19) |
| **Prohibiciones** | No transporta el cuerpo del correo a la base de datos; no guarda tokens de invitación ni de recuperación; **no registra aperturas ni clics** — el seguimiento está desactivado por dominio (D-22) y el esquema no tiene dónde ponerlos |
| **Prueba del puerto** | Se ejecuta la suite contra un segundo destino configurado **solo por variables de entorno**, sin editar código (criterio 2 de FU-08) |

### 8.3 Puerto de destino de copias — una operación

| | |
|---|---|
| **Operación** | `depositar(clave, contenido) → confirmación` |
| **Contrato** | Escribe un objeto nuevo en el destino. **No lee, no lista, no borra, no sobrescribe.** Esa incapacidad no es una omisión: es la mitigación de R-37 |
| **Protocolo** | API S3 genérica (D-20, D-21) |
| **Configuración** | Nombres de variable: endpoint, región, bucket, identificador y secreto de acceso **de solo escritura**, clave de cifrado (custodiada **fuera** del VPS y fuera del repositorio) |
| **Por qué la restauración no comparte puerto** | Restaurar exige leer, y purgar exige borrar. Ambas son **procesos distintos con credenciales distintas** (§9.3, criterio 4 de FU-14). Si un solo puerto pudiera escribir y borrar, la credencial del VPS bastaría para destruir los backups junto con los datos, que es exactamente el escenario que R-37 describe |

### 8.4 Los otros dos puertos que la arquitectura ya tiene

No los pide el enunciado de esta sección, pero existen y siguen la misma regla:

- **Puerto del CRM** — dos modos tras `CRM_MODE` (D-19, RF-46): `contact_note`
  (`POST /contacts` + `POST /notes`) y `lead_admission` (`POST /api/v1/leads`, inactivo mientras el
  CRM no exponga el endpoint). El modo **realmente usado** se persiste en la fila (`crm_mode`), no se
  deduce de la variable (`data_model` §7.2). Dos claves distintas con alcances mínimos: captura y
  tablero (RF-56, RNF-40).
- **Puerto de almacenamiento de archivos** — API S3 contra MinIO, con emisión de URL firmada de
  caducidad corta y validación de tipo MIME y tamaño **en el servidor antes de aceptar un byte**
  (FU-09, RNF-25). Los topes **no son uno solo**: los fija `data_model` §2.6 por bucket y tipo — ver §11.3.

---

## 9. Copias de seguridad y restauración

### 9.1 Qué se copia y con qué frecuencia

| Qué | Cómo | Frecuencia |
|---|---|---|
| Base de datos `slg-db` | Volcado lógico de PostgreSQL, coherente | **Diaria** (RF-124) + **una copia automática antes de cada migración de esquema** (criterio 7 de FU-14, R-20) |
| Volúmenes de `slg-files` | Objetos de los buckets `downloads` y `deliverables` | **Diaria** (RF-124) |
| Contenido, código, migraciones | No se copian aquí: viven en GitHub (repositorio público) | Continua, por push |
| Secretos | **No se copian nunca**: viven solo en variables de entorno de Easypanel (RNF-26). Su custodia es del panel, no del backup | — |

El proceso **cifra en el VPS antes de subir** (criterio 3 de FU-14, R-12) y no se ejecuta dentro de
`slg-web`: es una tarea programada de la plataforma sobre el VPS (§0 del brief: «backups
programados»). `[PENDIENTE: mecanismo exacto de programación en la plataforma — se verifica en FU-14]`.

### 9.2 A dónde, y las cuatro mitigaciones de R-37

Destino: **Cloudflare R2** (D-21), proveedor distinto del que aloja el VPS (D-20). R2 **no ofrece
Object Lock por la API estándar**, así que la inmutabilidad no se compra: se construye.

| # | Mitigación | Cómo se implementa |
|---|---|---|
| 1 | **Credencial de solo escritura para el proceso de copia** | El puerto de §8.3 solo expone `depositar`. La credencial que usa no tiene permiso de borrado ni de sobrescritura |
| 2 | **El borrado de copias antiguas lo hace un proceso distinto con otras credenciales** | La purga es una tarea aparte, con su propia credencial, que **nunca** se carga en el servicio web |
| 3 | **Retención por generaciones**, no un destino sobrescrito | Al menos tres: **diaria**, **semanal**, **mensual** (criterio 5 de FU-14). Cada copia es un objeto con clave propia; ninguna copia pisa a otra |
| 4 | **Restauración verificada desde una copia ANTIGUA** | §9.3, paso 2 |

Y la contrapartida operativa de R2 que D-21 registra: **las operaciones son la partida medida**, así
que el cliente de copia se configura para no dispararlas (lotes, no objeto a objeto cuando se pueda).

### 9.3 Procedimiento de restauración (DoD #8, gate D11)

*Un backup no restaurado no cuenta como backup.* El procedimiento se ejecuta **en staging**, se
cronometra y se registra en `work_log`; y forma parte del README operativo, porque es una de las siete
tareas que Ricardo debe poder hacer solo (RF-126, DoD #9).

```
 0. PREPARAR   Confirmar que se restaura contra STAGING, nunca contra producción.
               Anotar fecha y hora de inicio (el tiempo de restauración es el dato
               que falta cuando llega la emergencia).

 1. ELEGIR     Listar las generaciones disponibles con la credencial de LECTURA
               (distinta de la de copia, §8.3).

 2. ELEGIR UNA ANTIGUA
               La prueba obligatoria NO usa la última copia: usa una de una
               generación anterior (semanal o mensual). Restaurar solo la última
               deja sin verificar justo lo que se guarda por si acaso  (R-37).

 3. DESCARGAR  Traer el objeto de base de datos y el de volúmenes al entorno de
               staging.

 4. DESCIFRAR  Con la clave custodiada FUERA del VPS y FUERA del repositorio.
               Si la clave no aparece, el backup no existe: es el fallo que esta
               prueba tiene que descubrir hoy y no el día del incidente.

 5. RESTAURAR  Base de datos: crear una base limpia en staging y cargar el volcado.
               Aplicar después las migraciones pendientes, si la copia es anterior
               al esquema actual, y anotar cuáles.
               Archivos: cargar los objetos en los buckets de staging conservando
               las claves, porque `deliverable.file_key` y `download.file_key`
               apuntan a ellas.

 6. VERIFICAR  Integridad de datos:
                 · recuentos por tabla comparados con los de la copia
                 · una empresa cliente completa: proyectos, entregables y avisos
                 · una captura entregada: sus filas de `crm_delivery` y su
                   `download_event`
                 · `audit_log` presente y sin huecos en el rango restaurado
               Integridad de archivos:
                 · abrir un PDF de `downloads` por URL firmada
                 · abrir un entregable HTML en el visor aislado
                 · comprobar que ningún objeto referenciado falta
               Integridad funcional:
                 · iniciar sesión con los tres métodos
                 · la batería de aislamiento de FU-13 en verde sobre los datos
                   restaurados

 7. REGISTRAR  En `work_log`: generación usada y su fecha, duración total de la
               restauración, incidencias y qué hubo que hacer a mano.
               Ese registro ES la evidencia del DoD #8.

 8. LIMPIAR    Devolver staging a su estado normal. Ningún dato restaurado de
               cliente permanece en staging más allá de la prueba.
```

**Lo que esta prueba mide de verdad** no es que el archivo exista: es que la clave de cifrado esté
disponible, que las migraciones sepan avanzar desde un esquema viejo, y **cuánto tarda**. Las tres
cosas solo se saben ejecutándolo.

---

## 10. Correo: el subdominio de envío dedicado

### 10.1 Qué decidió D-24 y por qué cambia la arquitectura

El correo corporativo **se queda en Microsoft 365** (D-23): los MX de Outlook y el TXT de la raíz son
intocables. Y el correo transaccional sale por un **subdominio de envío dedicado** verificado en
Resend (D-24), en vez de convivir con Outlook en el SPF de la raíz.

**Consecuencia arquitectónica:** la reputación de envío automatizado y la del correo humano quedan
completamente aisladas —un problema en una no puede arrastrar a la otra— y publicar los registros del
subdominio **no puede** romper el correo corporativo, porque son entradas DNS distintas (R-38, ya
rebajado de Media/Alto a Baja/Medio).

### 10.2 Qué registros lleva, y dónde

| Zona | Registros | Quién los toca |
|---|---|---|
| **Subdominio de envío** (`[PENDIENTE: P-4 — nombre exacto, se fija en M0]`) | Los que exige el proveedor para verificar un dominio de envío: verificación, DKIM, SPF **del subdominio** y, cuando se publique, DMARC en `p=none` al principio para observar antes de endurecer (R-38) | Se publican en Hostinger, **solo bajo el subdominio**. `[PENDIENTE: tipos y valores exactos — los entrega el panel del proveedor al añadir el dominio (F.2-4)]` |
| **Raíz `softlandingglobal.com`** | **NO SE TOCA.** El TXT de la raíz sigue autorizando solo a Outlook (D-23, D-24) | Nadie. Añadir el `include` del proveedor al SPF de la raíz es **exactamente lo que D-24 descartó** |
| **MX** | **NO SE TOCAN.** Microsoft 365 sigue recibiendo el correo humano | Nadie |

### 10.3 Remitente visible

`[PENDIENTE: P-3 — dirección remitente visible; recomendado `From` en el subdominio con `Reply-To` a
`support@softlandingglobal.com`. Se fija en M0 y se registra en decision_log antes de construir
FU-08]`.

Consecuencia ya registrada: **cualquier requisito o documento que afirme que el remitente es
exactamente `support@softlandingglobal.com` está desactualizado** respecto a D-24 —incluidos RF-117 y
§5.1 del brief—. `support@` sigue siendo el **destinatario** de los avisos de captura (RF-53) y,
previsiblemente, el `Reply-To`. Por eso `email_delivery` persiste `from_email` y `reply_to` **en cada
fila**: cuando P-3 y P-4 se fijen o cambien, la evidencia de lo ya enviado no se reescribe.

### 10.4 Antes del primer envío real

Verificar el dominio en el proveedor, calentar la reputación enviando primero a buzones propios, y
comprobar que las invitaciones llegan a **bandeja de entrada** en tres proveedores distintos —incluido
Microsoft 365 corporativo, que es donde están los compradores— con el resultado registrado en
`work_log` (criterio 3 de FU-08, R-01, R-38).

---

## 11. Seguridad (B.8)

### 11.1 Cabeceras

| Cabecera | Contenido | Nota |
|---|---|---|
| **CSP** | Política estricta con origen propio; **sin dominios de terceros** en la capa pública, porque no hay ninguno (frontera (h), RF-35, RF-127) | El presupuesto de D1 y la CSP se defienden mutuamente: cada script de tercero rompería los dos |
| **HSTS** | Activa en producción, verificada por prueba automatizada en staging (criterio 7 de FU-05, RNF-22) | — |
| **`frame-ancestors`** | La aplicación **no se deja embeber**: ningún origen externo puede ponerla en un marco | RNF-22 |
| Resto | `X-Content-Type-Options`, `Referrer-Policy` restrictiva y política de permisos mínima | Se detallan en FU-05 |

### 11.2 Cookies y sesión

Todas las cookies de sesión con `Secure`, `HttpOnly` y `SameSite` (RNF-23). Expiración deslizante de
7 días (RF-65) y **«cerrar sesión en todos los dispositivos» con efecto inmediato** en todas las
sesiones del usuario (RF-66) — lo que obliga a que la validez de la sesión se compruebe contra la base
de datos y no solo contra la firma de la cookie (§2.4, paso 6).

### 11.3 Archivos y visor de entregables

- **URLs firmadas de caducidad corta** para todo archivo, de emisión y de subida (RF-38, RNF-20; los
  minutos exactos los fija `api_contracts`). Ninguna ruta lista un bucket (RF-123).
- **Visor de HTML de entregables**: el HTML autocontenido se sirve **desde un origen separado**
  (subdominio propio) — **normativo por D-45** (`docs/decision_log.md`) —, dentro de un
  `iframe` con `sandbox` **sin** `allow-same-origin` y con **CSP estricta propia** de la respuesta que
  lo entrega, de modo que no alcanza la sesión de la aplicación anfitriona ni su DOM (RF-90, RNF-21,
  R-11, gate D10). El documento se entrega a través de una ruta que verifica pertenencia y **añade sus
  propias cabeceras**; no se enlaza el objeto directamente, porque entonces las cabeceras las pondría
  el almacenamiento y no nosotros.
  - **El origen separado es la barrera principal**: parte de los entregables HTML los generan agentes
    Hermes, y con origen propio un script hostil dentro del entregable no puede leer cookies de sesión
    ni datos de la aplicación, porque el navegador lo aísla por política de origen.
  - **El `sandbox` sin `allow-same-origin` y la CSP estricta se mantienen** como **defensa en
    profundidad**, no como alternativa al origen separado.
  - Se construye en **DU-19**; la ruta de entrega la declara `api_contracts`.
    `[PENDIENTE: nombre del subdominio del visor, se fija en M4]`.
- **Subidas**: tipo MIME y tamaño validados **en el servidor antes de aceptar el archivo** (RNF-25).
  Los topes son los de `data_model` §2.6 y **no son uno solo**: **25 MB** en el bucket `downloads`
  (documentos D-01…D-11), **50 MB** en `deliverables` de tipo `pdf` y `material`, **5 MB** en
  `deliverables` de tipo `html`, **1 MB** en `deliverables` de tipo `md`, y **tope duro de 50 MB** en
  servidor y proxy. Citar 25 MB para un entregable rechazaría archivos legítimos de entre 25 y 50 MB.

### 11.4 Identidad y abuso

- **Límite de intentos de login** con bloqueo progresivo; el mismo mecanismo protege la recuperación
  de contraseña (RNF-24, F.1). Contraseñas de 12 caracteres mínimo con verificación de correo
  (RF-64).
- **Formularios públicos**: honeypot, límite por IP y por dirección de correo con umbral configurable
  (429 **sin revelar el umbral**), y lista de dominios de correo gratuito como **dato editable sin
  desplegar** (FU-11, RF-31…RF-35, D-16). Ningún desafío anti-bot de terceros.
- **Mensajes neutros**: sin registro público; un correo desconocido recibe el mismo mensaje que uno
  conocido (RF-59).

### 11.5 Auditoría inmutable

`audit_log` **no tiene camino de código que actualice o borre una fila, ni siquiera para
`slg_admin`**, y una prueba lo demuestra intentándolo (RNF-29, criterio 3 de FU-04). La inmutabilidad
se sostiene en dos capas: la ausencia de operación en la capa de acceso, y los permisos del rol de
base de datos de la aplicación. Toda escritura por clave de API queda atribuida en el recurso creado
(`published_by`, `author`) como **clave**, distinguible de una persona (RF-111).

### 11.6 Secretos

Solo nombres de variable en el repositorio, **cero valores** (RNF-26, RF-129), con `.env.example`
documentando propósito y servicio consumidor de cada una, y análisis de secretos bloqueante en CI. El
repositorio es público: esa es la razón de D-18 (el MCP del CRM se registra con alcance local, nunca
en un archivo versionado) y de la frontera (g).

---

## 12. Integraciones externas y su modo de fallo

### 12.1 CRM Softlanding Global — degradación a cola

| Camino | Si el CRM no responde |
|---|---|
| **Entrega de capturas** (clave «Website — captura») | La captura queda `pending`, **el documento se entrega igual**, y el reintento tiene éxito al volver (§6, RNF-36, gate D7). Tras agotar intentos: `failed`, alerta en HQ y correo a `support@` |
| **Métricas del tablero** (clave «Website — tablero», solo lectura) | El tablero muestra **la última caché con su marca de tiempo** y, si no hay ninguna, un estado «métricas del CRM no disponibles». Nunca cifras inventadas ni un cero que parezca un dato (RF-74) |
| **Enlace profundo a la ficha** | Se construye desde **plantilla configurable por variable de entorno**, nunca codificada, porque la ruta del frontend del CRM está sin confirmar (RF-54) |

**Nada del CRM está en el camino de renderizado de una página pública.** Un CRM caído no degrada el
sitio: degrada la sincronización, que es asíncrona por diseño.

### 12.2 Resend — el hecho de negocio no depende del correo

Un fallo de envío **no pierde el hecho de negocio** (RF-119): la invitación queda creada y reenviable
desde HQ; la captura queda entregada aunque el aviso falle. La fila de `email_delivery` conserva el
estado y el error saneado, y la cola reintenta (§6.1). El fallo **se ve** en HQ; no se traga.

### 12.3 Umami — nunca en el camino crítico

Autoalojado en el mismo VPS. Se carga de forma diferida y no bloqueante: si `slg-analytics` está
caído, **la página se sirve igual** y solo se pierde la medición de esas visitas. Sin cookies de
seguimiento y sin scripts de terceros (RF-127). Una analítica que pudiera romper el LCP sería una
analítica que rompe el gate D1.

### 12.4 n8n — opcional, y opcional de verdad

Suscriptor de los **nueve** webhooks firmados de B.7 (`lead.captured`, `lead.delivered_to_crm`,
`download.completed`, `contact.submitted`, `doctrine.requested`, `invitation.sent`,
`deliverable.published`, `announcement.published`, `post.published`), con firma HMAC-SHA256 en
cabecera y secreto por suscriptor (RF-112, RF-113).

**Si no hay suscriptor configurado, los eventos se registran y el sistema funciona igual** (RF-115).
Ningún flujo de n8n es requisito de la v1 (§7), y ninguna operación de negocio espera su respuesta:
la entrega de webhooks es una cola más, con su reintento y su traza (§6.1, RF-114).

---

## 13. DNS

### 13.1 Lo que se añade

| Registro | Valor | Para qué |
|---|---|---|
| `A` en la raíz `@` | **`167.88.42.76`** | Hoy la raíz **no resuelve**: no hay nada que respaldar (§7) |
| `CNAME www` | `softlandingglobal.com` | Dominio secundario del servicio de producción |
| `A staging` | **`167.88.42.76`** | `slg-web-staging` |
| Registros del **subdominio de envío** | Los que pida el proveedor (§10.2) | Correo transaccional aislado |

Zona previa copiada a `docs/` como estado anterior antes de tocar nada (FU-05).

### 13.2 Restricción dura: lo que NO se toca

**`crm` · `n8n` · `evolution` · `academy` · los MX de Outlook · el TXT de la raíz.**

- `crm`, `n8n` y `evolution` sirven desde la misma IP y son sistemas vivos.
- `academy` apunta fuera y Phoenix Academy queda fuera de alcance: **solo enlace** (§10-7,
  frontera (e)).
- Los MX y el TXT de la raíz sostienen el correo corporativo, que **se queda en Microsoft 365**
  (D-23) y cuyo SPF **no se toca** gracias al subdominio dedicado (D-24).

Verificación obligatoria: tras el cambio, `crm`, `n8n`, `evolution`, `academy` y los MX **siguen
resolviendo igual**, comprobado nombre por nombre y registrado en `work_log` (criterio 3 de FU-05,
R-25).

---

## 14. Trazabilidad

### 14.1 Requisitos que este documento cierra o condiciona

| Requisito | Dónde queda resuelto aquí |
|---|---|
| RF-03, RF-04, RF-05 | §2.2, §4 |
| RF-16, RF-18, RF-19, RF-20, RF-128 | §5 |
| RF-21, RF-22 | §3.2, §3.3 |
| RF-38, RF-39, RF-40, RF-41 | §3.4, §6.6, §8.4, §11.3 |
| RF-46 … RF-53, RF-55, RF-56 | §6, §8.4, §12.1 |
| RF-70, RF-71, RF-95 | §2.4, §2.5 |
| RF-97 … RF-99, RF-107, RF-108, RF-109 | §2.5 |
| RF-112 … RF-115 | §6.1, §12.4 |
| RF-118, RF-119 | §8.2, §12.2 |
| RF-120 … RF-125, RF-127, RF-129, RF-130, RF-131 | §7, §9, §12.3, §13 |
| RNF-01, RNF-02, RNF-03 | §3.3, §3.5 |
| RNF-16 | §4.4 |
| RNF-20, RNF-21, RNF-22, RNF-23, RNF-24, RNF-25, RNF-26 | §11 |
| RNF-29, RNF-32, RNF-33 | §2.5, §11.5 |
| RNF-36 | §6.6 |

### 14.2 Gates del Anexo D que dependen de decisiones de este documento

| Gate | Qué de aquí lo sostiene |
|---|---|
| **D1** rendimiento público | Capa pública estática, cero terceros, fuente autoalojada, analítica diferida (§3.3, §3.5, §12.3) |
| **D4** i18n | Resolución por ruta, pares por `pair`, scripts de paridad (§4) |
| **D5** fidelidad de contenido | Validación en build + los cuatro scripts bloqueantes (§5) |
| **D7** conversión E2E | Cola de entrega al CRM y su comportamiento con el CRM apagado (§6) |
| **D9** aislamiento | Middleware + capa de acceso + 404 en vez de 403 (§2.4) |
| **D10** archivos | URLs firmadas, buckets privados, visor en sandbox (§11.3) |
| **D11** operación | Cinco servicios, despliegue automático, copias y **restauración probada** (§7, §9) |
| **D12** literacy | El procedimiento de restauración de §9.3 es una de las siete tareas del README (RF-126) |

---

## 15. Huecos declarados y decisiones que exigen registro

### 15.1 `[PENDIENTE]` que este documento **no** puede cerrar

| # | Hueco | Dónde se cierra |
|---|---|---|
| 1 | Nombre exacto del subdominio de envío (P-4) | M0, `decision_log` |
| 2 | Dirección remitente visible: `From` en el subdominio con `Reply-To` a `support@`, o `From` en la raíz (P-3) | M0, antes de construir FU-08 |
| 3 | Tipos y valores exactos de los registros DNS del subdominio de envío | Panel del proveedor (F.2-4) |
| 4 | Caducidad de la URL firmada, en minutos (RNF-20) | `design_docs/api_contracts.md` |
| 5 | Intervalo del barrido de colas (restricción dura: < 60 s) | DU-09, `decision_log` |
| 6 | Duración del plazo de reserva de una fila reclamada (restricción dura: mayor que el tiempo máximo de espera de la llamada externa) | DU-09 |
| 7 | Mecanismo exacto de programación de la copia diaria en la plataforma | FU-14 |
| 8 | Ruta de la ficha de contacto en el CRM para el enlace profundo (la plantilla ya es variable de entorno, RF-54) | F.2-5, Anexo I-9 |
| 9 | Si el cerrojo por cola se activa desde v1 o solo al escalar réplicas | Operación, `decision_log` |
| ~~10~~ | ~~Si el visor de entregables HTML se sirve además desde un origen aislado, además del `sandbox` sin `allow-same-origin`~~ | ✅ **Cerrado por D-45**: el **origen separado es normativo** (§11.3), en línea con `data_model` §3.10 y `ui_wireframes` §7.3; el `sandbox` sin `allow-same-origin` y la CSP estricta se mantienen como defensa en profundidad. Cierra CF-4 de `design_summary` §2. Se construye en DU-19. Queda `[PENDIENTE: nombre del subdominio del visor, se fija en M4]` |

### 15.2 Contradicciones detectadas entre documentos, que alguien debe resolver

Se registran aquí porque afectan directamente al comportamiento del ejecutor de colas y no pueden
resolverse inventando un número:

| # | Contradicción | Detalle |
|---|---|---|
| **C-1** ✅ **CERRADA** | **Cinco esperas contra cinco intentos.** RF-50 enumera **cinco** escalones (1 min → 10 min → 1 h → 6 h → 24 h), pero `data_model` §5.9 acota `crm_attempts` a **5** y `crm_delivery.attempt` a `1…5` | **Ya resuelta en `api_contracts` §8.1**, que la decidió y razonó: **cada espera precede a su intento**, en correspondencia uno a uno, de modo que los cinco escalones se consumen y el tope de cinco intentos se respeta sin tocar el `data_model`. Coste asumido allí: el primer intento no es inmediato, sino a un minuto de la captura. **La instrucción vigente para DU-09 es la de `api_contracts` §8.1**; este documento ya no manda nada distinto. Registrar como D-30 (ver CF-2 de `design_summary` §2) |
| **C-2** | **El reintento manual y el tope.** RF-52 permite forzar desde HQ el reintento de una captura no entregada, pero una captura `failed` ya consumió los 5 intentos que permite la restricción `lead_capture_attempts_bounded` | Resolver en DU-09: o el reintento manual reinicia el contador, o se registra como intento fuera del tope con su propia semántica. **No se decide aquí** |

### 15.3 Decisiones de este documento que exigen entrada en `docs/decision_log.md`

| # | Decisión | Razón resumida |
|---|---|---|
| **A-01** | **El ejecutor de colas vive dentro del servicio `slg-web`**, no en un servicio aparte ni en un orquestador externo | n8n es opcional por contrato (RF-115) y no puede estar en el camino crítico de la conversión; un servicio de trabajador aparte es la salida de escape documentada, no la v1 (§6.2) |
| **A-02** | **Reserva con plazo empujando `next_attempt_at`**, sin estado «en curso» nuevo | Usa el mecanismo que ya existe en las tres colas; una fila reservada por un proceso que muere vuelve sola a la cola, sin tarea de reparación (§6.3) |
| **A-03** | **404, no 403, al cruzar de superficie o de empresa** | Un 403 confirma que la ruta o el recurso existen; coherente con los mensajes neutros de RF-59 y con `ui_wireframes` §1.4 |
| **A-04** | **Límite de peticiones (429) antes de la comprobación de alcance (403)** en `api/v1` | Si el 403 fuera primero, una clave podría martillear endpoints prohibidos sin consumir cuota (§2.5) |
| **A-05** | **La caché de métricas del CRM vive en memoria del proceso**, no en una tabla | `data_model` no declara tabla de caché y no hay que inventarla; son agregados, no datos de cliente, y un reinicio solo cuesta una lectura (§3.6) |
| **A-06** | **El espejo de la tabla `download` se sincroniza en el despliegue y nunca borra filas** | Borrar rompería la trazabilidad de las capturas anteriores (§5.3) |
| **A-07** | **El contrato de webhooks es «al menos una vez»** | Consecuencia inevitable de los momentos 3 y 4 de §6.4; debe quedar escrito en `api_contracts` para que el suscriptor lo sepa |

---

## Registro

- `2026-09-08` — Creado en el paso 6 de `init-project`, nivel MEDIUM del perfil `software-app`, sobre
  `START_PROJECT.md` v1.1 (§0, §4, §5.1, §7, §9, A.2, A.4, B.1–B.8, D1…D12, F.1, F.2),
  `planning/requirements.md` (RF-01…RF-148, RNF-01…RNF-46), `planning/scope.md` (fronteras (a)…(j)),
  `planning/risks.md` (R-01, R-04, R-12, R-20, R-23, R-24, R-25, R-27, R-37, R-38),
  `docs/decision_log.md` (D-14…D-24, P-3, P-4), `design_docs/data_model.md` (§2.6, §3.8, §5.9,
  §5.10, §5.12, §5.18, §5.19, §6, §7) y `design_docs/ui_wireframes.md` (§1.2, §1.3, §1.4).
  Productos nombrados por elección expresa de Ricardo en HITL (AGENTS.md Regla 7): Next.js,
  TypeScript, Tailwind, Motion, Better Auth, PostgreSQL, Drizzle, MinIO, Umami, Easypanel, Hostinger,
  CRM Softlanding Global, n8n, **Resend** (D-22) y **Cloudflare R2** (D-21). Siete decisiones propias
  (A-01…A-07) y dos contradicciones entre documentos (C-1, C-2) quedan declaradas en §15; **C-1 queda
  cerrada** con puntero a `api_contracts` §8.1, y C-2 sigue abierta para su registro y resolución.
- `2026-09-08` — **D-45** eleva el **origen separado del visor de entregables HTML a normativo** en
  §11.3 y cierra el hueco §15.1-10 (CF-4 de `design_summary` §2). El `iframe sandbox` sin
  `allow-same-origin` y la CSP estricta se mantienen como **defensa en profundidad**. Se construye en
  DU-19; queda `[PENDIENTE: nombre del subdominio del visor, se fija en M4]`.
