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
Hoy **todas** están en `pending`: la Compuerta de Planificación (AGENTS.md Regla 1) sigue cerrada y no
se ha producido ningún entregable.

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

**Estado global:** 35 `pending` · **1 `in_progress`** (FU-05, mitad de agente hecha y **R-40 resuelto por D-50**) · 0 `blocked` · 0 `review` · **3 `done`** (FU-02, FU-03, FU-04 · 2026-09-08). **M0-A completo salvo FU-05**, ya desbloqueada (EXT-7 cerrada por D-49; S-01 diferida a go-live). Solo queda la mitad de Ricardo: cargar las credenciales de staging en Easypanel, push a `develop`, verificar y pausar los monitores de raíz/`www` en UptimeRobot — detalle en `docs/project_memory.md`.

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
| FU-05 | FU | Despliegue, CI, DNS y documentación de entorno | M0-A | FU-02, FU-03, FU-04 · EXT-7 ✅ (D-49) | `in_progress` |
| ━━━ | ━━━ | **▼ M0-B · FUNDACIONES: IDENTIDAD Y SERVICIOS COMPARTIDOS** | ━━━ | ━━━ | ━━━ |
| FU-06 | FU | Módulo de identidad y autorización | M0-B | FU-04, FU-05 | `pending` |
| FU-07 | FU | Servicio de invitaciones | M0-B | FU-06, FU-08 | `pending` |
| FU-08 | FU | Adaptador de correo transaccional | M0-B | FU-05 · F.2-4 | `pending` |
| FU-09 | FU | Almacenamiento de archivos y URLs firmadas | M0-B | FU-05 · `api_contracts` | `pending` |
| DU-01 | DU | Acceso, sesión y recuperación por los tres métodos | M0-B | FU-06, FU-07, FU-08 · F.2-2, F.2-3 | `pending` |
| ━━━ | ━━━ | **▼ M1-A · CAPA PÚBLICA: COMPUERTAS, COMPONENTES Y ARMAZÓN** | ━━━ | ━━━ | ━━━ |
| FU-01 | FU | Copy maestro bilingüe — compuerta única de aprobación | M1-A | FU-03 · SLG_Overhauling | `pending` |
| FU-10 | FU | Sistema de componentes C.5 con prototipo interactivo aprobado | M1-A | FU-02 | `pending` |
| DU-02 | DU | Armazón público: navegación, sheet móvil, pie y conmutador de idioma | M1-A | FU-03, FU-10 | `pending` |
| DU-03 | DU | Portada (Home) ES/EN | M1-A | FU-01, FU-10, DU-02 | `pending` |
| ━━━ | ━━━ | **▼ M1-B · CAPA PÚBLICA: PÁGINAS** | ━━━ | ━━━ | ━━━ |
| DU-04 | DU | Overviews de rama (`/ai`, `/ai/academy`, `/ai/enterprise`, `/ai/factory`) | M1-B | DU-03 | `pending` |
| DU-05 | DU | Las once páginas de servicio (contrato A.3) | M1-B | DU-04 | `pending` |
| DU-06 | DU | Autoridad y legales: Doctrina, Nosotros y `/legal/*` | M1-B | DU-04 · F.2-1 | `pending` |
| DU-07 | DU | SEO técnico, 404/500 y cierre de los gates D1–D6 | M1-B | DU-03, DU-04, DU-05, DU-06 | `pending` |
| ━━━ | ━━━ | **▼ M2 · CONVERSIÓN Y CONTENIDO** | ━━━ | ━━━ | ━━━ |
| FU-11 | FU | Anti-abuso propio: límite, honeypot y dominios gratuitos | M2 | FU-04, FU-05 | `pending` |
| DU-08 | DU | Biblioteca de descargas, formulario de captura y entrega firmada | M2 | FU-09, FU-11, DU-05 | `pending` |
| DU-09 | DU | Captura al CRM: adaptador de dos modos, cola y aviso | M2 | FU-08, DU-08 · F.2-5 · S-01 | `pending` |
| DU-10 | DU | Contacto y solicitud del documento completo de Doctrina | M2 | DU-06, DU-09 | `pending` |
| DU-11 | DU | Blog: índice, artículo, etiquetas, RSS y borradores | M2 | FU-03, DU-02 | `pending` |
| DU-12 | DU | Webhooks salientes firmados y analítica privacy-first | M2 | DU-09, DU-11 | `pending` |
| ━━━ | ━━━ | **▼ M3 · HQ (INTRANET SLG)** | ━━━ | ━━━ | ━━━ |
| FU-12 | FU | Shell de aplicación para HQ y portal | M3 | FU-06, FU-10 | `pending` |
| DU-13 | DU | Tablero de HQ | M3 | FU-12, DU-09, DU-11 · F.2-5 | `pending` |
| DU-14 | DU | Empresas, proyectos, usuarios e invitaciones | M3 | FU-07, DU-13 | `pending` |
| DU-15 | DU | Entregables y avisos | M3 | FU-09, DU-14 | `pending` |
| DU-16 | DU | Capturas web: lista, detalle de intentos y reintento manual | M3 | DU-09, DU-13 · spec-delta del `data_model` aprobado (conflicto del reintento manual, `design_summary` §2 CF-1) | `pending` |
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
| EXT-6 | Dirección remitente visible (**P-3**) y nombre del subdominio de envío (**P-4**), sub-decisiones abiertas de D-24; el brief §5.1 y RF-117 quedan desactualizados en ese punto | FU-08 | `pending` — se fijan en **M0**, antes de FU-08 |
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
