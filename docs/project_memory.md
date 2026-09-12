---
type: docs
title: Project memory
project: slg_website
status: execution
timestamp: 2026-09-12
---

# Project memory — slg_website

> **Punto de retomada en una línea:** **M0 construido, FU-01 esqueletada y FU-10 construida**. Once
> unidades tocadas — cinco `done` y seis `in_progress`, y **ninguna esperando código**. **No queda
> nada construible sin Ricardo**: las dos compuertas abiertas —copy (FU-01) y prototipos (FU-10)—
> bloquean todas las DU de página, y el resto espera paneles externos. El paso a paso de cada cosa
> está en `docs/handoff.md`.

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
- **DU-02** — armazón público (navegación, sheet, pie, conmutador de idioma). **No empieza** hasta que
  se cierren **las dos compuertas**: la de FU-01 (copy) y la de FU-10 (los nueve prototipos), ambas
  con aprobación fechada en `docs/work_log.md`.
- **No hay ninguna unidad construible sin Ricardo.** Lo que falta está en `docs/handoff.md`.

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
| Las cuatro cláusulas del sheet, cuadro a cuadro | `npm run test:gesto` (necesita el build y Chromium) |

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

## El presupuesto de JS, y por qué ya no asusta
Iba al **89 %** (133,9 KB de 150 KB) con la portada vacía, y la duda era qué pasaría al entrar FU-10.
Respuesta medida: **no se movió ni un byte**. Siete de los nueve componentes son de **servidor**, y
los dos que no —formulario y sheet— viven en rutas que ya cargaban React. La regla que lo mantiene
así: **`"use client"` solo donde hay gesto o estado**, y el resto en `components/piezas.tsx`.

## Lo que hay que saber de la CSP antes de tocarla
**Hay dos políticas, y no es un descuido (D-68).** Las páginas prerrenderizadas llevan
`script-src 'self' 'unsafe-inline'`; las dinámicas —`(auth)`, `(hq)`, `(portal)`, `/api`— llevan
**nonce nuevo por petición + `'strict-dynamic'` y sin `'unsafe-inline'`**. Las dos se emiten desde
**`middleware.ts`**, nunca desde `next.config.ts`: una cabecera declarada allí es la misma para todas
las peticiones y no puede llevar un nonce. **Si alguien vuelve a declarar la CSP en `next.config.ts`,
las dos políticas se intersecan y el sitio deja de hidratar**: se ve y no funciona. `check:runtime` lo
comprueba sobre el servidor real.

## Lo que hay que saber del sheet antes de tocarlo
El cierre es **estado de render**, no `style` escrito sobre el nodo (**D-69**). Escribirlo a mano
parecía funcionar y no funcionaba: el render que dispara el propio gesto reescribía la duración recién
calculada y el sheet cerraba **siempre** en 350 ms. Si vuelves a necesitar animar algo desde un
manejador, pásalo por estado. Lo vigila `npm run test:gesto`, que lo mide cuadro a cuadro con un
Chromium real.

## Migraciones: diez, y todas declaradas
`0000`…`0009`. **Ojo con el journal**: una migración escrita a mano no se registra sola, y hasta el
2026-09-12 tres de ellas no se aplicaban. Lo vigila `npm run check:migrations`.

## Base de datos para verificar sin Docker
`bash scripts/db/local-pg.sh up` levanta PostgreSQL 16, migra y siembra; `down` lo borra. Existe
porque lo que se prueba son **políticas de fila reales**, y contra un doble siempre saldría verde.

## Archivos clave de FU-10
- `components/`: `FormularioDeDescarga.tsx`, `BarraDeNavegacion.tsx`, `SheetMovil.tsx`, `piezas.tsx`,
  `Reveal.tsx`, `ShellDeApp.tsx`, `VisorDeEntregables.tsx`
- `app/motion.css` (las tres preferencias del sistema) · `lib/design/motion.ts` (la física del gesto) ·
  `app/(auth)/prototipo/page.tsx` (los nueve, navegables)
- `middleware.ts` (las dos CSP) · `next.config.ts` (ya no lleva CSP) ·
  `scripts/ci/check-contraste.ts`, `check-motion.ts`, `test-gesto.ts`, `negative/gesto/roto.html`

## Archivos clave tocados en sesiones anteriores (FU-05 y FU-06)
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
