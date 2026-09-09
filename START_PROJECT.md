---
type: project-brief
title: START_PROJECT — slg_website · Website y centro de comando de SLG Agency
description: Brief SDD (fase Specify) que APP_Builder v4.1 consume vía /init-project para planificar la website pública, la intranet SLG (HQ) y el portal de clientes de SLG Agency Inc.
project: slg_website
repo: https://github.com/RicardoTorresOliva/slg_website.git
version: "1.1"
status: listo-para-planning-gate
author: Ricardo Torres Oliva / SLG Agency Inc. (redactado con Claude)
tags: [slg, website, sdd, okf, app-builder, software-app, spec]
timestamp: 2026-09-08
revision: al-aprobar-el-plan
okf_version: "0.1"
sources:
  - "~/Dev/SLG_Overhauling/SLG Overhauling.md (fuente de verdad de la oferta)"
  - "BizPart/01_Negocios/SLG_Offering/Guides_Manuals/Docs_MD/ (Manual SDD+ICM v1.1 · The Phoenix Doctrine v1.1 · DAL OS v1.0 · Arquitectura de Capas · Guía Hermes · Manual Obsidian+Claude)"
  - "BizPart/07_Systems/APP_Builder (v4.1: AGENTS.md, _contract.md, software-app, knowledge/README.md)"
  - "github.com/emilkowalski/skills/skills/apple-design/SKILL.md"
---

# START_PROJECT — slg_website

> **Cómo usar este archivo.** Va en la raíz del repo `slg_website` (creado desde el template APP_Builder) con este nombre exacto. En Claude Code: `/bootstrap` → `/init-project`. El agente elige el Asset Profile, formula solo las preguntas que este brief no responde, presenta el plan (FU/DU por milestones) y **no produce nada hasta la aprobación de Ricardo** (Planning Gate). Este documento es la fase *Specify* de SDD: es el contrato; el código es su realización. Las decisiones ya tomadas por Ricardo están en §10 y **no se re-exploran**.

---

## 0. Resumen ejecutivo

| | |
|---|---|
| **Activo** | Website de **SLG Agency** en `softlandingglobal.com`: capa comercial pública (ES raíz + `/en`) + **intranet SLG "HQ"** + **portal de clientes**, en una sola aplicación. |
| **Para qué** | Poner en el mercado la nueva estructura `SLG_AI` / `SLG_Holdings` y operar desde un solo lugar: leads, clientes, proyectos, entregables, agentes. Es el *centro de comando* de SLG (Arquitectura de Capas, Capa 6). |
| **Modelo comercial** | High-ticket informativo: **no vendemos, ayudamos a comprar**. CTA = descarga de un documento de interés por servicio (email corporativo). La **Sesión Cero** no es CTA público: se ofrece cuando alguien ingresa/enrola (portal). Blog que alimenta las redes de SLG. |
| **Leads** | **Todos los leads se gestionan en el CRM propio** (`crm.softlandingglobal.com`, compose `slg` del proyecto `clientes` en Easypanel). La web captura y entrega al CRM por API; no gestiona pipeline. |
| **Perfil APP_Builder** | `software-app` (+ gates de marketing y auth del Anexo D). |
| **Stack (decidido, HITL)** | Next.js (App Router, TypeScript) · Tailwind · Motion · contenido Markdown/MDX con frontmatter OKF · Better Auth (contraseña + Google + Microsoft Entra ID, organizaciones, admin, API keys) · PostgreSQL + Drizzle · almacenamiento S3-compatible (MinIO) · Umami · CRM Softlanding Global vía API con clave · n8n vía webhooks (opcional). |
| **Despliegue** | **Easypanel en el VPS Hostinger** (`167.88.42.76`, el mismo del CRM, n8n y Hermes), deploy automático desde GitHub, HTTPS Let's Encrypt, backups programados. DNS en Hostinger (`ns1/ns2.dns-parking.com`). |
| **Idioma** | Sitio público ES + EN completo desde v1 (ES en raíz). Intranets: UI ES/EN por preferencia de usuario, contenido tal como se entrega. |
| **Diseño** | Skill `apple-design` (motion físico, materiales translúcidos, reduced-motion) sobre el **Kit de Marca SLG** (`Kit_Marca_SLG_Rojo.md` v1): azules `#2878B4` / `#14648C` / `#50B4DC`, índigo `#282878`, rojo `#DC141E` solo como detención visual (CTA de descarga), Montserrat. Light-first, sobrio, ejecutivo, una idea por viewport. |
| **Orden de entrega** | 1) Capa pública + descargas + blog (vendible) → 2) HQ → 3) Portal → 4) API agentes + endurecimiento + go-live. Fecha objetivo: `[PENDIENTE: fecha de go-live]`; criterio: lo antes posible. |

---

## 1. Bloque canónico START_PROJECT (lo que `/init-project` lee primero)

**Asset type**: software app — website corporativa bilingüe + dos áreas autenticadas (intranet SLG y portal de clientes) + API para agentes.

**Description**: El sitio público de SLG Agency (SLG Agency Inc., Florida) que presenta la oferta `SLG_AI` (`SLG_Academy`, `SLG_Enterprise`, `SLG_Factory`) y `SLG_Holdings` a C-suite, fundadores y directorios de LATAM e internacional; captura interés mediante descargas de documentos de autoridad; publica un blog; y, tras login, opera como centro de comando de SLG (HQ) y como portal donde cada cliente ve sus entregables y materiales. Sustituye la ausencia actual de sitio en el dominio raíz (hoy sin registro A).

**Key elements**:
- Capa pública ES/EN con navegación que **es** la estructura de la oferta (`SLG_AI` · `SLG_Holdings` · Doctrina · Blog · Nosotros) y una página por servicio con su descarga.
- Sistema de descargas gated (email corporativo → entrega del PDF → alta del lead **en el CRM propio** por API → aviso por correo a SLG).
- Blog en Markdown con frontmatter OKF que incluye extractos listos para redes sociales.
- Autenticación: contraseña, Google, Microsoft 365 (Entra ID); acceso a clientes **solo por invitación, por empresa**.
- HQ (intranet SLG): tablero (capturas web y su estado de entrega al CRM, métricas del pipeline leídas del CRM, clientes, proyectos, entregables, actividad de agentes), gestión de empresas/usuarios/invitaciones/proyectos/entregables/avisos, claves de API, auditoría. El pipeline **no** se gestiona aquí: HQ enlaza al CRM.
- Portal de clientes: avisos, entregables por proyecto (PDF, HTML autocontenido, Markdown OKF, enlace), materiales de programa, miembros de la empresa, paso "Agenda tu Sesión Cero".
- API REST con claves para agentes Hermes (leer clientes y proyectos, crear entregables y avisos, registrar actividad). Los leads los operan los agentes en el **CRM** (su propio MCP), no en la web.

**Consumers / roles**: visitante ejecutivo (LATAM/US, poco tiempo, lee en móvil desde LinkedIn) · `slg_admin` (Ricardo) · `slg_operator` (Jessica, asociados) · `client_admin` / `client_member` (personas de cada empresa cliente) · `agent` (Hermes, por API key).

**Sources / integrations**: `SLG Overhauling.md` (estructura y nomenclatura) · Docs_MD (doctrina y método; fuente de la página Doctrina y del tono) · **CRM Softlanding Global** (`https://crm.softlandingglobal.com/api/v1`, clave `crm_live_…` con alcances; repo `RicardoTorresOliva/CRM`, clon local `~/Dev/crm_slg`) · n8n `n8n.softlandingglobal.com` (opcional) · proveedor de correo transaccional `[PENDIENTE]` · Google Cloud (OAuth) · Microsoft Entra ID (OAuth) · Easypanel/Hostinger (panel `buul2l.easypanel.host`, VPS `167.88.42.76`) · GitHub (privado).

**Constraints**:
- **Stack y hosting pre-decididos** (§10): no re-explorar; el agente solo propone alternativas donde este brief lo marca como abierto.
- Nomenclatura obligatoria e intraducible: `SLG_AI`, `SLG_Holdings`, `SLG_Academy`, `SLG_Enterprise`, `SLG_Factory`, `SLG_Readiness`, `SLG_Implement`, `APP_Building`, `AGE_Building`, `CoO as a Service`, `Phoenix PEEx / TEAx / RETx`. Marca pública: **SLG Agency**; "Softlanding Global" solo en contexto `SLG_Holdings`. Lema: *Precision with Purpose*.
- Tono: ejecutivo, sobrio, claridad quirúrgica, cero hype de IA. Autoridad, no entusiasmo. Marcos de la casa cuando aporten: Digital Geography, Market Fracking, Hyperflexibility, Agentic Mindset, Destrucción Creativa, Antifragilidad, AI Literacy. Regla dura: la "D" de DAL OS se expande siempre como **Destrucción Creativa**.
- **Nada inventado**: precios, casos, cifras, nombres de clientes y testimonios solo con dato verificado y autorización explícita; si falta, `[PENDIENTE: …]` visible en staging, nunca en producción.
- Copy nuevo (no se reutiliza el copy Palin de julio 2026): se redacta como Foundation Unit y **se aprueba antes de construir páginas** (compuerta SDD).
- Contenido como datos (OKF): todo texto visible vive en `content/` con frontmatter; ninguna cadena de negocio hardcodeada en componentes.
- **El CRM es el sistema de registro de leads y pipeline.** La web no construye gestión de leads: captura, entrega al CRM, guarda evidencia y reintenta si el CRM no responde.
- Secretos solo en variables de entorno de Easypanel. **El repo es público** (decisión de Ricardo, 2026-09-08): ningún secreto, PDF de descarga, entregable de cliente ni dato de cliente entra en el repo (los archivos gated viven en el bucket); el copy pre-lanzamiento es visible desde el primer commit. No tocar los registros DNS de `n8n`, `evolution`, `academy`, `crm` ni los MX (correo en migración paralela).
- Phoenix Academy (`academy.softlandingglobal.com`) queda fuera: solo enlace desde `SLG_Academy` mientras siga vivo.

---

## 2. Qué quiero construir y por qué ahora

**Qué.** Una sola aplicación con tres caras: (1) la cara pública que explica la nueva oferta y convierte interés en leads calificados por descarga; (2) HQ, desde donde SLG ve y opera todo lo que entra y todo lo que se entrega; (3) el portal donde cada cliente encuentra lo suyo, entra con la identidad que ya usa (Google o Microsoft 365) y no ve nada de nadie más. Las tres comparten identidad, base de datos, diseño y despliegue.

**Por qué ahora (PAIN).**
- El dominio raíz `softlandingglobal.com` **no sirve nada** (sin registro A): la nueva estructura `SLG_AI` / `SLG_Holdings` no existe en ningún activo digital y las presentaciones comerciales no tienen dónde aterrizar.
- La operación de SLG vive repartida (CRM, Notion, Drive, n8n, Hermes, correo): el CRM ya concentra leads y pipeline, pero no hay un punto único donde ver clientes, proyectos, entregables y agentes junto a lo que entra — la Capa 6 de la Arquitectura de Capas no tiene interfaz propia.
- Los entregables a clientes se envían por correo/Drive: sin portal no hay "lugar" del cliente, ni evidencia de entrega, ni base para `SLG_Readiness` (reporte interactivo web) ni para los materiales Phoenix.
- Prioridad financiera: lo primero que sale es lo que **vende** (capa pública + descargas); las intranets se construyen sobre la misma base sin rehacer nada.

**Qué no es.** No es un LMS, no es un CRM completo, no es un CMS de terceros, no es un chat. Es un sitio de autoridad con máquina de captura + un centro de comando mínimo que crece por iteraciones (`/iterate`).

---

## 3. Perfil de activo

- [x] **software-app** (perfil de referencia de APP_Builder v4.1).
- Extensiones declaradas en este brief, no en el perfil: gates de marketing (rendimiento, SEO, i18n, fidelidad de copy), gates de identidad (tres métodos de login, aislamiento por empresa), gates de API (claves, alcances, límites) — Anexo D. Regla del perfil que **sí aplica**: superficie de administración/operaciones (HQ lo es).

---

## 4. Criterio de éxito (Definition of Done v1)

Se considera terminado cuando **todas** estas pruebas pasan en producción (`softlandingglobal.com`, HTTPS):

| # | Prueba (E2E, con evidencia en `work_log`) |
|---|---|
| 1 | Un CEO que llega desde LinkedIn en móvil entiende en < 3 minutos qué es `SLG_AI` y qué es `SLG_Holdings`, entra a `Phoenix PEEx`, deja su email corporativo y recibe el PDF; **en el CRM aparece el contacto (y su empresa y oportunidad con fuente `web`, cuando el CRM lo permita — Anexo B.6)** con una nota "Descargó D-01 desde /ai/academy/phoenix-peex", y llega un aviso a `support@softlandingglobal.com`. Un email gratuito (gmail, hotmail…) es rechazado con mensaje claro. Si el CRM no responde, la captura queda en cola y se entrega al reintentar (prueba con el CRM apagado). |
| 2 | La misma página existe en EN (`/en/...`) con paridad de secciones y `hreflang` correcto; el toggle conserva la página. |
| 3 | Un artículo nuevo se publica añadiendo un `.md` con frontmatter OKF al repo y haciendo push: aparece en `/blog` en minutos, con sus extractos para redes visibles en HQ. |
| 4 | Ricardo entra a HQ con Google; Jessica con contraseña. HQ muestra las capturas web del día con su estado de entrega al CRM y enlace directo a cada contacto en el CRM, las métricas del pipeline leídas del CRM, empresas, proyectos, entregables y la actividad reciente de agentes. |
| 5 | Ricardo crea la empresa "Cliente Demo", invita a un usuario; ese usuario acepta con **Microsoft 365** y ve **solo** los proyectos y entregables de su empresa. Una prueba automatizada demuestra que no puede leer recursos de otra empresa ni rutas de HQ. |
| 6 | Un agente Hermes con clave de API de la web lista los proyectos de "Cliente Demo" y crea un aviso en su portal; la clave con alcance de solo lectura no puede crear nada; el exceso de peticiones devuelve 429; todo queda en el registro de auditoría. El mismo agente consulta los leads de la semana **en el CRM** por su MCP, no en la web. |
| 7 | Lighthouse móvil ≥ 90 en Performance / Accessibility / Best Practices / SEO en Home y en una página de servicio; contraste AA; `prefers-reduced-motion` respetado; navegación completa por teclado. |
| 8 | Backup de base de datos y de archivos ejecutado y **restaurado** en staging con éxito. |
| 9 | Ricardo, sin ayuda técnica, cambia un texto, añade una descarga y crea un cliente siguiendo el README del repo (prueba de Literacy). |
| 10 | Ningún `[PENDIENTE]`, lorem ipsum, cifra sin fuente ni nombre de cliente sin autorización en producción (script de verificación en CI). |

---

## 5. Alcance v1

### 5.1 SÍ (se construye ahora)

**Capa pública (ES raíz + `/en`)**
- Home · `SLG_AI` (overview) · `SLG_Academy` (+ `Phoenix PEEx`, `Phoenix TEAx`, `Phoenix RETx`, Customize Programs, AI Coaching for Directors) · `SLG_Enterprise` (+ `SLG_Readiness`, `SLG_Implement`) · `SLG_Factory` (+ `APP_Building`, `AGE_Building`, `CoO as a Service`) · `SLG_Holdings` · Doctrina (The Phoenix Doctrine resumen ejecutivo + DAL OS) · Nosotros · Blog (índice, artículo, etiquetas, RSS) · Descargas (biblioteca + página por documento + gracias) · Contacto · Legal (privacidad, términos — requisito de las pantallas OAuth).
- Sistema de descargas: un documento por servicio (§Anexo A.4), formulario con validación de email corporativo, entrega por enlace firmado con caducidad, **alta del lead en el CRM por API** (contacto + nota con contexto; empresa y oportunidad según Anexo B.6), cola de reintentos si el CRM no responde, aviso por correo a `support@`.
- Blog en Markdown/MDX (`content/blog/`), frontmatter OKF con `social` (extractos para LinkedIn), borradores no publicados, RSS.
- SEO técnico: metadatos únicos por página e idioma, Open Graph con imagen de marca, `hreflang`, `sitemap.xml`, `robots.txt`, schema.org `Organization` + `Service`, canonical.
- Analítica privacy-first autoalojada (Umami en Easypanel).

**Identidad y acceso**
- Registro solo por invitación (portal) o alta por administrador (HQ). Métodos: contraseña, Google, Microsoft Entra ID (`tenantId: common`). Vinculación de cuentas por email verificado. Recuperación de contraseña por correo.
- Roles: `slg_admin`, `slg_operator`, `client_admin`, `client_member`, `agent` (API key con alcances). Matriz en Anexo B.3.

**HQ — intranet SLG (`/hq`)**
- Tablero: capturas web (por documento/página/fecha) con estado de entrega al CRM y enlace al contacto en el CRM; métricas del pipeline leídas del CRM (`/dashboard/metrics`, `/reports/funnel`, `/reports/sources`); empresas activas; proyectos y entregables recientes; artículos (publicados/borradores con sus extractos sociales); actividad de agentes; últimos eventos de auditoría. Botón "Abrir CRM".
- Gestión: empresas cliente, usuarios e invitaciones, proyectos, entregables (subida de archivo o enlace; visibilidad por proyecto), avisos a una empresa, claves de API (crear/revocar/alcances/límites), registro de auditoría, reintento manual de capturas no entregadas al CRM. **Sin gestión de leads ni pipeline** (viven en el CRM).

**Portal de clientes (`/portal`)**
- Inicio con avisos de SLG · Proyectos y entregables (ver/descargar: PDF, HTML autocontenido en visor aislado, Markdown OKF renderizado, enlace) · Materiales de programa (entregables de tipo `material`) · Miembros de la empresa (`client_admin` invita) · Perfil · Paso "Agenda tu Sesión Cero" (enlace a calendario `[PENDIENTE]`).

**API para agentes (`/api/v1`)**
- Autenticación por clave (`Authorization: Bearer`), alcances por clave, límite de peticiones, auditoría. Recursos: empresas y proyectos (leer), entregables (crear metadatos + URL de subida, leer), avisos (crear), eventos de actividad (crear), capturas web (leer, solo evidencia). Especificación OpenAPI publicada en `/api/v1/openapi.json` (solo autenticado). Los leads se operan en el CRM (`/api/v1/mcp` del CRM, 25 herramientas ya existentes).

**Integraciones**
- **CRM Softlanding Global** (sistema de registro de leads): clave `crm_live_…` propia de la web con los alcances mínimos; alta de contacto + nota por cada captura; lectura de métricas para el tablero; enlace profundo a cada contacto. Detalle y dependencia en Anexo B.6.
- Webhooks salientes firmados (HMAC), suscriptor opcional n8n: `lead.captured`, `lead.delivered_to_crm`, `download.completed`, `contact.submitted`, `doctrine.requested`, `invitation.sent`, `deliverable.published`, `announcement.published`, `post.published`.
- Correo transaccional: invitaciones, recuperación de contraseña, avisos de captura a SLG (remitente `support@softlandingglobal.com`).

**Operación**
- Servicios Easypanel: `slg-web` (Next.js, Dockerfile `standalone`), `slg-db` (PostgreSQL), `slg-files` (MinIO, buckets `downloads` y `deliverables`, privados), `slg-analytics` (Umami), `slg-web-staging` (rama `develop`, `staging.softlandingglobal.com` con contraseña básica). Deploy automático al hacer push a `main`. Backups diarios de base de datos y volúmenes a destino externo `[PENDIENTE: destino]`.
- README operativo para no programador: cómo editar un texto, publicar un artículo, añadir una descarga, crear un cliente e invitar, crear una clave de API, desplegar, restaurar un backup, dónde vive cada spec.

### 5.2 NO (fuera de v1; registrado para spec-deltas)
- Motor del reporte interactivo `SLG_Readiness` (v1 solo aloja el HTML resultante como entregable) · seguimiento de alumnos/LMS · mensajería o chat cliente-SLG · pagos y facturación · editor de contenido en HQ (CMS) · buscador · newsletter · migración o integración de Phoenix Academy · sincronización automática vault→repo · módulo de grafo en vivo · página Advisory · casos de cliente públicos sin autorización · modo oscuro (opcional v1.1) · 2FA (v1.1).

### 5.3 Previsto (la arquitectura lo deja enchufable, no se construye)
- Módulo "Contenido" en HQ (escribir/publicar artículos y generar extractos sociales) · alojamiento nativo del reporte `SLG_Readiness` · programas Phoenix con progreso por participante · flujo n8n que publica extractos del blog en LinkedIn · Hermes como validador de revisiones (patrón Builder-Validator, Guía Hermes §7) · perfil `marketing-website` formalizado en `profiles/` a partir del Anexo D.

---

## 6. Modelo sugerido (barbell)

- **Planificación y diseño** (`/init-project`, arquitectura, sistema de diseño, revisión por milestone): el modelo de razonamiento más capaz disponible en Claude Code.
- **Construcción** (páginas, componentes, migraciones, tests): el modelo económico que supere el quality gate; subir de modelo solo si un DU falla dos veces.
- **Revisión independiente** (`/review`): sesión nueva con contexto limpio; opcionalmente Hermes local como validador que ejecuta las pruebas en Docker y devuelve veredicto estructurado.

---

## 7. Recursos y stack (modo: **decidido en HITL — no re-explorar**)

| Capa | Decisión | Motivo | Si falla |
|---|---|---|---|
| Framework | **Next.js (App Router, TypeScript)**; un solo proyecto con grupos de rutas `(public)`, `(hq)`, `(portal)`, `api/` | Público + app en un despliegue; la skill `apple-design` presupone React/Motion; SSR para las áreas autenticadas | — |
| Estilo y motion | **Tailwind CSS** + tokens de marca; **Motion** (springs) | Tokens verificables; springs interrumpibles (apple-design §3–4) | CSS variables puras + View Transitions solo en lo no gestual |
| Contenido | **Markdown/MDX en `content/`** con frontmatter OKF; pares ES/EN por `slug`; i18n con ES en raíz y `/en` | Copy = datos; edición sin código; paridad verificable por script | — |
| Identidad | **Better Auth**: email+contraseña, Google, Microsoft (`tenantId: common`), plugins `organization`, `admin`, `apiKey` | Tres métodos + multi-empresa + claves de API en una sola librería, datos en nuestro Postgres, sin proveedor externo de identidad | Auth.js (proveedor `microsoft-entra-id`) + tablas propias de organizaciones/claves |
| Base de datos | **PostgreSQL** (servicio Easypanel) + **Drizzle** (esquema y migraciones versionadas en el repo) | Soberanía; migraciones auditables (SDD) | — |
| Archivos | **MinIO** (servicio Easypanel, API S3) con URLs firmadas | PDFs de descarga y entregables privados en el mismo VPS | Object storage S3 del proveedor de hosting |
| Correo transaccional | `[PENDIENTE: elegir proveedor — candidatos: SMTP de Google Workspace tras la migración, o un servicio transaccional con dominio verificado (SPF/DKIM)]` | Invitaciones, recuperación, avisos | — |
| Analítica | **Umami** autoalojado (Easypanel) | Privacy-first, coherente con glass-box | Sin analítica en v1 |
| Leads y pipeline | **CRM Softlanding Global** (`crm.softlandingglobal.com`, mismo VPS) por API REST con clave de alcances (`contacts:write`, `activities:write`, `crm:read`); cola de reintentos en la web | Un solo sistema de registro comercial; ya desplegado en Easypanel (proyecto `clientes`, compose `slg`) | Captura en cola + reintento; nunca un segundo CRM |
| Automatización | **n8n** existente como suscriptor opcional de webhooks firmados | Ya operativo; no es requisito de la v1 | — |
| Anti-abuso | Límite de peticiones en formularios/API + honeypot + lista de dominios de correo gratuito; desafío anti-bot `[opcional: decidir en plan]` | Leads limpios sin fricción | — |
| Despliegue | **Easypanel** App Service desde GitHub (`main` → producción, `develop` → staging), Dockerfile con `output: 'standalone'`, dominios `softlandingglobal.com` + `www`, Let's Encrypt | Ya pagado y operativo; deploy automático por webhook | Trigger URL de despliegue desde GitHub Actions |
| DNS (Hostinger) | `A @ → 167.88.42.76` (IP confirmada: es la que ya sirven `crm`, `n8n` y `evolution`) · `CNAME www → softlandingglobal.com` · `A staging → 167.88.42.76`. **No tocar** `crm`, `n8n`, `evolution`, `academy` (CNAME a Vercel) ni MX (Outlook) | Hoy el raíz no resuelve: no hay nada que respaldar | — |
| Repo | `RicardoTorresOliva/slg_website`, **público**, creado desde el template APP_Builder (commit inicial `23e893f`); clon local `~/Dev/slg_website` | Flujo APP_Builder; glass-box | — |

**MCP vs API (distinción del método).** MCP = para que el agente *construya* (inspeccionar el CRM por su MCP, consultar n8n, operar Easypanel/Hostinger/Google Cloud/Entra con Claude in Chrome). API + clave en variables de entorno = para que el sitio *opere en producción* por sí mismo. Nunca se mezclan.

**Vault y rutas locales.** Repo clonado en `~/Dev/slg_website`. Specs y entregables del proyecto en `~/Dev/SLG_Overhauling/web/` (bundle OKF con `index.md` + `log.md`). Doctrina y método en `BizPart/01_Negocios/SLG_Offering/Guides_Manuals/Docs_MD/`.

---

## 8. Conocimiento OKF a montar en `knowledge/` (`/init-project`, paso 9)

| Concepto (`type`) | Origen | Uso |
|---|---|---|
| `project-brief` — este archivo | `~/Dev/SLG_Overhauling/web/START_PROJECT.md` | Contrato |
| `offer-structure` — estructura de la oferta | `~/Dev/SLG_Overhauling/SLG Overhauling.md` | Fuente de navegación, páginas y nomenclatura |
| `brand-kit` — Kit de Marca SLG v1 íntegro | `~/Dev/SLG_Overhauling/assets/Kit_Marca_SLG_Rojo.md` | Paleta, tipografía, reglas de logo y prohibiciones; fuente de los tokens |
| `brand-tokens` — tokens web derivados del kit | §Anexo C + activos `[PENDIENTE: logo SLG Agency en SVG/PNG, favicon, imagen OG, Montserrat en woff2]` | Tokens de Tailwind con contrastes verificados |
| `design-apple` — skill `apple-design` íntegra | `github.com/emilkowalski/skills/skills/apple-design/SKILL.md` | Reglas de motion, materiales, tipografía, accesibilidad; checklist de revisión |
| `doctrine-summary` — resumen público de The Phoenix Doctrine y DAL OS | Docs_MD | Página Doctrina; tono |
| `method-sdd-icm` — reglas del manual SDD+ICM | Docs_MD | Estructura del repo (estaciones), compuertas |
| `content-schema` — frontmatter de páginas, servicios, artículos, descargas | Anexo B.4 | Colecciones de contenido |
| `crm-integration` — contrato de captura web → CRM | Anexo B.6 + `~/Dev/crm_slg/docs/integrations.md` y `design/api_contracts.md` (solo lectura) | Alta de contactos, notas, métricas; cola de reintentos |
| `data-model`, `api-contracts`, `auth-spec`, `architecture`, `style-guide` | Diseño del perfil `software-app` (generados en el plan) | Producción |

Reglas del bundle: un archivo = un concepto; frontmatter con `type` obligatorio (`title`, `description`, `tags`, `timestamp` recomendados); enlaces relativos; `index.md` + `log.md` obligatorios y actualizados en cada cambio. `types` permitidos para este proyecto: `project-brief`, `Concepto`, `Convención`, `Plantilla`, `Índice`, `Registro` (+ los `design_docs` del perfil). Añadir un `type` nuevo exige entrada en `log.md`.

---

## 9. Riesgos principales

| Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|
| Pantalla de consentimiento de Google / registro Entra sin completar a tiempo | Media | Alto | Son pre-requisitos externos (Anexo F) que se hacen en paralelo al milestone 0, guiados por Claude in Chrome; el login por contraseña no depende de ellos |
| Cancelar M365 antes de registrar la app en Entra | Media | Medio | Registrar la app **antes** de cancelar; si ya se canceló, crear un tenant Entra gratuito solo para el registro |
| Copy nuevo retrasa las páginas | Alta | Alto | El copy es la FU-01 del milestone 1 y se aprueba en una sola compuerta; las páginas se construyen con el esquema de contenido antes, con texto de staging marcado `[PENDIENTE]` |
| 9 PDFs de descarga no listos al lanzar | Alta | Medio | El sistema admite añadir documentos sin código; se lanza con los que existan y cada página sin PDF muestra "disponible próximamente" + captura anticipada |
| Un solo VPS | Media | Alto | Backups diarios probados (DoD #8), límites de recursos por servicio, monitor de caída vía n8n |
| Fuga entre empresas en el portal | Baja | Crítico | Autorización por `organization_id` en cada consulta, pruebas automatizadas de aislamiento (DoD #5), revisión independiente por milestone |
| La clave de API del CRM no puede crear empresas ni oportunidades (alcances actuales: solo contactos, notas y actualizaciones) | Alta | Medio | v1 crea contacto + nota; empresa y oportunidad se crean en el CRM a mano o tras el spec-delta del CRM (Anexo B.6). Nunca se usa un login de usuario del CRM como cuenta de servicio |
| CRM caído en el momento de la captura | Baja | Medio | Cola de entrega con reintentos y reintento manual en HQ; el PDF se entrega igual |
| Scripts de verificación de APP_Builder con falsos verdes (Reporte_APP_Builder §6) | Alta | Medio | Hasta corregirlos, `/review` verifica a mano la completitud; se registra en `decision_log` |
| Dominio raíz nuevo sin historial SEO | Alta | Bajo | Sitemap, schema, contenido de autoridad, blog constante |

---

## 10. Decisiones ya tomadas por Ricardo (HITL, 2026-09-08) — no re-explorar

| # | Decisión | Resolución |
|---|---|---|
| 1 | Hosting/despliegue | **Easypanel en el VPS Hostinger** (no Vercel, no híbrido) |
| 2 | Alcance de intranets v1 | **Centro de comando mínimo vendible** (HQ + portal con lo listado en §5.1) |
| 3 | Copy y arquitectura de páginas | **Copy nuevo** desde `SLG Overhauling.md`; Palin solo como referencia de voz |
| 4 | Marca web | **Kit de Marca SLG Rojo v1** (azules + índigo + rojo de detención, Montserrat) — sustituye la elección inicial de la paleta Navy/Cyan/Lime, hecha el mismo día |
| 5 | Idioma | **ES en raíz + `/en`**, ambas versiones completas desde v1 |
| 6 | Repo | Creado desde el template APP_Builder y **público** (2026-09-08); clonado en `~/Dev/slg_website` con este brief en la raíz (Anexo H) |
| 7 | Phoenix Academy | **Fuera de alcance; solo enlace** |
| 8 | CTA | **Descarga de interés por servicio**; Sesión Cero solo al ingresar/enrolar; **Blog** que alimenta redes |
| 9 | Usuarios HQ | **Personas (admin + operadores) + agentes Hermes vía API** desde v1 |
| 10 | Acceso de clientes | **Solo por invitación, por empresa** |
| 11 | Blog | **Markdown en el repo** (sin CMS en v1) |
| 12 | Descargas en el lanzamiento | **Una por servicio (9)**; contenidos producidos en paralelo en el proyecto SLG_Overhauling |
| 13 | Leads | **Todos los leads se manejan en el CRM propio** (Easypanel, proyecto `clientes`, compose `slg`; `crm.softlandingglobal.com`); la web no gestiona pipeline |

---

# ANEXO A — Arquitectura de información y contrato de páginas

## A.1 Navegación (el menú es la estructura de la oferta)

| ES | EN | Ruta ES | Ruta EN |
|---|---|---|---|
| SLG_AI | SLG_AI | `/ai` | `/en/ai` |
| SLG_Holdings | SLG_Holdings | `/holdings` | `/en/holdings` |
| Doctrina | Doctrine | `/doctrina` | `/en/doctrine` |
| Blog | Blog | `/blog` | `/en/blog` |
| Nosotros | About | `/nosotros` | `/en/about` |
| Acceder (botón) | Sign in | `/acceder` | `/en/sign-in` |

Etiquetas específicas, nunca "Inicio/Home" como destino de menú (apple-design §16: *direct, specific labels*). El logo lleva a Home.

## A.2 Mapa de páginas públicas

| Página | Ruta ES | Ruta EN | Descarga asociada |
|---|---|---|---|
| Home | `/` | `/en` | — |
| SLG_AI (overview de las tres ramas) | `/ai` | `/en/ai` | — |
| SLG_Academy (overview) | `/ai/academy` | `/en/ai/academy` | — |
| Phoenix PEEx | `/ai/academy/phoenix-peex` | `/en/ai/academy/phoenix-peex` | D-01 |
| Phoenix TEAx | `/ai/academy/phoenix-teax` | `/en/ai/academy/phoenix-teax` | D-02 |
| Phoenix RETx | `/ai/academy/phoenix-retx` | `/en/ai/academy/phoenix-retx` | D-03 |
| Customize Programs | `/ai/academy/customize-programs` | `/en/ai/academy/customize-programs` | D-04 |
| AI Coaching for Directors | `/ai/academy/ai-coaching` | `/en/ai/academy/ai-coaching` | D-05 |
| SLG_Enterprise (overview) | `/ai/enterprise` | `/en/ai/enterprise` | — |
| SLG_Readiness | `/ai/enterprise/readiness` | `/en/ai/enterprise/readiness` | D-06 |
| SLG_Implement | `/ai/enterprise/implement` | `/en/ai/enterprise/implement` | D-07 |
| SLG_Factory (overview) | `/ai/factory` | `/en/ai/factory` | — |
| APP_Building | `/ai/factory/app-building` | `/en/ai/factory/app-building` | D-08 |
| AGE_Building | `/ai/factory/age-building` | `/en/ai/factory/age-building` | D-09 |
| CoO as a Service | `/ai/factory/coo-as-a-service` | `/en/ai/factory/coo-as-a-service` | D-10 |
| SLG_Holdings | `/holdings` | `/en/holdings` | D-11 |
| Doctrina | `/doctrina` | `/en/doctrine` | — |
| Nosotros | `/nosotros` | `/en/about` | — |
| Blog (índice, etiquetas) | `/blog`, `/blog/etiqueta/[tag]` | `/en/blog`, `/en/blog/tag/[tag]` | — |
| Artículo | `/blog/[slug]` | `/en/blog/[slug]` | — |
| Descargas (biblioteca) | `/descargas` | `/en/downloads` | — |
| Documento (formulario) | `/descargas/[slug]` | `/en/downloads/[slug]` | — |
| Gracias (post-descarga) | `/gracias` | `/en/thank-you` | — |
| Contacto | `/contacto` | `/en/contact` | — |
| Privacidad · Términos | `/legal/privacidad`, `/legal/terminos` | `/en/legal/privacy`, `/en/legal/terms` | — |

Nota: "uno por servicio" da **11 servicios** si se cuentan Customize Programs y AI Coaching for Directors; `[PENDIENTE: confirmar si son 9 (sin D-04 y D-05) u 11]`. El sistema no distingue: cada documento es un registro de contenido.

## A.3 Contrato de cada página de servicio (ICM: una estación, un contrato)

Orden fijo de secciones; el copy de cada una es `[PENDIENTE: Spec de copy bilingüe — FU-01]`:

1. **Para quién y qué problema** — el comprador se reconoce en dos frases (sin alarmismo).
2. **Qué es** — definición literal desde `SLG Overhauling.md` (p. ej., `SLG_Readiness`: análisis exhaustivo de preparación para la era IA).
3. **Qué incluye** — lista tal cual la fuente (p. ej., las 11 dimensiones de `SLG_Readiness`; las tres promesas de `CoO as a Service`; las tres líneas de `SLG_Holdings`).
4. **Cómo trabajamos** — una frase por principio aplicable: sin lock-in, elección del stack por el cliente, compuertas de aprobación (SDD), capacidad transferible (DAL OS).
5. **Descarga** — el documento de interés de ese servicio (título, para quién, qué aprende; formulario de email corporativo). **Único CTA de la página.**
6. **Siguiente paso** — sin venta: "Si después de leerlo quieres conversar, escríbenos" → `/contacto`. Nada de agenda embebida.

Home: hero tipográfico (una idea) → las dos ramas como dos puertas (`SLG_AI` · `SLG_Holdings`) → tres tarjetas de `SLG_AI` (Academy · Enterprise · Factory) → franja Doctrina (pull-quote + enlace) → últimos artículos → descarga destacada → pie. Doctrina: resumen ejecutivo público de The Phoenix Doctrine + los tres pilares de DAL OS (Destrucción Creativa · Antifragilidad · AI Literacy) + "documento completo a solicitud" (formulario = lead). Nosotros: SLG Agency Inc. (Florida), Ricardo Torres Oliva, mentorías (ACP, SelectUSA/SGWIT) — datos a confirmar en copy.

## A.4 Documentos de descarga (lead magnets)

| ID | Servicio | Título de trabajo (propuesta; aprobar en FU-01) | Estado |
|---|---|---|---|
| D-01 | Phoenix PEEx | *Lo que un Director debe saber sobre Implementación IA* (título dado por Ricardo) | `[PENDIENTE: PDF]` |
| D-02 | Phoenix TEAx | `[PENDIENTE: título]` | `[PENDIENTE: PDF]` |
| D-03 | Phoenix RETx | `[PENDIENTE: título]` | `[PENDIENTE: PDF]` |
| D-04 | Customize Programs | `[PENDIENTE: título]` | `[PENDIENTE: PDF]` |
| D-05 | AI Coaching for Directors | `[PENDIENTE: título]` | `[PENDIENTE: PDF]` |
| D-06 | SLG_Readiness | `[PENDIENTE: título]` | `[PENDIENTE: PDF]` |
| D-07 | SLG_Implement | `[PENDIENTE: título]` | `[PENDIENTE: PDF]` |
| D-08 | APP_Building | `[PENDIENTE: título]` | `[PENDIENTE: PDF]` |
| D-09 | AGE_Building | `[PENDIENTE: título]` | `[PENDIENTE: PDF]` |
| D-10 | CoO as a Service | `[PENDIENTE: título]` | `[PENDIENTE: PDF]` |
| D-11 | SLG_Holdings | `[PENDIENTE: título]` | `[PENDIENTE: PDF]` |

Cada documento es un registro en `content/downloads/<slug>.md` (ES y EN) con frontmatter (Anexo B.4) y su archivo en el bucket `downloads`. Mientras falte el PDF, la página muestra "disponible próximamente" y captura el email igual (`download.completed` se dispara cuando exista el archivo).

## A.5 Blog → redes

- Artículos en `content/blog/<lang>/<slug>.md`. Frontmatter obligatorio: `type: post`, `title`, `description`, `lang`, `pair` (slug del par en el otro idioma o `null`), `date`, `tags`, `status: draft|published`, `cover`, `social: { hook, linkedin, x }` (extractos redactados para redes), `author`.
- HQ muestra por artículo los extractos listos para copiar; el evento `post.published` permite a n8n publicarlos automáticamente (previsto, v1.1).
- Idioma: un artículo puede existir solo en ES; la paridad ES/EN es obligatoria en páginas, no en artículos.

---

# ANEXO B — Arquitectura técnica

## B.1 Una aplicación, tres superficies

```
softlandingglobal.com
├── (public)   /  /ai/**  /holdings  /doctrina  /blog/**  /descargas/**  /contacto  /legal/**  (+ /en/**)
├── (auth)     /acceder  /invitacion/[token]  /recuperar
├── (hq)       /hq/**        rol slg_*      (tablero, empresas, usuarios, proyectos, entregables, avisos, claves, auditoría, capturas web)
├── (portal)   /portal/**    rol client_*   (avisos, proyectos, entregables, materiales, miembros, perfil, sesión-cero)
└── api/v1/**  agentes (API key) + endpoints internos de la app
```

Middleware: resuelve idioma en `(public)`; exige sesión y rol en `(hq)`/`(portal)`; exige clave válida y alcance en `api/v1`. Toda consulta a datos de cliente incluye `organization_id` del contexto autenticado (nunca del parámetro de la petición).

## B.2 Modelo de datos (entidades; el detalle va al `data_model` del plan)

| Entidad | Campos clave | Notas |
|---|---|---|
| `user` | id, name, email (único, verificado), role (`slg_admin`,`slg_operator`,`client_admin`,`client_member`), locale, created_at | Better Auth + campos propios |
| `account` / `session` / `verification` | proveedor (`credential`,`google`,`microsoft`), provider_account_id (Entra: `oid`) | Better Auth |
| `organization` | id, name, slug, type (`client`,`slg`), status, primary_contact | Empresa cliente; SLG es una organización de tipo `slg` |
| `membership` | user_id, organization_id, org_role | Un usuario puede pertenecer a una sola empresa cliente en v1 |
| `invitation` | email, organization_id, role, token, expires_at, accepted_at | Aceptable con cualquiera de los tres métodos |
| `api_key` | hash, name, owner (user/org), scopes[], rate_limit, expires_at, last_used_at, revoked_at | Plugin `apiKey` |
| `lead_capture` | email, domain, name, company, role, source (`download`,`contact`,`doctrine-request`), download_id, page, locale, utm, consent_at, **crm_contact_id**, **crm_company_id**, **crm_opportunity_id**, crm_sync_status (`pending`,`delivered`,`failed`), crm_attempts, crm_last_error | **Evidencia y cola de entrega, no un CRM**: el registro comercial es el CRM. Sin campos de estado comercial |
| `download` (documento) | slug, service, title_es/en, file_key, status (`draft`,`coming-soon`,`published`) | Metadatos en contenido; archivo en MinIO |
| `download_event` | lead_capture_id, download_id, signed_url_issued_at, completed_at | Prueba de entrega |
| `project` | organization_id, name, service (nomenclatura), status, owner_user_id, starts_at, ends_at | |
| `deliverable` | project_id, title, type (`pdf`,`html`,`md`,`link`,`material`), file_key/url, version, visibility (`client`,`internal`), published_at, published_by (user o api_key) | HTML autocontenido se sirve en visor aislado (sandbox) |
| `announcement` | organization_id, title, body_md, published_at, author (user o api_key) | |
| `agent_event` | api_key_id, kind, payload_json, created_at | Actividad de agentes visible en HQ |
| `audit_log` | actor (user/api_key), action, entity, entity_id, ip, created_at | Inmutable |
| `webhook_delivery` | event, payload, status, attempts, last_error | Reintentos a suscriptores (n8n) |
| `crm_delivery` | lead_capture_id, request, response_code, attempt, created_at | Traza de cada intento de alta en el CRM |

## B.3 Roles y permisos

| Acción | slg_admin | slg_operator | client_admin | client_member | agent (según alcance) |
|---|---|---|---|---|---|
| Ver tablero HQ, capturas web, métricas del CRM | ✔ | ✔ | — | — | `captures:read` |
| Reintentar entrega de una captura al CRM | ✔ | ✔ | — | — | — |
| Crear/editar empresas, proyectos | ✔ | ✔ (asignados) | — | — | `orgs:read` |
| Invitar usuarios SLG / crear claves de API | ✔ | — | — | — | — |
| Publicar entregables y avisos | ✔ | ✔ (asignados) | — | — | `deliverables:write`, `announcements:write` |
| Ver entregables/avisos de su empresa | ✔ | ✔ | ✔ | ✔ | — |
| Invitar miembros de su empresa | ✔ | ✔ | ✔ | — | — |
| Registrar actividad | ✔ | ✔ | — | — | `events:write` |
| Ver auditoría | ✔ | — | — | — | — |

## B.4 Esquema de contenido (OKF aplicado al sitio)

| Colección | Ruta | Frontmatter mínimo |
|---|---|---|
| `page` | `content/pages/<lang>/<slug>.md` | `type: page`, `title`, `description`, `lang`, `pair`, `nav_order`, `updated` |
| `service` | `content/services/<lang>/<slug>.md` | `type: service`, `name` (nomenclatura literal), `branch` (`SLG_Academy`…), `parent`, `download` (slug), `lang`, `pair`, secciones 1–6 del contrato A.3 como bloques con encabezado fijo |
| `download` | `content/downloads/<lang>/<slug>.md` | `type: download`, `service`, `title`, `audience`, `learns[]`, `file_key`, `status`, `lang`, `pair` |
| `post` | `content/blog/<lang>/<slug>.md` | ver A.5 |
| `doctrine` | `content/doctrine/<lang>/*.md` | `type: doctrine_section`, `order` |
| `ui` | `content/ui/<lang>.json` | cadenas de interfaz (público, HQ, portal) |

Regla de oro: si Ricardo quiere cambiar una frase, edita un `.md`. Un script de CI verifica: frontmatter válido, `pair` existente para páginas y servicios, nomenclatura literal (ninguna variante traducida de las etiquetas obligatorias), cero `[PENDIENTE]` en `main`.

## B.5 API v1 para agentes (contrato inicial; el detalle va a `api_contracts`)

| Método y ruta | Alcance | Efecto |
|---|---|---|
| `GET /api/v1/captures?since=&source=` | `captures:read` | Evidencia de capturas web y su estado en el CRM (solo lectura; el lead se trabaja en el CRM) |
| `GET /api/v1/organizations` · `GET /api/v1/organizations/{id}/projects` | `orgs:read` | Lectura |
| `POST /api/v1/deliverables` | `deliverables:write` | Crea metadatos y devuelve URL firmada de subida; `PUT` del archivo; `POST .../publish` |
| `GET /api/v1/projects/{id}/deliverables` | `deliverables:read` | Lectura |
| `POST /api/v1/announcements` | `announcements:write` | Aviso a una empresa |
| `POST /api/v1/events` | `events:write` | Actividad del agente (aparece en HQ) |
| `GET /api/v1/openapi.json` | cualquier clave | Especificación |

Reglas: `Authorization: Bearer <clave>`; alcances por clave; límite por clave (`rateLimitMax`/`rateLimitTimeWindow`); expiración; toda llamada en `audit_log`; errores sin detalles internos; versionado en la ruta.

## B.6 Integración con el CRM Softlanding Global (sistema de registro de leads)

**Qué existe hoy en el CRM** (leído de `~/Dev/crm_slg/docs/integrations.md` y `design/api_contracts.md`): API REST en `https://crm.softlandingglobal.com/api/v1`; claves `crm_live_…` como cuentas de servicio con alcances *deny-by-default*; por clave se puede **crear contactos** (`contacts:write`), **crear notas y actividades** (`activities:write`), **leer** contactos/empresas/oportunidades/dashboard/informes (`crm:read`) y **actualizar** empresas y oportunidades (`companies:write`, `opportunities:write`). **No** se pueden crear empresas ni oportunidades por clave (solo por sesión de usuario). Endpoint MCP para agentes: `POST /api/v1/mcp` (25 herramientas). El CRM ya admite login con Google y Microsoft 365.

**Flujo de captura (web → CRM), por cada envío de descarga/contacto/solicitud de Doctrina:**
1. La web valida (email corporativo, honeypot, límite), guarda `lead_capture` con `crm_sync_status = pending` y entrega el PDF (el visitante nunca espera al CRM).
2. Un trabajo en segundo plano busca el contacto en el CRM por email (`GET /contacts?q=`); si no existe, `POST /contacts` (nombre, email, cargo, empresa como texto, `source: web`); luego `POST /notes` sobre el contacto: "Descargó D-01 *Lo que un Director debe saber…* desde `/ai/academy/phoenix-peex` (ES) · UTM …". Guarda `crm_contact_id`, marca `delivered`.
3. Si el CRM responde error o no responde: reintentos con backoff (1 min, 10 min, 1 h, 6 h, 24 h); tras 5 fallos, `failed` + alerta en HQ y correo a `support@`; reintento manual en HQ.
4. Aviso por correo a `support@softlandingglobal.com` con enlace al contacto en el CRM.

**Dependencia (spec-delta en el repo del CRM, fuera de este proyecto):** para que cada captura nazca como **empresa + contacto + oportunidad** en la etapa inicial con fuente `web`, el CRM necesita un endpoint de admisión `POST /api/v1/leads` con alcance nuevo `leads:write` (crea o vincula la empresa por dominio del email, crea el contacto, crea la oportunidad en la primera etapa del pipeline y la nota de contexto; idempotente por email + documento). Estado: `[PENDIENTE: decidir si se ejecuta el /iterate del CRM antes de M2]`. Hasta entonces, la v1 entrega contacto + nota y la oportunidad se crea en el CRM a mano.

**Lectura para el tablero de HQ:** `GET /dashboard/metrics`, `GET /reports/funnel`, `GET /reports/sources?currency=USD` con una clave de solo lectura (`crm:read`), en caché de 5 minutos. Enlace profundo: `https://crm.softlandingglobal.com/contacts/{id}` `[PENDIENTE: confirmar ruta de ficha en el frontend del CRM]`.

**Reglas:** una clave por integración ("Website — captura", "Website — tablero"), alcances mínimos, rotación anual, revocación inmediata si se filtra; nunca se usa un login de persona como cuenta de servicio; toda escritura queda auditada en ambos lados.

## B.7 Eventos y webhooks salientes (suscriptor opcional: n8n)

`lead.captured` · `lead.delivered_to_crm` · `download.completed` · `contact.submitted` · `doctrine.requested` · `invitation.sent` · `deliverable.published` · `announcement.published` · `post.published`. Firma HMAC-SHA256 en cabecera, reintentos con backoff, tabla `webhook_delivery`. Ningún flujo n8n es requisito de la v1; los que se creen se documentan en `mcps/inventory.md`.

## B.8 Seguridad (además del `quality_gate` de `software-app`)

Autorización por `organization_id` en el servidor · URLs firmadas con caducidad corta para archivos · visor de HTML de entregables en `iframe sandbox` con CSP estricta · cabeceras de seguridad (CSP, HSTS, frame-ancestors) · cookies `Secure`/`HttpOnly`/`SameSite` · límite de intentos de login · verificación de email en altas por contraseña · validación de tipo y tamaño en subidas · secretos solo en Easypanel · dependencias fijadas · registro de auditoría inmutable · pruebas automatizadas de aislamiento entre empresas y de alcances de API.

---

# ANEXO C — Sistema de diseño (skill `apple-design` sobre el Kit de Marca SLG)

**Fuente de marca:** `Kit_Marca_SLG_Rojo.md` v1 (2026-05-26), copia en `~/Dev/SLG_Overhauling/assets/Kit_Marca_SLG_Rojo.md`. Manda sobre cualquier paleta anterior. Reglas duras del kit que la web hereda: **no usar verde, amarillo ni naranja**; el rojo **nunca** decorativo ni de relleno (máximo 1–2 instancias por pieza); **máximo 3 colores de marca por elemento gráfico**; **el logo nunca sobre fondo oscuro** ni deformado; nada de tipografías serif o decorativas para el nombre de marca; margen de respeto = 1 altura de la "S".

**Concepto:** *Autoridad silenciosa.* El producto es pensamiento: titulares tipográficos grandes, una idea por viewport, blanco generoso, motion físico y contenido. Light-first (el kit prohíbe el logo sobre oscuro). Cero stock, cero clichés de IA, cero confeti. Referencia de sensación: la claridad de una keynote, no una landing de agencia.

## C.1 Tokens (del kit; contrastes WCAG medidos)

| Token | Valor (kit) | Uso en la web | Contraste |
|---|---|---|---|
| `--blue-primary` | `#2878B4` | Color de marca: H2, botón secundario (texto blanco), líneas estructurales, eyebrows, bordes de bloque | 4,7:1 sobre blanco (AA texto); 4,4:1 sobre blanco roto → ahí solo en tamaño grande (≥ 24 px) |
| `--blue-deep` | `#14648C` | H1 y titulares de portada, texto de enlace, títulos de bloque, superficies de HQ/portal | 6,5:1 sobre blanco; 6,0:1 sobre blanco roto |
| `--cyan` | `#50B4DC` | Highlights, marcador de palabras clave (fondo con texto tinta: 8,3:1), iconos, subrayados, anillos de foco | **2,4:1 sobre blanco: nunca como color de texto sobre claro**; como texto solo sobre índigo (5,3:1) |
| `--blue-tint` | `#78B4DC` | Fondos de tabla y áreas de respiración (a 20–40 % de opacidad) | Solo fondo (texto tinta encima: 8,8:1) |
| `--indigo` | `#282878` | H3, elementos secundarios de marca, `SLG_Academy`, datos destacados en tablas | 12,6:1 sobre blanco |
| `--red` | `#DC141E` | **Detención visual**: el botón del CTA de descarga (texto blanco) y alertas críticas en HQ. Máximo 1–2 instancias por viewport; nunca fondo ni decoración | 5,0:1 sobre blanco; blanco sobre rojo 5,0:1 |
| `--ink` / `--ink-2` | `#0A0A14` / `#5A6470` | Texto de cuerpo / secundario, captions, pie | 19,7:1 / 6,0:1 sobre blanco |
| `--line` | `#C8CCD3` | Divisores sutiles, bordes de tarjeta | Solo líneas |
| `--paper` / `--paper-2` | `#FFFFFF` / `#F4F6F9` | Fondo principal / fondos suaves y alternancia de secciones | — |
| Radio, sombra, blur | `12/16/24px` · sombras suaves multicapa · `blur(20px) saturate(180%)` | Materiales (C.3) | — |

Secciones oscuras: permitidas en `--blue-deep` o `--indigo` (texto blanco, cyan como acento), **sin logo** dentro. Modo oscuro: no en v1 (los tokens son CSS variables para habilitarlo en v1.1 sin rehacer).

## C.2 Tipografía (kit + apple-design §15)

- **Montserrat** (kit), autoalojada en `woff2` (pesos 400, 600, 700; `font-display: swap`; subconjunto latino). Fallbacks del kit: `'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`. Es la excepción justificada a la regla "fuente de sistema" de apple-design: la marca ya tiene familia.
- **Bebas Neue u Oswald** (kit) solo para separadores de sección y eyebrows en mayúsculas; nunca para cuerpo ni para el nombre de marca.
- Jerarquía web derivada del kit: portada/hero `Montserrat 700`, `clamp(2.25rem, 5vw, 4.5rem)`, `line-height 1.05`, `letter-spacing -0.02em`, color `--blue-deep`; H2 `Montserrat 600` `--blue-primary`; H3 `Montserrat 600` `--indigo`; cuerpo `Montserrat 400` `1.0625rem/1.6` `--ink`; caption `0.875rem` `--ink-2` tracking `+0.04em`; eyebrow `Montserrat 700` `0.75rem` `--blue-primary` mayúsculas tracking `+0.08–0.10em`.
- Jerarquía por **peso + tamaño + interlineado** como conjunto; espaciado en `rem` (respeta el tamaño de texto del usuario).
- Cifras grandes (ej. las 11 dimensiones de `SLG_Readiness`, "3 versiones Phoenix") en `--blue-deep` como elemento gráfico; sustituyen a la fotografía.

## C.3 Logo, materiales y profundidad (§12)

- **Logo:** el kit entrega `SLGA-Horizontal-A.png` (Softlanding Global Academy, fondo transparente). La web es de **SLG Agency**: `[PENDIENTE: logo SLG Agency (SVG + PNG) y favicon; mientras tanto, wordmark tipográfico "SLG Agency" en Montserrat 700 `--blue-deep`]`. El logo va solo sobre `--paper`/`--paper-2`, con margen de 1 altura de la "S", y nunca en secciones oscuras ni deformado.
- Barra de navegación translúcida (`backdrop-filter`) sobre fondo claro con el contenido pasando por debajo; *scroll edge effect* en lugar de borde de 1 px; nunca dos superficies claras translúcidas apiladas; modales con scrim que empujan el fondo; paneles laterales (HQ) sin scrim; `prefers-reduced-transparency` → superficies sólidas.
- Bloques con `border-left 3px` en `--blue-primary` / `--cyan` / `--indigo` (patrón del kit para email) como recurso de jerarquía en listas "Qué incluye".

## C.4 Motion (§1–§11) — reglas duras

- Feedback en `pointerdown` (botones `scale(0.97)`, 100 ms); ningún retardo artificial en la ruta de entrada.
- **Springs por defecto** (Motion): `damping 1.0` (sin rebote), `response 0.3–0.4` s. Rebote (`~0.8`) **solo** tras un gesto con momentum (hoja móvil lanzada, carrusel de artículos).
- Todo lo gestual es **interrumpible**: se anima desde el valor presentado, nunca desde el objetivo; nada de `@keyframes` en interacciones que el usuario pueda agarrar.
- Menú móvil como *sheet* arrastrable: seguimiento 1:1 con `setPointerCapture`, proyección de momentum (`d ≈ 0.998`) para decidir cerrar/abrir, rubber-band en el límite, velocidad transferida al spring de cierre.
- Reveals al scroll: opacidad + 8 px, una vez, `damping 1.0`; sin parallax, sin fondos en movimiento, sin bucles lentos.
- Solo `transform` y `opacity`; `will-change` donde el movimiento es inminente.
- `prefers-reduced-motion: reduce` → cross-fades de 200 ms, sin desplazamientos ni rebotes; `prefers-contrast: more` → bordes definidos y fondos casi sólidos.

## C.5 Componentes a diseñar primero (en este orden, con prototipo interactivo antes de construir el resto)

Barra de navegación translúcida + sheet móvil · Hero tipográfico · Tarjeta de rama/servicio · Bloque "Qué incluye" (lista con cifra) · **Formulario de descarga** (el componente que paga el proyecto) · Tarjeta de artículo · Pie · Shell de app (HQ/portal: barra lateral, tabla, ficha, estado vacío, estado de error) · Visor de entregables.

## C.6 Lente de revisión (§16, los ocho principios)

Cada DU de interfaz se revisa contra: Propósito (¿qué no construimos?), Agencia (deshacer fácil; confirmación solo en lo irreversible), Responsabilidad (datos mínimos, permisos en el momento justo), Familiaridad (mismo patrón, mismo lugar), Flexibilidad (móvil = rápido; escritorio = profundo), Simplicidad (jerarquía, no minimalismo), Craft (nada al azar: cada espaciado y timing defendible), Deleite (consecuencia, no confeti). Wayfinding en cada pantalla: dónde estoy, a dónde puedo ir, cómo salgo.

---

# ANEXO D — Quality gates adicionales (se suman al `quality_gate` de `software-app`)

| # | Gate | Umbral / evidencia |
|---|---|---|
| 1 | Rendimiento público | Lighthouse móvil ≥ 90 en las 4 categorías (Home + 1 servicio + 1 artículo); LCP < 2,5 s en 4G simulado; JS inicial de la capa pública < 150 KB gz |
| 2 | Accesibilidad | Contraste AA en todas las combinaciones (cyan `#50B4DC` y tinte `#78B4DC` nunca como texto sobre claro; `#2878B4` sobre blanco roto solo en tamaño grande); teclado completo; `alt` en imágenes; foco visible; formularios con etiquetas y errores en línea |
| 2b | Marca | Reglas del kit verificadas por revisión: sin verde/amarillo/naranja; rojo ≤ 2 instancias por viewport y nunca de fondo; ≤ 3 colores de marca por elemento; logo solo sobre claro, con margen de respeto, sin deformar; Montserrat autoalojada |
| 3 | Motion | Checklist C.4 aplicado; prueba con `prefers-reduced-motion`; revisión cuadro a cuadro de sheet y hero |
| 4 | i18n | Paridad ES/EN en `page` y `service` (script); `hreflang` y `canonical` por idioma; toggle conserva la ruta |
| 5 | Fidelidad de contenido | Todo texto proviene de `content/`; nomenclatura literal verificada; cero `[PENDIENTE]`/lorem en `main`; sin cifras sin fuente; sin clientes sin autorización |
| 6 | SEO técnico | Metadatos únicos, OG, sitemap, robots, schema `Organization`+`Service`, 404/500 propias |
| 7 | Conversión E2E | Prueba real: descarga → `lead_capture` → contacto + nota en el CRM → correo a `support@`; caso de error (CRM apagado → captura en cola, PDF entregado, reintento exitoso al volver) |
| 8 | Identidad E2E | Login por los tres métodos; invitación aceptada por cada método; vinculación por email verificado; recuperación de contraseña; cierre de sesión global |
| 9 | Aislamiento | Pruebas automatizadas: `client_*` no accede a otra empresa ni a `/hq`; `slg_operator` no crea claves; claves con alcance insuficiente → 403; sin clave → 401; exceso → 429 |
| 10 | Archivos | URLs firmadas caducan; visor HTML en sandbox; tipo/tamaño validados; sin listado público de buckets |
| 11 | Operación | Deploy automático desde `main`; staging desde `develop`; backup + restauración probada; variables de entorno documentadas sin valores; monitor de caída |
| 12 | Literacy | README operativo probado por Ricardo (DoD #9); cada spec enlazada desde `knowledge/index.md` |

---

# ANEXO E — Milestones propuestos (semilla para FU/DU de `/init-project`; el agente los detalla)

IDs con dos dígitos (`FU-NN` / `DU-NN`). Cada DU declara su criterio de completitud del perfil.

| Milestone | Contenido | Hecho cuando |
|---|---|---|
| **M0 Fundaciones** | FU: scaffold Next.js + Tailwind + tokens; colecciones de contenido + i18n; Postgres + Drizzle + migraciones; Better Auth (3 métodos, organizaciones, admin, API keys); MinIO + URLs firmadas; correo transaccional; Dockerfile + Easypanel (prod + staging) + DNS; CI (lint, tests, scripts de contenido); README base | `staging.softlandingglobal.com` sirve una página con login funcional por los tres métodos |
| **M1 Capa pública núcleo** | FU-01 copy maestro bilingüe (compuerta de aprobación); DU: Home, `SLG_AI`, `SLG_Academy` + 5 servicios, `SLG_Enterprise` + 2, `SLG_Factory` + 3, `SLG_Holdings`, Doctrina, Nosotros, Legal; nav + sheet; SEO | Gates D1–D6 en verde en staging |
| **M2 Conversión y contenido** | DU: sistema de descargas (11 registros, formulario, entrega, captura), **integración con el CRM** (alta de contacto + nota, cola de reintentos, aviso por correo), Contacto, solicitud de Doctrina completa, Blog (índice, artículo, etiquetas, RSS), Gracias; webhooks; Umami | Gate D7; DoD #1–#3 |
| **M3 HQ** | DU: tablero (capturas + métricas del CRM); empresas; usuarios e invitaciones; proyectos; entregables; avisos; capturas web (lista, estado, reintento); claves de API; auditoría | DoD #4; gates D8–D10 |
| **M4 Portal** | DU: inicio/avisos; proyectos y entregables (visor); materiales; miembros; perfil; Sesión Cero | DoD #5 |
| **M5 API + go-live** | DU: API v1 + OpenAPI; pruebas de aislamiento y límites; backups probados; README operativo; contenido de producción sin `[PENDIENTE]`; DNS raíz → producción | DoD completo; `/review` final |

Orden comercial: M0→M1→M2 salen a producción antes de empezar M3 (la web ya vende mientras se construyen las intranets; `/hq` y `/portal` permanecen ocultos tras login hasta su milestone).

---

# ANEXO F — Identidad: especificación y pre-requisitos externos

## F.1 Flujos
- **Acceso**: `/acceder` con tres botones (Google · Microsoft · contraseña). Sin registro público: si el email no existe ni tiene invitación, mensaje neutro ("solicita acceso a tu contacto en SLG").
- **Invitación**: HQ o `client_admin` crea invitación → correo con enlace de un solo uso (72 h) → el invitado elige método → cuenta ligada a la empresa con el rol de la invitación.
- **Vinculación**: si el email verificado del proveedor coincide con un usuario existente, se vincula la cuenta; Entra puede no emitir `email` para usuarios gestionados → se usa `oid` como ancla y `mapProfileToUser` con `preferred_username`/`upn` como respaldo; si no hay email verificable, la invitación exige coincidencia de email al aceptar.
- **Sesión**: cookies seguras; expiración deslizante 7 días; "cerrar sesión en todos los dispositivos".
- **Contraseña**: mínimo 12 caracteres, verificación por correo, recuperación por enlace de un solo uso, bloqueo progresivo por intentos.

## F.2 Pre-requisitos externos (se hacen en paralelo a M0; Claude guía con Claude in Chrome, Ricardo aprueba)

| # | Qué | Dónde | Resultado esperado | Estado |
|---|---|---|---|---|
| 1 | Páginas `/legal/privacidad` y `/legal/terminos` publicadas en staging (texto legal) | Repo | URLs válidas para las pantallas de consentimiento | `[PENDIENTE: texto legal]` |
| 2 | Proyecto Google Cloud "SLG Agency Web" → pantalla de consentimiento OAuth (externa, alcances `openid email profile`, política y términos, dominio autorizado `softlandingglobal.com`) → credencial "ID de cliente OAuth (aplicación web)" con redirecciones `https://softlandingglobal.com/api/auth/callback/google` y la de staging | console.cloud.google.com (cuenta Google de SLG) | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` en Easypanel | `[PENDIENTE]` |
| 3 | Registro de aplicación en Microsoft Entra ID: "Cuentas en cualquier directorio organizativo y cuentas personales", redirecciones `https://softlandingglobal.com/api/auth/callback/microsoft` (+ staging), secreto de cliente (anotar caducidad). Si el CRM ya tiene un registro en Entra (login/Graph), **reutilizarlo** añadiendo las redirecciones de la web | entra.microsoft.com — **antes de cancelar M365**; si ya está cancelado, tenant Entra gratuito | `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET`, `tenantId=common` | `[PENDIENTE]` |
| 4 | Dominio de correo transaccional verificado (SPF/DKIM/DMARC) para `support@softlandingglobal.com` | Proveedor elegido + DNS Hostinger | Correos de invitación entregados en bandeja | `[PENDIENTE: proveedor]` |
| 5 | Dos claves de API en el CRM: "Website — captura" (`contacts:write`, `activities:write`, `crm:read`) y "Website — tablero" (`crm:read`); ruta de la ficha de contacto; decisión sobre el endpoint de admisión `POST /leads` (B.6) | CRM → Sistema → API y accesos (solo admin) | `CRM_API_KEY_CAPTURE` / `CRM_API_KEY_READ` en Easypanel | `[PENDIENTE]` |
| 6 | Calendario para "Agenda tu Sesión Cero" (enlace) | Herramienta de agenda de Ricardo | URL en `content/ui` | `[PENDIENTE: URL]` |

---

# ANEXO G — Conectores y herramientas (inventario para `/init-project`, paso 8)

| Conector / herramienta | Uso en construcción (MCP) | Uso en producción (API/servicio) | Decisión |
|---|---|---|---|
| **Claude in Chrome** | Configurar Easypanel, DNS Hostinger, Google Cloud, Entra y las claves del CRM con Ricardo; verificación visual de páginas | — | Usar |
| **CRM Softlanding Global — MCP** (`https://crm.softlandingglobal.com/api/v1/mcp`, clave de solo lectura) | Inspeccionar contactos/etapas/campos reales para el mapeo de la captura; validar el flujo E2E | API REST con claves de alcances (captura y tablero) | Usar |
| **Airtable MCP** | — | — | **Rechazado**: leads y pipeline viven en el CRM propio; las bases Airtable quedan como histórico |
| **n8n** (`n8n.softlandingglobal.com`) | Flujos opcionales sobre los webhooks (p. ej., publicar extractos del blog); el MCP N8N_Cloud es otra instancia y hoy no conecta | Suscriptor de webhooks | Opcional |
| **Google Drive MCP** | Traer activos (logo, PDFs de descarga) al repo/bucket | — | Usar puntual |
| **Gmail / Microsoft 365 MCP** | Enviar accesos y avisos a Ricardo durante el proyecto | — | Usar puntual |
| **Supabase MCP** | — | — | **Rechazado**: la identidad y los datos viven en Postgres propio; proyectos actuales pausados |
| **Vercel MCP** | — | — | **Rechazado**: hosting decidido en Easypanel (revisar si conviene mantener el plan Pro sin proyectos) |
| **Figma MCP** | Mockups de hero/nav/sheet solo si el prototipo en código no basta | — | Opcional |
| **Gamma, Firecrawl, Apify, NotebookLM, Obsidian MCPs** | — | — | Rechazados para este activo (sin aporte al sitio) |
| **Skills `emilkowalski/skills`** (`apple-design`, `emil-design-eng`, `review-animations`, `pick-ui-library`, `prototype`) | Instalar en el repo desde Claude Code: `npx skills@latest add emilkowalski/skills` (Claude Code lo ejecuta; sin abrir terminal) | — | Usar |
| **Browser/automation MCP** (perfil `software-app`) | Verificación visual y Lighthouse en staging | — | Usar |

---

# ANEXO H — Plan de arranque (quién hace qué, en orden)

| Paso | Quién | Dónde | Acción literal | Se ve bien si… |
|---|---|---|---|---|
| 1–3 | Ricardo | GitHub | ✅ Hecho 2026-09-08: `slg_website` creado desde el template APP_Builder (60 archivos, commit `23e893f`) y publicado como repo público | El repo muestra `AGENTS.md`, `QUICKSTART.md`, `commands/`, `profiles/`… |
| 4–5 | Claude | `~/Dev` | ✅ Hecho 2026-09-08: clon en `~/Dev/slg_website` y `START_PROJECT.md` de la raíz reemplazado por este brief (copia idéntica en `~/Dev/SLG_Overhauling/web/`) | `~/Dev/slg_website/START_PROJECT.md` empieza con `type: project-brief` |
| 6 | Ricardo (o Claude, si lo autoriza) | **GitHub Desktop** → repositorio `slg_website` (si no aparece: **File → Add local repository** → `/Users/ricardotorresoliva/Dev/slg_website`) | En Summary escribir `Add START_PROJECT (slg_website brief v1.1)` → **Commit to main** → **Push origin** | En github.com/RicardoTorresOliva/slg_website el archivo `START_PROJECT.md` empieza con `type: project-brief` |
| 7 | Ricardo | **Claude Code Desktop** → abrir carpeta `~/Dev/slg_website` | Escribir `/bootstrap` y Enter; luego `/init-project` y Enter | Claude confirma perfil `software-app`, hace las pocas preguntas abiertas (F.2) y presenta el plan FU/DU |
| 8 | Ricardo | Claude Code | Leer el plan; aprobar o devolver. Solo tras aprobar: `/start-execution` | Empieza M0 |
| 9 | Claude (en Chrome) + Ricardo | Easypanel `https://buul2l.easypanel.host` (nuevo proyecto `website`), Hostinger DNS, Google Cloud, Entra, CRM (Sistema → API y accesos) | Pre-requisitos F.2 en paralelo a M0 | Variables cargadas en Easypanel; staging con HTTPS; claves del CRM creadas |
| 10 | Claude (proyecto SLG_Overhauling) | `~/Dev/SLG_Overhauling/docs/` | Producir los 11 documentos de descarga (Anexo A.4) y el texto legal | PDFs en el bucket `downloads` antes de M2 |

Si en el paso 7 Claude Code no reconoce `/bootstrap`, abrir la carpeta correcta (`~/Dev/slg_website`, la que contiene `CLAUDE.md`). Si GitHub Desktop pide credenciales al hacer push, iniciar sesión con la cuenta `RicardoTorresOliva`.

---

# ANEXO I — Pendientes (todos los `[PENDIENTE]` de este brief)

1. Fecha objetivo de go-live (§0).
2. Confirmar si las descargas son 9 u 11 (A.2/A.4) y aprobar títulos.
3. 11 PDFs de descarga (A.4) — se producen en el proyecto SLG_Overhauling.
4. Spec de copy bilingüe (FU-01) — incluye datos de Nosotros y del resumen público de Doctrina.
5. Logo SLG Agency (SVG/PNG), favicon, imagen Open Graph y Montserrat en woff2 (§8, C.3). El kit trae el logo SLGA (Academy) y la identidad "Softlanding Global Inc."; la web es de SLG Agency: confirmar si el tagline "The discipline of going global" se usa en `SLG_Holdings`.
6. Texto legal de privacidad y términos (F.2-1).
7. Credenciales OAuth de Google (F.2-2) y registro en Entra (F.2-3) — **Entra antes de cancelar M365**.
8. Proveedor de correo transaccional y verificación de dominio (F.2-4).
9. Claves de API del CRM (captura y tablero), ruta de la ficha de contacto, confirmación de que el compose `slg` del proyecto `clientes` es la instancia `crm.softlandingglobal.com`, y decisión sobre el endpoint de admisión `POST /leads` en el CRM (B.6, F.2-5).
10. URL del calendario de Sesión Cero (F.2-6).
11. Destino externo de backups (§5.1 Operación).
12. Añadir los registros A/CNAME del raíz, `www` y `staging` (la IP `167.88.42.76` ya sirve `crm`, `n8n` y `evolution`).
13. Decidir si se activa un desafío anti-bot en formularios (§7).

---

# ANEXO J — Registro OKF de este documento

- `2026-09-08` · v1.1 · Anexo C reescrito sobre el Kit de Marca SLG Rojo v1 (decisión 4 actualizada por Ricardo); contrastes WCAG medidos por token; gate D2b de marca; brief instalado en la raíz del repo público `slg_website` (clon en `~/Dev/slg_website`).
- `2026-09-08` · v1.0 · Creación del brief a partir del análisis de Docs_MD, APP_Builder v4.1, specs Palin, conectores activos, la documentación del CRM propio y 13 decisiones HITL de Ricardo (§10). Próxima revisión: al aprobar el plan de `/init-project` (se registran desviaciones en `docs/decision_log.md` del repo).
