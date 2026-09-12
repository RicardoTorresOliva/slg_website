---
type: docs
title: Handoff — cómo retomar slg_website en una sesión nueva
project: slg_website
status: execution
timestamp: 2026-09-12
---

# Handoff — para abrir una sesión nueva

Este documento es lo primero que hay que leer al empezar una sesión nueva. Dice **dónde está el
proyecto**, **qué falta**, y **quién tiene que hacer cada cosa**.

---

## REGLA PERMANENTE DE COMUNICACIÓN CON RICARDO

> **Toda instrucción para Ricardo se explica paso a paso, y NUNCA se da por supuesto que él sabe
> dónde va cada cosa que se le indica.**

Esto no es una preferencia de estilo: es una condición de trabajo, y se aplica siempre.

**Qué significa, en concreto:**

1. **Ricardo no tiene terminal.** No se le pide que ejecute comandos. Si hace falta ejecutar algo, lo
   ejecuta el asistente. Si algo solo puede hacerse en un panel web, se le dan **los clics**, no la
   orden de shell.
2. **Se nombra el sitio exacto, siempre.** No «pon la variable de entorno»: **«entra en
   `easypanel.softlandingglobal.com`, abre el proyecto `slg`, haz clic en el servicio `slg-web`,
   pestaña *Environment*, y añade esta línea»**. Nombre del panel, nombre del servicio, nombre de la
   pestaña, nombre del campo.
3. **Nunca se dice «esto falla», «esto bloquea» o «falta esto» y se deja ahí.** Se dice qué falla y
   **la solución concreta, el paso a paso**. Si la solución es de Ricardo, se le entrega lista para
   ejecutar. Si no se sabe de dónde sale un dato —una credencial, un webhook, un registro DNS—, la
   respuesta no es «consíguelo»: es **dónde está exactamente ese botón**.
4. **Si un dato está en una pantalla de un servicio externo**, se describe la pantalla: qué menú, qué
   sección, qué botón, y qué se ve cuando está bien.
5. **Nada de explicaciones largas antes de resolver.** Primero se resuelve; la explicación va después
   y va corta.
6. **Se avanza sin preguntar** lo que se puede decidir con lo que ya está escrito en `AGENTS.md`, los
   `design_docs` y el `decision_log`. Solo se le pregunta lo que la gobernanza reserva a él: elección
   de producto, compuertas de aprobación y datos que solo él tiene.

Cuando una instrucción incumple esto, la instrucción está mal escrita. Se reescribe.

---

## Dónde está el proyecto

**Fase:** ejecución. Compuerta de Planificación abierta por Ricardo el 2026-09-08.

**Once unidades tocadas:** cinco `done` (FU-02, FU-03, FU-04, FU-06, FU-07) y seis `in_progress`
(FU-05, FU-08, FU-09, DU-01, FU-01, FU-10).

**Todo lo que está `in_progress` lo está por algo que no es código.** No hay ninguna unidad esperando
a que alguien escriba una función. Lo que falta es: dos compuertas de aprobación de Ricardo, y acceso
a paneles externos.

**Verificación en verde el 2026-09-12:** `check:ci` completo · `check:brakes` con **trece** frenos,
cada uno visto en rojo por su motivo · `test:db` con **264** comprobaciones contra PostgreSQL, SMTP y
servidores HTTP reales · `test:gesto` con **10** comprobaciones cuadro a cuadro sobre un Chromium
real.

---

## Lo que falta, y es de Ricardo

Van en orden de lo que más desbloquea. Cada una tiene su paso a paso en el documento que se indica.

### 1. Aprobar los nueve prototipos de FU-10 — desbloquea DU-02, DU-03 y todas las DU de página

1. Abre **`https://staging.softlandingglobal.com/prototipo`** en el navegador.
2. Si pide usuario y contraseña, son las de la compuerta de staging: las que pusiste en Easypanel, en
   el servicio **`slgweb-staging`**, pestaña *Environment*, variables `STAGING_BASIC_AUTH_USER` y
   `STAGING_BASIC_AUTH_PASSWORD`.
3. **Míralo primero en el móvil**: el sheet arrastrable solo existe ahí. Toca «Menú», arrastra el
   panel hacia abajo con el dedo y suéltalo. Prueba también a lanzarlo rápido y corto, y a arrastrarlo
   hacia arriba para notar la resistencia.
4. En el ordenador, recorre la página **solo con la tecla Tab**. Tienes que ver un anillo de foco en
   **todos** los elementos por los que pases.
5. Responde una sola cosa: **«apruebo FU-10»**, o la lista de cambios. **Una sola ronda.**

Paso a paso completo: `docs/work_log.md`, entrada de FU-10.

### 2. Cerrar la compuerta del copy (FU-01) — desbloquea M1-A entero

El esqueleto bilingüe está completo: **71 registros**, las once páginas de servicio con los seis
bloques del contrato A.3, en los dos idiomas. **El copy no está escrito, y es deliberado**: son
afirmaciones sobre una empresa real y el criterio 3 exige dato verificado; la fuente es
`SLG_Overhauling`, que vive fuera de este repositorio.

Orden en que hay que rellenarlo, que es el orden comercial del contrato: Home → `SLG_AI` → las tres
ramas → el resto. **Una sola ronda.**

Paso a paso: `docs/work_log.md`, entrada de FU-01.

### 3. Desplegar — cierra FU-05

`docs/deployment.md`, secciones **§3 a §5**. Los cinco servicios de Easypanel ya existen con sus
nombres reales (`slgwebpostgres`, `minio`, `slg-web`, `slgweb-staging`, `umami` + `umami-db`).

### 4. La credencial SMTP y la prueba de bandeja — cierra FU-08

El subdominio **`mailweb.softlandingglobal.com`** está verificado desde el 2026-09-11. **No hay que
crear el subdominio de tracking.** Falta la credencial SMTP en Easypanel y probar que el correo llega
a tres buzones. Paso a paso: `docs/deployment.md` **§4bis**.

### 5. Confirmar los dos buckets de MinIO — cierra FU-09

`downloads` y `deliverables`, los dos **privados**, más las seis variables `S3_*`. Paso a paso:
`docs/deployment.md` **§4ter**.

### 6. Los dos registros de OAuth — cierra los criterios 1 y 3 de DU-01

Consentimiento de Google Cloud y registro de aplicación en Entra ID, con las URL de retorno exactas.
Paso a paso: `docs/deployment.md` **§4quater**.

---

## Cómo trabaja este proyecto (para quien abra la sesión)

**La gobernanza está en `AGENTS.md`.** `CLAUDE.md` solo apunta ahí. Se lee antes de tocar nada.

**Cinco reglas que este proyecto ha aprendido a la mala, y que no se negocian:**

1. **El sistema que corre manda sobre el documento.** Ha pasado cuatro veces: la base de datos, el
   `CHECK` de `membership.org_role`, las cifras de contraste del `style_guide`, la CSP. Cuando la
   medición y el documento no coinciden, **se corrige el documento** y se registra la decisión.
2. **Se verifica contra infraestructura real, no contra dobles.** PostgreSQL de verdad
   (`bash scripts/db/local-pg.sh up`), servidores SMTP de verdad, un servidor que verifica firmas
   SigV4 de verdad, el servidor `standalone` de verdad, y un Chromium de verdad. Un doble siempre sale
   verde.
3. **Todo criterio mecanizable se convierte en freno de CI, y todo freno tiene prueba negativa**
   (R-26): *un script que nunca se ha visto en rojo no se acepta como gate verde*. Van trece.
4. **Este repositorio es PÚBLICO** (§10-6). Cero credenciales, cero entregables de cliente, cero
   nombres de cliente sin autorización. Lo vigilan `check:secrets`, gitleaks y `check:archivos`.
5. **Sin lock-in de producto.** Correo por SMTP estándar, almacenamiento por API S3 genérica. Cambiar
   de proveedor cuesta variables de entorno, no líneas de código.

**Después de cada unidad se documenta**: entrada en `docs/work_log.md`, estado en
`implementation/task_tracker.md`, y las decisiones en `docs/decision_log.md`. Al cerrar la sesión, se
actualiza `docs/project_memory.md`.

**Rama de trabajo:** `claude/nice-euler-0uhryc`. No se abre pull request salvo que Ricardo lo pida.

---

## Para verificar que todo sigue en pie

| Qué | Comando |
|---|---|
| Base de datos efímera para las pruebas | `bash scripts/db/local-pg.sh up` |
| Pipeline entero | `npm run check:ci` |
| Que los trece frenos siguen frenando | `npm run check:brakes` |
| Aislamiento, correo, invitaciones, archivos y acceso | `npm run test:db` |
| Las cuatro cláusulas del sheet, cuadro a cuadro | `npm run test:gesto` |

`npm run check:ci` y `test:db` necesitan `DATABASE_URL` y `DATABASE_URL_MIGRATIONS`; los imprime
`bash scripts/db/local-pg.sh env`. **Esos comandos los ejecuta el asistente, no Ricardo.**
