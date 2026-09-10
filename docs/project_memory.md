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
- **M0-A completa** (FU-02, FU-03, FU-04, FU-05) · **M0-B en curso**: FU-06 y **FU-09 hechas**,
  **FU-08 `in_progress`** (adaptador construido y probado; cierre real pendiente de F.2-4/P-3/P-4),
  FU-07 pendiente, de 39 unidades totales.
- **2026-09-10, sesión en modo autónomo ("turbo")**: Ricardo pidió avanzar sin detenerse a confirmar
  decisiones diferibles mientras estaba fuera. Ver D-54 en `docs/decision_log.md` para el criterio
  aplicado (adoptar la recomendación ya escrita en los `design_docs` cuando existe una; inventar el
  mínimo imprescindible cuando no, y dejarlo marcado como provisional, nunca como cerrado).

## Última unidad completada
**FU-09 · Almacenamiento de archivos y URLs firmadas · `done` · 2026-09-10.** Servicio en `lib/files/`:
URL firmada de descarga (GET SigV4) y de subida (POST policy — no PUT presignado, es lo que permite
que el propio MinIO rechace tamaño/tipo antes de aceptar el archivo). Verificado contra **MinIO real**
(binario Homebrew local, sin Docker: `npm run test:files`, 10 comprobaciones) y en el runner de GitHub
(el job descarga el binario oficial de Linux). Detalle completo en `docs/work_log.md`
(entrada 2026-09-10).

**Lo que hay que saber para construir sobre FU-09:**
- El servicio vive en `lib/files/` (`emitirUrlFirmadaDeDescarga`/`emitirUrlFirmadaDeSubida` son la
  única puerta — vigilado por `scripts/files/check-files-encapsulado.ts`). Nadie fuera de
  `lib/files/client.ts`/`signed-urls.ts` puede importar `@aws-sdk/client-s3`, y ningún archivo de
  `app/`/`lib/` puede nombrar el comando de listado (RF-123, gate D10).
- **FU-09 no tiene todavía ningún llamador real** (igual que FU-08): DU-08 (biblioteca de descargas) y
  DU-13/DU-15 (entregables) son quienes deben llamar a estas funciones.
- **Hallazgo real, deliberadamente NO cerrado en FU-09**: `download` no existe como tabla, `download_event`
  usa `download_slug` en vez de FK a `download.id`, y `deliverable` no tiene
  `source`/`external_url`/`mime_type`/`size_bytes` — todo frente a `data_model` §5.10/§5.11/§5.14.
  Ninguno de los 5 criterios de FU-09 lo exige (es trabajo de DU-08/DU-13/DU-15), así que queda anotado
  como tarea aparte (`task_fb516747`), no arreglado por adelantado.
- Variables de entorno: `FILES_S3_*`/`FILES_BUCKET_*`/`SIGNED_URL_TTL_*` (`.env.example`) — **no**
  `S3_*` a secas, que es como estaba el borrador antes de esta unidad (mismatch corregido contra
  `api_contracts` §11.4, mismo patrón que `RESEND_API_KEY`→`MAIL_SMTP_*` en FU-08).

**FU-06 · Módulo de identidad y autorización · `done` · 2026-09-10** (completada antes, sigue vigente):
Better Auth 1.7.3 (exacto), matriz B.3 completa, compuertas de `/hq`/`/portal`, claves de API —
verificado contra Postgres real (`npm run test:db`, 47 comprobaciones). Detalle en `docs/work_log.md`
y decisiones D-52/D-53 en `docs/decision_log.md`.

**Lo que hay que saber para construir sobre FU-06:**
- Sin los plugins de Better Auth `organization`/`admin`/`apiKey` (D-52) — el esquema real de FU-04 es
  incompatible con lo que asumen. El módulo propio en `lib/auth/` es la única puerta (R-19).
  `puedeHacer`/`exigir` (`lib/auth/permissions.ts`) es la matriz B.3; ninguna unidad compara `role` a
  mano — `scripts/db/check-auth-encapsulado.ts` lo vigila en CI.
- `api_key` y `membership` tienen RLS: cualquier código que las toque pasa por
  `withScope`/`withSystemScope` (`lib/db/scope.ts`), nunca por una conexión propia.
- `/hq` y `/portal` existen pero están apagadas (`HABILITADO = false` en sus `layout.tsx`) — DU-13 y
  DU-18 las encienden al construir el contenido real.
- `proxy.ts` (antes `middleware.ts`, Next 16 renombró la convención) hace comprobaciones baratas sin
  tocar la base de datos; la comprobación de verdad vive en los `layout.tsx` y en `lib/auth/`.

## Unidad en curso: FU-08 · Adaptador de correo transaccional · `in_progress`

Construido y probado de punta a punta contra SMTP y Postgres reales (33 comprobaciones,
`npm run test:email`), `npm run verify` en verde. Detalle completo en `docs/work_log.md`
(entrada 2026-09-10) y decisión **D-54** en `docs/decision_log.md`.

**Lo que hay que saber para construir sobre FU-08 o para cerrarla:**
- El puerto vive en `lib/email/` (`enviarCorreo()` es la única puerta — criterio 1 vigilado por
  `scripts/email/check-email-encapsulado.ts`, mismo patrón que `check-auth-encapsulado.ts`). Nadie
  fuera de `lib/email/smtp-transport.ts` puede importar `nodemailer`.
- **FU-08 no tiene todavía ningún llamador real**: FU-07 (invitación), DU-01 (recuperación de
  contraseña) y DU-09 (aviso de captura) son quienes deben llamar a `enviarCorreo()`. Cada una debe
  además registrar su propio reconstructor de reintento en `lib/email/retry-registry.ts` ANTES de que
  sus reintentos funcionen de verdad — sin registro, una fila fallida se queda `pending` para siempre
  (visible, nunca perdida, pero tampoco se resuelve sola).
- `email_delivery` tenía un hueco propio desde FU-04 (columnas/restricciones/índices de
  `data_model` §5.19 que nadie había añadido) y le faltaba RLS — ambos cerrados en
  `drizzle/0007_evidencia_de_correo_completa.sql`. Está en `ORG_SCOPED_TABLES`
  (`lib/db/schema.ts`) y protegida por `withSystemScope`, igual que `api_key`/`membership` (D-53).
- **Bloqueador real, de Ricardo, antes de CERRAR FU-08** (no de haberla construido):
  - **P-3/P-4**: resueltos con valor PROVISIONAL del agente (D-54) para poder construir. Sin
    confirmación real de Ricardo todavía.
  - **F.2-4** (dominio de correo verificado, SPF/DKIM/DMARC) — externo, `[PENDIENTE]`. Sin él no se
    puede probar entrega real a bandeja de entrada (criterio 3), verificar el subdominio en DNS
    (criterio 4) ni comprobar el seguimiento desactivado en el panel de Resend (criterio 6).
- FU-07 depende de FU-06 (cerrada) **y** FU-08 (en curso) — puede empezarse en paralelo si hace falta,
  pero sus envíos reales de invitación esperan a que FU-08 cierre de verdad.

## Próxima unidad
**FU-07 · Servicio de invitaciones · M0-B.** Depende de FU-06 (cerrada) **y** FU-08 (`in_progress`) —
puede empezarse (el hueco es el envío real de la invitación, que espera a que FU-08 cierre), o
esperar a que P-3/P-4/F.2-4 se resuelvan y cerrar FU-08 primero. Alternativa: cerrar FU-08 de verdad en
cuanto Ricardo confirme P-3/P-4 y F.2-4 avance.

## Entorno local
- `docker-compose.yml` levanta `slg-db` (PostgreSQL 16) en el puerto **5434** — 5432 y 5433 son de
  otros proyectos, no se tocan. También lleva `slg-mail-a`/`slg-mail-b` (mailpit) **opcionales**, solo
  para inspección manual de correos de prueba — `npm run test:email` no los necesita (usa un captador
  en proceso, `scripts/email/fake-smtp-server.ts`).
- Credenciales en `.env` (ignorado por git); `.env.example` documenta solo los nombres.
- Migraciones en `drizzle/`: `0000` y `0004` generadas por `drizzle-kit`; `0001`, `0002`, `0003`,
  `0005`, `0006`, `0007` escritas a mano (políticas de fila, roles, disparadores, restricciones que
  `drizzle-kit` no genera) y aplicadas vía el bucle de `psql` en `ci.yml`, no por `drizzle-kit migrate`.
- **MinIO local para `npm run test:files`**: binario Homebrew (`brew install minio/stable/minio`), NO
  Docker (el pull de imágenes en esta máquina resultó muy lento/inestable esa sesión — mismo motivo por
  el que FU-08 usa un captador SMTP en proceso en vez de un contenedor). Arrancar a mano:
  `MINIO_ROOT_USER=slgtest MINIO_ROOT_PASSWORD=slgtestpass minio server /tmp/slg-minio-data --address 127.0.0.1:9500 --console-address 127.0.0.1:9501`
  — variables `FILES_S3_*` correspondientes ya están en `.env`. No se deja corriendo entre sesiones.

## Infraestructura desplegada
- `slg-web` (producción, rama `main`) y `slgweb-staging` (`develop`) en Easypanel, cada uno con su
  propio webhook de auto-deploy activo en GitHub. `main` está protegida (PR + CI en verde
  obligatorios, sin `push` directo).
- MinIO con los cubos `downloads`/`deliverables` creados y privados (no verificado por el agente contra
  el MinIO REAL de producción/staging, sin acceso al Console — confirmar la primera vez que un llamador
  real de FU-09, DU-08 o DU-13/15, suba un archivo ahí). La app usa las credenciales de administrador de
  MinIO directamente (D-51/R-41: rotar a una clave acotada antes del go-live). Existe un bucket con
  typo (`dowloads`) vacío y sin usar — se deja así. Nombres de variable en `.env.example`:
  `FILES_S3_*`/`FILES_BUCKET_*`/`SIGNED_URL_TTL_*` (corregido en FU-09 desde el `S3_*` genérico que
  tenía el borrador — no coincidía con `api_contracts` §11.4). FU-09 se verificó contra MinIO **local**
  (binario Homebrew, puerto 9500), no contra este MinIO real desplegado.
- Bases de datos separadas por entorno: producción usa `slg_website_prod`, distinta de la de staging,
  dentro del mismo servicio `slgwebpostgres` (R-42 confirmado resuelto).
- UptimeRobot vigila `staging.softlandingglobal.com` (raíz y `/api/health`); los monitores de la raíz
  y `www` de producción están pausados a propósito — sin DNS hasta el go-live. Canal de aviso: correo
  a `torresoliva.ricardo@gmail.com` únicamente — el webhook/n8n no está en el plan gratuito de
  UptimeRobot (segunda corrección de D-49, ver `decision_log.md`).

## Decisiones fijadas (no re-explorar)
Todas registradas en `docs/decision_log.md` (D-14 a D-54). Dos marcadas
**[IRREVERSIBLE-TRAS-FU-04]** (D-26, D-27): revertirlas después de la primera migración es migración
de datos, no una edición.

## Blockers
- **P-3, P-4** (arriba, D-54) y **F.2-4** (dominio de correo verificado) — antes de cerrar FU-08.
  Ninguno de los tres bloquea seguir con otras unidades (FU-07 puede avanzar).
- **S-01** (rotación de una credencial de construcción) — diferida a go-live por decisión de Ricardo,
  fuera de este repositorio.
- Ninguno de planificación: el plan está aprobado y la Compuerta de Planificación, abierta.
