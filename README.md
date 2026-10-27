# slg_website — manual de operación

**Para quién es esto.** Para Ricardo, y para cualquiera que tenga que operar el sitio **sin ser
programador**. No hay ni un comando que teclear en una terminal: todo se hace desde el navegador, en
tres sitios —**GitHub**, **Easypanel** y el propio sitio (`/hq`)— y cada paso dice dónde hay que
pulsar.

Si algún paso de aquí no funciona tal como está escrito, **eso es un defecto del manual**, no un
error tuyo: dilo y se corrige.

> **Este archivo no es el manual de la fábrica.** Quien venga a **construir** empieza por
> [`AGENTS.md`](AGENTS.md) (la gobernanza) y por [`docs/plantilla-app-builder.md`](docs/plantilla-app-builder.md)
> (cómo está montado el repositorio). Este README es para **operar** lo que ya está construido.

---

## Lo que necesitas antes de empezar

| Qué | Para qué | Cómo entras |
|---|---|---|
| Cuenta de **GitHub** con acceso a `RicardoTorresOliva/slg_website` | Cambiar textos, artículos y documentos | `https://github.com` |
| Cuenta de **Easypanel** | Variables, despliegue y tareas programadas | El panel de tu VPS |
| Tu cuenta del **sitio** | Crear clientes, invitar y claves de API | `https://softlandingglobal.com/acceder` |

**Dos ramas y qué significa cada una.** El repositorio tiene dos: **`develop`** publica en
**staging** (la copia de pruebas, `staging.softlandingglobal.com`) y **`main`** publica en
**producción** (`softlandingglobal.com`). **Siempre se toca `develop` primero.** Es una regla del
sistema, no una recomendación: hay un freno que rechaza cualquier cosa que llegue a `main` sin haber
pasado por staging.

---

## Tarea 1 · Cambiar un texto de la web

Los textos **no están dentro del programa**: son archivos de texto que puedes editar tú.

1. Entra en `https://github.com/RicardoTorresOliva/slg_website`.
2. Arriba a la izquierda hay un selector que pone **`main`**. Púlsalo y elige **`develop`**.
3. Busca el archivo. Los textos viven en la carpeta **`content/`**:

   | Qué quieres cambiar | Dónde está |
   |---|---|
   | Una página (Nosotros, Contacto, Legal…) | `content/pages/es/` y `content/pages/en/` |
   | Una página de servicio (Phoenix PEEx, …) | `content/services/es/` y `content/services/en/` |
   | Un artículo del blog | `content/blog/es/` y `content/blog/en/` |
   | La ficha de un documento de descarga | `content/downloads/es/` y `content/downloads/en/` |
   | Un botón, un menú, un mensaje de la interfaz | `content/ui/es.json` y `content/ui/en.json` |

4. Pulsa el archivo, y después el **lápiz** («Edit this file») arriba a la derecha.
5. Cambia el texto. **No toques la parte de arriba entre las dos líneas de `---`**: eso es la ficha
   técnica del archivo (título, idioma, pareja), y si se rompe, el sitio no publica.
6. Abajo: **Commit changes**. En el cuadro de arriba escribe qué cambiaste (por ejemplo, «corrijo el
   subtítulo de Nosotros»). Deja marcado **«Commit directly to the `develop` branch»**. Pulsa
   **Commit changes**.
7. **Espera dos o tres minutos** y mira `https://staging.softlandingglobal.com`. Tu cambio está ahí.
8. Cuando te guste, hay que pasarlo a producción → **Tarea 6**.

> **Cada texto tiene pareja.** Si cambias algo en español, cambia lo equivalente en inglés. El sistema
> **rechaza** un cambio que deje una página sin su pareja — no es quisquillosidad: una página que
> existe en un idioma y no en el otro es una página rota para la mitad de los visitantes.

---

## Tarea 2 · Publicar un artículo del blog

Un artículo son **dos archivos**: el español y el inglés.

1. GitHub → rama **`develop`** → carpeta `content/blog/es`.
2. Arriba a la derecha: **Add file → Create new file**.
3. En el nombre escribe algo como `mi-articulo.md` (minúsculas, sin acentos, guiones en vez de
   espacios).
4. Pega esto y cámbialo:

   ```
   ---
   type: post
   title: "El título del artículo"
   description: "Una frase de qué trata. Se lee en Google y al compartir."
   date: 2026-10-01
   lang: es
   pair: "mi-articulo-en"
   draft: true
   copy: temporal
   ---

   Aquí va el artículo, en Markdown normal. Un párrafo por línea en blanco.

   ## Un subtítulo

   Más texto.
   ```

5. **Commit changes** → a `develop`.
6. Repite en `content/blog/en` con el archivo `mi-articulo-en.md`, cambiando `lang: en` y
   `pair: "mi-articulo"`.
7. Mientras `draft: true`, el artículo **está en staging y no en producción**. Cuando quieras
   publicarlo, edítalo y pon `draft: false`.

> **Qué significa `copy: temporal`.** Que el texto todavía no lo has firmado tú. El sitio funciona
> igual; es una marca para saber qué falta revisar. Cuando lo des por bueno, cámbialo a
> `copy: aprobado`.

---

## Tarea 3 · Añadir un documento de descarga

Un documento de descarga son **tres cosas**: el PDF, su ficha en español y su ficha en inglés.

**El PDF no va al repositorio.** Nunca. El repositorio es público, y un documento que se entrega a
cambio de un correo no puede estar descargable sin dar el correo. Va al almacén de archivos.

### a) Subir el PDF

1. **Easypanel → proyecto `slg_website` → servicio `minio` → pestaña `Domains`.**
2. Si hay un dominio apuntando al **puerto 9001**, ábrelo. Si no lo hay: **Add Domain**, marca
   **Generate a free domain**, en *Port* escribe **9001**, **Create**, y ábrelo.
3. Entra con el usuario y la contraseña de MinIO (están en las variables `MINIO_ROOT_USER` y
   `MINIO_ROOT_PASSWORD` del servicio `minio`, pestaña `Environment`).
4. Menú izquierdo → **Object Browser** → bucket **`downloads`** → **Upload** → tu PDF.
5. Fíjate en el **nombre exacto** con el que quedó el archivo. Lo necesitas en el paso siguiente.

### b) Crear las dos fichas

1. GitHub → rama `develop` → `content/downloads/es` → **Add file → Create new file**.
2. Nombre: `d-12.md` (el siguiente número libre).
3. Contenido:

   ```
   ---
   type: download
   service: "phoenix-peex"
   title: "El título del documento"
   audience: "Para quién es, en una frase."
   learns:
     - "Lo primero que se lleva quien lo lee"
     - "Lo segundo"
     - "Lo tercero"
   status: published
   lang: es
   pair: "d-12-en"
   copy: temporal
   ---

   Un párrafo de presentación del documento.
   ```

4. Repite en `content/downloads/en` con `d-12-en.md`, `lang: en` y `pair: "d-12"`.
5. **Commit** a `develop` y mira staging.

> **`status`** admite tres valores: `draft` (no se ve), `coming-soon` (se ve, **captura el correo** y
> avisa de que todavía no está listo) y `published` (se entrega). Un documento `coming-soon` **sí**
> recoge los correos: no se pierde ningún interesado mientras lo terminas.

---

## Tarea 4 · Crear un cliente e invitar a alguien

Esto **no pasa por GitHub**: se hace dentro del sitio.

1. Entra en `https://softlandingglobal.com/acceder` con tu cuenta.
2. Menú lateral → **Empresas** → rellena **nombre** y **slug** (el slug es el nombre en minúsculas y
   con guiones: `cliente-demo`), tipo **client**, estado **active** → **Guardar**. El **identificador
   en el CRM** se pone aquí, al crear la empresa: es lo que permite que el CRM cree en el sitio sus
   proyectos (si el CRM la crea él por la API, ya viene puesto).
3. Menú lateral → **Proyectos** → elige la empresa, ponle nombre, elige el **servicio** de la lista
   y **Guardar**. El servicio se elige de una lista cerrada: los nombres son literales y no se
   escriben a mano.
4. Menú lateral → **Usuarios** → bloque **«Invitar a una empresa cliente»**:
   - **Correo** de la persona.
   - **Empresa**: la que acabas de crear.
   - **Rol**: `client_admin` si esa persona va a poder invitar a sus compañeros; `client_member` si
     solo va a mirar.
   - **Idioma**: en el que quieres que le llegue el correo.
   - **Enviar la invitación**.
5. La invitación aparece abajo, en **«Invitaciones pendientes»**, con su fecha de caducidad. Ahí
   mismo puedes **reenviarla** o **revocarla**.

> **Si el correo no sale, la invitación NO se pierde.** Queda creada y reenviable desde esa misma
> pantalla. Es a propósito: un fallo del correo no puede dejar a un cliente sin acceso y a ti sin
> saberlo.

### Antes de la primera invitación: la primera cuenta

Invitar exige estar dentro, así que la **primera** cuenta de un sitio nuevo (rol `slg_admin`) no se
invita: la crea una sola vez el guion `npm run auth:primer-admin`, que ejecuta Claude —o quien tenga
el archivo de variables del despliegue— al montar el sitio. **No te da ninguna contraseña**: la
cuenta nace sin ella y te llega un correo para que la elijas tú.

1. Abre tu correo y busca uno con el asunto **«Restablecer tu contraseña»**. Es el enlace de alta:
   sirve **una vez** y **caduca en una hora**.
2. Pulsa **Restablecer la contraseña**. Se abre `…/restablecer` en el sitio.
3. Escribe tu contraseña (**12 caracteres como mínimo**) y confírmala.
4. Entra en `…/acceder` con tu correo y esa contraseña. Deberías ver el panel de HQ.

**Si el enlace caducó o el correo no llegó** (mira también la carpeta de spam): entra en
`…/recuperar`, escribe **el mismo correo** y pulsa enviar; llega otro enlace igual. Si tampoco llega,
el correo del sitio no está funcionando: díselo a Claude, que puede repetir el arranque mientras
nadie haya entrado (`--rehacer`).

> Existe un modo de emergencia, `--imprimir-contrasena`, que enseña la contraseña en la terminal en
> vez de mandar el enlace. Es solo para cuando el correo del sitio no funciona todavía, lo avisa al
> ejecutarse, y esa contraseña hay que cambiarla nada más entrar: ha pasado por una pantalla.

---

## Tarea 5 · Crear una clave de API

Una clave de API es lo que usa un agente (por ejemplo, Hermes) para leer o escribir sin ser una
persona.

1. En el sitio, menú lateral → **Claves**.
2. Rellena:
   - **Nombre**: para qué es. Se verá en la auditoría, así que ponle algo que reconozcas dentro de un
     año («Hermes · publicador de informes»).
   - **Empresa**: si la eliges, esa clave **solo ve esa empresa**. Si la dejas vacía, ve todas — eso
     es una clave de SLG, y solo debe existir si de verdad hace falta.
   - **Alcances**: marca **lo mínimo**. Los alcances no se implican entre sí: una clave que puede
     escribir eventos **no** puede crear entregables, y eso es a propósito.
   - **Límite** y **ventana**: cuántas peticiones por cuántos segundos. No hay valor por defecto
     porque decidirlo es parte de crear la clave.
   - **Caduca el**: una fecha. Tampoco hay defecto.
3. **Crear**.
4. **La clave se enseña UNA sola vez.** Cópiala y guárdala donde vaya a usarse. Si se pierde, no se
   recupera: se revoca y se crea otra.
5. Para retirarla: misma pantalla, **Revocar**. Surte efecto en la siguiente petición.

---

## Tarea 6 · Desplegar

**Publicar en staging** ya lo has hecho: cada cambio que guardas en `develop` se publica solo, en dos
o tres minutos.

**Pasar de staging a producción:**

1. GitHub → `https://github.com/RicardoTorresOliva/slg_website`.
2. Pestaña **Pull requests** → **New pull request**.
3. Arriba: **base: `main`** ← **compare: `develop`**.
4. **Create pull request**. Ponle un título («publico los cambios de esta semana»).
5. Espera a los cuatro cuadros verdes de abajo. **Si alguno sale rojo, no fuerces nada**: es el
   sistema diciendo que algo no está listo. Pulsa el rojo, copia lo que dice y pásamelo.
6. Con todo en verde: **Merge pull request** → **Confirm merge**.
7. Dos o tres minutos y `https://softlandingglobal.com` tiene los cambios.

### Si un despliegue sale mal: volver a la versión anterior

Esto es lo primero que hay que hacer, **antes** de investigar nada: primero se vuelve a algo que
funciona, y después se mira qué pasó.

1. **Easypanel → proyecto `slg_website` → servicio `slg-web` → pestaña `Deployments`.**
2. Verás la lista de despliegues, el más reciente arriba. Busca **el anterior al que rompió** (por la
   hora).
3. En su fila, menú de tres puntos → **Redeploy**.
4. Un minuto después el sitio vuelve a estar como antes.
5. **Y después, en GitHub**, deshaz el cambio: pestaña **Pull requests** → el que acabas de mezclar →
   botón **Revert** → y mezcla ese revert. Si no lo haces, el próximo despliegue vuelve a subir lo
   que rompió.

> Los datos **no se tocan** al volver atrás: una versión anterior del programa lee la misma base de
> datos. Lo único que cambia es el programa.

---

## Tarea 7 · Restaurar una copia de seguridad

**Esto no se hace a solas y no se hace con prisa.** Restaurar sustituye datos vivos por datos de
antes: lo que se escribió después de esa copia **se pierde**.

Lo que tienes que saber y hacer:

1. **La clave privada de las copias es tuya y solo tuya.** Está en tu gestor de contraseñas, con el
   nombre «SLG · clave privada de backups». **Sin ella no hay restauración posible**, y eso es
   deliberado: es lo que impide que quien entre en el servidor pueda leer las copias.
2. **Avísame y lo hacemos juntos.** Necesito que me pases esa clave **por el canal privado** —nunca
   por el repositorio, nunca por el chat de trabajo— y la borro del entorno al terminar.
3. **Se restaura primero en staging, nunca directamente en producción.** Se comprueba que los datos
   están bien y solo entonces se decide.
4. Las copias se guardan en **tres generaciones** —diaria, semanal y mensual— así que se puede elegir
   de qué día volver. No estás obligado a volver a lo de anoche.

El procedimiento técnico completo está en [`docs/deployment.md`](docs/deployment.md) §4nonies.

---

## Cuando algo sale mal

### El CRM: hoy los leads entran como **contacto con nota**

El sitio entrega cada lead al CRM en el modo **`contact_note`**: crea el contacto si no existe y le
añade una nota con el contexto (qué documento pidió, de qué página venía, la campaña).

**Lo que el sitio NO hace hoy, y tienes que hacer tú a mano:** crear la **oportunidad** en el CRM. La
clave del CRM no puede crearla todavía, así que **no se inventa**: el contacto y su nota quedan
registrados, y la oportunidad la abres tú cuando decidas que ese lead lo merece.

Cómo te enteras de que hay uno nuevo: te llega un **correo** por cada captura, con el enlace directo
a la ficha del contacto en el CRM. Y en el sitio, menú lateral → **Capturas**, están todas con su
estado de entrega.

Si alguna sale **`failed`** (cinco intentos agotados), esa pantalla tiene un botón para
**reintentarla**. El lead no está perdido: la captura y el documento entregado siguen registrados.

> El día que el CRM permita crear oportunidades por API, esto cambia de modo con **una variable**
> (`CRM_MODE`) y sin desplegar código nuevo. Hasta entonces, el paso manual es el paso.

**Un sitio sin CRM** (la ficha `site.config.ts` con `crm: false`) no entrega a ningún sitio: cada
captura llega **por correo al buzón del cliente** (`MAIL_LEADS_TO`) con nombre, apellido, correo,
origen, página, documento y mensaje. En **Capturas** sale como **`notified`** si el correo salió, o
**`notify_failed`** si tras cinco intentos no salió; en ese caso lee el error de la fila (casi siempre
falta `MAIL_LEADS_TO` o falla el correo), arréglalo y pulsa **Reintentar**.

### Rotar el secreto de Microsoft (Entra ID)

El secreto que permite entrar con la cuenta de Microsoft **caduca**. Cuando caduque, nadie podrá
entrar por ese método — y el aviso que da Microsoft es fácil de perder.

**La fecha de caducidad vive en [`docs/project_memory.md`](docs/project_memory.md).** Cuando crees o
rotes el secreto, dime la fecha y la anoto ahí.

Para rotarlo:

1. Entra en `https://entra.microsoft.com` → **Aplicaciones** → **Registros de aplicaciones** → la
   aplicación de `slg_website`.
2. Menú izquierdo → **Certificados y secretos** → pestaña **Secretos de cliente**.
3. **Nuevo secreto de cliente**. Descripción: `slg_website <mes y año>`. Expiración: **24 meses**.
   **Agregar**.
4. Copia **el valor** (la columna *Valor*, no la de *Id.*). **Se enseña una sola vez.**
5. **Easypanel → `slg_website` → `slg-web` → `Environment`** → cambia `MICROSOFT_CLIENT_SECRET` por el
   nuevo valor → **Save** → **Deploy**. Repite en `slg-web-staging`.
6. Comprueba que puedes entrar con Microsoft en staging **antes** de borrar el secreto viejo.
7. Vuelve a Entra y **elimina el secreto anterior**.
8. Dime la fecha de caducidad del nuevo para anotarla.

---

## De dónde sale cada variable de entorno

**Aquí no hay ni un valor escrito, y no lo va a haber**: el repositorio es público. Lo que hay es de
dónde sale cada uno y quién puede volver a generarlo.

Los valores se ponen en **Easypanel → proyecto `slg_website` → el servicio → pestaña
`Environment`**. Los nombres, con su explicación, están también en
[`.env.example`](.env.example).

| Variable | De dónde sale su valor | Quién puede regenerarlo |
|---|---|---|
| `POSTGRES_USER` · `POSTGRES_DB` | Los eliges tú al crear el servicio de base de datos | Tú, en Easypanel |
| `POSTGRES_PASSWORD` | La genera Easypanel al crear el servicio | Tú, en Easypanel → servicio de Postgres → `Environment` |
| `DATABASE_URL` | Se compone: usuario `slg_app`, su contraseña, el host interno del servicio y el nombre de la base | Tú, siguiendo `docs/deployment.md` §2.1 |
| `DATABASE_URL_MIGRATIONS` | Igual, pero con el usuario dueño de la base | Tú, igual |
| `APP_DB_PASSWORD` | La eliges tú; el botón de `/api/ops` se la pone al usuario `slg_app` | Tú, y se vuelve a aplicar con ese botón |
| `NEXT_PUBLIC_SITE_URL` · `BETTER_AUTH_URL` | La dirección pública de ese entorno. `NEXT_PUBLIC_SITE_URL` **no tiene valor por defecto**: si falta, la compilación se detiene y lo dice — antes se inventaba un dominio y el sitio salía publicando el de otro en sus etiquetas sociales y en su RSS | Tú |
| `BETTER_AUTH_SECRET` | Una cadena larga al azar que generas una vez | Tú. Cambiarla **cierra todas las sesiones abiertas** |
| `STAGING_BASIC_AUTH_USER` · `STAGING_BASIC_AUTH_PASSWORD` | Los eliges tú: es la puerta que tapa staging | Tú |
| `SUPERFICIES_EN_REVISION` | Qué intranets se pueden mirar en staging mientras se revisan: `hq`, `portal`, o las dos. **Solo en `slgweb-staging`**; en producción no hace nada | Tú, cuando vayas a revisarlas |
| `GOOGLE_CLIENT_ID` · `GOOGLE_CLIENT_SECRET` | Google Cloud → *APIs y servicios* → *Credenciales* | Tú, en Google Cloud |
| `MICROSOFT_CLIENT_ID` · `MICROSOFT_TENANT_ID` | Entra ID → el registro de la aplicación | Tú, en Entra |
| `MICROSOFT_CLIENT_SECRET` | Entra ID → *Certificados y secretos*. **Caduca** | Tú. Ver «Rotar el secreto de Microsoft» |
| `MAIL_SMTP_HOST` · `MAIL_SMTP_PORT` · `MAIL_SMTP_USERNAME` · `MAIL_SMTP_PASSWORD` | Resend → *SMTP* | Tú, en Resend |
| `MAIL_FROM_ADDRESS` · `MAIL_FROM_NAME` · `MAIL_REPLY_TO` | Los eliges tú. El remitente vive en el **subdominio de envío**, no en la raíz | Tú |
| `MAIL_ALERTS_TO` | El buzón que recibe los avisos de captura y de fallo | Tú |
| `MAIL_LEADS_TO` | El buzón **del cliente** que recibe los contactos de la web. Solo en un sitio **sin CRM**, y ahí es obligatoria: cada captura le llega por correo con los datos de la persona | El cliente te la da en el formulario de intake |
| `S3_ENDPOINT` · `S3_REGION` · `S3_BUCKET_DOWNLOADS` · `S3_BUCKET_DELIVERABLES` | El servicio `minio`: dirección interna y los dos buckets | Tú, en Easypanel |
| `S3_ACCESS_KEY_ID` · `S3_SECRET_ACCESS_KEY` | Son `MINIO_ROOT_USER` y `MINIO_ROOT_PASSWORD` del servicio `minio` | Tú, en Easypanel → `minio` → `Environment` |
| `SIGNED_URL_TTL_DOWNLOAD_MINUTES` · `SIGNED_URL_TTL_DELIVERABLE_MINUTES` · `SIGNED_URL_TTL_UPLOAD_MINUTES` | Cuánto dura un enlace de archivo. Tienen defecto: solo se ponen para cambiarlo | Tú |
| `DELIVERABLE_VIEWER_ORIGIN` | El subdominio del visor de entregables | Tú, al crear ese dominio en Easypanel |
| `DELIVERABLE_VIEWER_SECRET` | Una cadena larga al azar que generas una vez. Es lo que firma el permiso temporal para ver un entregable. **Sin ella el visor no enseña nada** | Tú |
| `WEBHOOK_SIGNING_SECRET` | Una cadena larga al azar que generas una vez | Tú. Cambiarla obliga a reconfigurar a quien escuche |
| `WEBHOOK_SUBSCRIBERS` · `N8N_WEBHOOK_URL` · `WEBHOOK_ANNOUNCE_POSTS` | Quién escucha los eventos salientes. **Opcional**: sin esto el sitio funciona igual | Tú |
| `WEBHOOK_QUEUE_INTERVAL_MS` · `WEBHOOK_QUEUE_BATCH` · `WEBHOOK_TIMEOUT_MS` | Ritmo de la cola de webhooks. Tienen defecto | Tú |
| `NEXT_PUBLIC_UMAMI_SCRIPT_URL` · `NEXT_PUBLIC_UMAMI_WEBSITE_ID` | La analítica autoalojada. **Opcional** | Tú, en el servicio de analítica |
| `UPTIME_WEBHOOK_SECRET` | Lo eliges tú; lo comparte el monitor externo | Tú |
| `OPS_TOKEN` | Lo eliges tú: es lo que protege la página de puesta en marcha | Tú. Cámbialo cuando quieras |
| `OPS_MAIL_TO` | A qué dirección manda el correo de prueba esa página | Tú |
| `PUBLIC_FORM_RATE_LIMIT_MAX` · `PUBLIC_FORM_RATE_LIMIT_WINDOW_MS` | Cuántos envíos admite un formulario público. Tienen defecto | Tú |
| `PRIVACY_POLICY_VERSION` | La fecha de la versión de la política que se está aceptando | Tú, cada vez que cambie la política |
| `CRM_BASE_URL` · `CRM_APP_URL` · `CRM_CONTACT_URL_TEMPLATE` | Las direcciones de tu CRM | Tú |
| `CRM_API_KEY_CAPTURE` | Clave del CRM con permiso de **escritura**: crea contacto y nota | Tú, en el CRM |
| `CRM_API_KEY_READ` | Clave del CRM de **solo lectura**, para las métricas del tablero | Tú, en el CRM |
| `CRM_MODE` | `contact_note` hoy. Se cambia el día que el CRM permita crear oportunidades | Tú |
| `CRM_TIMEOUT_MS` · `CRM_QUEUE_INTERVAL_MS` · `CRM_QUEUE_BATCH` · `CRM_QUEUE_DISABLED` · `CRM_METRICS_CACHE_SECONDS` | Ritmo y cachés de la integración. Tienen defecto | Tú |
| `BACKUP_S3_ENDPOINT` · `BACKUP_S3_REGION` · `BACKUP_S3_BUCKET` | Cloudflare R2 → el bucket de copias → *Settings* | Tú, en Cloudflare |
| `BACKUP_S3_ACCESS_KEY_ID` · `BACKUP_S3_SECRET_ACCESS_KEY` | R2 → *Manage API tokens* → el token de **solo escritura** | Tú, en Cloudflare |
| `BACKUP_PURGE_ACCESS_KEY_ID` · `BACKUP_PURGE_SECRET_ACCESS_KEY` | R2 → el **otro** token, el que sí puede borrar. **No van en `slg-web`** | Tú, en Cloudflare |
| `BACKUP_PUBLIC_KEY` | El botón «Generar el par de claves» de `/api/ops`. **No es un secreto** | Tú, generando un par nuevo |
| `BACKUP_PRIVATE_KEY` | El mismo botón. **No va a ningún servidor**: vive en tu gestor de contraseñas | **Nadie**. Si se pierde, las copias antiguas son ilegibles |
| `BACKUP_VOLUME_PATHS` | La ruta del volumen de MinIO dentro del servidor | Tú |
| `BACKUP_RETENTION_DAILY` · `BACKUP_RETENTION_WEEKLY` · `BACKUP_RETENTION_MONTHLY` | Cuántas copias se guardan. Tienen defecto y **nunca bajan de él** | Tú |
| `BACKUP_ALERT_EMAIL` | A quién se avisa si una copia falla | Tú |
| `BACKUP_FIRST_DATE` | La fecha de tu primera copia (`AAAA-MM-DD`). Va **en la tarea de purga**. Es lo que permite detectar que alguien ha borrado el histórico | Tú, el día que hagas la primera copia |
| `BACKUP_DATE_OVERRIDE` | **Solo para el simulacro de restauración.** Producción no la define | — |
| `PG_DUMP_BIN` · `PG_RESTORE_BIN` | Solo si esos programas no están donde el sistema los busca | — |
| `FILES_DRIVER` | Qué guarda los archivos. Vacía: S3/MinIO, el diseño del VPS. `supabase`: Supabase Storage por su REST, y entonces las `S3_*` no hacen falta —los nombres de bucket sí | Tú, según dónde esté el sitio |
| `SUPABASE_URL` · `SUPABASE_SERVICE_ROLE_KEY` | Solo con `FILES_DRIVER=supabase`. Supabase → *Project Settings* → *API*. La clave de servicio **salta las políticas de fila**: no toca nunca al navegador | Tú, en Supabase |
| `CRON_SECRET` | Testigo de `/api/colas`, la ruta que vacía las colas cuando la llama un planificador externo. **Opcional**: sin ella la ruta responde 404 y las colas se vacían igual tras cada captura | Tú. Larga y al azar |

> **Lo que se pierde para siempre si se pierde:** `BACKUP_PRIVATE_KEY`. Todo lo demás se regenera
> donde lo creaste. Esa no.

---

## Dónde está cada cosa

| Necesito… | Está en |
|---|---|
| Desplegar por primera vez, DNS, correo, buckets, copias | [`docs/deployment.md`](docs/deployment.md) |
| Lo que está pendiente y es tuyo | [`docs/handoff.md`](docs/handoff.md) |
| Por qué se decidió algo | [`docs/decision_log.md`](docs/decision_log.md) |
| Qué se construyó y qué se aprendió, unidad por unidad | [`docs/work_log.md`](docs/work_log.md) |
| Qué se está construyendo ahora | [`implementation/task_tracker.md`](implementation/task_tracker.md) |
| Cómo trabaja el equipo que construye esto | [`AGENTS.md`](AGENTS.md) |
| El conocimiento del proyecto, por dónde entrar | [`knowledge/index.md`](knowledge/index.md) |
| Añadir una conexión a HQ | editar [`content/conexiones.json`](content/conexiones.json) |
| Archivar una empresa o cerrar un proyecto | HQ → **Empresas** / **Proyectos** → **Archivar** / **Cerrar proyecto** → confirmar. No se borra nada: la fila baja al final, atenuada, y **Reactivar** / **Reabrir** lo deshace |
