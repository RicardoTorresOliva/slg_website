---
type: planning
title: scope
project: slg_website
description: Alcance v1 del activo slg_website — qué se construye, qué queda fuera, qué queda enchufable y qué fronteras no se cruzan. Instrumento de arbitraje contra el crecimiento silencioso (AGENTS.md Regla 4).
status: planning
tags: [slg, slg_website, planning, scope, sdd, app-builder, software-app]
timestamp: 2026-09-08
sources:
  - "START_PROJECT.md v1.1 §5.1 / §5.2 / §5.3 (fuente de verdad del alcance)"
  - "START_PROJECT.md Anexos A (páginas), B (arquitectura), D (gates), E (milestones)"
  - "AGENTS.md v4.1 — Reglas 1, 3, 4, 5, 7"
  - "profiles/software-app/profile.md"
  - "docs/decision_log.md — D-14 a D-24"
---

# Alcance — slg_website v1

> **Cómo se usa este documento.** Es el árbitro. Si algo no aparece en «Dentro de v1», está fuera
> por defecto: no se construye «porque parece útil» (AGENTS.md Regla 4) — se para y se pregunta.
> Un cambio de alcance no se discute de palabra: se registra como spec-delta vía `/iterate` o se
> difiere a v1.1, y queda en `docs/decision_log.md`.
>
> **Jerarquía de fuentes.** Manda `START_PROJECT.md` §5. Este documento lo desdobla por superficie
> y le aplica las decisiones D-15 a D-24, que el brief todavía no refleja (ver la última sección).
> Donde el brief no dice nada, este documento dice `[PENDIENTE: …]` y no inventa.

---

## Dentro de v1

Una sola aplicación con tres superficies + una API, un despliegue y una base de datos
(`START_PROJECT.md` B.1). Todo lo de abajo es exigible: si al cierre falta, la v1 no está hecha.

### 1. Capa pública (ES en raíz + `/en`)

**Páginas.** Las **27 rutas** del mapa A.2 —que tiene 25 **filas** de tabla, pero la del blog aporta
dos rutas (`/blog` y `/blog/etiqueta/[tag]`) y la legal, otras dos (`/legal/privacidad` y
`/legal/terminos`)—, **cada una completa en ES y en EN** (paridad obligatoria
en `page` y `service`, verificada por script — gate D4):

| Grupo | Rutas | Descarga |
|---|---|---|
| Portada | `/` | — |
| Overviews de rama | `/ai`, `/ai/academy`, `/ai/enterprise`, `/ai/factory` | — |
| `SLG_Academy` | `phoenix-peex`, `phoenix-teax`, `phoenix-retx`, `customize-programs`, `ai-coaching` | D-01…D-05 |
| `SLG_Enterprise` | `readiness`, `implement` | D-06, D-07 |
| `SLG_Factory` | `app-building`, `age-building`, `coo-as-a-service` | D-08, D-09, D-10 |
| `SLG_Holdings` | `/holdings` | D-11 |
| Autoridad | `/doctrina`, `/nosotros` | — (Doctrina: solicitud del documento completo = captura) |
| Blog | índice, `/blog/etiqueta/[tag]`, `/blog/[slug]`, RSS | — |
| Conversión | `/descargas`, `/descargas/[slug]`, `/gracias`, `/contacto` | — |
| Legal | `/legal/privacidad`, `/legal/terminos` | — (requisito de las pantallas OAuth) |

- **11 páginas de servicio llevan descarga** (D-17). Cada una respeta el contrato A.3: seis
  secciones en orden fijo, con la descarga como **CTA único** de la página y «Siguiente paso»
  sin agenda embebida.
- Navegación = estructura de la oferta (A.1). Etiquetas específicas; el logo lleva a Home; ningún
  destino de menú llamado «Inicio/Home».
- Todo el texto visible vive en `content/` con frontmatter OKF (B.4). Ninguna cadena de negocio
  hardcodeada en componentes.

**Sistema de descargas (la máquina que paga el proyecto).**
- Formulario con validación de **email corporativo** (lista de dominios de correo gratuito propia),
  honeypot y límite de peticiones (D-16).
- Entrega del archivo por **enlace firmado con caducidad**, desde el bucket privado `downloads`.
- Alta de la captura en el CRM por API (ver §5 Integraciones) con **cola de reintentos**; el
  visitante nunca espera al CRM.
- Aviso por correo a `support@softlandingglobal.com` con enlace al contacto en el CRM.
- Documento sin PDF todavía → la página muestra «disponible próximamente» y **captura el email
  igual**; `download.completed` se dispara cuando el archivo existe.

**Blog.** Markdown/MDX en `content/blog/<lang>/<slug>.md`, frontmatter A.5 con `social`
(`hook`, `linkedin`, `x`), borradores no publicados, etiquetas y RSS. Publicar = añadir un `.md` y
hacer push (DoD #3). Paridad ES/EN **no** exigida en artículos (sí en páginas y servicios).

**SEO técnico y analítica.** Metadatos únicos por página e idioma, Open Graph con imagen de marca,
`hreflang`, `canonical`, `sitemap.xml`, `robots.txt`, schema.org `Organization` + `Service`, páginas
404/500 propias. Analítica privacy-first autoalojada (Umami en Easypanel).

**Diseño.** Skill `apple-design` sobre el Kit de Marca SLG Rojo v1 (Anexo C): tokens con contrastes
medidos, Montserrat autoalojada, motion con springs interrumpibles, `prefers-reduced-motion` y
`prefers-reduced-transparency` respetados. Light-first.

### 2. Identidad y acceso

- **Sin registro público.** Alta solo por invitación (portal) o por administrador (HQ).
- **Tres métodos**: contraseña (mínimo 12 caracteres, verificación por correo, bloqueo progresivo),
  Google, Microsoft Entra ID (`tenantId: common`). Vinculación de cuentas por email verificado;
  en Entra, `oid` como ancla cuando no haya email (F.1).
- **Invitación** de un solo uso con caducidad 72 h, aceptable por cualquiera de los tres métodos.
- **Cinco roles**: `slg_admin`, `slg_operator`, `client_admin`, `client_member`, `agent` (clave de
  API con alcances). Matriz de permisos B.3, aplicada en el servidor.
- Recuperación de contraseña por correo; sesión con cookies seguras, expiración deslizante 7 días y
  «cerrar sesión en todos los dispositivos».

### 3. HQ — intranet SLG (`/hq`)

**Tablero.** Capturas web (por documento/página/fecha) con su estado de entrega al CRM y enlace
profundo al contacto · métricas del pipeline **leídas** del CRM (`/dashboard/metrics`,
`/reports/funnel`, `/reports/sources`, caché 5 min) · empresas activas · proyectos y entregables
recientes · artículos publicados y borradores con sus extractos sociales · actividad de agentes ·
últimos eventos de auditoría · botón «Abrir CRM».

**Gestión.** Empresas cliente · usuarios e invitaciones · proyectos · entregables (subida de archivo
o enlace, visibilidad por proyecto) · avisos a una empresa · claves de API (crear, revocar, alcances,
límites) · registro de auditoría · **reintento manual** de capturas no entregadas al CRM.

**No incluye, por definición:** gestión de leads y de pipeline. HQ **enlaza** al CRM; no lo replica.

### 4. Portal de clientes (`/portal`)

Inicio con avisos de SLG · proyectos y entregables con visor (PDF, HTML autocontenido en `iframe`
aislado con CSP estricta, Markdown OKF renderizado, enlace) · materiales de programa (entregables de
tipo `material`) · miembros de la empresa (`client_admin` invita) · perfil · paso «Agenda tu Sesión
Cero» como enlace a calendario `[PENDIENTE: URL del calendario — Anexo I-10]`.

Aislamiento duro: toda consulta lleva el `organization_id` del contexto autenticado, **nunca** del
parámetro de la petición. Pruebas automatizadas de fuga entre empresas (gate D9, DoD #5).

### 5. API para agentes (`/api/v1`)

`Authorization: Bearer <clave>`, alcances por clave, límite de peticiones por clave, expiración,
auditoría de toda llamada, errores sin detalles internos, versión en la ruta.

| Endpoint | Alcance |
|---|---|
| `GET /captures` | `captures:read` (solo evidencia; el lead se trabaja en el CRM) |
| `GET /organizations`, `GET /organizations/{id}/projects` | `orgs:read` |
| `POST /deliverables` (+ URL firmada de subida + `publish`) | `deliverables:write` |
| `GET /projects/{id}/deliverables` | `deliverables:read` |
| `POST /announcements` | `announcements:write` |
| `POST /events` | `events:write` |
| `GET /openapi.json` | cualquier clave válida |

### 6. Integraciones

- **CRM Softlanding Global** — sistema de registro de leads. Dos claves con alcances mínimos
  («Website — captura», «Website — tablero»); alta de la captura por cada envío de descarga,
  contacto o solicitud de Doctrina; lectura de métricas para el tablero; enlace profundo por
  plantilla configurable `[PENDIENTE: ruta de la ficha de contacto en el CRM — Anexo I-9]`.
  **Adaptador de dos modos** por variable de entorno (D-19, ver última sección).
- **Webhooks salientes firmados** (HMAC-SHA256), reintentos con backoff, tabla `webhook_delivery`.
  Nueve eventos: `lead.captured`, `lead.delivered_to_crm`, `download.completed`,
  `contact.submitted`, `doctrine.requested`, `invitation.sent`, `deliverable.published`,
  `announcement.published`, `post.published`. n8n es suscriptor **opcional**: ningún flujo n8n es
  requisito de la v1.
- **Correo transaccional**: invitaciones, recuperación de contraseña y avisos de captura, enviados con
  **Resend** (D-22) desde un **subdominio de envío dedicado** verificado con SPF, DKIM y DMARC propios
  (D-24), tras un adaptador que habla SMTP estándar y no el SDK propietario. Seguimiento de aperturas
  y clics **desactivado**. Las respuestas llegan a `support@softlandingglobal.com` (`Reply-To`); la
  dirección remitente visible es `[PENDIENTE: P-3, se fija en M0]` y el nombre del subdominio,
  `[PENDIENTE: P-4, se fija en M0]`.

### 7. Operación

- Servicios en Easypanel: `slg-web` (Next.js, Dockerfile `standalone`), `slg-db` (PostgreSQL),
  `slg-files` (MinIO, buckets privados `downloads` y `deliverables`), `slg-analytics` (Umami),
  `slg-web-staging` (rama `develop`, con contraseña básica).
- Deploy automático: `main` → producción, `develop` → staging. HTTPS Let's Encrypt.
- DNS en Hostinger: alta de `A @`, `CNAME www`, `A staging` hacia `167.88.42.76`, más los registros
  del **subdominio de envío** de correo (SPF, DKIM y CNAME de verificación) **bajo ese subdominio y
  solo ahí** (D-24). **No se tocan** `crm`, `n8n`, `evolution`, `academy`, los **MX de Outlook** ni el
  **TXT (SPF) de la raíz**: el correo corporativo se queda en Microsoft 365 (D-23).
- **Backups diarios de base de datos y volúmenes a Cloudflare R2** (D-21), con restauración probada en
  staging **también desde una copia antigua** (DoD #8). Sin Object Lock por API estándar, la
  inmutabilidad **no se da por supuesta**: credencial de solo escritura para el proceso de copia,
  purga de copias antiguas con credenciales distintas y retención por generaciones (R-37).
- CI con los scripts de verificación de contenido: frontmatter válido, `pair` existente,
  nomenclatura literal, cero `[PENDIENTE]` en `main`.
- **README operativo para no programador** (DoD #9): editar un texto, publicar un artículo, añadir
  una descarga, crear un cliente e invitar, crear una clave de API, desplegar, restaurar un backup.

---

## Fuera de v1

Fuente: `START_PROJECT.md` §5.2. Ninguno de estos elementos se construye, se prototipa ni se «deja
a medias». La columna **Cómo entraría** es la única vía admitida: si alguien lo quiere, ese es el
camino, no una excepción en mitad de un milestone.

| Fuera de v1 | Por qué | Cómo entraría |
|---|---|---|
| **Motor del reporte interactivo `SLG_Readiness`** | Es un producto en sí (análisis de 11 dimensiones), no una pantalla del sitio. La v1 cumple la necesidad alojando el HTML resultante como entregable. | **v1.1 como módulo propio**. El *alojamiento nativo* sí está previsto (§ siguiente); el motor no. |
| **Seguimiento de alumnos / LMS** | «No es un LMS» (§2). Exigiría entidades de curso, lección, matrícula y progreso, y una superficie de autor. | **Activo aparte** (proyecto propio). No cabe como spec-delta de esta app. |
| **Mensajería o chat cliente-SLG** | «No es un chat» (§2). En v1 la comunicación es avisos + correo transaccional. | **v1.1**: exige entidades de hilo/mensaje, notificaciones y moderación. Spec-delta grande, no incremental. |
| **Pagos y facturación** | El modelo comercial es high-ticket informativo: la web informa y captura, no cobra. No hay ninguna prueba del DoD que lo requiera. | **v1.1+** y con elección de categoría de proveedor de pagos (Regla 7). |
| **Editor de contenido en HQ (CMS)** | D-11: el blog es Markdown en el repo. «No es un CMS de terceros» (§2). Publicar = push. | **v1.1**, sobre el esquema de contenido que la v1 ya deja montado (está en «Previsto»). |
| **Buscador** | No aparece en §5.1 ni sirve a ninguna prueba del DoD. Con 27 rutas por idioma, la navegación es el buscador. | **spec-delta vía `/iterate`**: se construiría sobre `content/`, sin tocar el modelo de datos. |
| **Newsletter** | El CTA de la v1 es la descarga, no la suscripción. Exigiría consentimiento propio y una categoría de correo **masivo**, distinta de la transaccional de D-15. | **v1.1** con decisión de categoría y de consentimiento. |
| **Migración o integración de Phoenix Academy** | Decisión §10-7: fuera de alcance, solo enlace mientras siga vivo. | **Decisión de negocio previa**, no spec-delta técnico. Hasta entonces, enlace desde `SLG_Academy`. |
| **Sincronización automática vault→repo** | La regla de oro es que Ricardo edite un `.md` en el repo (B.4). Una sincronización automática crea una segunda fuente de verdad. | **spec-delta vía `/iterate`** como herramienta externa al activo; nunca como acoplamiento dentro de la app. |
| **Módulo de grafo en vivo** | No sirve a ninguna prueba del DoD ni al modelo comercial. | **v1.1+**. |
| **Página Advisory** | No está en la navegación A.1 ni en el mapa A.2; no tiene copy aprobado ni descarga asociada. | **spec-delta vía `/iterate`**: es un registro `page` más, con paridad ES/EN y copy aprobado en compuerta. |
| **Casos de cliente públicos sin autorización** | Regla dura «nada inventado» (§1 Constraints): nombres, cifras y testimonios solo con dato verificado y autorización explícita. | **Nunca «sin autorización»**. Con autorización por escrito, entra como contenido (`page`/`service`), sin código nuevo. |
| **Modo oscuro** | El Kit de Marca es light-first y prohíbe el logo sobre fondo oscuro; resolverlo bien es trabajo de marca, no de CSS. | **v1.1 sin rehacer nada**: los tokens ya son variables CSS (C.1). Requiere decisión de marca sobre el logo. |
| **2FA** | La v1 ya exige tres métodos de login e invitación por email verificado; 2FA añade superficie de soporte (recuperación, códigos) sin cerrar ninguna prueba del DoD. | **v1.1**, ampliando la spec de identidad (F.1) y el gate D8. |

---

## Previsto (enchufable, no se construye)

Fuente: `START_PROJECT.md` §5.3. **La diferencia con «Fuera» es que esto exige decisiones de diseño
HOY**: si la v1 no las toma, lo previsto costará una migración de datos o una reescritura del DU.
Lo que sigue no es trabajo de v1 — es la forma que el trabajo de v1 debe tener.

| Previsto | Qué deja preparado la v1 | Qué exige decidir HOY |
|---|---|---|
| **Módulo «Contenido» en HQ** (escribir/publicar artículos, generar extractos sociales) | La colección `post` (`content/blog/<lang>/<slug>.md`) con el frontmatter completo de A.5 — `status: draft\|published`, `social{hook,linkedin,x}`, `pair`, `author`, `tags` — y la **superficie de lectura ya construida**: HQ muestra publicados y borradores con sus extractos. Falta solo el camino de escritura. | Que el frontmatter A.5 se implemente **completo desde el primer artículo**, aunque en v1 se escriba a mano: un editor posterior escribe los mismos campos y no exige migrar contenido. Que la publicación se dispare del `status`, no de la existencia del archivo. |
| **Alojamiento nativo del reporte `SLG_Readiness`** | La entidad `deliverable` con `type` (`pdf`,`html`,`md`,`link`,`material`), `version`, `visibility` y `published_by`; el **visor aislado** (`iframe sandbox` + CSP estricta) y las URLs firmadas. En v1 el reporte entra como entregable `html`. | Que el tipo del entregable sea un **valor de datos, no una rama de código** en el visor: añadir un tipo nativo debe ser un registro más, no una reescritura del portal. Que `version` exista desde v1 (un reporte se reemite). |
| **Programas Phoenix con progreso por participante** | `project` con `service` en nomenclatura literal (`Phoenix PEEx/TEAx/RETx`), `deliverable` de tipo `material` colgando del proyecto, y `membership` (usuario ↔ empresa). | Que los materiales cuelguen **del proyecto**, nunca de una biblioteca global: el progreso futuro se mide por participante **dentro de** un proyecto. Que `membership` no se use como si fuera «matrícula»: la v1 declara un usuario en una sola empresa cliente (B.2) y esa restricción debe quedar explícita. |
| **Flujo n8n que publica extractos del blog en LinkedIn** | El evento `post.published`, la firma HMAC-SHA256, los reintentos con backoff y la tabla `webhook_delivery`. n8n ya existe como suscriptor opcional. | Que el **payload de `post.published` transporte `social.hook/linkedin/x` y el enlace canónico por idioma**: si el evento solo lleva un id, el flujo tendría que leer de vuelta el repo y el «previsto» deja de ser enchufable. |
| **Hermes como validador de revisiones** (patrón Builder-Validator, Guía Hermes §7) — **sigue en previsto, no se construye aquí**. D-46 confirma que el cron vive en Hermes Agent y consume lo que este proyecto ya produce (CI de FU-05, `POST /api/v1/events` tras M5); no entra en alcance de slg_website. | La API v1 con claves, alcances y límites; `POST /api/v1/events` + entidad `agent_event` (visible en HQ); `audit_log` inmutable; OpenAPI publicado. | Que `agent_event.kind` y su `payload_json` admitan un **veredicto estructurado** sin cambiar el esquema, y que los alcances sean granulares desde v1 (una clave de validación no debe poder escribir entregables). |
| **Perfil `marketing-website` formalizado en `profiles/`** | Los 12 gates del Anexo D declarados en el brief (no en el perfil, por D-14) y los scripts de CI que los verifican mecánicamente. | Que cada gate del Anexo D se escriba como **checklist verificable o script**, no como prosa: extraerlo después a `profiles/marketing-website/profile.md` debe ser mover texto, no reinventar criterios. |

---

## Fronteras que se defienden

Líneas que el proyecto **no** cruza. Cada una tiene su razón; cruzarla exige una decisión registrada,
no una buena idea en mitad de un DU.

**(a) La web no gestiona pipeline de leads. Eso es el CRM.**
Decisión §10-13: el CRM Softlanding Global es el **sistema de registro** comercial. La tabla
`lead_capture` es *evidencia y cola de entrega*, y por eso **no tiene campos de estado comercial**
(sin etapa, sin propietario, sin valor, sin próximo paso). HQ muestra capturas y enlaza al CRM;
`GET /api/v1/captures` es de solo lectura. Razón: dos sistemas de registro comercial es cero
sistemas de registro. *Si aparece la tentación de «solo un campito de estado», eso es el CRM.*

**(b) No es un LMS.**
Se entregan **materiales** de programa (entregables de tipo `material`), no cursos: sin lecciones,
sin progreso, sin evaluaciones, sin certificados. Razón: §2 lo declara explícitamente y el modelo de
datos B.2 no tiene ninguna entidad de aprendizaje.

**(c) No es un CMS.**
El contenido es datos en el repo (B.4) y se edita en `.md`. No hay editor en HQ, no hay tipos de
contenido creados desde la interfaz, no hay previsualización server-side de borradores arbitrarios.
Razón: D-11 y la regla de oro «si Ricardo quiere cambiar una frase, edita un `.md`» — es también la
prueba de Literacy del DoD #9.

**(d) No hay chat.**
La comunicación SLG→cliente es `announcement` + correo transaccional; la del visitante es el
formulario de contacto. Sin hilos, sin mensajería en tiempo real, sin notificaciones push, sin
widget de terceros en la capa pública. Razón: §2, y un chat arrastra moderación, presencia y
expectativa de respuesta que el modelo «no vendemos, ayudamos a comprar» no sostiene.

**(e) Phoenix Academy queda fuera: solo enlace.**
`academy.softlandingglobal.com` no se migra, no se integra, no se consulta por API y **su registro
DNS no se toca**. La página `SLG_Academy` enlaza a él mientras siga vivo. Razón: decisión §10-7.

**(f) El motor del reporte `SLG_Readiness` no se construye: solo se aloja el HTML resultante.**
El reporte llega como entregable de tipo `html`, se sirve en visor aislado y se versiona. La web no
calcula dimensiones, no puntúa, no genera el informe. Razón: §5.2 lo excluye y §5.3 solo prevé el
alojamiento nativo.

**(g) El repo es público: ningún dato sale de su sitio.**
Ni secretos, ni PDFs de descarga, ni entregables de cliente, ni datos de cliente entran al
repositorio. Los archivos gated viven en los buckets privados; los secretos, solo en variables de
entorno de Easypanel. Razón: decisión §10-6 y su consecuencia ya registrada (D-18: el MCP del CRM se
registra con `--scope local`, nunca en un `.mcp.json` versionado).

**(h) Cero scripts de terceros en la capa pública.**
Analítica autoalojada, sin desafío anti-bot de terceros (D-16), sin widgets embebidos, sin agenda
incrustada en las páginas de servicio (A.3 §6 lo prohíbe expresamente). Razón: los gates D1
(Lighthouse ≥ 90, JS inicial < 150 KB gz) y la promesa privacy-first se pierden de uno en uno.

**(i) MCP para construir, API para operar. Nunca se mezclan.**
Los MCP (CRM, navegador, Drive) son herramientas de la sesión de construcción; la producción opera
solo con claves de API en variables de entorno. Ningún componente desplegado llama a un MCP, y
ninguna clave de producción se usa desde una sesión de agente. Razón: §7, distinción del método.

**(j) Nada inventado llega a producción.**
Precios, cifras, casos, nombres de clientes y testimonios solo con dato verificado y autorización
explícita. Los huecos se marcan `[PENDIENTE: …]`, son visibles en staging y **están prohibidos en
`main`** (script de CI, DoD #10, gate D5). Razón: es una promesa de marca antes que una regla de
calidad.

---

## Efecto de las decisiones de planificación sobre el alcance

Qué añade o quita cada decisión D-15…D-24 respecto de lo que dice el brief v1.1. Estas diferencias
son deliberadas y este documento es donde constan.

| Decisión | Efecto sobre el alcance | Signo |
|---|---|---|
| **D-15 — Correo transaccional: servicio transaccional dedicado con dominio verificado (SPF/DKIM/DMARC)** | Cierra la ambigüedad del brief (§7 dejaba abierto «SMTP de Workspace o servicio transaccional»). Añade al alcance de M0 un **adaptador de envío** sobre el servicio elegido y un pre-requisito DNS (SPF/DKIM/DMARC). **Quita** la dependencia de que termine la migración de correo, que habría sido bloqueante de M0. Producto concreto **resuelto después en D-22 (Resend)**. | ≈ (aclara) |
| **D-16 — Anti-abuso sin desafío de terceros** | **Quita** del alcance el desafío anti-bot que §7 dejaba como «opcional: decidir en plan» (Anexo I-13). Confirma en el alcance lo propio: límite de peticiones, honeypot y lista de dominios de correo gratuito. Elimina un producto del stack, un script de terceros de la capa pública y una variable de entorno. Reversible si aparece spam real. | **−** |
| **D-17 — 11 documentos de descarga (D-01…D-11)** | Resuelve la contradicción del brief entre §10-12 («9») y A.2/A.4 («11»). **Sube las descargas de 9 a 11**: dos documentos más (D-04 Customize Programs, D-05 AI Coaching for Directors) a producir en el proyecto **SLG_Overhauling**, y dos registros `download` más en ES y EN. Dentro de este repo el coste es de contenido, no de código: el sistema no distingue entre 9 y 11. Sin esto, dos páginas de servicio quedarían sin el CTA único que exige el contrato A.3 §5. | **+** (fuera de este repo) |
| **D-19 — Adaptador de captura al CRM de dos modos** | **Añade** al DU de captura de M2 un adaptador seleccionable por variable de entorno: modo `contact_note` (`POST /contacts` + `POST /notes`, lo único que la clave del CRM permite hoy) y modo `lead_admission` (`POST /api/v1/leads` con alcance `leads:write`, cuando el CRM lo implemente). Coste explícito: `api_contracts` especifica **los dos modos** y el DU **prueba ambos**. A cambio, **quita** del camino crítico la dependencia con el repo `crm_slg`: M2 no queda bloqueado por un cambio en otro repositorio y el spec-delta del CRM se enchufa después sin reabrir el DU ni migrar datos. | **+** (acotado) |
| **D-20 — Backups a object storage S3-compatible externo, en proveedor distinto de Hostinger** | Concreta el `[PENDIENTE: destino]` de §5.1 Operación. **Añade** a M0/M5 la FU de backup contra un destino S3 externo y la prueba de **restauración** que exige el DoD #8. Descarta guardar el backup en la máquina que puede morir (riesgo «un solo VPS», §9). Producto concreto **resuelto después en D-21 (Cloudflare R2)**. | ≈ (concreta) |
| **D-21 — Destino de backups: Cloudflare R2** | Cierra P-2: el destino se nombra y el `[PENDIENTE]` de §5.1 Operación desaparece. **Mete en el alcance las mitigaciones de R-37**, porque R2 **no ofrece Object Lock por API estándar** y la inmutabilidad del backup deja de poder darse por supuesta: credencial de **solo escritura y sin borrado** para el proceso de copia · purga de copias antiguas por un proceso distinto con **credenciales distintas** · **retención por generaciones** (diaria/semanal/mensual) en vez de un destino sobrescrito · **restauración verificada desde una copia antigua**, no solo desde la última. También **añade** la disciplina de operaciones (R2 factura por operaciones, no por egreso: el cliente de copia se configura para no dispararlas). El script se escribe contra API S3 genérica, así que cambiar de destino sigue costando endpoint + credenciales. | **+** (acotado) |
| **D-22 — Correo transaccional: Resend** | Cierra P-1: el producto se nombra. **Impone forma** al DU de correo, no superficie nueva: adaptador tras variable de entorno **hablando SMTP estándar**, nunca el SDK propietario, de modo que cambiar de proveedor cueste tres variables y ninguna línea de código. **Mete en el alcance** una exigencia de configuración privacy-first: seguimiento de aperturas y clics **desactivado** por dominio, coherente con la frontera (h). | ≈ (concreta) |
| **D-23 — El correo corporativo se queda en Microsoft 365** | **Saca del alcance** la migración a Google Workspace que suponían §7 y §1 Constraints, y con ella su riesgo y su carrera contra una fecha de cancelación. **Saca del alcance los MX de Outlook**, que entran formalmente en la lista de «no tocar» del §7 junto a `crm`, `n8n`, `evolution` y `academy`. Efecto positivo sobre M0: **el tenant de Entra existente puede reutilizarse** para el registro de la app (F.2-3), en vez de crear uno nuevo contra reloj. | **−** |
| **D-24 — Subdominio de envío dedicado** | **Saca del alcance el registro SPF de la raíz**: no se toca y sigue autorizando solo a Outlook. Lo que entra son los registros **del subdominio** (SPF, DKIM y CNAME de verificación), entradas DNS distintas que no pueden romper el correo humano — el riesgo R-38 queda neutralizado de Media/Alto a Baja/Medio. **Contrapartida en el alcance de contenido**: la dirección remitente deja de ser necesariamente `support@softlandingglobal.com`, así que cualquier requisito o texto que lo afirme queda desactualizado (corregido en RF-117). Quedan dos sub-decisiones de configuración, no de producto: `P-3` (dirección remitente visible, recomendado `From` en el subdominio con `Reply-To` a `support@`) y `P-4` (nombre del subdominio), ambas **se fijan en M0** y ninguna bloquea el plan. | ≈ (aclara) |
| **D-18 — MCP del CRM con `--scope local`** | No cambia el alcance del activo; **restringe el repo**: ningún `.mcp.json` versionado, ningún secreto en control de versiones. Refuerza la frontera (g). | ≈ (restringe) |
| **D-14 — Perfil `software-app`** | Fija qué `design_docs`, qué definición de completitud y qué `quality_gate` se aplican a cada unidad. Los gates extra (marketing, identidad, API) viven en el Anexo D del brief y **no** exigen perfil compuesto; su formalización como perfil propio queda en «Previsto». | ≈ (fija) |

**Saldo.** El alcance de v1 queda **igual en superficies** que el brief y **más definido**: cero
productos por decidir —P-1 y P-2 están resueltos (Resend, Cloudflare R2)—, un producto menos en el
stack (D-16), dos documentos más de contenido fuera de este repo (D-17) y un adaptador de dos modos en
un único DU (D-19). Las decisiones D-21 a D-24 **restan más de lo que suman**: fuera la migración de
correo (D-23), fuera el SPF de la raíz y los MX de Outlook (D-23, D-24). Lo único que suman es trabajo
acotado dentro de FU ya previstas: las mitigaciones de R-37 en la FU de backup (D-21) y los registros
del subdominio de envío en la FU de correo (D-24). Ninguna decisión de planificación ha añadido una
superficie nueva. Lo que queda abierto no es producto sino configuración: `P-3` y `P-4`, en M0.

---

## Registro

- `2026-09-08` — Escrito por `init-project` (paso 4) sobre `START_PROJECT.md` v1.1 §5.1/§5.2/§5.3,
  aplicando D-14 a D-20 de `docs/decision_log.md`. Los `[PENDIENTE]` de este documento son los
  mismos del Anexo I del brief; ninguno bloquea el cierre del plan.
- `2026-09-08` — Sincronizado con **D-21 a D-24**, posteriores a su redacción. Se cierran los dos
  `[PENDIENTE: producto concreto]`: correo transaccional → **Resend** (D-22) sobre **subdominio de
  envío dedicado** (D-24); destino de backups → **Cloudflare R2** (D-21) con las mitigaciones de R-37
  en lugar de una inmutabilidad que R2 no da por API estándar. La sección «Efecto de las decisiones»
  incorpora las cuatro filas nuevas y el «Saldo» se recalcula. Fuera del alcance quedan la migración
  de correo, los MX de Outlook y el SPF de la raíz (D-23, D-24). Corregido además el recuento de A.2:
  **25 filas de tabla, 27 rutas** por idioma. Nuevos `[PENDIENTE]`: `P-3` y `P-4`, ambos de
  configuración y ambos se fijan en M0; ninguno bloquea el cierre del plan.
