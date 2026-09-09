---
type: Registro
title: Dónde retomar — mañana por la mañana
description: Estado al cierre de la sesión del 2026-09-08 y las acciones concretas para continuar.
tags: [sesion, continuidad]
timestamp: 2026-09-08
---

# Dónde retomar

> **Actualizado el 2026-09-09.** La sesión del 8 se cerró por presión de contexto,
> siguiendo las señales que fija `AGENTS.md`. Este archivo es el punto de entrada:
> ábrelo con `/session-start`.

## Estado

| | |
|---|---|
| Unidades | **3 hechas** (FU-02, FU-03, FU-04) · **1 en curso** (FU-05) · 35 pendientes |
| Requisitos | 148 RF + 46 RNF |
| Riesgos | 40 |
| Decisiones | 36 (D-14…D-49, sin huecos) |
| Pipeline local | **16 pasos en verde, 1 en rojo** — el rojo es intencionado (R-40) |
| Infraestructura | `staging` y `/api/health` **en verde** · MinIO **arrancado** · raíz y `www` en rojo por diseño |
| Lighthouse móvil | Performance **98** · Accesibilidad **100** · Best Practices 92 · SEO **100** · LCP 2,4 s |

## Lo primero al abrir: una decisión de dos minutos

**R-40 — el gate D1 y el stack son incompatibles.** El suelo de React 19 + Next 16
App Router son **172,3 KB comprimidos** en una página vacía, con **cero librerías
propias** en el paquete. El gate D1 fija 150 KB. Ambos los decidiste tú.

**El objetivo del gate sí se cumple**: Lighthouse da 98 / 100 / 92 / 100 con
LCP 2,4 s y TBT 20 ms. Los 150 KB eran un proxy mal calibrado, no el objetivo.

Tres salidas:

| | Qué implica |
|---|---|
| **(a)** Sustituir el umbral de KB por **Lighthouse en CI** — ≥ 90 en las cuatro categorías y LCP < 2,5 s | Mide lo que de verdad importa y es más difícil de engañar que un número de bytes. Coste: el job de CI tarda ~1 min más |
| **(b)** Subir el presupuesto a **180 KB** y conservarlo como detector de **regresiones** | Es para lo que sirve un presupuesto. Barato. No mide la experiencia real |
| **(c)** Mantener 150 KB | Exigiría abandonar App Router y contradiría §10. No recomendado |

Mi recomendación: **(a) y (b) juntas** — Lighthouse como gate real, presupuesto
como detector de regresiones. Hasta que decidas, la comprobación falla a
propósito: un gate que se relaja solo deja de ser un gate.

## Cerrado el 2026-09-09, antes de terminar la sesión

- **MinIO arrancó.** El `FATAL` del panel era una línea vieja de un log acumulativo.
- **Staging protegido.** Se descubrió que estuvo abierto e indexable 1 h 37 min:
  las variables `STAGING_BASIC_AUTH_*` estaban documentadas pero **no existía el
  código que las usaba**. Corregido con `middleware.ts` y verificado en 10
  comprobaciones (`scripts/ci/test-staging-auth.ts`).
- **Falta desplegarlo**: el middleware está en el repositorio pero no en el
  servidor hasta el próximo push a `develop`, y solo se activa si las dos
  variables están cargadas en Easypanel.

## Lo segundo: terminar tu mitad de FU-05

Guía paso a paso ya entregada. En orden:

1. ✅ ~~MinIO~~ · ✅ ~~`slgweb-staging`~~ · ✅ ~~DNS de `staging`~~ — hechos el 09.
2. **Cargar `STAGING_BASIC_AUTH_USER` y `STAGING_BASIC_AUTH_PASSWORD`** en el
   Entorno de `slgweb-staging`. Sin ellas el middleware no se activa.
3. **Push a `develop`** para que el middleware llegue al servidor.
4. **Comprobar** que `staging.softlandingglobal.com` pide contraseña.
5. **Pausar los monitores de la raíz y `www`** en UptimeRobot hasta el go-live:
   tres semanas en rojo enseñan a ignorar las alertas.
6. Pendiente menor: los dos cubos privados de MinIO (`downloads`, `deliverables`)
   y una clave de acceso para la aplicación. No hace falta hasta FU-09.

**Aviso**: el primer despliegue ya NO debería fallar por el rol de PostgreSQL.
Se cerró anoche con `scripts/db/setup-app-role.ts`. En Easypanel hay que
ejecutar `npm run db:deploy` antes de arrancar la aplicación (migraciones + rol).

## Lo que quedó abierto, por orden de urgencia

| # | Qué | Quién | Cuándo |
|---|---|---|---|
| 1 | **R-40** — decidir el gate D1 | Ricardo | Mañana, primero |
| 2 | Tu mitad de FU-05 | Ricardo | Mañana |
| 3 | **R-39** — la caducidad del certificado no está vigilada (el plan gratuito de UptimeRobot no lo incluye) | Ricardo | Antes del go-live |
| 4 | **P-3 y P-4** — dirección remitente y nombre del subdominio de envío | Ricardo | Antes de FU-08 |
| 5 | **S-01** — rotar la credencial del CRM | Ricardo | Diferida a go-live, por decisión propia |
| 6 | Los cinco subdominios sin documentar (`abril`, `xic`, `sabha`, `easypanel`, `panel`) | Ricardo | Cuando quiera |

## Hallazgos de anoche que conviene no olvidar

- **Tu DMARC es `p=quarantine` sin `sp=`.** Los subdominios heredan esa política,
  así que el subdominio de envío de D-24 nace en cuarentena, **sin periodo de
  gracia**. Verificar el dominio en Resend y probar la entrega antes de invitar a
  un cliente real.
- **Tu VPS tiene más carga de la que el plan suponía.** Diez nombres apuntando a
  `167.88.42.76`, no cinco. Refuerza R-25 y hace más valiosa la monitorización.
- **Tres decisiones tuyas casi se pierden.** D-47, D-48 y D-49 se escribieron con
  un script que imprimía «registrada» sin comprobarlo. Detectado al cuadrar los
  conteos al cierre y corregido. Lección aplicada: verificar, no confiar en el
  mensaje de éxito.

## Entorno tal como quedó

- `slg-db` (PostgreSQL 16) **corriendo** en el puerto **5434**, con datos de
  ejemplo sembrados. El `crm-db-1` del CRM sigue intacto en el 5432.
- Docker Desktop **encendido**. Si molesta, se puede parar: `docker compose down`
  en el repositorio para el contenedor de este proyecto sin tocar los demás.
- Sin subir a GitHub: **11 archivos**. Incluyen el pipeline de CI, el `Dockerfile`
  y la capa de datos completa.
