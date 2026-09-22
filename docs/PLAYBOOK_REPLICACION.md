---
type: Plantilla
title: Playbook de replicación — webs de clientes desde slg_website
description: Qué de slg_website es núcleo reutilizable, qué se configura por cliente y qué es específico de SLG; stack mínimo recomendado; plan para convertir el repo en plantilla; intake, procedimiento de lanzamiento en ≤ 5 días hábiles y estimación para cinco encargos.
tags: [playbook, plantilla, clientes, replicacion, slg_website]
timestamp: 2026-09-22
lang: es
---

# Playbook de replicación — 5 webs de clientes

Base de trabajo: `docs/plantilla-de-sitios.md` (inventario línea a línea del 18-09) y `docs/MANUAL_DEL_SISTEMA.md` (estado real del 22-09).

## 1. Clasificación

| Clase | Qué es | Piezas concretas | Qué se hace con ello |
|---|---|---|---|
| **NÚCLEO** (motor, no se toca) | Todo lo que no lleva una sola línea de SLG | `AGENTS.md` + `profiles/software-app` · capa de contenido OKF bilingüe (`lib/content`) · identidad y roles (`lib/auth`) · aislamiento por empresa en la base (RLS, `lib/db`) · invitaciones · correo SMTP · adaptadores de archivos (S3/MinIO y Supabase) · anti-abuso propio · cola al CRM y webhooks (`lib/colas`, `lib/crm`, `lib/webhooks`) · blog y RSS · HQ y portal · API v1 y OpenAPI · visor aislado · copias cifradas · **los 65 frenos** · CI de tres trabajos · `docs/blog-editor.md` · el mapa «Empieza aquí» generado desde la tabla de rutas | Se clona tal cual |
| **CONFIGURABLE por cliente** | Lo que hoy está escrito a mano y debe salir de un `site.config` | **Identidad** (13 sitios con «SLG Agency»: nombre, wordmark, favicon, Open Graph, colores) · **Dominio** (`NEXT_PUBLIC_SITE_URL`, remitente de correo, visor) · **Idiomas** (hoy ES/EN fijos; un cliente puede querer uno) · **Estructura de la oferta** (`lib/content/rutas.ts`: ejes → líneas → servicios; `schema.ts` con los 11 literales de servicio; `nomenclature.ts` con 30 patrones; `POR_RUTA` de `Fotografia.tsx`) · **Módulos** (blog sí/no, descargas sí/no, portal sí/no, CRM sí/no, analítica sí/no) · **Textos** (`content/ui/*.json`, `content/pages`, `content/services`, `content/downloads`, legales) · **Cinco frenos que validan contra la oferta**: `check:nomenclature`, `check:armazon`, `check:paginas`, `check:seo`, `check:copy` | Se parametriza una vez; después cada cliente es un archivo de configuración + su contenido |
| **ESPECÍFICO de SLG** (se descarta) | Lo que solo tiene sentido para SLG Agency | La Doctrina Phoenix y sus documentos · los 11 servicios y las tres líneas de VoltAi · Holdings by SLG · los 11 PDF de descarga · el blog actual · la integración con **este** CRM (`crm.softlandingglobal.com`) · la Academy tal como está (noticias con importancia editorial, programas Phoenix) · el mapa de servicios · `content/conexiones.json` de HQ · `SLG_Overhauling` como fuente de copy | No se copia; el cliente trae lo suyo por el intake |

## 2. Stack recomendado para clientes

**Regla**: una web de cliente informativa se entrega con **tres herramientas** (Vercel, Supabase, Resend) y el registrador de dominio del cliente. Todo lo demás es opcional o sobra.

| Herramienta actual | ¿Sobra en una web de cliente? | Qué la reemplaza |
|---|---|---|
| VPS + Easypanel | **Sí**, para informativas y con intranet | Vercel (web) + Supabase (datos y archivos). El VPS solo si el cliente exige sus datos en su servidor o ya tiene CRM/n8n propios |
| MinIO | **Sí** | Supabase Storage (ya soportado por `FILES_DRIVER=supabase`) |
| Umami autoalojado | **Sí**, salvo que el cliente pida analítica sin terceros | Nada (informativa simple) o Umami Cloud / Vercel Web Analytics si el cliente acepta un script de terceros (decisión de intake) |
| n8n + webhooks | **Sí**, salvo que el cliente tenga automatizaciones | Nada; la cola del CRM basta |
| CRM propio + `lib/crm` | **Depende** | Sin `CRM_*` la captura queda en `lead_capture` y HQ → Capturas la muestra: para muchos clientes eso **es** el CRM. Si tiene HubSpot/Pipedrive, un adaptador nuevo en `lib/crm` (el puerto ya existe) |
| Cloudflare R2 (copias) | **Sí** en tramo gratuito de Supabase | Copias automáticas de Supabase (7 días en Free, 30 en Pro). R2 solo si el contrato exige retención larga |
| UptimeRobot | No sobra: gratis y cinco minutos | Se mantiene, un monitor por cliente |
| Google / Microsoft login | **Sí** para informativas; **depende** para intranet | Invitación + contraseña ya funciona; social solo si el cliente lo pide y entrega las credenciales en el intake |
| Docker + `docker-compose.yml` | Solo para desarrollo local | Se mantiene para las pruebas de base de datos; el cliente nunca lo ve |

| Opción | Tiempo de entrega | Costo mensual | Complejidad de mantenimiento |
|---|---|---|---|
| **A · Informativa** — web pública ES(/EN), formulario de contacto, descargas, blog opcional. Vercel + Supabase Free + Resend Free | **2–3 días** (con contenido entregado) | 0 USD (Vercel Hobby no admite uso comercial → Vercel Pro compartido del equipo de SLG: ~20 USD/mes por asiento, prorrateable entre clientes) [POR CONFIRMAR precio vigente] | Baja: solo contenido y despliegues |
| **B · Informativa + intranet** — A + HQ/portal con invitaciones, entregables y avisos. Vercel + Supabase (Free o Pro ~25 USD) + Resend | **4–5 días** | 0–45 USD/mes | Media: usuarios, copias, migraciones |
| **C · Con CRM externo** — B + adaptador al CRM del cliente | **+2 días** por CRM nuevo | Igual que B + el CRM del cliente | Media-alta: dos sistemas de registro |
| **D · Réplica completa de SLG** (VPS, MinIO, n8n, Umami, R2) | 2–3 semanas (lo que costó esta) | 20–60 USD/mes + VPS | Alta: no recomendable para clientes |

> **E-commerce no está cubierto**: no hay carrito, pagos ni catálogo en el núcleo. Si un cliente lo pide, es un proyecto distinto (o una tienda externa enlazada).

## 3. Plan para convertir `slg_website` en plantilla de cliente

Orden estricto: cada paso depende del anterior. Total estimado: **3 días de Claude + 2 horas de Ricardo**, antes del primer cliente.

| # | Paso | Quién | Salida | Tiempo |
|---|---|---|---|---|
| 0 | **Decidir §4.1**: la estructura de ejes/líneas/servicios ¿se declara en un archivo (`site.config.ts`) o cada cliente tiene su `rutas.ts`? **Recomendación: archivo.** Cuesta un generador y paga desde el segundo cliente; con cinco encargos, paga | Ricardo | Una línea en `docs/decision_log.md` | 10 min |
| 1 | Crear `site.config.ts` con: nombre, dominio, idiomas, colores, logo, remitente, módulos activos (blog/descargas/portal/crm/analítica) y la estructura de la oferta | Claude | Archivo + tipos | 3 h |
| 2 | Sustituir los 26 sitios de marca y dominio (§3.1, §3.2 del inventario) por lecturas del config | Claude | 0 apariciones de «SLG Agency» / `softlandingglobal.com` fuera de `content/` y `site.config.ts` | 3 h |
| 3 | Derivar `rutas.ts`, `schema.ts` (`PROJECT_SERVICES`), `nomenclature.ts` y `POR_RUTA` del config (o generarlos con `npm run sitio:generar`) | Claude | Generador + freno `check:sitio` que falla si el config y los derivados no coinciden | 6 h |
| 4 | Parametrizar los cinco frenos que validan contra la oferta de SLG (`nomenclature`, `armazon`, `paginas`, `seo`, `copy`) para que lean el config | Claude | CI en verde con un config de prueba «Cliente Demo» | 4 h |
| 5 | Módulos apagables: portal, blog, descargas, CRM, analítica; cada uno con su flag y sus rutas retiradas del mapa y del sitemap cuando está apagado | Claude | Config `portal: false` → `/portal` y `/hq/*` no existen; `check:paginas` lo entiende | 4 h |
| 6 | Perfil `marketing-website` en `profiles/` (gates D1–D6 + captura; sin identidad ni API) para que el intake sea corto | Claude | `profiles/marketing-website/profile.md` | 2 h |
| 7 | Playbook `crear-sitio` en `commands/`: crea Supabase, aplica migraciones, aprovisiona bucket, crea Vercel, carga variables desde `ops/<cliente>.env`, crea primer admin, verifica DNS y `/api/health` | Claude | `commands/crear-sitio.md` + `scripts/sitio/crear.ts` | 4 h |
| 8 | Vaciar lo específico de SLG: contenido, PDF, blog, `conexiones.json`, mapa; dejar un «Cliente Demo» bilingüe con 3 servicios de ejemplo | Claude | Repo arranca con contenido de demostración | 2 h |
| 9 | Crear el repositorio **`website_template`** en GitHub (desde la rama resultante, historia limpia) y marcarlo como *Template repository* | Ricardo | github.com/RicardoTorresOliva/website_template | 15 min |
| 10 | Prueba en frío: crear «Cliente Demo» con el playbook, de cero a `https://demo-….vercel.app` en línea | Claude + Ricardo | Tiempo real medido; defectos al `work_log` | 2 h |
| 11 | `slg_website` pasa a ser **un cliente más** de la plantilla (o se queda como está, congelado) — decisión posterior | Ricardo | — | — |

Cómo hace Ricardo el paso 9:
1. Abre `https://github.com/new/import` en el navegador.
2. En **Your old repository's clone URL** pega `https://github.com/RicardoTorresOliva/slg_website.git`. En **Repository name** escribe `website_template`. Marca **Private**. Clic en **Begin import**. Debe verse «Importing…» y luego el repositorio abierto.
3. En el repositorio nuevo: **Settings** → marca la casilla **Template repository** (arriba, bajo el nombre). Debe verse un botón verde **Use this template** en la portada del repositorio.
4. Si el import falla por tamaño: avisa en la sesión de Claude; se crea desde una rama con historia limpia.

## 4. Checklist de intake por cliente

Se pide **todo antes de empezar**; sin los ítems marcados ★ no arranca el reloj de los 5 días.

| # | Ítem | ★ | Formato que se pide |
|---|---|---|---|
| 1 | Nombre legal y nombre comercial; país y entidad que factura | ★ | Texto |
| 2 | **Dominio**: ¿ya lo tiene? ¿dónde está registrado? Acceso al panel DNS **o** que Ricardo quede como colaborador | ★ | Usuario invitado en el registrador (Hostinger, GoDaddy, Namecheap…). Nunca contraseñas por correo |
| 3 | Idiomas del sitio (uno o dos) y cuál es el principal | ★ | ES / EN / ambos |
| 4 | **Marca**: logo en SVG y PNG, favicon, colores (hex), tipografías, imagen Open Graph 1200×630 | ★ | Carpeta compartida |
| 5 | **Estructura de la oferta**: ejes → líneas → servicios, con nombre exacto y una frase por servicio | ★ | Tabla (plantilla que se le manda) |
| 6 | **Contenido** por página: portada, quiénes somos, cada servicio (6 secciones: qué es, para quién, qué incluye, cómo se trabaja, resultado, CTA), contacto, legales | ★ | Documento por página; sin contenido no hay web |
| 7 | Correo: dominio de envío (subdominio `mail.` o `notificaciones.`), dirección remitente visible, dirección de respuesta, quién recibe los avisos | ★ | Texto + acceso DNS para SPF/DKIM |
| 8 | Módulos: ¿blog? ¿descargas (PDF)? ¿intranet/portal para sus clientes? ¿login con Google/Microsoft? | ★ | Sí/No por módulo |
| 9 | CRM: ¿tiene? ¿cuál? ¿clave de API o usuario técnico? Si no, las capturas viven en HQ | | Nombre del CRM + acceso |
| 10 | Analítica: ¿acepta un script de terceros (Vercel Analytics)? ¿o sin analítica? | | Sí/No |
| 11 | Texto legal: política de privacidad y términos redactados por su asesor, o autorización para usar plantilla | ★ | Documento |
| 12 | Cuentas: ¿usa su cuenta de Vercel/Supabase o la de SLG? (recomendado: **la de SLG**, facturada en el fee) | ★ | Decisión |
| 13 | Primer administrador: nombre y correo corporativo (será `slg_admin` de su sitio) | ★ | Correo |
| 14 | Redes y enlaces externos (LinkedIn, calendario de citas, WhatsApp) | | URLs |
| 15 | Fecha de lanzamiento deseada y persona que aprueba | ★ | Fecha + nombre |

## 5. Procedimiento de lanzamiento de una web nueva (≤ 5 días hábiles)

Presupone la plantilla del §3 terminada. R = Ricardo, C = Claude.

| Día | # | Paso | Resp. | Tiempo | Resultado visible |
|---|---|---|---|---|---|
| 0 | 1 | Intake completo (§4) firmado por el cliente | R | 1 h de reunión | Carpeta del cliente con los 15 ítems |
| 1 | 2 | En GitHub: **Use this template** → repo `web_<cliente>` privado | R | 5 min | Repositorio nuevo |
| 1 | 3 | En supabase.com: **New project** → nombre `<cliente>-web`, región `us-east-1`, contraseña generada y guardada en el gestor de contraseñas | R | 10 min | Proyecto con estado *Active* |
| 1 | 4 | En vercel.com: **Add New → Project → Import** `web_<cliente>` → Framework Next.js → **Deploy** (fallará por variables: es esperado) | R | 10 min | Proyecto creado |
| 1 | 5 | Rellenar `ops/<cliente>.env` (fuera del repo) con las variables del §6 del manual; C indica cuáles, R pone los valores | R + C | 30 min | Archivo local |
| 1 | 6 | Ejecutar el playbook `crear-sitio`: migraciones, bucket, variables a Vercel, primer admin, verificación | C | 30 min | `https://web-<cliente>.vercel.app` responde `ok` en `/api/health` |
| 1 | 7 | Escribir `site.config.ts` con marca, dominio, idiomas, módulos y estructura de la oferta | C | 1 h | Mapa del sitio generado con los servicios del cliente |
| 2 | 8 | Cargar contenido: páginas, servicios, legales, descargas; frenos de contenido en verde | C | 4–6 h | Vista previa de Vercel completa |
| 2 | 9 | Marca: colores, logo, favicon, Open Graph; `check:contraste` en verde | C | 2 h | Vista previa con la identidad del cliente |
| 3 | 10 | Correo: subdominio de envío en Resend, registros DNS (R los pega donde C le diga), prueba de bandeja de entrada | R + C | 1 h | Correo de prueba recibido en Gmail y Outlook |
| 3 | 11 | Revisión del cliente sobre la vista previa; lista de cambios | Cliente + R | 1 día de espera | Lista firmada |
| 4 | 12 | Aplicar cambios; `check:ci` completo en verde; Lighthouse ≥ 90 | C | 3 h | CI verde |
| 4 | 13 | Intranet (si aplica): crear empresa del cliente, invitar administrador, recorrer portal con él | R + C | 1 h | Cliente dentro del portal |
| 5 | 14 | DNS: en el registrador, `A @ → 76.76.21.21` y `CNAME www → cname.vercel-dns.com`; en Vercel → Settings → Domains → añadir dominio | R | 20 min + propagación | Vercel muestra *Valid Configuration* |
| 5 | 15 | Despliegue de producción (`vercel --prod` o **Promote** desde el panel), monitor en UptimeRobot, comprobación en incógnito | R | 20 min | Dominio del cliente en línea |
| 5 | 16 | Entrega: `README` del cliente (las 7 tareas desde el navegador), accesos, factura | R | 30 min | Cliente autónomo para textos, blog y descargas |

Tiempo de Claude por sitio (opción A): **~12 h**. Tiempo de Ricardo: **~5 h** repartidas en cinco días. Camino crítico: el contenido del cliente (paso 1) y su revisión (paso 11).

## 6. Estimación para los 5 encargos

| Concepto | Estimación |
|---|---|
| Preparar la plantilla (§3) | 3 días de trabajo (Claude) + 2 h (Ricardo). **Se hace una vez, antes del cliente 1** |
| Un sitio, opción A (informativa) | 5 días hábiles de calendario; ~12 h Claude, ~5 h Ricardo |
| Un sitio, opción B (con intranet) | 5–7 días hábiles; ~18 h Claude, ~7 h Ricardo |
| **Paralelismo real** | El límite es **Ricardo**: intake, DNS, cuentas, revisión con el cliente. Claude puede llevar 2–3 sitios a la vez en sesiones separadas (un repo por sesión, sin cruzar worktrees) |
| **Cinco sitios, en serie** | 5 × 5 días = 25 días hábiles + 3 de plantilla = **~6 semanas** |
| **Cinco sitios, escalonados de dos en dos** (recomendado) | Plantilla (semana 1) → clientes 1-2 (semana 2) → 3-4 (semana 3) → 5 (semana 4) = **~4 semanas**, con cada cliente entregado dentro de sus 5 días |
| Condición para que se cumpla | Los cinco intakes completos **antes** de empezar el primero; el contenido tarde es lo único que rompe el calendario |
| Coste mensual recurrente para SLG (5 clientes en la cuenta de SLG) | Vercel Pro (1 asiento) + Supabase Free ×5 + Resend Free ×5 + UptimeRobot Free = **~20 USD/mes** [POR CONFIRMAR precios vigentes]; con intranet y Supabase Pro por cliente, +25 USD/mes cada uno |

**Pregunta abierta que cambia el plan**: si alguno de los cinco es **e-commerce**, no cabe en esta plantilla y hay que cotizarlo aparte.
