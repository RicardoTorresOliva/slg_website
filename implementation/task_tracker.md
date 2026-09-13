---
type: implementation
title: task_tracker
project: slg_website
description: Seguimiento de las 39 unidades de trabajo de slg_website v1 (14 Foundation Units y 25 Deliverable Units) agrupadas por milestone, con dependencias y estado. Se actualiza después de cada unidad, nunca en lotes.
tags: [slg, slg_website, implementation, tracker, milestones, fu, du, okf, software-app]
status: planning
timestamp: 2026-09-08
sources:
  - "implementation/user_units.md — definición completa de cada unidad"
  - "START_PROJECT.md v1.1 Anexo E — milestones y orden comercial"
  - "AGENTS.md v4.1 — Regla 6 (documentar mientras se trabaja)"
---

# Task tracker — slg_website v1

Tabla de seguimiento de las **39 unidades** definidas en `implementation/user_units.md`.
Se actualiza **después de cada unidad**, junto con `docs/work_log.md` (AGENTS.md Regla 6:
*no later, not in batches*).

**Estados admitidos:** `pending` · `in_progress` · `blocked` · `review` · `done`.
La **Compuerta de Planificación está abierta** desde el 2026-09-08 (AGENTS.md Regla 1, aprobación de
Ricardo): la ejecución está en marcha y el estado real de cada unidad vive en la tabla de abajo.

---

## Resumen de conteos

| Milestone | FU | DU | Total |
|---|---:|---:|---:|
| **M0-A** — Fundaciones: plataforma, contenido y despliegue | 4 | 0 | **4** |
| **M0-B** — Fundaciones: identidad y servicios compartidos | 4 | 1 | **5** |
| **M1-A** — Capa pública: compuertas, componentes y armazón | 2 | 2 | **4** |
| **M1-B** — Capa pública: páginas | 0 | 4 | **4** |
| **M2** — Conversión y contenido | 1 | 5 | **6** |
| **M3** — HQ (intranet SLG) | 1 | 5 | **6** |
| **M4** — Portal de clientes | 1 | 4 | **5** |
| **M5** — API para agentes y go-live | 1 | 4 | **5** |
| **TOTAL** | **14** | **25** | **39** |

**Estado global:** 19 `pending` · **7 `in_progress`** (FU-05, FU-08, FU-09, DU-01, FU-01, DU-07, DU-08) · **13 `done`** (FU-02, FU-03, FU-04, FU-06, FU-07, FU-10, FU-11, DU-02, DU-03, DU-04, DU-05, DU-06, DU-11) · 0 `blocked` · 0 `review`. **FU-05 en curso desde 2026-09-12**: la mitad que vive en el repositorio está construida y verificada —pipeline, frenos con prueba negativa, cabeceras, compuerta de staging, `.env.example`, scripts de DNS— y los criterios 5, 6, 7 y 9 están cerrados. Los criterios 1, 2, 3 y 8 necesitan los cinco servicios arriba y la zona DNS delante: el paso a paso está en **`docs/deployment.md`**.

> **M0 y M1 están subdivididos** porque salían con 9 y 8 unidades, por encima del máximo de 6 por
> milestone. No cambia su contenido ni el orden comercial del Anexo E: **M0 → M1 → M2 salen a
> producción antes de empezar M3**.

---

## Unidades

| ID | Tipo | Unidad | Milestone | Depende de | Estado |
|---|---|---|---|---|---|
| ━━━ | ━━━ | **▼ M0-A · FUNDACIONES: PLATAFORMA, CONTENIDO Y DESPLIEGUE** | ━━━ | ━━━ | ━━━ |
| FU-02 | FU | Andamiaje del repositorio, tokens de marca y skills aprobadas | M0-A | — | `done` |
| FU-03 | FU | Capa de contenido OKF, i18n y scripts de verificación | M0-A | FU-02 | `done` |
| FU-04 | FU | Capa de datos: PostgreSQL, Drizzle, migraciones y modelo B.2 | M0-A | FU-02 · `data_model` | `done` |
| FU-05 | FU | Despliegue, CI, DNS y documentación de entorno | M0-A | FU-02, FU-03, FU-04 · EXT-7 ✅ (D-49) | `in_progress` — repo cerrado; faltan criterios 1, 2, 3 y 8 (infraestructura, `docs/deployment.md`) |
| ━━━ | ━━━ | **▼ M0-B · FUNDACIONES: IDENTIDAD Y SERVICIOS COMPARTIDOS** | ━━━ | ━━━ | ━━━ |
| FU-06 | FU | Módulo de identidad y autorización | M0-B | FU-04, FU-05 | `done` |
| FU-07 | FU | Servicio de invitaciones | M0-B | FU-06, FU-08 | `done` |
| FU-08 | FU | Adaptador de correo transaccional | M0-B | FU-05 · F.2-4 | `in_progress` — código cerrado (criterios 1, 2, 5, 7); faltan P-3/P-4, los registros del subdominio y los tres buzones |
| FU-09 | FU | Almacenamiento de archivos y URLs firmadas | M0-B | FU-05 · `api_contracts` | `in_progress` — los cinco criterios cerrados en código; faltan los dos buckets privados en `minio` y las variables `S3_*` |
| DU-01 | DU | Acceso, sesión y recuperación por los tres métodos | M0-B | FU-06, FU-07, FU-08 · F.2-2, F.2-3 | `in_progress` — criterios 2, 4, 5, 6, 7, 8 y 9 cerrados; 1 y 3 esperan F.2-2 y F.2-3 |
| ━━━ | ━━━ | **▼ M1-A · CAPA PÚBLICA: COMPUERTAS, COMPONENTES Y ARMAZÓN** | ━━━ | ━━━ | ━━━ |
| FU-01 | FU | Copy maestro bilingüe — compuerta única de aprobación | M1-A | FU-03 · SLG_Overhauling | `in_progress` — **74 registros con copy redactado y cero `[PENDIENTE]`**, marcados `copy: temporal` (**D-75**). **Ya no bloquea M1-A.** Falta la firma de Ricardo y cuatro enumeraciones literales |
| FU-10 | FU | Sistema de componentes C.5 con prototipo interactivo aprobado | M1-A | FU-02 | `done` — los trece criterios cerrados. **Compuerta aprobada por Ricardo el 2026-09-12** |
| DU-02 | DU | Armazón público: navegación, sheet móvil, pie y conmutador de idioma | M1-A | FU-03, FU-10 | `done` — los siete criterios cerrados y verificados sobre el servidor real |
| DU-03 | DU | Portada (Home) ES/EN | M1-A | FU-01, FU-10, DU-02 | `done` — los siete bloques de RF-09 en orden, verificado sobre el HTML; Lighthouse móvil medido: 96/100/100/100 |
| ━━━ | ━━━ | **▼ M1-B · CAPA PÚBLICA: PÁGINAS** | ━━━ | ━━━ | ━━━ |
| DU-04 | DU | Overviews de rama (`/ai`, `/ai/academy`, `/ai/enterprise`, `/ai/factory`) | M1-B | DU-03 | `done` — los cuatro en los dos idiomas; cada uno enlaza a todos sus servicios y a ninguno ajeno |
| DU-05 | DU | Las once páginas de servicio (contrato A.3) | M1-B | DU-04 | `done` — las 22 páginas con las seis secciones en orden fijo y un solo CTA |
| DU-06 | DU | Autoridad y legales: Doctrina, Nosotros y `/legal/*` | M1-B | DU-04 · F.2-1 | `done` — legales en `/legal/*`, públicas y sin sesión; doctrina desde su colección |
| DU-07 | DU | SEO técnico, 404/500 y cierre de los gates D1–D6 | M1-B | DU-03, DU-04, DU-05, DU-06 | `pending` |
| ━━━ | ━━━ | **▼ M2 · CONVERSIÓN Y CONTENIDO** | ━━━ | ━━━ | ━━━ |
| FU-11 | FU | Anti-abuso propio: límite, honeypot y dominios gratuitos | M2 | FU-04, FU-05 | `pending` |
| DU-08 | DU | Biblioteca de descargas, formulario de captura y entrega firmada | M2 | FU-09, FU-11, DU-05 | `pending` |
| DU-09 | DU | Captura al CRM: adaptador de dos modos, cola y aviso | M2 | FU-08, DU-08 · F.2-5 · S-01 | `pending` |
| DU-10 | DU | Contacto y solicitud del documento completo de Doctrina | M2 | DU-06, DU-09 | `pending` |
| DU-11 | DU | Blog: índice, artículo, etiquetas, RSS y borradores | M2 | FU-03, DU-02 | `done` — ocho rutas prerrenderizadas en los dos idiomas; 33 comprobaciones sobre el servidor real |
| DU-12 | DU | Webhooks salientes firmados y analítica privacy-first | M2 | DU-09, DU-11 | `pending` |
| ━━━ | ━━━ | **▼ M3 · HQ (INTRANET SLG)** | ━━━ | ━━━ | ━━━ |
| FU-12 | FU | Shell de aplicación para HQ y portal | M3 | FU-06, FU-10 | `pending` |
| DU-13 | DU | Tablero de HQ | M3 | FU-12, DU-09, DU-11 · F.2-5 | `pending` |
| DU-14 | DU | Empresas, proyectos, usuarios e invitaciones | M3 | FU-07, DU-13 | `pending` |
| DU-15 | DU | Entregables y avisos | M3 | FU-09, DU-14 | `pending` |
| DU-16 | DU | Capturas web: lista, detalle de intentos y reintento manual | M3 | DU-09, DU-13 · ~~spec-delta del `data_model`~~ ✅ **CF-1 resuelto por D-50** (`crm_delivery.cycle`, ya construido en FU-04) | `pending` |
| DU-17 | DU | Claves de API y registro de auditoría | M3 | FU-06, DU-14 | `pending` |
| ━━━ | ━━━ | **▼ M4 · PORTAL DE CLIENTES** | ━━━ | ━━━ | ━━━ |
| FU-13 | FU | Batería de pruebas de aislamiento entre empresas | M4 | FU-04, FU-06, DU-15 | `pending` |
| DU-18 | DU | Inicio del portal con avisos | M4 | FU-12, FU-13, DU-15 | `pending` |
| DU-19 | DU | Proyectos, entregables y visor aislado | M4 | DU-18 · nombre del subdominio del visor (origen separado, D-45) | `pending` |
| DU-20 | DU | Materiales de programa | M4 | DU-19 | `pending` |
| DU-21 | DU | Miembros, perfil y paso «Agenda tu Sesión Cero» | M4 | FU-07, DU-18 · F.2-6 | `pending` |
| ━━━ | ━━━ | **▼ M5 · API PARA AGENTES Y GO-LIVE** | ━━━ | ━━━ | ━━━ |
| DU-22 | DU | API v1 de lectura: clave, alcances, límites y auditoría | M5 | FU-06, DU-17, DU-19 · `api_contracts` | `pending` |
| DU-23 | DU | API v1 de escritura y especificación OpenAPI | M5 | DU-22 | `pending` |
| FU-14 | FU | Copias de seguridad cifradas a destino externo y restauración probada | M5 | FU-05 | `pending` |
| DU-24 | DU | README operativo y prueba de Literacy | M5 | DU-11, DU-14, DU-17, FU-14 | `pending` |
| DU-25 | DU | Go-live: contenido, DNS raíz, monitor y auditoría final | M5 | todas las anteriores | `pending` |

---

## Dependencias externas (no son unidades)

Corren **en paralelo a M0** y se revisan al cerrar cada milestone. Detalle completo en
`implementation/user_units.md` §1.

| # | Dependencia externa | Bloquea | Estado |
|---|---|---|---|
| F.2-1 | Texto legal de privacidad y términos | DU-06 · activación de formularios en producción (DU-08, DU-10, DU-25) | `pending` |
| F.2-2 | Consentimiento OAuth de Google + credencial | DU-01 (método Google) · gate D8 | `pending` |
| F.2-3 | Registro de aplicación en Microsoft Entra ID | DU-01 (método Microsoft) · DoD #5 (DU-21, FU-13) | `pending` |
| F.2-4 | Dominio de correo verificado (SPF/DKIM/DMARC) sobre subdominio de envío dedicado | FU-08 → FU-07, DU-01, DU-09 | `pending` |
| F.2-5 | Dos claves de API del CRM + ruta de la ficha de contacto | DU-09, DU-13, DU-16 | `pending` |
| F.2-6 | URL del calendario de «Agenda tu Sesión Cero» | DU-21 (degrada a «próximamente» si falta) | `pending` |
| EXT-1 | 11 documentos de descarga (D-01…D-11) y copy maestro, producidos en SLG_Overhauling | FU-01 · DU-08 (no bloquea go-live: publica «disponible próximamente») | `pending` |
| EXT-2 | Logo de SLG Agency (SVG + PNG), favicon e imagen Open Graph | FU-02 (wordmark provisional) · DU-07 (Open Graph) | `pending` |
| EXT-3 | Elección de producto en la categoría de correo transaccional | FU-08 | `done` — **Resend** (D-22), dentro de la categoría de D-15. El adaptador sigue hablando SMTP estándar |
| EXT-4 | Elección de producto en la categoría de object storage externo de backups | FU-14 | `done` — **Cloudflare R2** (D-21), dentro de la categoría de D-20. El script sigue escrito contra API S3 genérica |
| EXT-5 | Los cinco `design_docs` que el perfil exige | FU-04, FU-09, DU-22, DU-23 | `done` — los cinco existen: `data_model` (HIGH), `api_contracts` (HIGH), `ui_wireframes` (MEDIUM), `architecture` (MEDIUM), `style_guide` (LIGHT). El bloqueo queda levantado |
| EXT-6 | Dirección remitente visible (**P-3**) y nombre del subdominio de envío (**P-4**) | FU-08 | ✅ **Cerrada (2026-09-12)**: `no-reply@mailweb.softlandingglobal.com` sobre `mailweb.softlandingglobal.com`, con `support@softlandingglobal.com` como `Reply-To`. El brief §5.1 y RF-117 quedan desactualizados en ese punto |
| EXT-7 | Elección del **producto** de monitorización externa. La **categoría está cerrada por D-43** —servicio de uptime dedicado con tramo gratuito, ejecutado **fuera del VPS**, que vigila al menos `softlandingglobal.com` y `staging.softlandingglobal.com` y avisa por un canal que no depende del VPS— y con ella P-5, RF-130 y el gate D11; n8n queda como monitor **secundario** por correr en el mismo VPS que vigila | FU-05 (cierre) · DU-25 (verificación) | ✅ **Cerrada: UptimeRobot (D-49)** |
| EXT-8 | Nombre del **subdominio del visor de entregables**, sub-decisión abierta de **D-45** (el origen separado ya es norma; lo único abierto es el nombre) | DU-19 | `pending` — se fija en **M4**, antes de DU-19 |
| EXT-9 | **Cron de validación en Hermes Agent** (D-46): ejecuta `/review` por milestone, corre las pruebas E2E en contenedor y recuerda compuertas. Vive **fuera de este repositorio**; consume el CI de FU-05 y, tras M5, `POST /api/v1/events` | — (mitiga R-16; no bloquea ninguna unidad) | Configurar en Hermes |

## Acción previa de Ricardo (no es una unidad)

| # | Acción | Bloquea | Estado |
|---|---|---|---|
| S-01 | Verificación de higiene de credenciales antes de cargar variables de producción (Anexo G); se sigue fuera del repositorio | FU-05 | **Diferida a go-live** por decisión de Ricardo (D-49/S-01). No bloquea FU-05: la credencial afectada es de construcción, no de producción. |

---

## Registro

- `2026-09-08` — Poblado en el paso 7 de `init-project` a partir de `implementation/user_units.md`.
  39 unidades (14 FU + 25 DU) en 8 milestones (M0 y M1 subdivididos), **todas en `pending`**.
  12 dependencias externas y 1 acción previa de Ricardo listadas aparte. Ninguna unidad se ejecuta
  hasta que el plan esté aprobado (AGENTS.md Regla 1).
- `2026-09-08` — Sincronizado con `docs/decision_log.md` **D-21…D-24** y con el **cierre de la fase de
  diseño** (los cinco `design_docs` producidos), AGENTS.md Regla 6. Cambios: **EXT-3** cerrada por
  D-22 (Resend), **EXT-4** cerrada por D-21 (Cloudflare R2) y **EXT-5** cerrada porque los cinco
  `design_docs` existen — con ella se levanta el bloqueo declarado sobre **FU-04, FU-09, DU-22 y
  DU-23**. **DU-16** suma como condición de entrada el spec-delta del `data_model` (conflicto del
  reintento manual, `design_summary` §2 CF-1). Siguen abiertas **EXT-6** (dirección remitente
  definitiva: sub-decisiones P-3 y P-4 de D-24, se fijan en M0) y **S-01**. El estado de las 39
  unidades no cambia: todas siguen en `pending`.
- `2026-09-08` — Sincronizado con `docs/decision_log.md` **D-43, D-44 y D-45** (AGENTS.md Regla 6).
  Añadidas dos dependencias externas: **EXT-7**, elección del **producto** de monitorización externa
  —la **categoría** ya está cerrada por D-43 y con ella P-5, RF-130 y el gate D11; el producto se
  elige con 2–3 candidatos antes de **FU-05** y **no bloquea el arranque** ni la aprobación del plan,
  con n8n como monitor **secundario** por vivir en el mismo VPS que vigila—; y **EXT-8**, nombre del
  **subdominio del visor de entregables**, sub-decisión abierta de D-45 que se fija en **M4** antes de
  **DU-19** (el origen separado en sí ya es norma, no está en discusión). En consecuencia, **FU-05**
  suma EXT-7 y **DU-19** suma el subdominio del visor a su columna «Depende de». **D-44** (anillo de
  foco de dos capas) **no añade dependencia externa**: es token de FU-02 y verificación de FU-10, ambas
  ya listadas. El estado de las 39 unidades no cambia: todas siguen en `pending`.

- `2026-09-08` — **D-46**: el cron de validación de Hermes Agent se registra como **EXT-9**, dependencia
  externa, **no como unidad**. Hermes asume las compuertas delegables (`/review` por milestone, pruebas
  E2E en contenedor, recordatorio de compuertas con su paquete de decisión); el Planning Gate, la
  compuerta de copy FU-01 y las elecciones de producto siguen siendo de Ricardo por gobernanza.
  **Las 39 unidades no cambian**: §5.3 del brief mantiene «Hermes como validador» en *previsto, no se
  construye*, y el cron vive fuera de este repositorio consumiendo el CI de FU-05 y, tras M5,
  `POST /api/v1/events`. Efecto: **R-16 baja de Alta/Alto a Media/Medio**.

- `2026-09-08` — **D-49**: UptimeRobot elegido como monitorización externa. **EXT-7 cerrada**, y con
  ella la última elección de producto del proyecto. **S-01 diferida a go-live** por decisión de
  Ricardo: la credencial afectada es de construcción, no de producción, así que no bloquea FU-05.
  La condición que hace aceptable el aplazamiento —no reutilizar esa credencial en ningún entorno
  desplegado, y rotar antes del go-live— queda registrada en `docs/decision_log.md`.
  **FU-05 queda desbloqueada.**

- `2026-09-12` — **FU-05 pasa a `in_progress`.** Construido y verificado en el repositorio: el
  pipeline (`.github/workflows/ci.yml`, 4 jobs), los seis frenos del criterio 4 con su **prueba
  negativa ejecutada** (`npm run check:brakes`), las cabeceras de seguridad y la compuerta de staging
  comprobadas **sobre el servidor real** (`npm run check:runtime`, 19 comprobaciones), el gate de
  `.env.example` y los scripts de DNS. **Criterios 5, 6, 7 y 9 cerrados.** Criterios 1, 2, 3 y 8
  pendientes de infraestructura, con procedimiento paso a paso en `docs/deployment.md`.
  Registradas **D-47…D-51** en `docs/decision_log.md`: D-47, D-48 y D-49 estaban citadas en este
  tracker y en el `work_log` **sin entrada**, y D-50 (`crm_delivery.cycle`) no tenía número.
  Efecto en el plan: **DU-16 deja de depender de un spec-delta del `data_model`** — CF-1 quedó
  resuelto por D-50 y la vía está construida desde FU-04.

- `2026-09-12` — **Defecto corregido, no unidad:** las migraciones `0001`, `0002` y `0003` no estaban
  declaradas en `drizzle/meta/_journal.json` y **ningún despliegue las aplicaba**: producción habría
  nacido sin row level security, sin el rol `slg_app` y sin la política de auditoría. Registradas y
  verificadas contra PostgreSQL real (19 tablas, 10 políticas, 29 comprobaciones en verde). Freno
  nuevo `check:migrations` con prueba negativa; el pipeline pasa a **siete** frenos.
  **FU-04 sigue `done`**: su resultado era cierto, lo que faltaba era el camino que lleva a él.
- `2026-09-12` — **FU-06 arrancada** (sigue `pending` hasta que cierre): migración `0004_identidad`
  aplicada y verificada —columnas de Better Auth y la función `app_memberships_de_usuario`, única vía
  para resolver la pertenencia durante el inicio de sesión sin abrir las ocho tablas bajo RLS—, y
  `lib/auth/` con la matriz B.3 como datos y su aplicación en servidor.
- `2026-09-12` — **FU-06 `done`.** Módulo de identidad en `lib/auth/`, con los siete criterios
  verificados: la frontera del módulo como freno de CI (criterio 1 deja de depender de una revisión),
  la matriz B.3 recorrida entera (60 celdas), los seis alcances probados contra las 15 acciones
  (RF-147), y `/hq` y `/portal` devolviendo 404 con sesión válida mientras M3 y M4 sigan abiertos
  (RF-87). Registradas **D-52** (no se usa el plugin `apiKey`, desviación declarada), **D-53**
  (funciones `SECURITY DEFINER` estrechas) y **D-54** (`invitation.token_hash` opcional).
  Cuatro defectos corregidos, tres anteriores a la unidad — el más grave: las dos constructoras del
  `AuthContext` lanzaban `ReferenceError` al llamarlas, y nadie las había llamado nunca.
- `2026-09-12` — **FU-08 `in_progress`.** `lib/mail/` construido y verificado: el puerto de una sola
  operación, el adaptador SMTP, las cuatro plantillas en dos idiomas y la cola con espera creciente.
  **Criterios 1, 2, 5 y 7 cerrados**; el 2 demostrado corriendo la suite entera contra **dos
  servidores SMTP distintos** solo con variables de entorno. Registradas **D-55** (desaparece la
  variable con nombre de producto: `api_contracts` §11.3 dice que su ausencia es la decisión) y
  **D-56** (los correos con enlace no se reintentan; reintentar es reemitir). **P-3 y P-4 siguen
  abiertas**, con propuesta escrita en `decision_log`: `mailweb.softlandingglobal.com` y
  `no-reply@mailweb.softlandingglobal.com`.
- `2026-09-12` — **FU-07 `done`.** Servicio de invitaciones con los cinco criterios verificados contra
  PostgreSQL y SMTP reales (34 comprobaciones). Tres hallazgos: las invitaciones **no se escriben como
  sistema** —la política de fila las rechaza, y tenía razón: ahora se escriben con el contexto de quien
  invita y la política hace cumplir la pertenencia sola—; `membership.org_role` guarda el rol de B.3 y
  no el vocabulario del plugin (**D-59**); y `@/lib/auth` solo cargaba dentro de Next hasta que el
  import de `next/headers` pasó a ser dinámico. Registradas **D-57**, **D-58** y **D-59**.
  **EXT-6 cerrada**: P-3 y P-4 fijadas por Ricardo.
- `2026-09-12` — **FU-09 `in_progress`.** `lib/files/` con los cinco criterios cerrados en código y
  **39 comprobaciones** contra un servidor que verifica la firma SigV4. Defecto corregido: las
  caducidades de `upload` y `deliverable` estaban **intercambiadas** respecto a `api_contracts` §11.9
  —el entregable del portal habría vivido el triple de lo especificado— y ahora se leen de
  configuración con tope duro (**D-60**). Lista de MIME de `material` cerrada sin ejecutables, sin
  comprimidos y sin SVG (**D-61**). Falta que Ricardo cree los dos buckets privados en `minio`.
  El pipeline pasa a **diez** frenos.
- `2026-09-12` — **DU-01 `in_progress`.** Pantallas de acceso, recuperación, restablecimiento y
  aceptación de invitación, con **39 comprobaciones** contra el servidor real. **Hallazgo grave: el
  registro público estaba abierto** —`POST /api/auth/sign-up/email` de la librería permitía darse de
  alta en un sitio solo por invitación—; cerrado con 404 en el middleware y sustituido por la vía de
  la invitación (**D-62**). Registradas **D-63** (el canje verifica el correo) y **D-64** (pantalla
  propia de restablecimiento, y cierre de todas las sesiones al cambiar la contraseña). Los criterios
  1 y 3 esperan **F.2-2 y F.2-3**, con paso a paso en `docs/deployment.md` §4quater.
- `2026-09-12` — **FU-01 `in_progress`, compuerta ABIERTA.** De 7 registros de contenido a **71**: las
  once páginas de servicio con los seis bloques del contrato A.3, los overviews de rama, las páginas
  de utilidad y los once documentos, **todo en los dos idiomas**. **El copy NO se escribió**, y es
  deliberado: son afirmaciones sobre una empresa real y el criterio 3 exige dato verificado; la fuente
  es `SLG_Overhauling`, fuera de este repositorio. Freno nuevo `check:copy` (**D-65**) para los
  criterios 3 y 4. **Mientras la compuerta siga abierta, ninguna DU de página es construible** y
  `main` rechaza los marcadores. Lo construible en paralelo es **FU-10**, que no depende del copy.
- `2026-09-12` — **FU-10 `in_progress`, compuerta ABIERTA.** Los **nueve componentes de C.5** con el
  formulario de descarga primero (**D-67**), el contrato de movimiento de C.4 partido entre
  `app/motion.css` y `lib/design/motion.ts`, y `/prototipo` sirviéndolos todos. La revisión «cuadro a
  cuadro» del gate D3 deja de ser manual y pasa a ser un **freno ejecutable** con navegador real
  (**D-70**): el proyecto va por **trece frenos**. En su primera ejecución encontró tres defectos que
  ningún análisis estático podía ver: **la hidratación no ocurría en todo el sitio** por la CSP
  (**D-68**), el sheet **ignoraba la velocidad del dedo** al cerrar y la velocidad **no caducaba**
  (**D-69**). Corregidas de paso las cifras de contraste obsoletas del `style_guide` (**D-66**).
  **Falta solo la aprobación de Ricardo**, con el paso a paso en `docs/work_log.md`.
- `2026-09-12` — **FU-10 `done`**: compuerta aprobada por Ricardo. **DU-02 `done`**: el armazón
  público sobre las **29 rutas**. Tres destinos del menú no existían y se crearon con las rutas
  canónicas de `ui_wireframes` §1.1 (**D-71**). **Hallazgo grave: los frenos barrían solo lo
  versionado**, así que FU-10 pasó en verde contra sus propios archivos sin `git add` y el CI habría
  fallado en el primer push (**D-74**). Corregido en los cinco frenos, más dos defectos que eso
  destapó en `check:motion`. Frenos nuevos: `check:cadenas` y `check:armazon` — van **quince**.
- `2026-09-13` — **Copy maestro temporal (D-75)**: 74 registros redactados contra el brief y
  `knowledge/`, **cero `[PENDIENTE]` en todo el contenido**, cada uno marcado `copy: temporal` y
  listado por `check:copy`. **FU-01 deja de bloquear M1-A.** **DU-11 `done`**: blog completo —índice,
  artículo, etiquetas y RSS en los dos idiomas— con un borrador permanente en el repositorio
  (**D-78**) porque el criterio 2 pasó en verde sin tener ningún borrador que comprobar. Freno nuevo
  `check:blog` con su prueba negativa: van **dieciséis**.
- `2026-09-13` — **DU-03, DU-04 y DU-05 `done`**: la capa pública completa. **58 rutas**, las 67
  páginas prerrenderizadas. La tabla de rutas pasa a ser explícita y adopta el anidamiento del Anexo
  A.2 (**D-79**); `/holdings` lo sirve el registro de servicio y se retira el de página (**D-80**); el
  orden de los bloques vive en el `.md` y se comprueba sobre el HTML (**D-81**). **Lighthouse móvil
  medido ya** (R-21): 96/98/93 de rendimiento y **100 de accesibilidad en las tres páginas**. Frenos
  nuevos `check:paginas` y `check:lighthouse`: van **diecisiete**.
- `2026-09-13` — **DU-06 y FU-11 `done`; DU-07 y DU-08 casi**. La capa pública completa: **78
  rutas**. SEO técnico con `hreflang` recíproco verificado (220 comprobaciones), 404 y 500 propias,
  anti-abuso de tres capas sin un script de terceros, y la máquina de descargas probada contra
  PostgreSQL real. **El navegador encontró lo que ningún test veía**: la portada salía en blanco bajo
  el hero porque el reveal se escondía por defecto (**D-84**). Frenos nuevos `check:seo` y
  `check:lighthouse`: van **dieciocho**.
