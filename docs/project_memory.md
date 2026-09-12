---
type: docs
title: Project memory
project: slg_website
status: execution
timestamp: 2026-09-12
---

# Project memory — slg_website

> **Punto de retomada en una línea:** **M0 construido y FU-01 esqueletada**. Diez unidades tocadas —
> cinco `done` y cinco `in_progress`, y **ninguna esperando código**. La siguiente construible es
> **FU-10** (sistema de componentes), que no depende del copy. **M1-A no empieza hasta que Ricardo
> cierre la compuerta de FU-01.**

## Lo que espera a Ricardo, y solo a él
1. **Despliegue** — `docs/deployment.md` §3 a §5. Cierra FU-05 (criterios 1, 2, 3 y 8).
2. ~~**P-3 y P-4**~~ — **cerradas el 2026-09-12**: `no-reply@mailweb.softlandingglobal.com` sobre
   `mailweb.softlandingglobal.com`, `Reply-To` a `support@softlandingglobal.com`. EXT-6 cerrada.
3. ~~**Registros del subdominio**~~ — **hechos**: `mailweb.softlandingglobal.com` verificado el
   2026-09-11. Falta la credencial SMTP en Easypanel, **no crear el subdominio de tracking** y la
   prueba de bandeja en tres buzones (`docs/deployment.md` §4bis). Cierran FU-08.
4. **Los dos buckets `downloads` y `deliverables` en el servicio `minio`, los dos PRIVADOS**, y las
   seis variables `S3_*`. Es lo único que le falta a FU-09.
5. **F.2-2 y F.2-3** — consentimiento OAuth de Google y registro de aplicación en Entra ID. Son las
   dos últimas dependencias externas de M0 y bloquean **DU-01**.

## Current state
- **Fase**: **ejecución**. Compuerta de Planificación **abierta** (Ricardo, 2026-09-08).
- **active_profile**: `software-app` (`profiles/software-app/profile.md`) — D-14.
- **Contrato de entrada**: `START_PROJECT.md` v1.1, fase *Specify* de SDD.

## Última unidad completada
- **FU-01** — copy maestro (2026-09-12), `in_progress` con la **compuerta ABIERTA**: el esqueleto
  bilingüe está completo (71 registros) y los frenos construidos; **el copy es de `SLG_Overhauling`**.
- **DU-01** — acceso, sesión y recuperación (2026-09-12), `in_progress`: siete de los nueve criterios
  cerrados con **39 comprobaciones** contra el servidor real; los dos que faltan esperan los registros
  de OAuth. **Es la primera cosa que un consumidor puede hacer de punta a punta.**
- **FU-07** — servicio de invitaciones (2026-09-12). Los cinco criterios verificados con **34
  comprobaciones** contra PostgreSQL y SMTP reales.
- **FU-08** — adaptador de correo (2026-09-12), `in_progress`: el código está cerrado y verificado con
  **95 comprobaciones contra SMTP real**; falta dominio verificado y tres buzones.
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
- **FU-10** — sistema de componentes C.5 con prototipo interactivo aprobado. Depende de **FU-02**, no
  del copy: se valida contra el contenido marcador que ya existe. Es lo único construible ahora.
- **M1-A (DU-02 en adelante) NO empieza** hasta que la compuerta de FU-01 se cierre con una aprobación
  con fecha en `docs/work_log.md`.

## El esqueleto de contenido, de un vistazo
- **71 registros**: 22 `service` (las once páginas × 2 idiomas, con los seis bloques de A.3), 22
  `page`, 22 `download` en `coming-soon`, más blog y doctrina.
- **Cada hueco lleva su marcador con dueño**: `[PENDIENTE: copy maestro FU-01 — …]`. En staging son
  obligatorios; en `main` los rechaza `check:pending --strict`.
- **`check:copy` (D-65)** veta «Sesión Cero», agendas y cualquier cifra, premio o superlativo sin
  `[fuente: …]` en la misma línea.

## Lo que hay que saber del acceso antes de tocarlo
- **No existe registro público** (D-62). `POST /api/auth/sign-up/**` devuelve **404** desde el
  middleware. La única vía a una cuenta es `/api/acceso/invitacion`.
- **Los manejadores de formulario son nuestros, no de la librería**: el mensaje neutro, el bloqueo
  progresivo y el funcionar sin JavaScript no se delegan.
- **Cero JavaScript de cliente** en las pantallas de acceso. El presupuesto del gate D1 va al 89 %.
- **Aceptar una invitación verifica el correo** (D-63) y **restablecer cierra todas las sesiones**
  (D-64).

## Lo que hay que saber de `lib/files/` antes de tocarlo
- **El puerto no tiene `listar` ni `firmarPermanente`.** No es que nadie las llame: no existen. Esa
  ausencia ES el gate D10.
- **La validación ocurre antes de emitir la firma**: sin firma no hay escritura, así que rechazar ahí
  es rechazar antes de que se escriba un byte.
- **Las tres caducidades salen de variables de entorno** (D-60), con defectos en `lib/db/limits.ts` y
  tope de 60 minutos. Estuvieron intercambiadas hasta FU-09.
- **La lista de MIME de `material` es cerrada** (D-61): sin ejecutables, sin comprimidos y sin SVG.

## Lo que hay que saber de `lib/invitations/` antes de tocarlo
- **Se escribe con el contexto de quien invita**, nunca como sistema: la política de fila de
  `invitation` hace cumplir la pertenencia ella sola. El código que lo intentó como sistema fue
  rechazado por PostgreSQL, y la base tenía razón.
- **El testigo solo existe en el correo.** En la base está su hash. Revocar o caducar lo borra.
- **Reenviar emite un testigo nuevo** (D-57): el viejo deja de servir.
- **Tres reglas de B.3 que no caben en un `CHECK`**: un `client_admin` no invita a otra empresa, no
  concede roles de SLG y no invita a la organización `slg`. Las tres responden **404**.

## Lo que hay que saber de `lib/mail/` antes de tocarlo
- **Una puerta pública**: `@/lib/mail`. `nodemailer` vive solo en `smtp.ts`; importarlo fuera pone el
  CI en rojo (`check:fronteras`).
- **Las variables son de transporte, no de marca** (D-55). No hay `<PRODUCTO>_API_KEY` y esa ausencia
  es la decisión: el proveedor se configura con su servidor y su clave en `MAIL_SMTP_*`.
- **Los correos con enlace no se reintentan** (D-56): su token no se guarda, así que reintentar es
  **reemitir**, y eso es de FU-07 y DU-01.
- **El barrendero existe pero nadie lo arranca**: el intervalo lo fija DU-09 (< 60 s). Hoy la cola se
  barre a mano.

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
  `SECURITY DEFINER` estrechas, `invitation.token_hash` opcional) · **D-55…D-56** (FU-08: variables de
  transporte y no de marca; los correos con enlace no se reintentan).

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
