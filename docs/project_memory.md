---
type: docs
title: Project memory
project: slg_website
status: planning
timestamp: 2026-09-08
---

# Project memory — slg_website

## Current state
- **Phase**: **ejecución** (`start-execution`). `init-project` cerrado en sus 10 pasos; preflight OK.
- **active_profile**: `software-app` (`profiles/software-app/profile.md`) — decidido en **D-14**.
  - Extensiones declaradas en el brief, no en el perfil: gates de marketing, identidad y API (Anexo D).
  - Regla del perfil que aplica: superficie de administración/operaciones (HQ lo es).
- **Contrato de entrada**: `START_PROJECT.md` v1.1 (`type: project-brief`), fase *Specify* de SDD.
- **Plan approved**: **SÍ** — Ricardo, 2026-09-08. La **Compuerta de Planificación queda abierta**.

## Qué está escrito

**Los cinco `design_docs` existen.** Ninguno falta:

| Documento | Líneas | Nivel |
|---|---:|---|
| `design_docs/data_model.md` | 1981 | HIGH |
| `design_docs/api_contracts.md` | 1853 | HIGH |
| `design_docs/ui_wireframes.md` | 1221 | MEDIUM |
| `design_docs/architecture.md` | 1035 | MEDIUM |
| `design_docs/style_guide.md` | 372 | LIGHT |

Su consolidación vive en `design_docs/design_summary.md`: 18 decisiones a registrar (D-25…D-42, ya
transcritas al `decision_log`), 8 conflictos —**dos ya resueltos** por D-44 y D-45— y 26 huecos con
dueño y milestone.

**Unidades de trabajo: 39** — **14 Foundation Units** + **25 Deliverable Units**, definidas en
`implementation/user_units.md` y seguidas en `implementation/task_tracker.md`. **Las 39 están en
`pending`**: no se ha producido ningún entregable. Reparto por milestone: M0-A 4 · M0-B 5 · M1-A 4 ·
M1-B 4 · M2 6 · M3 6 · M4 5 · M5 5.

**Bundle OKF montado**: `knowledge/` con `index.md` (divulgación progresiva, se carga en todas las
sesiones), `log.md` y los **siete conceptos** (`method-sdd-icm`, `naming-rules`, `offer-structure`,
`content-schema`, `brand-tokens`, `crm-integration`, `doctrine-summary`).

## Última unidad completada
- FU-04 (capa de datos) · 2026-09-08. FU-05 sigue `in_progress`, no se cuenta como completada.

## Próxima unidad
**FU-05 está `in_progress`.** De los 9 criterios de aceptación, quedan dos abiertos, y los dos son de
Ricardo — ninguno de código.

**Hecho por el agente, todo verificado, no solo escrito:**
- `Dockerfile`, `/api/health`, cabeceras de seguridad (criterio 7, con prueba explícita de CSP
  `frame-ancestors 'none'` y HSTS, no solo "existe una CSP").
- `.env.example` con todos los nombres, cero valores.
- Pipeline de CI con los seis frenos y sus pruebas negativas (criterios 4 y 5).
- `setup-app-role.ts`, protección de staging (`middleware.ts` + `test-staging-auth.ts`).
- **Gate D1 por Lighthouse** (D-50): reemplaza el presupuesto de KB. Tuvo un hallazgo serio —
  `check-lighthouse.ts` medía bien pero **colgaba el pipeline 3h39m** en el runner real de GitHub por
  un proceso huérfano de `next-server`; corregido (spawn `detached` + matar el grupo + `process.exit`
  de respaldo) y **reconfirmado en verde en GitHub** (1m22s, no solo en local).
- **Criterio 2 (R-20)**: `main` protegida — Pull Request y los dos checks de CI en verde, obligatorios,
  sin `push` directo. Confirmado con Ricardo antes de aplicarlo.
- **Criterio 3 (R-25)**: DNS verificado por consulta directa — los diez intocables intactos, `staging`
  y `minio` resuelven bien.

**Pendiente de Ricardo — guía actualizada en el artifact `Puesta en marcha M0-A`:**
1. **Crear el servicio de producción `slg-web` en Easypanel** (rama `main`, dominio
   `softlandingglobal.com` sin DNS todavía — no publica nada al público, solo prueba el mecanismo).
   Sin este servicio, los criterios 1 y 2 no se pueden dar por completamente cerrados. **Ojo con
   R-42**: la base de datos de producción tiene que llevar un **nombre distinto** al que quedó en
   staging dentro del mismo `slgwebpostgres` — si no, los dos entornos comparten datos.
2. **Criterio 8**: provocar una caída una vez y confirmar que UptimeRobot avisa por el canal fuera del
   VPS. No se puede simular desde aquí.
3. Menor, no bloquea hasta FU-09: los dos cubos de MinIO (`downloads`, `deliverables`) — **D-51**: la
   app usará `MINIO_ROOT_USER`/`PASSWORD` directamente (R-41, revisar antes del go-live), porque el
   Console gratuito ya no deja crear una clave acotada desde la web.

## R-40 resuelto — D-50 (2026-09-09)
**Ya no bloquea el cierre de FU-05.** El gate D1 y el stack elegido eran incompatibles: el suelo de
React 19 + Next 16 App Router son 172,3 KB comprimidos en una página vacía, con cero librerías
propias, contra un presupuesto de 150 KB — pese a que Lighthouse ya daba 98/100/92/100. **Ricardo
eligió la salida (a)**: el gate D1 pasa a medirse por Lighthouse en CI (≥ 90 en las cuatro categorías,
LCP < 2,5 s — RNF-01, RNF-02); RNF-03 (el presupuesto de KB) queda retirada. Implementado en
`scripts/ci/check-lighthouse.ts` con prueba negativa en `test-lighthouse-gate.ts` (R-26), verificado
en verde contra el build real (Performance 100 · Accesibilidad 100 · Best Practices 92 · SEO 100 ·
LCP 1,6 s). Detalle completo en `docs/decision_log.md` D-50 y `docs/work_log.md` (entrada del 09-09).
Solo mide Home hoy; DU-07 añade una página de servicio y un artículo cuando existan.

## Nota de higiene
`docs/MANANA.md` (notas de cierre de la sesión del 08 al 09) queda **consolidado en este archivo** y
puede borrarse: mantenerlo por separado invita a que ambos diverjan, que es justo lo que había pasado
—daba por pendientes tareas de infraestructura que ya estaban hechas—.

## Entorno local
- `docker-compose.yml` levanta `slg-db` (PostgreSQL 16) en el **puerto 5434**. El 5432 lo ocupa la base
  de datos del CRM y el 5433 otro proyecto: no se tocan.
- Credenciales en `.env`, ignorado por git. `.env.example` documenta solo los nombres.
- Migraciones en `drizzle/`: `0000_inicial.sql` generada, `0001_restricciones_aislamiento.sql` escrita
  a mano (drizzle-kit no genera políticas de fila ni disparadores).

## Stack: cerrado
Todas las categorías están decididas por Ricardo en HITL. El detalle y la justificación de cada
elección viven en `docs/decision_log.md` (D-21 a D-24 y D-43 a D-45).

- **Correo transaccional: Resend** (D-22), tras adaptador SMTP por variable de entorno (D-36).
- **Backups: Cloudflare R2** (D-21), contra API S3 genérica.
- **Correo corporativo: se queda en Microsoft 365** (D-23). No hay migración; los MX de Outlook no se tocan.
- **Subdominio de envío dedicado** (D-24): el SPF de la raíz no se toca.
- **Monitorización externa** (D-43): servicio de uptime dedicado con tramo gratuito, ejecutado
  **fuera del VPS** — n8n vive en la misma máquina que vigilaría, así que queda como señal
  **secundaria**. Cierra P-5, RF-130 y el gate D11. Falta elegir el producto concreto (2–3 candidatos,
  paso 5) antes de FU-05; **no bloquea el arranque**.
- **Anillo de foco de dos capas** (D-44): exterior `--cyan`, interior `--blue-primary` o `--ink`.
  El cyan solo mide 2,4:1 y no pasaba el gate D2. Token en FU-02, verificado en FU-10.
- **Visor de entregables HTML desde origen separado** (D-45), normativo. El `iframe sandbox` y la
  CSP estricta se mantienen como defensa en profundidad. Se construye en DU-19.

Nombrar **Resend** y **Cloudflare R2** **no** viola la Regla 7: la regla prohíbe nombrar productos
que el usuario **no** haya elegido, y estos los eligió él el 2026-09-08.

## Decisiones fijadas (no re-explorar)
- **13 decisiones HITL** de Ricardo sobre stack y hosting (`START_PROJECT.md` §7 y §10).
- **D-14…D-24**: perfil, categorías de stack, anti-abuso, 11 documentos de descarga, adaptador de dos
  modos al CRM, y las elecciones de producto de Resend, R2, M365 y subdominio de envío.
- **D-43…D-46**: monitorización externa, anillo de foco de dos capas, origen separado del visor, y el
  cron de validación de Hermes (EXT-9). Cierran P-5, CF-3 y CF-4, y bajan R-16 a Media/Medio.
- **D-25…D-42**: las 18 decisiones que tomaron los `design_docs`. Dos de ellas están marcadas
  **[IRREVERSIBLE-TRAS-FU-04]** (D-26 y D-27): revertirlas después de la primera migración es
  migración de datos.
- Dos umbrales que estaban `[PENDIENTE]` **ya están cerrados**: caducidad de URL firmada (RNF-20 →
  **D-28**, 15/10/30 min) y tamaño máximo de subida (RNF-25 → **D-25**, 25/50/5/1 MB, tope 50).
  El bloqueo que `user_units` §0.6 declaraba sobre FU-04, FU-09, DU-22 y DU-23 **se levanta**.
- Todo registrado en `docs/decision_log.md`.

## Blockers
- **Ninguno de planificación.** A1–A5 resueltas (D-15…D-20); P-1 y P-2 cerradas (D-21, D-22).
- **Pendiente de Ricardo, antes de `start-execution`**:
  1. **Aprobar el plan** — la Compuerta de Planificación (Regla 1). Incluye dar por bueno el bloque
     D-25…D-42 ya escrito en el `decision_log`.
  2. **H-04** — `organization.primary_contact`: ¿usuario con `FK` o texto libre? Cambia el tipo de una
     columna **antes** de FU-04, así que conviene resolverlo pronto.
  3. **S-01** — verificación de higiene de credenciales; se sigue **fuera de este repositorio**.
- **Cerradas desde la última revisión**: ~~P-5~~ (D-43) · ~~CF-3, anillo de foco~~ (D-44) ·
  ~~CF-4, origen del visor~~ (D-45). Ninguna debe reabrirse en una sesión futura.
- **Abiertas sin bloquear**: P-3 y P-4 (remitente y nombre del subdominio de envío), se fijan en M0
  antes de FU-08 · el producto concreto de monitorización, antes de FU-05 · confirmar la vía del
  `cycle` (CF-1), antes de DU-16.

## Archivos clave tocados esta sesión
- `planning/`: questions.md, requirements.md, scope.md, risks.md
- `design_docs/`: data_model.md, api_contracts.md, ui_wireframes.md, architecture.md, style_guide.md,
  design_summary.md
- `implementation/`: user_units.md, task_tracker.md
- `knowledge/`: index.md, log.md y los siete conceptos (bundle OKF)
- `docs/`: decision_log.md (D-14…D-49, P-3/P-4, S-01), project_memory.md, work_log.md,
  `infra/dns-estado-anterior.md`
- Código: `app/`, `lib/`, `content/`, `scripts/`, `drizzle/`, `Dockerfile`, `docker-compose.yml`,
  `.github/workflows/ci.yml`
- `mcps/inventory.md`, `skills/inventory.md`
