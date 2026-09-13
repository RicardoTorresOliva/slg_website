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

**Dieciséis unidades tocadas:** once `done` (FU-02, FU-03, FU-04, FU-06, FU-07, FU-10, DU-02,
**DU-03**, **DU-04**, **DU-05**, DU-11) y cinco `in_progress` (FU-05, FU-08, FU-09, DU-01, FU-01).

**La capa pública está construida**: 58 rutas en los dos idiomas, todas prerrenderizadas, con
Lighthouse móvil medido — **100 de accesibilidad** en portada, servicio y artículo.

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

### ~~1. Aprobar los nueve prototipos de FU-10~~ — **hecho el 2026-09-12**

Aprobada por Ricardo. FU-10 `done`, y con ella DU-02 construida.

### 1. Revisar el copy temporal, y darme cuatro datos — ya NO bloquea nada

**El copy está escrito**: 74 registros, los dos idiomas, cero huecos. Está marcado `copy: temporal`
y se puede publicar tal cual.

Lo que necesito de ti son **cuatro enumeraciones** que el contrato A.3 pide «tal cual la fuente» y que
no están en este repositorio, más la revisión del resto cuando quieras:

1. Los nombres de las **once dimensiones** de `SLG_Readiness`.
2. Las **tres promesas** de `CoO as a Service`.
3. Las **tres líneas** de `SLG_Holdings`.
4. Qué distingue a **`Phoenix PEEx`, `TEAx` y `RETx`** — el brief los nombra sin definirlos, y hoy los
   diferencio por audiencia (individual · equipo · revisión de lo ya implementado), que es plausible
   pero **no está confirmado**.

Mándalas en un mensaje y las cambio en un commit.

### 2. Desplegar — cierra FU-05

`docs/deployment.md`, secciones **§3 a §5**. Los cinco servicios de Easypanel ya existen con sus
nombres reales (`slgwebpostgres`, `minio`, `slg-web`, `slgweb-staging`, `umami` + `umami-db`).

### 3. Corregir el remitente y hacer la prueba de bandeja — cierra FU-08

La credencial SMTP ya está puesta. **Pero el remitente apunta a un dominio que no existe**:
`MAIL_FROM_ADDRESS` dice `mail.softlandingglobal.com` y el verificado es `mailweb.` (con `web`).
Comprobado por DNS el 2026-09-12: `mail.` no tiene ni DKIM ni SPF. Corregirlo son dos clics y está en
`docs/deployment.md` **§4bis.0**. La prueba de bandeja se hace **desde el navegador**, con la página
`/api/ops`: **§4bis.3**.

### 4. Confirmar los dos buckets de MinIO — cierra FU-09

`downloads` y `deliverables`, los dos **privados**, más las seis variables `S3_*`. La consola de MinIO
se abre publicando su puerto 9001 desde Easypanel: los clics exactos están en `docs/deployment.md`
**§4ter**. Que los buckets sean realmente privados **lo comprueba `/api/ops` por ti**, sin entrar en
la consola.

### 5. Los dos registros de OAuth — cierra los criterios 1 y 3 de DU-01

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
   (R-26): *un script que nunca se ha visto en rojo no se acepta como gate verde*. Van **veintidós**.
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
| Que los **veintidós** frenos siguen frenando | `npm run check:brakes` |
| Las **519** comprobaciones contra base, correo, archivos, CRM, webhooks y HQ | `npm run test:db` |
| Cero terceros en la capa pública, medido con un navegador | `npm run check:terceros` |
| Las cuatro cláusulas del sheet, cuadro a cuadro | `npm run test:gesto` |

`npm run check:ci` y `test:db` necesitan `DATABASE_URL` y `DATABASE_URL_MIGRATIONS`; los imprime
`bash scripts/db/local-pg.sh env`. **Esos comandos los ejecuta el asistente, no Ricardo.**

---

## Estado al 2026-09-13 (fin de la sesión larga)

**M2 cerrado en código y M3 construido entero.** Ocho unidades esta sesión: **DU-12** (webhooks
firmados + analítica sin terceros), **FU-12** (armazón de HQ y portal), **DU-13** (tablero),
**DU-14** (empresas, proyectos, usuarios), **DU-16** (capturas y reintento), **DU-17** (claves y
auditoría), **DU-15** (entregables y avisos) y **FU-13** (batería de aislamiento).

**HQ tiene sus nueve rutas construidas y verificadas**, y **sigue devolviendo 404 a todo el mundo**:
`SUPERFICIES_ABIERTAS.hq` está en `false` porque M3 sigue abierto (RF-87). No es un olvido — se
cambia al cerrar el milestone, y hasta entonces la revisión visual de esas pantallas queda como
criterio abierto, igual que el criterio 7 de DU-07 espera al despliegue.

### Lo que sigue esperando a Ricardo, en orden de lo que más desbloquea

| # | Qué | Dónde está el paso a paso | Qué desbloquea |
|---|---|---|---|
| 1 | Los **cinco servicios y el DNS** (FU-05, criterios 1, 2, 3 y 8) | `docs/deployment.md` §2–§5 | **Todo lo demás.** Sin despliegue no hay staging, y sin staging no se cierran D1–D6 en producción |
| 2 | El **subdominio de correo** y la prueba de bandeja de entrada (FU-08) | `docs/deployment.md` §4bis, y la comprobación en `/api/ops` | Invitaciones, recuperación de contraseña, avisos de fallo del CRM |
| 3 | Los **dos buckets privados** de `minio` y las `S3_*` (FU-09) | `docs/deployment.md` §4ter | La entrega real de documentos (DU-08) y los entregables (DU-15) |
| 4 | Las **dos claves del CRM** (F.2-5) | `docs/deployment.md` §4septies | Que los leads lleguen al CRM y que el tablero enseñe métricas |
| 5 | **Google y Microsoft** (F.2-2, F.2-3) | `docs/deployment.md` §4quater | El gate **D8** y con él el cierre de DU-01 y DU-14 |
| 6 | La **firma del copy** (FU-01) y las cuatro enumeraciones literales | `implementation/task_tracker.md` | Pasar de `copy: temporal` a `copy: aprobado` |
| 7 | **S-01** | Canal privado, nunca aquí | El DoD de go-live |

Opcionales, y el sitio funciona sin ellos: la **analítica autoalojada** (§4quinquies) y los
**webhooks a n8n** (§4sexies).
