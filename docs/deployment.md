---
type: docs
title: Despliegue y operación
project: slg_website
description: Runbook de FU-05. Los cinco servicios de Easypanel, el despliegue automático develop→staging y main→producción, los registros DNS con la lista de «no tocar» delante, el monitor externo de UptimeRobot y la verificación de los nueve criterios.
tags: [slg, slg_website, fu-05, despliegue, easypanel, dns, uptimerobot, ci]
status: active
timestamp: 2026-09-12
sources:
  - "design_docs/architecture.md §7 (servicios y flujo de despliegue), §11 (seguridad), §13 (DNS)"
  - "implementation/user_units.md — FU-05"
  - "docs/decision_log.md — D-43, D-49 (monitorización), D-23, D-24 (correo y DNS)"
---

# Despliegue y operación — slg_website

Este archivo es **ejecutable por una persona**, no descriptivo. Cada paso dice qué se
pulsa, qué se escribe y cómo se comprueba que salió bien.

**Regla que atraviesa todo el documento:** el repositorio es **público**. Ningún valor
se escribe aquí ni en ningún archivo versionado. Los valores viven en las variables
de entorno de Easypanel y en el panel del proveedor de DNS.

**Dato base:** VPS Hostinger, IP `167.88.42.76`, Easypanel, certificados Let's Encrypt.

---

## 0. Antes de empezar: el orden importa

| # | Paso | Por qué va antes |
|---|---|---|
| 1 | **Línea base de DNS** (§4.1) | `architecture` §13.1 exige copiar la zona previa a `docs/` **antes de tocar nada**. Sin ella no hay forma de demostrar el criterio 3 |
| 2 | Los cinco servicios (§2) | Los dominios no se apuntan a un servicio que aún no existe |
| 3 | Despliegue automático (§3) | Verificar en staging antes de exponer la raíz |
| 4 | Registros DNS nuevos (§4.2) | Solo cuando hay algo detrás que responda |
| 5 | Monitor externo (§5) | Vigila lo que ya está publicado |

---

## 1. Prerrequisitos

- [ ] Acceso de administrador a Easypanel en el VPS.
- [ ] Acceso al panel de DNS de `softlandingglobal.com`.
- [ ] La rama `develop` existe en GitHub. Si no: `git switch -c develop && git push -u origin develop`.
- [ ] Una cuenta de UptimeRobot (tramo gratuito). Ver §5.
- [ ] Una contraseña generada para el rol `slg_app` de PostgreSQL. Genérala con
      `openssl rand -base64 32` y **guárdala en el gestor de contraseñas**, no aquí.

> **S-01 (higiene de credenciales) está diferida a go-live por decisión de Ricardo.**
> La condición que lo hace aceptable: las credenciales que se creen en este runbook
> son **nuevas**, y la credencial afectada por S-01 **no se reutiliza en ningún
> entorno desplegado**. Ver `docs/decision_log.md` → S-01.

---

## 2. Los cinco servicios — YA EXISTEN

Panel: **`buul2l.easypanel.host`**, proyecto **`slg_website`**. Los servicios ya están creados y
corriendo. **No hay que crear nada.** Lo que cambia respecto al diseño son los nombres:

| `architecture` §7.1 dice | En Easypanel se llama | Qué es |
|---|---|---|
| `slg-db` | **`slgwebpostgres`** | PostgreSQL |
| `slg-files` | **`minio`** | MinIO, buckets `downloads` y `deliverables` |
| `slg-web` | **`slg-web`** | La aplicación, rama `main` |
| `slg-web-staging` | **`slgweb-staging`** | La misma imagen, rama `develop` |
| `slg-analytics` | **`umami`** + **`umami-db`** | Umami y su base propia |

Los nombres reales mandan. En las cadenas de conexión internas el host es el nombre del servicio:
la base de datos es **`slgwebpostgres`**, no `slg-db`.

### 2.1 Lo único que queda por hacer en estos servicios

**a) Contraseña del rol de aplicación.** La migración crea el rol `slg_app` con `LOGIN` y **sin
contraseña**, a propósito: el repositorio es público. Hay que ponérsela una vez, en la consola de
`slgwebpostgres`:

```sql
ALTER ROLE slg_app WITH PASSWORD 'la-que-generes';
```

**Por qué dos roles y no uno:** el usuario que crea la imagen de PostgreSQL es superusuario y lleva
`rolbypassrls`. Conectando con él **las políticas de fila no se aplican** y el aislamiento entre
empresas se vuelve decorativo. Lo encontró FU-04.

**b) Variables de entorno de `slg-web`** (pestaña *Environment*). Los nombres salen de
`.env.example`; para M0 bastan estas:

| Variable | Valor |
|---|---|
| `DATABASE_URL` | `postgresql://slg_app@slgwebpostgres:5432/slg` — con la contraseña de (a) intercalada tras `slg_app` |
| `DATABASE_URL_MIGRATIONS` | `postgresql://slg@slgwebpostgres:5432/slg` — igual, con la del rol dueño |
| `NEXT_PUBLIC_SITE_URL` | `https://softlandingglobal.com` |
| `S3_ENDPOINT` | el endpoint interno de `minio` |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_REGION` | del servicio `minio` |
| `S3_BUCKET_DOWNLOADS` / `S3_BUCKET_DELIVERABLES` | `downloads` / `deliverables` |
| `NEXT_PUBLIC_UMAMI_SCRIPT_URL` / `NEXT_PUBLIC_UMAMI_WEBSITE_ID` | del servicio `umami` |

> Las cadenas van **sin contraseña** en este documento a propósito: el análisis de secretos marca en
> rojo cualquier cadena de conexión con contraseña dentro del repositorio, y tiene razón aunque sea
> un ejemplo.

**`STAGING_BASIC_AUTH_USER` y `STAGING_BASIC_AUTH_PASSWORD` NO se definen en `slg-web`.** El
middleware se activa por la presencia de esas dos variables: ponerlas en producción pondría un
candado delante del sitio público.

**c) Variables de `slgweb-staging`.** Las mismas, **más** `STAGING_BASIC_AUTH_USER` y
`STAGING_BASIC_AUTH_PASSWORD`, y con `NEXT_PUBLIC_SITE_URL` apuntando a
`https://staging.softlandingglobal.com`. Base de datos **distinta** de la de producción.

**d) Deploy command** en `slg-web` y `slgweb-staging`: `npm run db:migrate`. Usa
`DATABASE_URL_MIGRATIONS`, el rol dueño. El runtime nunca migra.

### 2.2 Qué hace la compuerta de staging

Con esas dos variables puestas, `slgweb-staging` devuelve `401` con `WWW-Authenticate: Basic` y
`X-Robots-Tag: noindex` en todas las rutas **menos `/api/health`**, que queda abierta a propósito:
UptimeRobot no lleva credenciales y un monitor que recibe `401` estaría midiendo la compuerta, no el
servicio. Está verificado de forma automatizada en `check:runtime` (19 comprobaciones sobre el
servidor real); en el despliegue solo hay que confirmar que las variables están puestas.

---

## 3. Despliegue automático (criterio 2)

### 3.1 Los dos ganchos

En Easypanel, en cada servicio → **Deployments → Auto Deploy: On**, y copia el
**Deploy Webhook URL**. En GitHub → *Settings → Webhooks → Add webhook*, pega la
URL, evento **`push`**. Uno para `slg-web` (rama `main`) y otro para
`slg-web-staging` (rama `develop`).

Resultado: push a `develop` publica staging y push a `main` publica producción,
sin intervención manual.

### 3.2 El freno que impide saltarse staging

`.github/workflows/ci.yml` incluye el job **`guarda-staging`**: en cada push a
`main` comprueba que ese commit **ya existe en `develop`**. Si alguien mezcla a
`main` sin pasar por staging, el pipeline se pone rojo (R-20).

Para que el freno sea de verdad, en GitHub → *Settings → Branches → Add rule*:

- [ ] Rama `main`: **Require a pull request before merging**.
- [ ] **Require status checks to pass**: `Gates · contenido, secretos, entorno, JS y cabeceras`,
      `Gates · escáner de secretos dedicado`, `Datos · migraciones y aislamiento entre empresas`,
      `Guarda · main solo recibe lo que pasó por staging`.
- [ ] **Do not allow bypassing the above settings**.

### 3.3 Qué frena el pipeline (criterio 4)

Falla —no avisa— ante: frontmatter inválido · `pair` roto · nomenclatura alterada ·
un `[PENDIENTE]` en `main` · un patrón de secreto · un JS inicial por encima de
**150 KB comprimidos**.

Los seis tienen **prueba negativa ejecutada** (criterio 5): `npm run check:brakes`
los pone en rojo a propósito y exige que fallen por el motivo esperado.

Todo el pipeline, en local y de una vez: `npm run check:ci`.

---

## 4. DNS

### 4.1 Primero, la línea base — **antes de tocar nada**

```bash
npm run check:dns:baseline     # escribe docs/dns_baseline.txt
git add docs/dns_baseline.txt && git commit -m "FU-05: estado anterior de la zona DNS"
```

Necesita `dig` (`apt-get install -y dnsutils` en Debian/Ubuntu; en macOS ya viene).
Consulta a un resolutor **público** a propósito: el resolutor local puede tener la
zona cacheada de antes del cambio y dar un verde falso.

### 4.2 Lo que NO se toca — léelo antes de abrir el panel

> **`crm` · `n8n` · `evolution` · `academy` · los MX de Outlook · el TXT de la raíz.**

- `crm`, `n8n` y `evolution` sirven desde **la misma IP** y son sistemas vivos.
- `academy` apunta fuera y Phoenix Academy está fuera de alcance.
- Los MX y el TXT de la raíz sostienen el correo corporativo, que **se queda en
  Microsoft 365** (D-23). El SPF de la raíz **no se toca**: el correo transaccional
  va sobre un **subdominio de envío dedicado** (D-24), que son entradas DNS distintas.

### 4.3 Lo que se añade

| Tipo | Nombre | Valor | TTL |
|---|---|---|---|
| `A` | `@` | `167.88.42.76` | 300 |
| `CNAME` | `www` | `softlandingglobal.com.` | 300 |
| `A` | `staging` | `167.88.42.76` | 300 |

TTL corto durante el cambio; súbelo a 3600 cuando todo esté estable.

### 4.4 Verificación (criterio 3)

```bash
npm run check:dns
```

Compara **nombre por nombre** contra la línea base y falla si un nombre protegido
se movió. Pega la salida en `docs/work_log.md`: el criterio 3 pide exactamente eso.

Si un nombre protegido cambió: **revierte esa entrada en el panel antes de seguir**.
Un `crm` caído es el CRM de la empresa fuera de servicio.

---

## 4bis. Correo transaccional — el subdominio de envío (FU-08)

**Estado: el subdominio YA ESTÁ CREADO Y VERIFICADO.** Ricardo lo dio de alta el **2026-09-11** y
Resend lo marca *Verified*. Los registros DNS ya están puestos en Hostinger y no hay que tocarlos.

| | |
|---|---|
| Subdominio de envío | **`mailweb.softlandingglobal.com`** — verificado |
| Región | **São Paulo (`sa-east-1`)** |
| Proveedor de DNS | Hostinger |
| Remitente (`From`) | `no-reply@mailweb.softlandingglobal.com` |
| `Reply-To` | `support@softlandingglobal.com` |
| Avisos internos | `support@softlandingglobal.com` |

> El SPF de la raíz y los MX de Outlook **no se tocaron**: los registros del envío cuelgan todos de
> `mailweb`, que es otra entrada de la zona. Es exactamente lo que D-24 buscaba (R-38).

### 4bis.1 Seguimiento: **NO crear el subdominio de tracking**

Resend implementa el seguimiento de aperturas y clics como un **subdominio de tracking** aparte
(*Domains → Tracking* / «New tracking subdomain»). Esa pantalla pide un nombre —sugiere `links`— y
ofrece dos casillas: *Enable click tracking* y *Enable open tracking*.

**La instrucción es no crear nada ahí.** Sal de esa pantalla sin añadir dominio. No hay campo que
rellenar, y dejarlo vacío no es un olvido: es la configuración correcta.

- **Sin subdominio de tracking no hay redirección posible.** Es la garantía más fuerte disponible:
  no depende de que dos casillas sigan desmarcadas mañana.
- Si alguna vez llegara a existir, las dos casillas van **desmarcadas**.

**Por qué, y no es una manía.** El tracking de clics **reescribe todos los enlaces** del correo para
que pasen por el dominio de seguimiento antes de llegar a su destino —lo dice la propia pantalla:
*«All email links will be securely redirected through this domain»*—. Un enlace de invitación
reescrito **deja de ser nuestro enlace**: su validez pasa a depender de un tercero, y el testigo de
un solo uso viaja por un servicio que no controlamos. El de aperturas mete además un píxel invisible
en cada correo, que es lo contrario de la promesa privacy-first (D-22).

Nuestras plantillas no llevan ni una imagen remota ni un parámetro de campaña —verificado por prueba
en `npm run test:correo`—, pero si el proveedor los inyecta, los inyecta él. Por eso la garantía
tiene que estar también de su lado.

**Evidencia del criterio 6**: una captura de *Domains → Tracking* mostrando que **no existe ningún
subdominio de tracking**. Va al `work_log`.

### 4bis.2 La credencial SMTP — de dónde sale, exactamente

**No hay una «contraseña SMTP» aparte. La clave de API ES la contraseña SMTP.** Eso confunde siempre,
y es consecuencia directa de D-36: el adaptador habla SMTP estándar, así que el proveedor entra por
las variables de transporte y no por un SDK con su propio nombre.

1. En **resend.com**, menú lateral izquierdo → **API keys**.
2. Botón **Create API Key**.
3. *Name*: `slg-web — envío`. *Permission*: **Sending access**. *Domain*: `mailweb.softlandingglobal.com`.
4. **Add**. La clave aparece **una sola vez** y empieza por `re_`. Cópiala ahora y guárdala en tu
   gestor de contraseñas; si la pierdes, se crea otra y se revoca esta.
5. Esa cadena `re_...` es lo que va en **`MAIL_SMTP_PASSWORD`**. El usuario es literalmente la palabra
   **`resend`**.

En Easypanel, en `slg-web` y en `slgweb-staging`:

| Variable | Valor |
|---|---|
| `MAIL_SMTP_HOST` | `smtp.resend.com` |
| `MAIL_SMTP_PORT` | `587` |
| `MAIL_SMTP_USERNAME` | `resend` |
| `MAIL_SMTP_PASSWORD` | la clave de API que acabas de crear |
| `MAIL_FROM_ADDRESS` | `no-reply@mailweb.softlandingglobal.com` |
| `MAIL_FROM_NAME` | `SLG Agency` |
| `MAIL_REPLY_TO` | `support@softlandingglobal.com` |
| `MAIL_ALERTS_TO` | `support@softlandingglobal.com` |

**No existe ninguna variable con el nombre del producto**, y esa ausencia es la decisión (D-55): el
adaptador habla SMTP estándar, así que cambiar de proveedor son cuatro variables y ninguna línea de
código.

### 4bis.3 La prueba de bandeja de entrada (criterio 3)

Con las variables puestas, manda una invitación de prueba a **tres buzones de proveedores distintos**
—por ejemplo uno de Gmail, uno de Outlook y uno de otro— y anota en cuál cayó en **bandeja de
entrada** y en cuál en spam. Esa tabla cierra el criterio 3 y va al `work_log`.

Si alguno cae en spam, el sospechoso habitual es el DMARC: comprueba si existe
`_dmarc.mailweb` y, si no, añádelo con `v=DMARC1; p=none;`. Solo en el subdominio; el de la raíz
no se toca.

---

## 4ter. Los dos buckets de archivos (FU-09)

Servicio **`minio`** del proyecto `slg_website`. Es lo único que le falta a FU-09.

1. Abre la consola de MinIO (el servicio la publica en su propio puerto/dominio).
2. **Buckets → Create Bucket**. Crea **`downloads`** y **`deliverables`**.
3. En cada uno: **Access Policy → Private**. Ninguno es público, y ninguno lleva *Anonymous access*.
   - `downloads` guarda los documentos D-01…D-11, que se entregan **a cambio de un correo**: si el
     bucket fuera público, el formulario de captura no serviría para nada.
   - `deliverables` guarda entregables **de clientes**. Ahí no hay matiz.
4. **Access Keys → Create access key**. Anótala; es la que va en las variables.
5. En Easypanel, en `slg-web` y en `slgweb-staging`:

| Variable | Valor |
|---|---|
| `S3_ENDPOINT` | la URL interna del servicio `minio` (p. ej. `http://minio:9000`) |
| `S3_REGION` | `us-east-1` — MinIO lo ignora, pero la firma lo exige |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | las del paso 4 |
| `S3_BUCKET_DOWNLOADS` | `downloads` |
| `S3_BUCKET_DELIVERABLES` | `deliverables` |
| `SIGNED_URL_TTL_*_MINUTES` | **déjalas vacías**: los defectos (15/10/30) son los del contrato |

6. Comprobación: pide una URL firmada y ábrela; luego quítale la firma y vuelve a abrirla. La segunda
   debe dar **AccessDenied**. Si da el archivo, el bucket quedó público y hay que volver al paso 3.

> **Nunca** subas un documento de descarga ni un entregable al repositorio: es público, y
> `npm run check:archivos` pone el CI en rojo si aparece uno.

---

## 4quater. Los dos inicios de sesión sociales (F.2-2 y F.2-3)

**Qué está hecho y qué no.** El **código** de los dos métodos está construido y probado desde FU-06:
`lib/auth/better-auth.ts` declara Google y Microsoft y los enciende **solo si sus variables están
presentes**. Lo que falta no es código: son **dos registros en dos consolas ajenas**, que solo puede
hacer alguien con cuenta en ellas. Eso es F.2-2 y F.2-3.

Sin ellos, `/acceder` muestra los dos botones **deshabilitados** con «no disponible» y el acceso por
correo y contraseña funciona igual. Con ellos, es poner cuatro variables y reiniciar.

Las **URL de retorno** son las mismas en los dos casos y hay que escribirlas **exactas**:

| Entorno | URL de retorno de Google | URL de retorno de Microsoft |
|---|---|---|
| Producción | `https://softlandingglobal.com/api/auth/callback/google` | `https://softlandingglobal.com/api/auth/callback/microsoft` |
| Staging | `https://staging.softlandingglobal.com/api/auth/callback/google` | `https://staging.softlandingglobal.com/api/auth/callback/microsoft` |

> Una barra de más, `http` en vez de `https`, o `www` donde no toca, y el proveedor devuelve
> `redirect_uri_mismatch`. Es el 90 % de los fallos de esta sección.

### 4quater.1 Google — F.2-2

1. Entra en **console.cloud.google.com** con la cuenta de Google de SLG.
2. Arriba a la izquierda, selector de proyecto → **Nuevo proyecto**. Nombre: `SLG Agency Website`.
   **Crear**, y asegúrate de que queda seleccionado.
3. Menú ☰ → **APIs y servicios** → **Pantalla de consentimiento de OAuth**.
   - *User Type*: **External** (Externo) → **Crear**.
   - *Nombre de la aplicación*: `SLG Agency`.
   - *Correo de asistencia*: `support@softlandingglobal.com`.
   - *Dominios autorizados*: **`softlandingglobal.com`**.
   - *Datos de contacto del desarrollador*: tu correo. → **Guardar y continuar**.
4. **Permisos (Scopes)** → **Añadir o quitar permisos** → marca **`openid`**, **`.../auth/userinfo.email`**
   y **`.../auth/userinfo.profile`**. Nada más: no pedimos acceso a Gmail, Drive ni contactos, y pedir
   de más dispara una revisión de Google que tarda semanas. → **Actualizar** → **Guardar y continuar**.
5. **Usuarios de prueba**: añade tu correo mientras la app esté en *Testing*. Cuando quieras que entre
   cualquiera, vuelve a la pantalla de consentimiento y pulsa **Publicar aplicación**.
6. **APIs y servicios** → **Credenciales** → **Crear credenciales** → **ID de cliente de OAuth**.
   - *Tipo de aplicación*: **Aplicación web**.
   - *Nombre*: `slg-web`.
   - *Orígenes de JavaScript autorizados*: `https://softlandingglobal.com` y
     `https://staging.softlandingglobal.com`.
   - *URI de redireccionamiento autorizados*: **las dos de Google** de la tabla de arriba.
   - **Crear**.
7. Copia **ID de cliente** y **Secreto de cliente**. Van a `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`.

### 4quater.2 Microsoft Entra ID — F.2-3

**D-23 ayuda aquí**: el correo se queda en Microsoft 365, así que **reutilizas el tenant que ya
tienes**; no hay que crear un directorio nuevo ni pagar nada.

1. Entra en **entra.microsoft.com** con una cuenta administradora del tenant de SLG.
2. **Identidad** → **Aplicaciones** → **Registros de aplicaciones** → **Nuevo registro**.
3. Rellena:
   - *Nombre*: `SLG Agency Website`.
   - *Tipos de cuenta admitidos*: **«Cuentas en cualquier directorio organizativo y cuentas personales
     de Microsoft»**. Es la opción que corresponde a `tenantId: common`, y es la que hace que entre
     tanto un cliente con Microsoft 365 propio como alguien con una cuenta personal.
   - *URI de redirección*: plataforma **Web**, y pega la **de Microsoft de producción**.
4. **Registrar**.
5. **Autenticación** → **Agregar URI** → pega la **de Microsoft de staging** → **Guardar**.
6. **Certificados y secretos** → **Secretos de cliente** → **Nuevo secreto de cliente**.
   - *Descripción*: `slg-web`. *Expira*: 24 meses (anótate la fecha: cuando caduque, el acceso deja
     de funcionar sin más aviso).
   - **Agregar**. Copia la columna **Valor**, **no** la de *Id. de secreto*. Solo se ve una vez.
7. **Información general** → copia el **Id. de aplicación (cliente)**.
8. **Permisos de API**: normalmente ya trae `User.Read` de Microsoft Graph, que basta. Si no está:
   **Agregar un permiso** → *Microsoft Graph* → *Permisos delegados* → `openid`, `profile`, `email`,
   `User.Read`.

### 4quater.3 Las cuatro variables

En Easypanel, en `slg-web` y en `slgweb-staging`:

| Variable | De dónde sale |
|---|---|
| `GOOGLE_CLIENT_ID` | paso 7 de §4quater.1 |
| `GOOGLE_CLIENT_SECRET` | paso 7 de §4quater.1 |
| `MICROSOFT_CLIENT_ID` | paso 7 de §4quater.2 |
| `MICROSOFT_CLIENT_SECRET` | paso 6 de §4quater.2 — la columna **Valor** |
| `MICROSOFT_TENANT_ID` | **`common`** |

`BETTER_AUTH_URL` tiene que apuntar al dominio de **ese** servicio (`https://softlandingglobal.com` en
producción, `https://staging.softlandingglobal.com` en staging): de ahí sale la URL de retorno que la
aplicación le manda al proveedor, y si no coincide con la registrada, `redirect_uri_mismatch`.

> **El correo de Microsoft puede no llegar.** Entra no siempre emite correo para cuentas gestionadas
> (F.1), y por eso el ancla de identidad es **`oid`**, no el correo. Está construido así desde FU-06
> y probado en DU-01: **nunca se vincula una cuenta por un correo no verificado** (RF-62, R-22).

---

## 5. Monitor de caída externo (criterios 8 y 9)

**Producto: UptimeRobot** (D-49), dentro de la categoría que cerró D-43: servicio de
uptime dedicado, con tramo gratuito, **ejecutado fuera del VPS**.

Por qué fuera: n8n corre en `167.88.42.76`, **la misma máquina que debería vigilar**.
Si el servidor cae, el monitor cae con él y nadie se entera. n8n queda como señal
**secundaria** para incidencias parciales, nunca como principal.

### 5.1 Alta, paso a paso

1. Entra en UptimeRobot → **+ New monitor**.
2. Monitor 1:
   - Type: **HTTP(s)** · Friendly name: `slg · producción`
   - URL: `https://softlandingglobal.com/api/health`
   - Interval: **5 minutos** (el mínimo del tramo gratuito)
   - Keyword (opcional, mejor): tipo **HTTP(s) Keyword**, `"status":"ok"`, alerta si
     **no** aparece. Así un `200` que sirve una página de error no cuenta como vivo.
3. Monitor 2: igual, con nombre `slg · staging` y URL
   `https://staging.softlandingglobal.com/api/health`.
   Funciona sin credenciales porque `/api/health` queda fuera de la compuerta.
4. **Alert contacts** — y aquí está el criterio: el aviso debe llegar por un canal
   que **no dependa del VPS**.
   - [ ] Correo a una dirección de **Microsoft 365** (`@softlandingglobal.com`): los MX
         son de Outlook, no del VPS. ✅ independiente.
   - [ ] Un segundo canal que tampoco dependa del VPS: la **app móvil** de
         UptimeRobot (push) o SMS.
   - [ ] **Nunca** un webhook a n8n como canal único: n8n vive en el VPS.
5. Asigna los dos contactos a los dos monitores.

### 5.2 La prueba del criterio 8 — hay que provocarla, no suponerla

1. En Easypanel, **detén `slg-web`**.
2. Espera a que UptimeRobot marque *Down* (hasta 5 min).
3. **Comprueba que el aviso llega** al correo y al segundo canal.
4. Arranca `slg-web` y comprueba que llega el *Up*.
5. Anota en `docs/work_log.md`: hora de la parada, hora del aviso, canales que
   respondieron. **Sin esa anotación el criterio 8 no está cerrado.**

Hazlo fuera de horario comercial y avisa antes: es una caída real de producción.

### 5.3 n8n como señal secundaria (opcional)

Si quieres la señal dentro del VPS para incidencias parciales, apunta un webhook de
UptimeRobot a n8n y usa `UPTIME_WEBHOOK_SECRET` para firmarlo. **No cuenta** para el
criterio 8.

---

## 6. Verificación de los nueve criterios de FU-05

| # | Criterio | Cómo se comprueba | Quién |
|---|---|---|---|
| 1 | Staging por HTTPS, con auth básica y `noindex` | `npm run check:runtime` (automatizado) + los `curl` de §2.5 | Script + Ricardo |
| 2 | `develop`→staging, `main`→producción, y nada llega a `main` sin pasar por staging | §3.1 (webhooks) + job `guarda-staging` + protección de rama §3.2 | Script + Ricardo |
| 3 | `crm`, `n8n`, `evolution`, `academy` y los MX siguen resolviendo igual | `npm run check:dns` contra la línea base, salida al `work_log` | Script |
| 4 | El pipeline **falla** ante los seis casos | `.github/workflows/ci.yml` | Script |
| 5 | Cada freno tiene prueba negativa ejecutada | `npm run check:brakes` — 6 frenos en rojo por el motivo esperado | Script ✅ |
| 6 | `.env.example` con todos los nombres, cero valores | `npm run check:env` — 42 variables, y falla si el código lee una que no está | Script ✅ |
| 7 | CSP, HSTS y `frame-ancestors` activas y verificadas | `npm run check:runtime` — 19 comprobaciones sobre el servidor real | Script ✅ |
| 8 | El monitor avisa, provocando la caída una vez, por canal ajeno al VPS | §5.2 | Ricardo |
| 9 | Producto de monitorización elegido y registrado | **UptimeRobot, D-49** en `docs/decision_log.md` | ✅ |

Los marcados ✅ ya están cerrados y verificados en este repositorio. Los demás
necesitan la infraestructura viva: son los pasos §2 a §5.

---

## 7. Operación diaria

| Necesidad | Comando |
|---|---|
| Correr todo el pipeline en local | `npm run check:ci` |
| Ver si los frenos siguen frenando | `npm run check:brakes` |
| Comprobar el DNS tras cualquier cambio de zona | `npm run check:dns` |
| Medir el JS inicial tras añadir una dependencia | `npm run build && npm run check:js-budget` |
| Aplicar una migración nueva | Se aplica sola en el despliegue (`npm run db:migrate`) |

**Antes de aplicar cualquier migración de esquema en producción se ejecuta una copia
de seguridad automática** (FU-14, criterio 7, R-20). Ese paso llega con FU-14: hasta
entonces, **haz la copia a mano** antes de desplegar una migración.
