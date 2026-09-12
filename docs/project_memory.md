---
type: docs
title: Project memory
project: slg_website
status: execution
timestamp: 2026-09-12
---

# Project memory — slg_website

> **Punto de retomada en una línea:** cinco unidades tocadas — FU-02, FU-03, FU-04 y **FU-06**
> `done`; FU-05 `in_progress` esperando el despliegue de Ricardo. La siguiente es **FU-07**
> (invitaciones), que necesita **FU-08** (correo) para entregar.

## Current state
- **Fase**: **ejecución**. Compuerta de Planificación **abierta** (Ricardo, 2026-09-08).
- **active_profile**: `software-app` (`profiles/software-app/profile.md`) — D-14.
- **Contrato de entrada**: `START_PROJECT.md` v1.1, fase *Specify* de SDD.

## Última unidad completada
- **FU-06** — módulo de identidad y autorización (2026-09-12). `lib/auth/` es el único sitio que sabe
  de sesión, rol, empresa y clave. Los siete criterios verificados; la frontera del módulo es un freno
  de CI, no una promesa de revisión. **53 comprobaciones** contra PostgreSQL real y **214** sobre la
  matriz B.3.
- Antes: **FU-04** — capa de datos (2026-09-08). 19 tablas, aislamiento verificado por comportamiento.

## Unidad en curso
- **FU-05** — despliegue, CI, DNS y documentación de entorno. **`in_progress` desde 2026-09-12.**
  - **Cerrado y verificado en el repositorio**: criterios **5, 6, 7 y 9**.
    - Pipeline `.github/workflows/ci.yml`: 4 jobs (gates, escáner de secretos dedicado, datos con
      PostgreSQL real, y la guarda que impide que `main` reciba nada que no haya pasado por `develop`).
    - Los **seis frenos** del criterio 4 con **prueba negativa ejecutada**: `npm run check:brakes`.
    - Cabeceras de seguridad y compuerta de staging comprobadas **sobre el servidor real**, no sobre
      `next.config.ts`: `npm run check:runtime`, 19 comprobaciones.
    - `middleware.ts`: compuerta de staging con comparación en tiempo constante; `/api/health` fuera
      de ella a propósito (D-51).
    - `.env.example`: 42 variables, cero valores, y el gate falla también si el código lee una que no
      está declarada.
    - `scripts/ci/check-dns.sh`: modo línea base y modo verificación, nombre por nombre.
  - **Falta, y es de Ricardo, no de decisión**: criterios **1, 2, 3 y 8** — los cinco servicios de
    Easypanel, los dos webhooks de despliegue, los tres registros DNS nuevos y la prueba de aviso del
    monitor. **Paso a paso completo en `docs/deployment.md`.**

## Próxima unidad
- **FU-07** — servicio de invitaciones (M0-B). Depende de FU-06 (hecha) y **FU-08** (adaptador de
  correo), que a su vez espera a **P-3 y P-4**: dirección remitente y nombre del subdominio de envío.
  Es decir: **el siguiente paso real es fijar P-3 y P-4 y construir FU-08**, no FU-07.

## Lo que hay que saber de `lib/auth/` antes de tocarlo
- **Dos puertas públicas, no una**: `@/lib/auth` (servidor) y `@/lib/auth/edge` (middleware, donde no
  existen ni la instancia ni PostgreSQL). Entrar por un archivo interno rompe el build de CI.
- **La matriz B.3 vive una sola vez**, como datos, en `lib/auth/roles.ts`. Añadir una acción es añadir
  una fila; la prueba la recorre entera y falla si queda una celda sin decidir.
- **Dos funciones `SECURITY DEFINER`** (D-53) son la única vía a `membership` y `api_key` sin contexto
  de empresa. No se amplían: cada una contesta una pregunta.
- **`SUPERFICIES_ABIERTAS`** en `roles.ts` mantiene `/hq` y `/portal` en 404 mientras M3 y M4 sigan
  abiertos (RF-87). Se abren cambiando la constante, no borrando la comprobación.

## Cómo se verifica todo, de un vistazo
| Necesidad | Comando |
|---|---|
| Pipeline entero en local | `npm run check:ci` |
| Que los frenos sigan frenando | `npm run check:brakes` |
| DNS tras cualquier cambio de zona | `npm run check:dns` (antes: `npm run check:dns:baseline`) |
| Aislamiento entre empresas | `npm run test:db` (necesita PostgreSQL) |

## Entorno local
- `docker-compose.yml` levanta `slg-db` (PostgreSQL 16) en el **puerto 5434**. El 5432 lo ocupa la
  base de datos del CRM y el 5433 otro proyecto: no se tocan.
- **Dos roles, dos cadenas de conexión** (D-47): `slg` migra, `slg_app` sirve. Apuntar `DATABASE_URL`
  al dueño **desactiva todo el aislamiento**, y `test:isolation` falla si alguien lo hace.
- Credenciales en `.env`, ignorado por git. `.env.example` documenta solo los nombres.
- Migraciones en `drizzle/`: `0000` generada; `0001`, `0002` y `0003` escritas a mano (drizzle-kit no
  genera políticas de fila ni disparadores).

## Stack: cerrado. Todas las elecciones de producto, hechas
Detalle y justificación en `docs/decision_log.md`. **No se re-exploran.**

- Correo transaccional: **Resend** (D-22), tras adaptador SMTP por variable de entorno (D-36).
- Backups: **Cloudflare R2** (D-21), contra API S3 genérica.
- Correo corporativo: **se queda en Microsoft 365** (D-23). Los MX de Outlook no se tocan.
- **Subdominio de envío dedicado** (D-24): el SPF de la raíz no se toca.
- Monitorización externa: **UptimeRobot** (D-49), fuera del VPS. n8n queda como señal **secundaria**.
- Anillo de foco de dos capas (D-44) · visor de entregables desde **origen separado** (D-45).

## Decisiones fijadas (no re-explorar)
- 13 HITL de Ricardo en `START_PROJECT.md` §7 y §10 · **D-14…D-24** · **D-25…D-42** (las que tomaron
  los `design_docs`; D-26 y D-27 marcadas **[IRREVERSIBLE-TRAS-FU-04]**, y FU-04 ya corrió) ·
  **D-43…D-46** · **D-47…D-51** (ejecución) · **D-52…D-54** (FU-06: sin plugin `apiKey`, funciones
  `SECURITY DEFINER` estrechas, `invitation.token_hash` opcional).

## Blockers
- **Ninguno de decisión.** Lo que falta de FU-05 es acceso a paneles, y tiene runbook.
- **De Ricardo, para cerrar FU-05**: ejecutar `docs/deployment.md` §2 a §5.
- **Abiertas sin bloquear**: **P-3 y P-4** (dirección remitente y nombre del subdominio de envío), se
  fijan en M0 antes de FU-08 · **EXT-8** (nombre del subdominio del visor), antes de DU-19 ·
  **F.2-1…F.2-6**, dependencias externas listadas en el tracker.
- **S-01**: **diferida a go-live** (D-49). La credencial afectada es de construcción, no de
  producción, y **no se reutiliza en ningún entorno desplegado**. La rotación sigue siendo requisito
  de go-live.
- **Cerradas, no reabrir**: ~~P-5~~ (D-43) · ~~CF-3~~ (D-44) · ~~CF-4~~ (D-45) · ~~EXT-7~~ (D-49) ·
  ~~H-04~~ (D-48) · ~~CF-1~~ (D-50, y con ella **DU-16 deja de esperar un spec-delta**).

## Riesgo abierto que conviene mirar antes de FU-10
**El presupuesto de JavaScript va al 89 % con la portada vacía.** 133,9 KB comprimidos de los 150 KB
del gate D1, y son runtime de React 19 más Next 16: no hay nada nuestro que recortar. Cuando entren
DU-03 y FU-10 el margen es de **16 KB**. Decidir antes de FU-10: llevar componentes a Server
Components, o subir el presupuesto con decisión escrita. **Desactivar el gate no es una opción.**

## Migraciones: ocho, y todas declaradas
`0000`…`0007`. **Ojo con el journal**: una migración escrita a mano no se registra sola, y hasta el
2026-09-12 tres de ellas no se aplicaban. Lo vigila `npm run check:migrations`.

## Base de datos para verificar sin Docker
`bash scripts/db/local-pg.sh up` levanta PostgreSQL 16, migra y siembra; `down` lo borra. Existe
porque lo que se prueba son **políticas de fila reales**, y contra un doble siempre saldría verde.

## Archivos clave tocados esta sesión (FU-05 y FU-06)
- `middleware.ts` · `.github/workflows/ci.yml` · `.gitleaks.toml`
- `scripts/ci/`: `check-js-budget.ts`, `check-secrets.ts`, `check-env-example.ts`, `check-runtime.ts`,
  `verify-brakes.ts`, `check-dns.sh`, `negative/`
- `docs/`: `deployment.md` (nuevo), `decision_log.md` (D-47…D-51), `work_log.md`, `project_memory.md`,
  `run_metadata.md`
- `lib/auth/`: `index.ts`, `edge.ts`, `roles.ts`, `permissions.ts`, `session.ts`, `membership.ts`,
  `api-key.ts`, `better-auth.ts`, `db.ts`
- `middleware.ts` (compuerta de staging + orden de §2) · `app/(hq)/layout.tsx` ·
  `app/(portal)/layout.tsx` · `app/api/auth/[...all]/route.ts`
- `drizzle/`: `0004`…`0007` y el journal · `lib/db/schema.ts` · `lib/db/context.ts` (marca de tipo)
- `scripts/auth/`: `test-permisos.ts`, `test-autorizacion.ts` · `scripts/ci/check-auth-boundary.ts`,
  `check-migrations.ts` · `scripts/db/local-pg.sh`
- `implementation/task_tracker.md` · `package.json` · `scripts/tsconfig.json`
