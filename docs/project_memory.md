---
type: docs
title: Project memory
project: slg_website
status: ejecución
timestamp: 2026-09-11
---

# Project memory — slg_website

## Estado actual (última sesión: 2026-09-11, larga — Opus 5)

- **Fase**: ejecución. Perfil `software-app`. Decisiones en `docs/decision_log.md` (D-1 a D-72).
- **M0-A completo** · **M1-A completo** · **M1-B completo** (DU-04, DU-05, DU-06, DU-07 pendiente).
- **15 unidades `done`**, 5 `in_progress` (FU-07, FU-08, FU-11, FU-14, DU-08), 19 `pending`.
- Todo commiteado en `develop` local. **Nada pusheado a `origin` todavía.**

### El sitio público, hoy funcionando en los dos idiomas

`/` · `/ai` · las tres líneas · **las 11 páginas de servicio** · `/descargas` + **las 11 fichas con
formulario** · `/gracias` · **blog completo** (índice, artículo, etiquetas, RSS) · `/doctrina` ·
`/nosotros` · `/contacto` · `/legal/privacidad` y `/legal/terminos`. **No queda ningún 404 en el
menú ni en el pie.** Gate D1: **100 · 100 · 100 · 100**, LCP 1,7 s.

**La máquina de captura funciona de verdad**, verificada contra Postgres real por las tres puertas:
`download`, `contact` y `doctrine-request`, las tres con `crm_sync_status: pending`.

## Plazo declarado por Ricardo

Presentación al directorio el **lunes 14** y arranque de campaña el **martes 15** (declarado el
viernes 11 por la noche).

## Qué hacer a continuación (en orden)

1. **DU-09 — entrega al CRM.** Es lo único que separa «lead capturado» de «lead en el CRM». **Ya
   está desbloqueada**: Ricardo confirmó que cargó las dos claves en Easypanel. El modo es
   `contact_note` (verificado en el código del CRM: la clave de API permite `POST /contacts` y
   `POST /notes`, no crear empresas ni oportunidades). Ruta de ficha confirmada: `/contactos/:id`.
2. **Cerrar DU-08** — faltan sus criterios 3, 6 y 8, que exigen **un archivo real** en el bucket, y
   la batería automatizada del criterio 11.
3. **DU-07** — SEO técnico, 404/500 y cierre de gates D1–D6. Cierra M1-B.
4. **Cerrar FU-14** — tercer token de R2 y ensayo de restauración (ver su sección).

## Lo que bloquea el go-live, y solo Ricardo puede resolver

1. **Los 11 documentos de descarga no existen** (EXT-1). Las 11 fichas están construidas y capturan
   correo, pero muestran «disponible próximamente». Una campaña cuyo CTA es descargar un documento
   necesita el documento.
2. **Revisión legal del borrador** (F.2-1). El copy legal existe y describe con exactitud lo que el
   sitio hace; las determinaciones jurídicas siguen `[PENDIENTE]` **a propósito**, y eso mantiene
   `check:pending` bloqueando `main`. Quitarlo es decisión de Ricardo, no del agente.
3. **6 de los 11 servicios sin contenido** más allá del nombre, y el resumen público de The Phoenix
   Doctrine. Hoy: **79 marcadores `[PENDIENTE]` en 67 archivos**.

## Trampas conocidas (leer antes de tocar)

- **La regla `a` de `globals.css` vive fuera de toda `@layer`**, así que en Tailwind v4 gana a
  cualquier utilidad: `className="text-paper"` sobre un enlace **no hace nada**. Los arreglos de
  color de enlace viven en `globals.css` (`.seccion-oscura`, `.superficie-suave`, `footer a`).
- **`--blue-primary` sobre `--paper-2` da 4,37:1**: incumple WCAG AA en texto normal. Cualquier
  tarjeta o franja en `--paper-2` lleva la clase `.superficie-suave` (D-68).
- **El contenido escribe rutas en dos convenciones** (unos registros ingleses en canónica española,
  otros ya en inglés). Usa siempre `localizarRuta`/`canonicalizarRuta` de `lib/routes/map.ts`.
- **Un fallo de hidratación deja las animaciones de entrada congeladas en su estado inicial**: si el
  hero «no aparece», es hidratación rota, no motion. El Fast Refresh del dev server se corrompe tras
  muchas ediciones seguidas — reinicia el servidor antes de investigar.
- **Los slugs ingleses no siguen una regla única** (`slg-ai-en` lleva sufijo; `about` y `doctrine`
  son otra palabra). Busca por `pair`, nunca transformando texto.
- **Migraciones**: ver la nota de `drizzle-kit` más abajo. Sigue vigente.

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

## FU-14 · Backups cifrados a R2 · `in_progress` (2026-09-11)

**Construida y verificada** contra PostgreSQL 16 y MinIO reales (MinIO hace de R2: misma API S3),
con las dos imágenes Docker ejecutadas y el cron de D-66 disparando solo dentro del contenedor. La
restauración se probó **desde una copia antigua**. Código en `lib/backups/` (puerto §8.3, cifrado
AES-256-GCM en flujo, generaciones), `scripts/backups/` (copia, purga, restauración, inventario,
25 pruebas) y `ops/backups/{copia,purga}/` (Dockerfile + crontab por servicio). Decisiones nuevas:
**D-69** (tercer token de R2, de solo lectura), **D-70** (dos servicios App, no uno), **D-71** (el
paquete de volúmenes guarda el papel del cubo, no su nombre — evitaba que restaurar en staging
escribiera en producción) y **D-72** (retención por conteo de ejecuciones, nunca por antigüedad).

**Los dos criterios que faltan no son código**:
- Criterio 4: R2 no ofrece «escribe pero no borra» (ya asumido en D-65). La separación es de proceso
  y de código, no un permiso del proveedor.
- Criterio 6: falta el **ensayo de restauración cronometrado sobre `slgweb-staging` real**.

**Pasos manuales pendientes de Ricardo (en este orden):**

*Cloudflare*
1. Crear un tercer token **`slg-backup-restore`** con permiso **`Object Read only`**, acotado al
   bucket `slg-backups`, TTL `Forever`, guardado por separado (D-69). Sin él la restauración no
   arranca — el código no tiene recurso a los otros dos tokens, a propósito.

*Easypanel*
2. Servicio App **`slg-backup`** — `Dockerfile` en `ops/backups/copia/Dockerfile`, contexto de build
   la raíz. Variables: `R2_*` de escritura, `BACKUP_ENCRYPTION_KEY` (la de D-66), `BACKUP_DATABASE_URL`
   (**el rol dueño**, no `slg_app`: con el rol de aplicación el RLS está activo y el volcado saldría
   con la mitad de las filas), `FILES_S3_*`, `FILES_BUCKET_*`, `MAIL_SMTP_*` y `MAIL_ALERTS_TO`.
   **Ninguna variable `_PRUNE`**: si aparece, el servicio no arranca, y es deliberado.
3. Servicio App **`slg-backup-purga`** — `ops/backups/purga/Dockerfile`. Solo `R2_*` de purga y las
   cuatro `BACKUP_RETENTION_*`. **Ni clave de cifrado, ni base de datos, ni `FILES_*`.** Retención
   sugerida: 14 diarias, 8 semanales, 12 mensuales, 30 pre-migración (~34 copias, caben de sobra en
   los 10 GB del tramo gratuito).
4. Cambiar el paso de despliegue a `npm run db:deploy`, que ya hace la copia previa a la migración.
5. **Confirmar el timezone del servidor**: el cron sigue la hora de la máquina, no UTC. Los crontabs
   están a las 02:15 (copia) y lunes 04:30 (purga), separados ocho horas para que una copia a medio
   subir no entre en el listado de la purga.
6. Arrancar `slg-backup` y comprobar en sus registros la primera línea JSON con `"ok":true`.

*El ensayo de restauración (criterio 6, DoD #8), con el token de lectura ya creado*
```
npm run backup:restore -- --listar
npm run backup:restore -- --staging --generacion weekly
```
Sin `--indice` coge la **más antigua**, que es lo que R-37 quiere probar. `RESTORE_DATABASE_URL` debe
apuntar a staging: el script se niega a arrancar si coincide con `DATABASE_URL` o si falta
`--staging`. Después, las cuatro comprobaciones que el propio script enumera, y **anotar la duración**.

**Contexto para no re-explorar**: las copias usan `@aws-sdk/client-s3` (el mismo cliente de FU-09),
cero líneas específicas de Cloudflare. `BACKUP_PG_DUMP_BIN`/`BACKUP_PSQL_BIN` son la costura para
máquinas sin cliente de PostgreSQL; en producción van vacías. **R-41 sigue abierto y ahora pesa un
poco más**: el proceso de copia lee los dos cubos de `slg-files` con la credencial de administrador
de MinIO — un consumidor más a revisar cuando se rote.

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
- **FU-14**: sin bloqueo — R2 (D-65), clave de cifrado y mecanismo de cron (D-66) ya resueltos.
- **S-01** (rotación de una credencial de construcción): diferida a go-live, fuera de este repo.
- Ninguno bloquea DU-02/DU-03 — ver "Qué hacer a continuación" arriba.
