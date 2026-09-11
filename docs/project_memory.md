---
type: docs
title: Project memory
project: slg_website
status: ejecución
timestamp: 2026-09-10
---

# Project memory — slg_website

## Current state
- **Fase**: ejecución (`start-execution`), plan aprobado por Ricardo el 2026-09-08. Perfil activo:
  `software-app`. Stack cerrado — detalle y justificación de cada elección en `docs/decision_log.md`.
- **M0-A completa** (FU-02, FU-03, FU-04, FU-05). **M0-B en curso**: FU-06 y **FU-09 hechas**;
  **FU-07 y FU-08 `in_progress`** (construidas y probadas de punta a punta; cierre real de cada una
  pendiente de dependencias externas que no dependen de este repositorio). 39 unidades totales.
- **2026-09-10, sesión larga en modo autónomo ("turbo")**: Ricardo pidió avanzar sin detenerse a
  confirmar decisiones diferibles mientras estaba fuera, en una sola sesión continua. Se cerró FU-09,
  se dejaron FU-07 y FU-08 `in_progress` (todo lo construible sin depender de Ricardo o de un tercero
  está construido y probado), y se corrigieron tres hallazgos en unidades ya `done` (FU-04, FU-05,
  FU-06) encontrados escribiendo encima de ellas — nunca al releer los `design_docs`, siempre
  ejecutando pruebas reales o leyendo código fuente real. Todo commiteado en `develop`, nada
  pusheado. Ver D-54 a D-57 en `docs/decision_log.md` para el criterio aplicado con cada decisión
  diferida: adoptar la recomendación ya escrita en los `design_docs` cuando existe una; el mínimo
  imprescindible, marcado como provisional, cuando no.

## Unidades en curso, en orden de dependencia

### FU-08 · Adaptador de correo transaccional · `in_progress`
Puerto propio en `lib/email/` (`enviarCorreo()`), SMTP estándar (nunca el SDK de Resend), plantillas
desde `content/ui`, cola de reintento con reserva-y-plazo y barrendero en proceso
(`instrumentation.ts`). Probado contra SMTP real — captador en proceso, sin Docker
(`scripts/email/fake-smtp-server.ts`) — 33 comprobaciones (`npm run test:email`).

**Para construir sobre FU-08 o cerrarla:**
- Único punto de entrada: `enviarCorreo()` (`lib/email/index.ts`). Nadie fuera de
  `lib/email/smtp-transport.ts` importa `nodemailer` — vigilado por `check:email-encapsulado`.
- **Sin llamador real todavía.** FU-07 (invitación), DU-01 (recuperación de contraseña) y DU-09 (aviso
  de captura) deben llamar a `enviarCorreo()` y registrar su propio reconstructor de reintento en
  `lib/email/retry-registry.ts` — sin registro, una fila fallida queda `pending` para siempre, visible
  pero sin resolverse sola.
- `email_delivery` tenía un hueco propio desde FU-04 (columnas/RLS que `data_model` §5.19 exigía y
  nadie había añadido) — cerrado en `drizzle/0007_evidencia_de_correo_completa.sql`.
- **P-3/P-4 confirmados (D-60, 2026-09-11) y F.2-4 resuelto**: Ricardo verificó el dominio en Resend.
  Subdominio real **`mailweb.softlandingglobal.com`** — distinto del ejemplo provisional de D-54
  (`mail.softlandingglobal.com`); `MAIL_FROM_ADDRESS` debe usar el dominio real, no el de ejemplo.
  Variables `MAIL_SMTP_*`/`MAIL_FROM_*` ya actualizadas por Ricardo en Easypanel (`slgweb-staging`).
  **Queda pendiente, no verificado por el agente todavía**: una prueba de envío real de punta a punta
  contra staging con las variables nuevas (criterio 3), y confirmar en el panel de Resend que el
  seguimiento de apertura/clics está desactivado (criterio 6, D-24 ya lo exigía). En cuanto se
  verifique, FU-08 pasa a `done`.

### FU-07 · Servicio de invitaciones · `in_progress`
Emisión, revocación, reenvío (testigo nuevo cada vez) y aceptación por los tres métodos —convergen en
`completarAceptacionInvitacion`, que no distingue cómo se creó la sesión. Primera unidad con UI real
(`app/(auth)/invitacion/[token]/`) y primera que crea cuentas/sesiones de verdad. Probada contra
Postgres y SMTP reales (27 comprobaciones, `scripts/db/test-invitations.ts`) **y contra el navegador
real con el build de producción**: invitación sembrada → `/invitacion/[token]` → contraseña → cuenta,
membership y `user.role` confirmados en Postgres, con `npm run verify` en verde después.

**Para construir sobre FU-07 o cerrarla:**
- `invitation` tenía el mismo tipo de hueco que `email_delivery` en FU-08 — cerrado en
  `drizzle/0008_invitacion_completa.sql` (D-55), con una política RESTRICTIVE nueva: un `client_admin`
  no puede invitar un rol de SLG ni a una organización `slg`, ni saltándose la capa de aplicación.
- **Dos hallazgos en unidades YA `done`, corregidos aquí:**
  - **D-56**: `lib/auth/config.ts` (FU-06) no tenía `disableImplicitSignUp` en los proveedores
    sociales — un hueco de seguridad real (alta pública sin invitación por Google/Microsoft), nunca
    explotado porque F.2-2/F.2-3 nunca tuvieron credenciales reales. Corregido; se reactiva solo para
    la sesión de aceptación de una invitación (`requestSignUp: true`).
  - **D-57**, el más grave: la CSP estática de `next.config.ts` (FU-05) bloqueaba la hidratación de
    React en **todas** las páginas del sitio, la portada incluida — nadie lo había notado porque
    ninguna unidad antes de FU-07 enviaba un Client Component con interactividad real. Corregida con
    CSP de nonce por petición (`proxy.ts`) y `dynamic = "force-dynamic"` en todo el árbol
    (`app/layout.tsx`) — consecuencia obligada de usar nonces, documentada por Next.js. **Verificado
    que el gate D1 mejora, no empeora**: Performance 98→100, Best Practices 92→100, LCP 2,3 s→1,2 s.
- **F.2-2/F.2-3 en progreso**: Ricardo cargó `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` y
  `MICROSOFT_CLIENT_ID`/`MICROSOFT_CLIENT_SECRET`/`MICROSOFT_TENANT_ID` en el entorno de
  `slgweb-staging` en Easypanel (2026-09-11). **Sin verificar todavía por el agente**: falta confirmar
  (a) que el redeploy de staging recogió las variables nuevas, (b) que las "Authorized redirect URIs"
  registradas en Google Cloud Console / Azure App registrations son exactamente
  `https://staging.softlandingglobal.com/api/auth/callback/google` y `.../callback/microsoft`, y (c)
  un inicio de sesión real de punta a punta con una invitación sembrada en staging (no solo que el
  botón aparezca). El criterio 2 de FU-07 exige los TRES métodos funcionando — hasta esa prueba real,
  sigue sin cerrarse aunque las credenciales ya existan.

## Última unidad cerrada del todo: FU-09 · Almacenamiento de archivos y URLs firmadas · `done` · 2026-09-10
Servicio en `lib/files/`: URL firmada de descarga (GET SigV4) y de subida (POST policy — no PUT
presignado, es lo que permite que el propio almacenamiento rechace tamaño/tipo antes de aceptar el
archivo). Verificado contra **MinIO real** (binario Homebrew local, sin Docker — `npm run test:files`,
10 comprobaciones) y en el runner de GitHub (el job descarga el binario oficial de Linux).

**Para construir sobre FU-09:** sin llamador real todavía (DU-08, DU-13/DU-15). Hallazgo real,
deliberadamente NO cerrado aquí (ninguno de los 5 criterios de FU-09 lo exige): `download` no existe
como tabla, `download_event` usa `download_slug` en vez de FK a `download.id`, y `deliverable` no tiene
`source`/`external_url`/`mime_type`/`size_bytes`, todo frente a `data_model` §5.10/§5.11/§5.14 —
anotado como tarea aparte (`task_fb516747`), es trabajo de quien construya DU-08/DU-13/DU-15.

## FU-06 · Módulo de identidad y autorización · `done` (2026-09-10, antes de esta sesión)
Better Auth 1.7.3, matriz B.3, compuertas de `/hq`/`/portal`, claves de API. Sin los plugins
`organization`/`admin`/`apiKey` (D-52) — `lib/auth/` es la única puerta (R-19); ninguna unidad compara
`role` a mano, vigilado por `check:auth-encapsulado`. `/hq`/`/portal` existen con `HABILITADO = false`
hasta DU-13/DU-18. Ver el hallazgo D-56 arriba: un hueco de esta unidad, corregido en FU-07.

## FU-10 · Sistema de componentes C.5 · `done` (2026-09-11)
Los nueve componentes están construidos, en `/prototipos`, y verificados en el navegador real contra
el build de producción — incluida la finalización visual de las animaciones (sheet móvil, hero), que
quedó pendiente al cerrar la sesión anterior (panel oculto) y se confirmó al reabrir con el panel
visible: Escape y clic en el scrim cierran limpio, el hero completa su entrada. **Hallazgo real
encontrado y corregido en el camino**: `MobileSheet` nunca cerraba (D-58) — un `useMotionValue`
externo por `style` bloqueaba `animate`/`exit`; corregido dejando que Motion gestione `y`
internamente, mismo patrón aplicado desde el diseño en el `Drawer` del shell de app. **D-62**:
`--blue-deep` oscurecido de `#24394D` a `#182430` por pedido de Ricardo (títulos "muy tenues" para
una agencia que debe proyectar firmeza) — mismo matiz, contraste sube de 11,9:1 a 15,7:1.

## FU-11 · Anti-abuso propio · `in_progress` (2026-09-11)
Construida sin bloqueo externo (depende solo de FU-04/FU-05) mientras Ricardo estaba fuera. Tablas
`blocked_email_domain` (RF-31/32) y `rate_limit_event` (RF-34, ventana deslizante) — RLS solo
`system`, ninguna de las dos es dato de empresa. `lib/anti-abuse/` completo, probado contra Postgres
real (`scripts/db/test-anti-abuse.ts`, 16 comprobaciones). **Hallazgo propio, corregido**: la primera
versión del límite de peticiones tenía una condición de carrera real (contar y luego insertar en dos
sentencias); corregida con `pg_advisory_xact_lock`, verificado con una prueba de concurrencia real.
**Hallazgo aparte sobre la herramienta**: el journal de `drizzle-kit` no conocía las migraciones
escritas a mano (0001-0003, 0005-0008) y generó un archivo con colisión de número y SQL redundante —
corregido a mano, advertencia dejada en D-63 para la próxima migración que use `drizzle-kit generate`.
**No está `done`**: los criterios 5 y 6 (cero scripts de terceros en 27 rutas; validar contra esquema
en un formulario real) no se pueden cerrar sin páginas públicas reales (DU-02/03+) ni un formulario
con Server Action real (DU-08) — ninguno existe todavía. Detalle completo en D-63 y `work_log.md`.

## FU-01 · Copy maestro bilingüe · `in_progress` (2026-09-11)
Primer borrador redactado por el agente con autorización explícita de Ricardo (D-61). Cubre Home, los
4 overviews de rama, los 11 `service` (secciones 1–3 nuevas; 4–6 ya eran texto final, replicado), sus
11 `download` (10 nuevos), Doctrina (shell) y Nosotros, más el cierre de ~29 cadenas de `content/ui`
que ya tenían borrador propio. Fuente real usada: `~/Dev/SLG_Overhauling/SLG Overhauling.md` (fuera
de este repositorio) — nada inventado donde esa fuente no alcanzaba; se dejó `[PENDIENTE]` explícito.
Verificado en verde contra `npm run check:content` y `npm run verify` completos, no solo por
inspección. **Hallazgo propio, corregido**: `lib/content/schema.ts` rechazaba `parent: null` en el
registro de `SLG_Holdings` — la excepción de "`null` válido" miraba el nombre del campo (`pair`), no
la función de validación (`isPair`, compartida con `parent`); corregido por función, no por nombre.

**No está `done`, y no puede estarlo por decisión de nadie más que Ricardo**: el criterio 6 de FU-01
exige su aprobación explícita registrada en `work_log`, con fecha — eso es exactamente lo que este
borrador todavía espera. Lista completa de lo que quedó `[PENDIENTE]` (y por qué no se inventó) en
`docs/work_log.md`, entrada "FU-01 — Primer borrador de copy maestro"; resumen: cita y resumen de The
Phoenix Doctrine (vive en Docs_MD, fuera de este repo), biografía/mentorías de Nosotros (dato de
Ricardo), qué documento se destaca en Home, contenido específico de 6 de los 11 servicios más allá
del nombre, y título/público/aprendizajes de los documentos D-02…D-11.

## Próxima unidad
Con FU-10 `done`, **la aprobación de FU-01 por Ricardo es lo único que desbloquea DU-02/DU-03**
(M1-A) — ya no falta nada más de este repositorio para poder construirlas. **FU-07 y FU-08** tienen
credenciales cargadas en `slgweb-staging` (redirect URIs de Google/Microsoft confirmados exactos por
Ricardo) pero **sin verificar de punta a punta todavía** — falta un inicio de sesión real y un envío
real por Resend. **FU-11** tiene su mecanismo propio construido y probado, pendiente de DU-02/03/08
para cerrar sus dos últimos criterios. Opciones razonables para la próxima sesión: (a) que Ricardo
revise y apruebe (o corrija) el borrador de FU-01, (b) verificar login real de Google/Microsoft y
envío real por Resend contra staging, o (c) seguir con otra unidad de M2 sin bloqueo si aparece
alguna.

## Entorno local
- `docker-compose.yml` levanta `slg-db` (PostgreSQL 16, puerto **5434** — 5432 y 5433 son de otros
  proyectos). También lleva `slg-mail-a`/`slg-mail-b` (mailpit) **opcionales**, solo para inspección
  manual — `npm run test:email` no los necesita (capta en proceso).
- Credenciales en `.env` (ignorado por git); `.env.example` documenta solo los nombres.
- Migraciones en `drizzle/`: `0000` y `0004` generadas por `drizzle-kit`; `0001`, `0002`, `0003`,
  `0005`, `0006`, `0007`, `0008` escritas a mano (políticas de fila, roles, restricciones que
  `drizzle-kit` no genera) y aplicadas vía el bucle de `psql` en `ci.yml`, no por `drizzle-kit migrate`.
- **MinIO local para `npm run test:files`**: binario Homebrew (`brew install minio/stable/minio`), NO
  Docker (el pull de imágenes en esta máquina resultó muy lento/inestable — mismo motivo por el que
  FU-08 usa un captador SMTP en proceso). Arrancar a mano:
  `MINIO_ROOT_USER=slgtest MINIO_ROOT_PASSWORD=slgtestpass minio server /tmp/slg-minio-data --address 127.0.0.1:9500 --console-address 127.0.0.1:9501`
  — variables `FILES_S3_*` ya están en `.env`. No se deja corriendo entre sesiones.
- `.claude/launch.json` arranca `npm run dev` en el puerto **3100** (el 3000 lo ocupa Docker Desktop en
  esta máquina) — `BETTER_AUTH_URL`/`NEXT_PUBLIC_SITE_URL` en `.env` ya apuntan ahí.
- Todo el sitio se renderiza dinámicamente desde D-57 (`app/layout.tsx`, `dynamic = "force-dynamic"`):
  no hay páginas estáticas que reconstruir aparte, ninguna unidad futura necesita declarar nada extra.

## Infraestructura desplegada
- `slg-web` (producción, rama `main`) y `slgweb-staging` (`develop`) en Easypanel, cada uno con su
  propio webhook de auto-deploy activo en GitHub. `main` está protegida (PR + CI en verde
  obligatorios, sin `push` directo).
- MinIO con los cubos `downloads`/`deliverables` creados y privados (no verificado por el agente contra
  el MinIO REAL de producción/staging — confirmar la primera vez que un llamador real de FU-09 suba un
  archivo ahí). La app usa las credenciales de administrador de MinIO directamente (D-51/R-41: rotar a
  una clave acotada antes del go-live). Variables: `FILES_S3_*`/`FILES_BUCKET_*`/`SIGNED_URL_TTL_*`
  (corregido en FU-09 desde el `S3_*` genérico que tenía el borrador).
- Bases de datos separadas por entorno: producción usa `slg_website_prod`, distinta de la de staging,
  dentro del mismo servicio `slgwebpostgres` (R-42 confirmado resuelto).
- UptimeRobot vigila `staging.softlandingglobal.com` (raíz y `/api/health`); los monitores de la raíz
  y `www` de producción están pausados a propósito — sin DNS hasta el go-live. Canal de aviso: correo
  a `torresoliva.ricardo@gmail.com` únicamente (segunda corrección de D-49, ver `decision_log.md`).

## Decisiones fijadas (no re-explorar)
Todas registradas en `docs/decision_log.md` (D-14 a D-59). Dos marcadas
**[IRREVERSIBLE-TRAS-FU-04]** (D-26, D-27): revertirlas después de la primera migración es migración
de datos, no una edición.

## Blockers
- **P-3, P-4** (D-54) y **F.2-4** — antes de cerrar FU-08.
- **F.2-2, F.2-3** (Google, Microsoft) — antes de cerrar FU-07.
- Ninguno de los cinco bloquea seguir con otras unidades de M0-B/M1 que no dependan de FU-07/FU-08.
- **S-01** (rotación de una credencial de construcción) — diferida a go-live por decisión de Ricardo,
  fuera de este repositorio.
- Ninguno de planificación: el plan está aprobado y la Compuerta de Planificación, abierta.
