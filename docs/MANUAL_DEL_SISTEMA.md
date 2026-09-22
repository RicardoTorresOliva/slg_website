---
type: Registro
title: Manual del Sistema — slg_website
description: Estado real del sistema que sirve softlandingglobal.com: herramientas, repositorios, arquitectura, flujos, variables, operación, estado y lecciones. Levantado sobre el repositorio, el DNS vivo, Vercel y los documentos de trabajo; lo no verificable va marcado [POR CONFIRMAR].
tags: [manual, operacion, inventario, arquitectura, slg_website]
timestamp: 2026-09-22
lang: es
---

# Manual del Sistema — slg_website

## 1. Resumen ejecutivo

- `softlandingglobal.com` es una aplicación **Next.js 16** en **Vercel**, con base de datos e imágenes de archivo en **Supabase** y correo transaccional por **Resend**; el CRM, n8n y el staging viven en un **VPS con Easypanel**.
- Un solo repositorio (`slg_website`) contiene web pública, HQ (centro de mando), portal de cliente (Academy) y API v1; **65 frenos automáticos** y un CI de tres trabajos guardan cada cambio.
- Producción va **tres commits por detrás** de `develop` y la base **una migración por detrás** del repositorio (0023 sin aplicar).
- El diseño original es VPS + MinIO; la producción actual es Vercel + Supabase. Los dos caminos existen en el código y se eligen con una variable.
- Nueve sesiones de Claude Code (`slg_website_1` … `slg_website_9`) construyeron todo esto entre el 8 y el 22 de septiembre de 2026; los tokens no se midieron.

## 2. Inventario de herramientas y plataformas

| Herramienta / Plataforma | Para qué sirve en este sistema | Dónde vive | Cuenta / proyecto | Costo |
|---|---|---|---|---|
| **Vercel** | Aloja la web de producción y las vistas previas; compila y sirve la app | vercel.com → equipo `ricardotorresolivas-projects` → proyecto `slg-website` | Plan Pro del equipo | Pro [POR CONFIRMAR importe] |
| **Supabase** | PostgreSQL 17 (datos, identidad, colas) y Storage (PDF de descargas y entregables) | supabase.com → proyecto `slg-website` (ref `jadrwpbgtshwqanrhjxp`, región `us-east-1`) | Cuenta de Ricardo | Tramo gratuito [POR CONFIRMAR si sigue] |
| **GitHub** | Código, historial y CI (GitHub Actions) | github.com/RicardoTorresOliva | Cuenta personal | Gratuito |
| **Hostinger (DNS)** | Zona DNS del dominio (`ns1/ns2.dns-parking.com`) y registro del dominio | hpanel.hostinger.com → dominio `softlandingglobal.com` | Cuenta de Ricardo | Renovación anual [POR CONFIRMAR] |
| **VPS + Easypanel** | Panel que ejecuta CRM, n8n, Evolution, staging, MinIO y Umami en contenedores | `buul2l.easypanel.host` → proyecto `slg_website` · IP `167.88.42.76` | Cuenta de Ricardo | Mensual [POR CONFIRMAR proveedor e importe] |
| **MinIO** (en el VPS) | Almacenamiento S3 del diseño original (buckets `downloads` y `deliverables`) | Easypanel → servicio `minio` | — | Incluido en el VPS |
| **Resend** | Envío de correo transaccional por SMTP (`smtp.resend.com`) desde `no-reply@mailweb.softlandingglobal.com` | resend.com | Cuenta de Ricardo | Tramo gratuito [POR CONFIRMAR] |
| **Microsoft 365** | Buzones reales del dominio (MX en Outlook); futuro login «Continuar con Microsoft» (Entra ID) | admin.microsoft.com | Tenant de SLG | Suscripción [POR CONFIRMAR] |
| **CRM Softlanding Global** | Sistema de registro de leads: la web crea el contacto y le añade una nota | `crm.softlandingglobal.com` (VPS) · repo `CRM` | Propio | Incluido en el VPS |
| **n8n** | Automatizaciones (suscriptor opcional de los webhooks del sitio; flujo CRM → sitio previsto) | `n8n.softlandingglobal.com` (VPS) | Propio | Incluido en el VPS |
| **Evolution API** | API de WhatsApp en el VPS; el sitio no la usa | `evolution.softlandingglobal.com` (VPS) | Propio | Incluido en el VPS [POR CONFIRMAR uso] |
| **Umami** | Analítica autoalojada (sin terceros, RF-35). **No conectada a producción**: Vercel no tiene sus dos variables | Easypanel → servicios `umami` + `umami-db` | — | Incluido en el VPS [POR CONFIRMAR si el servicio sigue arriba] |
| **Cloudflare R2** | Destino externo de copias de seguridad cifradas (FU-14). Probado en laboratorio, **no en producción** | dash.cloudflare.com | Cuenta de Ricardo | Tramo gratuito [POR CONFIRMAR si el bucket existe] |
| **UptimeRobot** | Monitor externo de disponibilidad (D-49) | uptimerobot.com | Cuenta de Ricardo | Gratuito [POR CONFIRMAR si el monitor está creado] |
| **Google Cloud (OAuth)** | Login «Continuar con Google» (F.2-2). **Pendiente**: botón apagado | console.cloud.google.com | — | Gratuito |
| **Claude Code** | Donde se desarrolla todo: sesiones `slg_website_1` … `slg_website_9` | App de escritorio de Claude | Cuenta de Ricardo | Suscripción |
| **Docker (local)** | Solo PostgreSQL local para las pruebas de base de datos (`docker-compose.yml`) | Portátil de Ricardo | — | Gratuito |

## 3. Repositorios

| Repo | URL | Propósito | Relación con los demás | Rama principal |
|---|---|---|---|---|
| **slg_website** | github.com/RicardoTorresOliva/slg_website | La web, HQ, portal y API v1 | Consume el CRM por API; recibe copy y activos de SLG_Overhauling; nace de APP_Builder | `develop` (trabajo) → `main` (solo lo que pasó por `develop`) |
| **APP_Builder** | github.com/RicardoTorresOliva/APP_Builder | Plantilla de gobierno (`AGENTS.md`, perfiles, playbooks) de la que se creó este proyecto | Origen de `slg_website`; base de la futura plantilla de clientes | `main` |
| **SLG_Overhauling** | github.com/RicardoTorresOliva/SLG_Overhauling | Copy maestro, documentos de descarga, logos y los archivos `ops/*.env` con las credenciales (fuera del repo público) | Fuente de contenido y de variables de `slg_website` | `main` |
| **CRM** (carpeta local `crm_slg`) | github.com/RicardoTorresOliva/CRM | CRM de ventas B2B (Perú/EE. UU.): empresas, contactos, pipeline, presupuestos, contratos | Recibe los leads de `slg_website` (`POST /api/v1/contacts` + nota); servido en el VPS | `main` [POR CONFIRMAR] |
| **CRM_Template** | github.com/RicardoTorresOliva/CRM_Template | Versión plantilla del CRM (marca neutra «Eskailet») para clientes | Hermano del CRM; candidato a módulo de las webs de clientes | `main` [POR CONFIRMAR] |
| **crm-frontend** (Vercel) | proyecto Vercel `crm-frontend` | Frontend del CRM desplegado en Vercel | Parte del CRM [POR CONFIRMAR si está activo] | — |
| **phoenix-program-academy** (Vercel) | `academy.softlandingglobal.com` | Sitio anterior de la Academy, aún en línea | Sustituido por el portal de `slg_website` (D-160); pendiente de retirar | — |
| **SLG_CoO_Agents** | github.com/RicardoTorresOliva/SLG_CoO_Agents | Agentes de la Company of One (Hermes, validadores) | Hermes publicará noticias por la API v1 con clave `orgs:read + news:write` | [POR CONFIRMAR] |
| **SLG_Crm_Clientes** (carpeta `XicTables`) | github.com/RicardoTorresOliva/SLG_Crm_Clientes | [POR CONFIRMAR propósito] | — | — |
| **SLG_Palin**, **SLG_Dashboard**, **SLG_Fetch**, **SLG_Newsletter**, **SLG_Builders** | varios / sin remoto | Proyectos vecinos de SLG en `~/Dev` | Sin relación con la web salvo que se diga lo contrario [POR CONFIRMAR] | — |

## 4. Arquitectura

```mermaid
flowchart LR
  U[Visitante / Cliente / Ricardo] --> DNS[DNS Hostinger<br/>softlandingglobal.com]
  DNS -->|A 76.76.21.21| V[Vercel<br/>proyecto slg-website]
  DNS -->|A 167.88.42.76| VPS[VPS Easypanel<br/>staging · crm · n8n · evolution · minio · umami]
  V --> APP[Next.js 16<br/>web pública · HQ · portal · API v1]
  APP --> AUTH[Better Auth<br/>email+contraseña · Google · Microsoft]
  AUTH --> DB[(Supabase PostgreSQL 17<br/>24 migraciones · RLS por empresa)]
  APP --> DB
  APP -->|FILES_DRIVER=supabase| ST[Supabase Storage<br/>downloads · deliverables]
  APP -.->|FILES_DRIVER vacío| MINIO[(MinIO en el VPS)]
  APP -->|SMTP| MAIL[Resend<br/>no-reply@mailweb.…]
  APP -->|cola crm_delivery| CRM[CRM Softlanding<br/>crm.softlandingglobal.com]
  APP -->|webhooks firmados| N8N[n8n]
  APP -.->|opcional| UM[Umami]
  GH[GitHub · CI] -->|vercel --prod desde el portátil| V
  DB -.->|pg_dump cifrado| R2[Cloudflare R2]
```

| Componente | Una línea |
|---|---|
| DNS (Hostinger) | Raíz y `www` apuntan a Vercel; `staging`, `crm`, `n8n`, `evolution` al VPS; `academy` a otro proyecto Vercel; MX y SPF en Microsoft 365 |
| Vercel | Compila `npm run build` y sirve la app; variables por entorno (Production, Preview, Preview rama `develop`) |
| Next.js | Una sola aplicación con cuatro superficies: pública, `/hq`, `/portal`, `/api/v1` |
| Better Auth | Sesiones, invitaciones, roles (`slg_admin`, `slg_operator`, `client_admin`, `client_member`), claves de API con alcances |
| Supabase PostgreSQL | Datos, con aislamiento por empresa en la base (RLS) y auditoría inmutable; conexión por *pooler* `aws-0-us-east-1` (app en 6543, migraciones en 5432) |
| Almacenamiento | Adaptador S3 genérico (MinIO en el VPS) **o** Supabase Storage por REST; se elige con `FILES_DRIVER` |
| Resend | SMTP estándar desde el subdominio de envío `mailweb`; la raíz del dominio no se toca |
| CRM | La cola `crm_delivery` entrega cada captura con cinco reintentos (1 min → 24 h) y avisa por correo al quinto fallo |
| n8n / webhooks | Nueve eventos firmados (HMAC) con cola propia; sin suscriptor, todo queda registrado y nada se pierde |
| Umami | Analítica sin terceros; existe en el VPS, no está conectada a producción |
| Cloudflare R2 | Copias cifradas (clave pública en el servidor, privada fuera); restauración probada en laboratorio |
| CI (GitHub Actions) | `Gates` (contenido, secretos, entorno, build, SEO), `Datos` (migraciones y aislamiento contra PostgreSQL real), `Guarda` (`main` solo recibe lo que estuvo en `develop`) |

## 5. Flujos clave

### 5.1 Publicar un cambio

| Paso | Quién | Qué pasa |
|---|---|---|
| 1 | Claude | Cambia código o contenido en `develop`, corre los frenos locales, hace commit y `push` |
| 2 | GitHub Actions | Corre `Gates` y `Datos`; un `push` nuevo **cancela** la corrida anterior |
| 3 | Ricardo | Si el cambio lleva migración: aplica `scripts/db/migrar.ts` **antes** de desplegar |
| 4 | Ricardo | Despliega con el CLI de Vercel desde la copia limpia `.claude/worktrees/desplegar` (§7.1) |
| 5 | Vercel | Compila, publica y cambia el alias `softlandingglobal.com` al despliegue nuevo |

> No hay integración Git en Vercel: **nadie despliega salvo Ricardo, desde su portátil**. `main` no manda a producción; solo el CI comprueba que lo que llega a `main` pasó por `develop`.

### 5.2 Alta de usuario y acceso

| Método | Estado | Cómo funciona |
|---|---|---|
| **Invitación + contraseña** | ✅ Funciona | HQ → Usuarios → invitar por correo → el invitado recibe el enlace (Resend) → crea contraseña → entra en `/acceder`. Recuperación por `/recuperar` |
| **Continuar con Google** | ⛔ Botón apagado (D-01) | Falta F.2-2: pantalla de consentimiento OAuth y credencial en Google Cloud; luego `GOOGLE_CLIENT_ID/SECRET` en Vercel |
| **Continuar con Microsoft** | ⛔ Botón apagado (D-01) | Falta F.2-3: registro de app en Entra ID; luego `MICROSOFT_CLIENT_ID/SECRET/TENANT_ID`. La cuenta social solo se vincula a una cuenta **con el mismo correo** |
| Primera cuenta | ✅ Hecha | `ricardo.torres@softlandingglobal.com`, rol `slg_admin`, empresa `SLG Agency`, creada con `npm run auth:primer-admin` |

Reglas que aplican a los tres: sesión con cookie firmada por `BETTER_AUTH_SECRET`; cada usuario pertenece a **una** empresa; HQ solo para roles `slg_*`; portal para roles `client_*`; en producción `/hq` y `/portal` devuelven 404 con sesión hasta cerrar M3/M4 (RF-87).

### 5.3 Captura de lead → CRM

| Paso | Dónde | Detalle |
|---|---|---|
| 1 | Formulario (`/descargas`, `/contacto`, solicitud de doctrina) | Nombre, apellido, correo corporativo, consentimiento; campo trampa `empresa_web` oculto |
| 2 | `lib/antiabuso` | Descarta en silencio si la trampa viene rellena **o no viene** (D-164); límite por IP y correo en la base; rechaza dominios gratuitos/desechables (tabla editable sin desplegar) |
| 3 | `lib/descargas` | Guarda `lead_capture` **antes** de responder; si hay archivo, firma la URL de descarga con caducidad |
| 4 | `lib/webhooks` | Emite `lead.captured` (+ `contact.submitted` o `download.completed`) firmados a los suscriptores (n8n) |
| 5 | `lib/crm` (cola `crm_delivery`) | Modo `contact_note`: busca el contacto por correo en el CRM, lo crea si no está, añade una nota con el contexto. Reintentos 1 min → 10 min → 1 h → 6 h → 24 h; al quinto, `failed` + correo a `MAIL_ALERTS_TO` |
| 6 | HQ → Capturas | Lista, detalle de intentos y **reintento manual** |

El barrido de las colas en Vercel lo dispara `/api/colas` con `CRON_SECRET` desde un planificador externo [POR CONFIRMAR que el cron está configurado en Vercel].

### 5.4 Carga de archivos → almacenamiento

| Paso | Detalle |
|---|---|
| 1 | HQ → Entregables → nuevo entregable → el servidor pide una **URL firmada de subida** con caducidad (`SIGNED_URL_TTL_UPLOAD_MINUTES`) |
| 2 | El navegador sube directo al bucket privado `deliverables` (nunca pasa por la app) |
| 3 | HQ marca «publicar»; el cliente lo ve en `/portal/entregables` y lo abre por URL firmada de lectura |
| 4 | Un entregable `html` se abre en el **visor aislado** (`DELIVERABLE_VIEWER_ORIGIN`, sin cookies, vale HMAC con ámbito `hq` o `cliente`) |
| Destino | `FILES_DRIVER` vacío → **MinIO** por API S3 (`S3_ENDPOINT`, *path-style*). `FILES_DRIVER=supabase` → Supabase Storage por REST con la clave de servicio. **Producción hoy: `supabase`** |
| Descargas públicas | Mismo mecanismo con el bucket `downloads`: 11 PDF, clave = `file_key` del frontmatter del documento |

## 6. Variables de entorno (nombre y propósito; nunca valores)

| Grupo | Variables | Propósito |
|---|---|---|
| Base de datos | `DATABASE_URL`, `DATABASE_URL_MIGRATIONS`, `APP_DB_PASSWORD` | Conexión de la app (rol `slg_app`, sin permisos de dueño) · conexión de migraciones (rol dueño) · contraseña que crea el rol de la app |
| Local | `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Solo el contenedor PostgreSQL de desarrollo |
| Sitio | `NEXT_PUBLIC_SITE_URL`, `STAGING_BASIC_AUTH_USER`, `STAGING_BASIC_AUTH_PASSWORD`, `SUPERFICIES_EN_REVISION` | URL pública (**obligatoria**: sin ella no compila) · compuerta de staging · abre `/hq`,`/portal` solo tras la compuerta |
| Identidad | `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TENANT_ID` | Firma de sesión · origen · proveedores sociales (pendientes) |
| Correo | `MAIL_SMTP_HOST`, `MAIL_SMTP_PORT`, `MAIL_SMTP_USERNAME`, `MAIL_SMTP_PASSWORD`, `MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME`, `MAIL_REPLY_TO`, `MAIL_ALERTS_TO` | Transporte SMTP (Resend) · remitente en `mailweb` · dirección de respuesta · avisos operativos |
| Archivos | `FILES_DRIVER`, `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET_DOWNLOADS`, `S3_BUCKET_DELIVERABLES`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SIGNED_URL_TTL_DOWNLOAD_MINUTES`, `SIGNED_URL_TTL_DELIVERABLE_MINUTES`, `SIGNED_URL_TTL_UPLOAD_MINUTES` | Elección de proveedor · credenciales S3 (MinIO) · credenciales Supabase Storage · caducidades de URL firmadas |
| Visor | `DELIVERABLE_VIEWER_ORIGIN`, `DELIVERABLE_VIEWER_SECRET` | Origen separado del visor · secreto del vale |
| Webhooks | `WEBHOOK_SIGNING_SECRET`, `N8N_WEBHOOK_URL`, `WEBHOOK_SUBSCRIBERS`, `WEBHOOK_QUEUE_INTERVAL_MS`, `WEBHOOK_QUEUE_BATCH`, `WEBHOOK_TIMEOUT_MS`, `WEBHOOK_ANNOUNCE_POSTS` | Todos opcionales: firma, destinos, cadencia de la cola |
| CRM | `CRM_BASE_URL`, `CRM_API_KEY_CAPTURE`, `CRM_API_KEY_READ`, `CRM_MODE`, `CRM_TIMEOUT_MS`, `CRM_CONTACT_URL_TEMPLATE`, `CRM_QUEUE_INTERVAL_MS`, `CRM_QUEUE_BATCH`, `CRM_QUEUE_DISABLED`, `CRM_METRICS_CACHE_SECONDS`, `CRM_APP_URL` | Dirección del CRM · dos claves (escribir / leer) · modo `contact_note` o `lead_admission` · cola y caché del tablero |
| Anti-abuso | `PUBLIC_FORM_RATE_LIMIT_MAX`, `PUBLIC_FORM_RATE_LIMIT_WINDOW_MS`, `PRIVACY_POLICY_VERSION` | Límite de envíos · versión de la política aceptada |
| Analítica | `NEXT_PUBLIC_UMAMI_SCRIPT_URL`, `NEXT_PUBLIC_UMAMI_WEBSITE_ID` | Umami autoalojado; sin ellas no se carga nada |
| Operación | `OPS_TOKEN`, `OPS_MAIL_TO`, `CRON_SECRET`, `UPTIME_WEBHOOK_SECRET` | Página `/api/ops` (temporal) · testigo de `/api/colas` · webhook del monitor |
| Copias | `BACKUP_S3_ENDPOINT`, `BACKUP_S3_REGION`, `BACKUP_S3_BUCKET`, `BACKUP_S3_ACCESS_KEY_ID`, `BACKUP_S3_SECRET_ACCESS_KEY`, `BACKUP_PURGE_ACCESS_KEY_ID`, `BACKUP_PURGE_SECRET_ACCESS_KEY`, `BACKUP_PUBLIC_KEY`, `BACKUP_PRIVATE_KEY`, `BACKUP_VOLUME_PATHS`, `BACKUP_RETENTION_DAILY`, `BACKUP_RETENTION_WEEKLY`, `BACKUP_RETENTION_MONTHLY`, `BACKUP_ALERT_EMAIL`, `BACKUP_FIRST_DATE`, `BACKUP_DATE_OVERRIDE`, `PG_DUMP_BIN`, `PG_RESTORE_BIN` | Destino R2, credenciales separadas (copiar / purgar), cifrado asimétrico, retenciones |

Dónde viven hoy: **Vercel** (Production y Preview, 26 variables; cuatro más acotadas a la rama `develop`) y el archivo **`~/Dev/SLG_Overhauling/ops/supabase-slg-website.env`** en el portátil (solo para migraciones). El repositorio es público: en él no hay ni un valor.

## 7. Operación

### 7.1 Desplegar a producción

1. Abre la app **Claude** → pestaña **Code** → sesión de `slg_website`. Pide: «comprueba que el CI de `develop` está en verde». Debe responder con `completed/success`. Si dice `failure` o `cancelled`, no sigas: pide que lo arregle o que lo relance.
2. Si el cambio incluye una migración (Claude te lo dirá), abre **Terminal** (Aplicaciones → Utilidades → Terminal) y pega exactamente:
   `cd ~/Dev/slg_website && node --env-file=$HOME/Dev/SLG_Overhauling/ops/supabase-slg-website.env scripts/db/migrar.ts`
   Debe verse «N migración(es) aplicada(s) ahora … Total en la base: X de X». Si ves `CONNECT_TIMEOUT … :5432`, es la red (§9, IPv6): cambia la cadena al *pooler* y repite.
3. En la misma Terminal pega:
   `cd ~/Dev/slg_website/.claude/worktrees/desplegar && git checkout --detach origin/develop && vercel --prod`
   Debe verse `✓ Ready in …` y `Aliased https://softlandingglobal.com`.
   - Si ves `Not authorized`: pega `vercel logout && vercel login`, entra en el navegador que se abre, y repite el paso 3.
   - Si el error habla de `NEXT_PUBLIC_SITE_URL`: falta esa variable en Vercel → Settings → Environment Variables (Production). Añádela y repite.
4. Abre una ventana de incógnito en `https://softlandingglobal.com`. Debe verse el cambio. Si no, espera 1 minuto y recarga.

### 7.2 Comprobar que está en línea

1. Abre `https://softlandingglobal.com` en incógnito → debe cargar la portada con el mapa «Empieza aquí».
2. Abre `https://softlandingglobal.com/api/health` → debe responder `ok` sin nombrar variables faltantes.
3. vercel.com → `slg-website` → pestaña **Deployments** → el primero debe decir **Ready** y **Production**.
4. Si tienes UptimeRobot configurado: uptimerobot.com → el monitor de `softlandingglobal.com` debe estar en verde [POR CONFIRMAR].

### 7.3 Revertir un despliegue (sin terminal)

1. vercel.com → equipo `ricardotorresoliva's projects` → proyecto **slg-website** → pestaña **Deployments**.
2. Localiza el despliegue anterior que funcionaba (columna *Environment* = Production, estado *Ready*).
3. Clic en los tres puntos (`…`) a la derecha de esa fila → **Promote to Production** → confirma.
4. Debe verse ese despliegue con la etiqueta **Current** y `softlandingglobal.com` sirviendo la versión anterior en menos de un minuto.
5. Si el cambio revertido llevaba una migración, **no** se deshace en la base: avisa en la sesión de Claude antes de volver a desplegar.

### 7.4 Ver quién entró y qué pasó

- HQ → **Auditoría**: cada acción con quién, cuándo y sobre qué; inmutable.
- HQ → **Capturas**: cada lead, sus intentos de entrega al CRM y el botón de reintento.
- vercel.com → `slg-website` → **Logs** / **Observability**: peticiones por ruta y errores del servidor.

## 8. Estado

### 8.1 Funciona en producción

| Área | Estado |
|---|---|
| Web pública ES/EN: mapa, 11 servicios, 4 overviews, doctrina, nosotros, blog (6 artículos), 11 descargas, legales, contacto | ✅ |
| Captura de leads con anti-abuso propio y entrega al CRM (`contact_note`) | ✅ |
| Correo transaccional desde `mailweb` | ✅ |
| Identidad: primera cuenta, invitaciones, contraseña, recuperación | ✅ |
| Base: 23 migraciones aplicadas, RLS por empresa, auditoría inmutable | ✅ |
| API v1 (lectura y escritura, OpenAPI generado del catálogo, D-162/D-163 para el CRM) | ✅ en código; sin clave emitida a Hermes todavía |
| HQ y portal (Academy: Hoy, Programa, Clases, Avisos, Entregables) | ✅ en código; **cerrados en producción** (RF-87) y abiertos en la vista previa de `develop` |
| CI de tres trabajos, 65 frenos | ✅ |
| Favicon e identidad visual del 21-09 | ✅ desplegado |

### 8.2 Falta para el objetivo final

| Qué | Bloquea | Quién |
|---|---|---|
| Aplicar migración **0023** y desplegar `develop` (D-164 completo) | Producción va tres commits atrás | Ricardo |
| Revisión visual de HQ y portal con un cliente de prueba (invitar, entrar, recorrer, archivar) | Cerrar M3 y M4 → abrir `/hq` y `/portal` en producción | Ricardo |
| F.2-2 Google OAuth y F.2-3 Microsoft Entra | Botones sociales; DoD #5 (aceptar invitación con Microsoft 365) | Ricardo (consolas de Google y Microsoft) |
| F.2-1 Texto legal definitivo de privacidad y términos | Activación formal de formularios en producción | Ricardo |
| Copias de seguridad en producción (bucket R2, dos credenciales, clave privada fuera) | FU-14 criterio 6 → gate D11 | Ricardo |
| Clave de API para Hermes (`orgs:read` + `news:write`) y flujo CRM → sitio en n8n | Noticias en el portal; proyectos que nacen en el CRM | Ricardo / n8n |
| Decisión de analítica (Umami conectado, propia, o ninguna) | Ver visitas | Ricardo |
| Decisión §4.1 de `docs/plantilla-de-sitios.md` (estructura en archivo o `rutas.ts` por cliente) | Toda la replicación para clientes | Ricardo |
| Retirar `phoenix-program-academy` (`academy.softlandingglobal.com`) | Dos Academy en línea | Ricardo |
| Prueba de Literacy: Ricardo ejecuta tres tareas del README sin ayuda | DU-24, gate D12 | Ricardo |

### 8.3 Bloqueos y riesgos vivos

| Riesgo | Detalle |
|---|---|
| **Nadie despliega salvo Ricardo desde su portátil** | Sin integración Git en Vercel. Si el portátil no está, no hay despliegue |
| **`main` está 102 commits por detrás y recibió un commit directo** | D-164 se hizo sobre `main` y hubo que traerlo a `develop`; `main` no ve lo que ve `develop` |
| **Staging en el VPS responde 500** | `staging.softlandingglobal.com` está caído o sin variables [POR CONFIRMAR]; la vista previa útil es la de Vercel (`slg-website-git-develop-…`) |
| **Migraciones por host IPv6** | El host directo de Supabase no tiene IPv4; si la red no da IPv6, las migraciones fallan. Solución: *pooler* en modo sesión (5432) |
| **Token del CLI de Vercel se cae** | Dos veces en una hora el 21-09; `vercel logout && vercel login` lo arregla. Sospecha: otra sesión de Claude tocando el mismo token |
| **Copias de seguridad no corren en producción** | Solo la copia automática de Supabase (tramo gratuito: 7 días) [POR CONFIRMAR] |
| **`data_model.md:1018` describe un CHECK que no existe** | Documento y base discrepan en `download_service_literal` |

## 9. Lecciones

| Problema | Costo | Decisión a futuro |
|---|---|---|
| Se diseñó para VPS + MinIO + Easypanel y se terminó desplegando en Vercel + Supabase | Dos caminos de archivos, dos runbooks, semanas de infraestructura que no se usa en producción | Para clientes: **una sola plataforma desde el día 1** (Vercel + Supabase). El VPS solo si el cliente exige datos en su servidor |
| Supabase no crea claves S3 por API | Un segundo adaptador de archivos (`lib/files/supabase.ts`) | Elegir el proveedor de archivos por lo que ofrece **por API**, no por lo que ofrece el panel |
| El host directo de Supabase es solo IPv6 | Migraciones que fallan según la red del día | Usar siempre el *pooler* en modo sesión (5432) para migraciones; documentarlo en el `.env` |
| Pooler en 5432 (sesión) para la app | 500 en `/hq/capturas` por agotar 15 conexiones | La app va por 6543 (transacción) con `prepare: false` y pools pequeños |
| Tres semanas y 156 commits para una web + intranet | Tokens «no medidos» en todos los milestones; coste real desconocido | Medir tokens por unidad desde el primer día; presupuestar por milestone |
| 65 frenos que validan **contra la oferta de SLG** | Un sitio de cliente arrancaría con cinco frenos en rojo | Parametrizar los frenos por `site.config` antes de clonar el repo |
| Marca y dominio escritos a mano en `lib/` | Un cliente sin `NEXT_PUBLIC_SITE_URL` publicaba el dominio de SLG | Texto visible solo en `content/ui`; la URL del sitio falla al compilar si falta (hecho el 21-09) |
| Un commit directo sobre `main` (D-164) | Tres fallos reales que el CI de `main` no podía ver; tres corridas de CI para dejarlo en verde | **Nunca** commitear sobre `main`; una regla que atraviesa tres puertas se cambia en las tres |
| Una comprobación anónima sobre `/hq` «demuestra» RF-87 | Falsa alarma de seguridad | Probar con sesión válida (`test:acceso`); una prueba anónima no prueba nada |
| Agentes en paralelo sin worktree propio | Dos agentes escribiendo el mismo directorio | Crear worktree + `node_modules` enlazado por agente y preasignar números de migración |
| Cada `push` cancela el CI anterior | Corridas canceladas que parecían verdes | Fusionar todo y empujar **una** vez; leer `conclusion`, no el código de salida de `gh run watch` |
| Google/Microsoft y legales pendientes desde el inicio (F.2-1/2/3) | HQ y portal no pueden cerrarse; DoD #5 bloqueado | Las dependencias externas del cliente se piden **en el intake**, antes de escribir código |
| Documentos de diseño de 1.000+ líneas por unidad | Contexto caro en cada sesión; nueve sesiones para leerlos | Para clientes: perfil `marketing-website` corto, con lo que cambia y nada más |
| Sin analítica por RF-35 | No hay forma de ver visitas | Decidir en el intake: Umami autoalojado por cliente o ninguna |

## Ítems [POR CONFIRMAR]

1. Importes mensuales: Vercel Pro, VPS (proveedor), Microsoft 365, Resend, Supabase (si dejó el tramo gratuito), Hostinger (renovación del dominio).
2. Rama principal y estado de despliegue de `CRM`, `CRM_Template` y `crm-frontend` (Vercel).
3. Propósito de `SLG_Crm_Clientes` (carpeta `XicTables`) y relación de `SLG_Palin`, `SLG_Dashboard`, `SLG_Fetch`, `SLG_Newsletter`, `SLG_Builders` con la web.
4. Evolution API: si algo lo usa hoy.
5. Umami: si los servicios `umami` y `umami-db` siguen arriba en Easypanel.
6. Cloudflare R2: si el bucket y las dos credenciales existen.
7. UptimeRobot: si el monitor está creado y con webhook.
8. Cron externo que llama a `/api/colas` con `CRON_SECRET` en Vercel.
9. `staging.softlandingglobal.com` devuelve 500: causa.
10. Si Ricardo cambió `DATABASE_URL_OWNER` al *pooler* en `ops/supabase-slg-website.env`.
11. Copias automáticas de Supabase en el plan actual.
12. Nombres reales de las sesiones `slg_website_1` … `slg_website_9` (dicho por Ricardo; no verificado en la app).
