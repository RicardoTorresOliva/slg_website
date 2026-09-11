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
- **Bloqueador real de cierre**: **P-3/P-4** (remitente/subdominio) resueltos con valor PROVISIONAL del
  agente (D-54) — sin confirmación real de Ricardo. **F.2-4** (dominio de correo verificado) sigue
  externo y `[PENDIENTE]`; sin él no se puede probar entrega real a bandeja de entrada (criterio 3),
  el subdominio en DNS (criterio 4) ni el seguimiento desactivado en el panel de Resend (criterio 6).

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
- **Bloqueador real de cierre**: **F.2-2/F.2-3** (Google, Microsoft) sin credenciales reales — Better
  Auth ni registra esos proveedores todavía, así que los botones no existen en la página. El criterio 2
  exige los TRES métodos funcionando; solo contraseña se pudo probar de punta a punta en el navegador.

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

## FU-10 · Sistema de componentes C.5 · `in_progress` (2026-09-10)
Los nueve componentes (formulario de descarga, nav + sheet móvil, hero, tarjeta de rama/servicio,
«qué incluye», tarjeta de artículo, pie, shell de app de seis estados, visor de entregables) están
construidos, en `/prototipos`, y verificados en el navegador real contra el build de producción.
**No está `done` todavía**: falta repetir la verificación de las animaciones dirigidas por
`requestAnimationFrame` (cierre del sheet móvil, entrada del hero, panel lateral) con el panel del
navegador visible en pantalla — durante toda esta sesión estuvo en `visibilityState: "hidden"`
(Ricardo seguía el avance desde el teléfono) y Chromium suspende esas animaciones en ese estado; los
valores (`initial`/`animate`/`exit`) se verificaron correctos por inspección, la finalización visual
no. Detalle completo en `docs/work_log.md` (entrada "FU-10 — Cierre de la compuerta de C.5") y D-58.
**Hallazgo real encontrado y corregido en el camino**: `MobileSheet` nunca cerraba (D-58) — un
`useMotionValue` externo por `style` bloqueaba `animate`/`exit`; corregido dejando que Motion gestione
`y` internamente, mismo patrón aplicado desde el diseño en el `Drawer` del shell de app.

## Próxima unidad
Con FU-10 en este estado, DU-02 y DU-03 (M1-A) quedan desbloqueadas en cuanto se complete la
repetición de motion pendiente arriba — no dependen de F.2-2/F.2-3/F.2-4/P-3/P-4. **FU-07 y FU-08
siguen construidas y solo esperan a Ricardo/terceros** (F.2-2, F.2-3, F.2-4, P-3, P-4); DU-01 depende
de las tres FU y no puede empezar antes. Opciones razonables para la próxima sesión: (a) repetir la
verificación de motion de FU-10 con el panel visible y cerrarla `done`, (b) empezar DU-02/DU-03, o
(c) esperar a que F.2-2/F.2-3/F.2-4/P-3/P-4 avancen para cerrar FU-07/FU-08 del todo.

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
