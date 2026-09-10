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
- **M0-A completa** (FU-02, FU-03, FU-04, FU-05) · **M0-B en curso**: FU-06 hecha, FU-07/FU-08/FU-09
  pendientes de 39 unidades totales.

## Última unidad completada
**FU-06 · Módulo de identidad y autorización · `done` · 2026-09-10.** Better Auth 1.7.3 (exacto),
matriz B.3 completa, compuertas de `/hq`/`/portal`, claves de API — verificado contra Postgres real
(`npm run test:db`, 47 comprobaciones) y confirmado en el runner de GitHub, no solo en local. Detalle
completo en `docs/work_log.md` (entrada 2026-09-10) y decisiones D-52/D-53 en `docs/decision_log.md`.

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
- Tres bugs reales encontrados por la prueba, no por la revisión (uno de FU-04, nunca antes ejercido
  en runtime): detalle en `work_log.md`, útil si algo parecido reaparece en otra unidad.

## Próxima unidad
**FU-08 · Adaptador de correo transaccional · M0-B.** Depende de FU-05 (cerrada) y de F.2-4 (dominio
de correo verificado — externo, `[PENDIENTE]`). FU-07 (invitaciones) depende de FU-06 **y** FU-08, así
que FU-08 va primero.

**Bloqueador real, de Ricardo, antes de cerrar FU-08** — dos sub-decisiones de configuración, abiertas
desde la planificación (`docs/decision_log.md`, tabla «Pendientes de decisión»):
- **P-3**: dirección remitente visible — `From` en el subdominio con `Reply-To` a `support@`
  (recomendado), o `From` en la raíz apoyándose solo en alineación DKIM.
- **P-4**: nombre exacto del subdominio de envío.

Ninguna de las dos bloquea *empezar* FU-08 (el adaptador SMTP en sí no depende del nombre elegido),
pero sí bloquea el primer envío real y el cierre de la unidad.

## Entorno local
- `docker-compose.yml` levanta `slg-db` (PostgreSQL 16) en el puerto **5434** — 5432 y 5433 son de
  otros proyectos, no se tocan.
- Credenciales en `.env` (ignorado por git); `.env.example` documenta solo los nombres.
- Migraciones en `drizzle/`: `0000` y `0004` generadas por `drizzle-kit`; `0001`, `0002`, `0003`,
  `0005`, `0006` escritas a mano (políticas de fila, roles, disparadores — `drizzle-kit` no las genera)
  y aplicadas vía el bucle de `psql` en `ci.yml`, no por `drizzle-kit migrate`.

## Infraestructura desplegada
- `slg-web` (producción, rama `main`) y `slgweb-staging` (`develop`) en Easypanel, cada uno con su
  propio webhook de auto-deploy activo en GitHub. `main` está protegida (PR + CI en verde
  obligatorios, sin `push` directo).
- MinIO con los cubos `downloads`/`deliverables` creados y privados (no verificado por el agente, sin
  acceso al Console — confirmar la primera vez que FU-09 suba un archivo). La app usa las credenciales
  de administrador de MinIO directamente (D-51/R-41: rotar a una clave acotada antes del go-live).
  Existe un bucket con typo (`dowloads`) vacío y sin usar — se deja así.
  `S3_ACCESS_KEY_ID`/`S3_SECRET_ACCESS_KEY` (`.env.example`) para cuando FU-09 los necesite.
- Bases de datos separadas por entorno: producción usa `slg_website_prod`, distinta de la de staging,
  dentro del mismo servicio `slgwebpostgres` (R-42 confirmado resuelto).
- UptimeRobot vigila `staging.softlandingglobal.com` (raíz y `/api/health`); los monitores de la raíz
  y `www` de producción están pausados a propósito — sin DNS hasta el go-live. Canal de aviso: correo
  a `torresoliva.ricardo@gmail.com` únicamente — el webhook/n8n no está en el plan gratuito de
  UptimeRobot (segunda corrección de D-49, ver `decision_log.md`).

## Decisiones fijadas (no re-explorar)
Todas registradas en `docs/decision_log.md` (D-14 a D-53). Dos marcadas
**[IRREVERSIBLE-TRAS-FU-04]** (D-26, D-27): revertirlas después de la primera migración es migración
de datos, no una edición.

## Blockers
- **P-3, P-4** (arriba) — antes de cerrar FU-08.
- **S-01** (rotación de una credencial de construcción) — diferida a go-live por decisión de Ricardo,
  fuera de este repositorio.
- Ninguno de planificación: el plan está aprobado y la Compuerta de Planificación, abierta.
