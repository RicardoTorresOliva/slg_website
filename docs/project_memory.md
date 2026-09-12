---
type: docs
title: Project memory
project: slg_website
status: ejecución
timestamp: 2026-09-11
---

# Project memory — slg_website

## Estado actual

- **Fase**: ejecución (`start-execution`), plan aprobado por Ricardo el 2026-09-08. Perfil activo:
  `software-app`. Stack cerrado — cada elección justificada en `docs/decision_log.md` (D-1 a D-64).
- **M0-A completa** (FU-02, FU-03, FU-04, FU-05).
- **M0-B**: FU-06 y FU-09 `done`. FU-07 y FU-08 `in_progress` — construidas y probadas de punta a
  punta; Ricardo ya cargó las credenciales reales (Google, Microsoft, Resend) en `slgweb-staging`,
  pero **falta la verificación real** (login de punta a punta, envío real de correo) — ver detalle
  más abajo.
- **M1-A**: **FU-01 y FU-10 `done`**. FU-01 se cerró el 2026-09-11 con aprobación explícita de
  Ricardo ("Apruebo todos los copy", registrada en `work_log.md`). **Consecuencia directa: DU-02 y
  DU-03 quedan desbloqueadas** — es la unidad de trabajo más natural para la próxima sesión.
- **M2**: FU-11 `in_progress` — mecanismo propio construido y probado contra Postgres real; dos de
  sus seis criterios dependen de páginas/formularios que no existen todavía (DU-02/03/08).
- 39 unidades totales (Anexo E). Nada pusheado a `origin` — todo commiteado en `develop` local.

## Qué hacer a continuación (en orden razonable)

1. **DU-02 (armazón público) y DU-03 (Home)** — ya desbloqueadas, sin ningún pendiente de este
   repositorio. El copy real de Home vive en `content/pages/{es,en}/home.md` (con varios
   `[PENDIENTE]` explícitos — ver más abajo, no bloquean construir, sí bloquean que la página llegue
   completa a `main`). Los componentes ya existen y están probados en `/prototipos` (FU-10): `NavBar`,
   `Footer`, `Hero`, `BranchCard`, `QueIncluye`. Es la unidad de mayor impacto para la próxima sesión.
2. **Verificar de punta a punta FU-07/FU-08** contra staging: login real de Google/Microsoft (las
   redirect URIs ya están confirmadas exactas por Ricardo) y un envío real de correo por Resend
   (dominio `mailweb.softlandingglobal.com`, ya verificado). Necesita acceso a staging con sesión
   real o que Ricardo lo pruebe y reporte.
3. **FU-14 (backups)** — bucket y los dos tokens de R2 ya creados (ver detalle abajo); falta solo la
   clave de cifrado y confirmar si Easypanel tiene cron nativo antes de poder construir el mecanismo.
4. Contenido pendiente de FU-01 que solo Ricardo (o SLG_Overhauling) puede dar — ver lista abajo.

## FU-01 · Copy maestro bilingüe · `done` (2026-09-11)

Borrador redactado por el agente contra `~/Dev/SLG_Overhauling/SLG Overhauling.md` (fuente real,
fuera de este repo) y las guías de `knowledge/`; aprobado explícitamente por Ricardo el mismo día
(D-64, `work_log.md`). Cubre Home, los 4 overviews de rama, los 11 `service` (secciones 1–3; 4–6 ya
eran texto compartido), sus 11 `download`, Doctrina (shell) y Nosotros, más ~29 cadenas de
`content/ui` ya cerradas. Verificado en verde contra `npm run check:content` y `npm run verify`.

**`[PENDIENTE]` que la aprobación NO resuelve — sigue faltando el dato, no es un olvido**:
- Cita/resumen público de The Phoenix Doctrine (Home, Doctrina) — vive en Docs_MD, fuera de este
  repo; `knowledge/doctrine-summary.md` prohíbe rellenarlo por inferencia.
- Biografía y mentorías de Nosotros — dato que debe aportar Ricardo.
- Qué documento de los 11 se destaca en Home y con qué criterio rota — decisión de producto.
- Contenido específico (más allá del nombre) de 6 de los 11 servicios: Phoenix TEAx/RETx, Customize
  Programs, AI Coaching for Directors, APP_Building, AGE_Building.
- Título, público y qué-aprende de los documentos D-02…D-11 (`content/downloads/`).

**Hallazgo propio, corregido**: `lib/content/schema.ts` rechazaba `parent: null` en el registro de
`SLG_Holdings` (una rama sin overview padre, caso legítimo) — la excepción de "`null` válido" miraba
el nombre del campo (`pair`), no la función de validación (`isPair`, compartida con `parent`).
Corregido por función, no por nombre.

## FU-10 · Sistema de componentes C.5 · `done` (2026-09-11)

Los nueve componentes construidos, en `/prototipos`, verificados en el navegador real contra el
build de producción — incluida la finalización visual de las animaciones (confirmado con el panel
del navegador visible: Escape y clic en el scrim cierran el sheet móvil limpio, el hero completa su
entrada). **Hallazgo real, D-58**: `MobileSheet` nunca cerraba — un `useMotionValue` externo por
`style` bloqueaba `animate`/`exit` de Motion; corregido dejando que Motion gestione `y`
internamente (mismo patrón aplicado desde el diseño en el `Drawer` del shell de app). **D-62**:
`--blue-deep` oscurecido de `#24394D` a `#182430` por pedido de Ricardo (títulos "muy tenues" para
una agencia que debe proyectar firmeza) — mismo matiz, contraste sube de 11,9:1 a 15,7:1.

## FU-11 · Anti-abuso propio · `in_progress` (2026-09-11)

Construida sin bloqueo externo mientras Ricardo estaba fuera (depende solo de FU-04/FU-05, `done`).
Tablas `blocked_email_domain` (RF-31/32, editable con un `INSERT`, sin desplegar) y `rate_limit_event`
(RF-34, ventana deslizante) — RLS solo `system`, ninguna de las dos es dato de empresa.
`lib/anti-abuse/` completo (`esDominioDeCorreoGratuito`, `verificarLimiteDePeticiones`,
`esHoneypotRelleno`), probado contra Postgres real (`scripts/db/test-anti-abuse.ts`, 16
comprobaciones, incluida una prueba de concurrencia real).

**Hallazgo propio, corregido**: la primera versión del límite de peticiones tenía una condición de
carrera real (contar y luego insertar en dos sentencias separadas); corregida con
`pg_advisory_xact_lock`, verificada con 10 peticiones simultáneas contra un umbral de 5.

**No está `done`**: los criterios 5 (cero scripts de terceros en 27 rutas) y 6 (validar contra
esquema en un formulario real) no se pueden cerrar sin páginas públicas reales (DU-02/03+) ni un
formulario con Server Action real (DU-08) — ninguno existe todavía.

## FU-07 · Servicio de invitaciones · `in_progress`

Emisión, revocación, reenvío, aceptación por los tres métodos — probada contra Postgres/SMTP reales
(27 comprobaciones) y contra el navegador real (contraseña, de punta a punta). **Google/Microsoft**:
Ricardo cargó las credenciales reales en `slgweb-staging` (2026-09-11) y confirmó que las "Authorized
redirect URIs" en Google Cloud Console / Azure coinciden exactamente con
`https://staging.softlandingglobal.com/api/auth/callback/{google,microsoft}`. **Sin verificar
todavía**: un inicio de sesión real de punta a punta contra staging (necesita una invitación sembrada
ahí, o probarlo Ricardo directamente). Hasta esa prueba, el criterio 2 (los tres métodos funcionando)
no cierra aunque las credenciales ya existan.

Dos hallazgos en unidades ya `done`, corregidos aquí — **D-56** (`disableImplicitSignUp` faltante en
proveedores sociales de FU-06, hueco de seguridad real nunca explotado) y **D-57**, el más grave: la
CSP estática de FU-05 bloqueaba la hidratación de React en todo el sitio — corregida con CSP de
nonce por petición y `dynamic = "force-dynamic"`; el gate D1 mejoró, no empeoró, tras el cambio.

## FU-08 · Adaptador de correo transaccional · `in_progress`

Puerto propio en `lib/email/`, SMTP estándar, cola de reintento con barrendero en proceso. Probado
contra SMTP real (captador en proceso, sin Docker, 33 comprobaciones). **P-3/P-4/F.2-4 resueltos
(D-60)**: subdominio real `mailweb.softlandingglobal.com` (Resend, estado Verified — distinto del
ejemplo provisional `mail.softlandingglobal.com` que se había usado antes de confirmarlo), variables
`MAIL_SMTP_*`/`MAIL_FROM_*` ya actualizadas por Ricardo en `slgweb-staging`. **Sin verificar
todavía**: un envío real de punta a punta contra staging con las variables nuevas, y confirmar en el
panel de Resend que el seguimiento de apertura/clics sigue desactivado.

## FU-06 · Módulo de identidad y autorización · `done`

Better Auth 1.7.3, matriz B.3, compuertas de `/hq`/`/portal`, claves de API. Sin los plugins
`organization`/`admin`/`apiKey` (D-52). `/hq`/`/portal` existen con `HABILITADO = false` hasta
DU-13/DU-18.

## FU-09 · Almacenamiento de archivos y URLs firmadas · `done`

`lib/files/`: URL firmada de descarga (GET SigV4) y de subida (POST policy). Verificado contra MinIO
real (binario Homebrew local, sin Docker) y en CI. Sin llamador real todavía (DU-08, DU-13/DU-15) —
hueco de esquema anotado aparte (`task_fb516747`), no bloquea el cierre de FU-09.

## FU-14 · Backups cifrados a R2 · sin empezar — preparación de Ricardo en curso (2026-09-11)

**Hecho por Ricardo, con el agente guiando el navegador (Claude in Chrome) en directo, D-65**:
1. Bucket `slg-backups` creado en Cloudflare R2.
2. **Dos tokens de cuenta creados** (verificados en pantalla, `Account API tokens`):
   - `slg-backup-write` — `Object Read & Write`, acotado a `slg-backups`, TTL `Forever`. Para el
     proceso de copia.
   - `slg-backup-purge` — mismo permiso y bucket, TTL `Forever`, guardado **por separado** del
     anterior. Para la purga de copias antiguas.
   - Nota real (D-65): R2 **no tiene un nivel de permiso "escribe sin borrar"** — los dos tokens son
     técnicamente capaces de borrar; la mitigación de R-37 es de procedimiento (cada proceso solo
     tiene acceso a su propio token), no una restricción que Cloudflare aplique por sí sola.
   - Ricardo tiene ambos secretos guardados en su gestor de contraseñas — **el agente nunca los vio**
     (a propósito: no deben pasar por el chat).
3. Account ID: `b1e37064c773099db5e12fbaa6134a55`. Endpoint S3:
   `https://b1e37064c773099db5e12fbaa6134a55.r2.cloudflarestorage.com`.

**Falta todavía, antes de poder construir FU-14**:
1. **Clave de cifrado**: `openssl rand -hex 32`, guardada fuera del VPS y del repositorio.
2. **Confirmar si Easypanel tiene cron/tareas programadas nativas** para la copia diaria — sin
   verificar todavía, Ricardo tiene que mirarlo en el panel.

Con esas dos cosas, FU-14 se puede construir en una sesión.

## Entorno local

- `docker-compose.yml` levanta `slg-db` (PostgreSQL 16, puerto **5434**). `slg-mail-a`/`slg-mail-b`
  (mailpit) son opcionales, solo para inspección manual.
- Credenciales en `.env` (ignorado por git); `.env.example` documenta solo los nombres.
- **Migraciones — cuidado real, no cosmético**: el journal interno de `drizzle-kit`
  (`drizzle/meta/_journal.json`) solo conoce `0000` y `0004` (las dos generadas por `drizzle-kit`);
  las escritas a mano (`0001`, `0002`, `0003`, `0005`…`0010`) nunca se registraron ahí. La próxima vez
  que alguien corra `drizzle-kit generate`, va a intentar reutilizar un número ya usado y puede
  generar SQL que repite columnas/restricciones ya aplicadas a mano — **hay que diffear a mano el
  archivo que genere contra lo que ya existe antes de aceptarlo**, renombrarlo al siguiente número
  real, y corregir el `tag` en `_journal.json`. Pasó una vez ya (D-63) y se resolvió así. Aplicación
  real: `drizzle-kit migrate` para las tracked (`0000`, `0004`, `0009`) + un bucle manual para las
  escritas a mano (`ci.yml`, o un script con el paquete `postgres` si no hay `psql` a mano local).
- **MinIO local**: binario Homebrew, no Docker. Arrancar a mano (ver comando en decision_log D-51 o
  en el historial de `work_log.md` de FU-09).
- `.claude/launch.json` arranca `npm run dev` en el puerto **3100**.
- Todo el sitio se renderiza dinámicamente desde D-57 — no hay páginas estáticas que reconstruir.

## Infraestructura desplegada

- `slg-web` (producción, `main`) y `slgweb-staging` (`develop`) en Easypanel, cada uno con webhook de
  auto-deploy en GitHub. `main` protegida (PR + CI en verde obligatorios).
- Google/Microsoft OAuth y Resend: credenciales reales cargadas en `slgweb-staging` (2026-09-11),
  redirect URIs confirmadas — verificación de punta a punta todavía pendiente (ver FU-07/FU-08
  arriba).
- MinIO con los cubos `downloads`/`deliverables` creados y privados; credencial de administrador
  directa (D-51/R-41: rotar a una clave acotada antes del go-live).
- Bases de datos separadas por entorno (`slg_website_prod` vs. staging), mismo servicio Postgres.
- UptimeRobot vigila `staging.softlandingglobal.com`; producción pausada a propósito hasta el
  go-live. Aviso solo por correo a `torresoliva.ricardo@gmail.com`.

## Decisiones fijadas (no re-explorar)

Todas registradas en `docs/decision_log.md` (D-1 a D-64). Dos marcadas
**[IRREVERSIBLE-TRAS-FU-04]** (D-26, D-27).

## Blockers

- **F.2-2/F.2-3/F.2-4** (Google, Microsoft, Resend): credenciales ya cargadas, falta verificación
  real de punta a punta — no bloquea seguir con otras unidades.
- **FU-14**: esperando que Ricardo prepare Cloudflare R2 + clave de cifrado (instrucciones arriba).
- **S-01** (rotación de una credencial de construcción): diferida a go-live, fuera de este repo.
- Ninguno bloquea DU-02/DU-03 — ver "Qué hacer a continuación" arriba.
