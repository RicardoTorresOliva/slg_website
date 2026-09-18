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

## 0bis. EMPIEZA POR AQUÍ — la ruta corta

Todo el resto de este documento es referencia. Para arrancar, esto es lo que hay que hacer, en
orden, y **no hay ninguna consola ni ningún comando** salvo donde lo diga expresamente:

1. **Enciende la página de puesta en marcha** (§2.1, paso 1): una variable en Easypanel y abrir una
   URL. Esa página te dice, variable por variable, **qué falta**, y trae dos botones que hacen solos
   lo que antes había que hacer a mano.
2. **Base de datos** (§2.1, paso 2): tres variables, y el botón *«Ponerle la contraseña al usuario
   de la base»*.
3. **Archivos** (§2.1, paso 3): copiar dos valores del servicio `minio` a `slg-web`, y el botón
   *«Crear los dos buckets y cerrarlos»*.
4. **Correo** (§4bis): comprobar el remitente en staging y mirar el bloque de correo de la misma
   página.
5. **DNS** (§4) y **despliegue automático** (§3).

Lo demás —analítica, webhooks, claves del CRM, monitor— es **opcional o posterior**, y cada apartado
lo dice en su título.

**Regla que no se rompe:** ninguna contraseña ni clave se pega en un chat, en un documento ni en este
repositorio. Van de una pestaña de Easypanel a otra pestaña de Easypanel.

### 0ter. La lista completa de lo que solo puedes hacer tú

Todo lo que se podía resolver escribiendo código **está escrito y verificado**. Lo que queda son
**doce cosas**, y ninguna es un comando: son pestañas de Easypanel, paneles de proveedores y una
tarde mirando pantallas. Esta tabla es el estado real del proyecto en una página.

Van en este orden porque cada una desbloquea a la siguiente.

| # | Qué | Dónde | Desbloquea | Rato |
|---|---|---|---|---|
| 1 | Los **cinco servicios** y la página de puesta en marcha | Easypanel · §2.1 | FU-05, y con ella todo lo demás | ~40 min |
| 2 | **Base de datos**: tres variables y el botón de la contraseña | Easypanel · §2.1 paso 2 | FU-05 | ~10 min |
| 3 | **Los dos buckets**: copiar dos valores y pulsar el botón | Easypanel · §2.1 paso 3 y §4ter | **FU-09, DU-08** (la entrega real de documentos) | ~10 min |
| 4 | **Despliegue automático** `develop`→staging y `main`→producción | Easypanel · §3 | FU-05, DU-07, DU-23 | ~15 min |
| 5 | **DNS**: primero la línea base, después los registros nuevos | Panel del dominio · §4 | FU-05, FU-08, DU-25 | ~30 min |
| 6 | **Correo**: el subdominio de envío y los tres buzones | Panel del dominio + Microsoft 365 · §4bis | **FU-08, DU-01, DU-09** | ~30 min |
| 7 | **Google y Microsoft** como formas de entrar (F.2-2, F.2-3) | Google Cloud + Entra ID · §4quater | **DU-01, DU-14, DU-21** y el gate **D8** | ~45 min |
| 8 | **Mirar las intranets**: `SUPERFICIES_EN_REVISION=hq,portal` en staging | Easypanel · §2.2 | **DU-13, DU-14, DU-15, DU-16, DU-17, DU-18, DU-20** | una tarde |
| 9 | El **visor**: el subdominio, su variable y `DELIVERABLE_VIEWER_SECRET` | Easypanel · §4octies | **DU-19** y el gate **D10** | ~20 min |
| 10 | **Copias de seguridad**: R2, las claves, las dos tareas y `BACKUP_FIRST_DATE` | Cloudflare + Easypanel · §4nonies | **FU-14** y el gate **D11** | ~40 min |
| 11 | **Monitor de caída** y provocar una parada para ver si avisa | UptimeRobot · §5 | **DU-25** y el gate **D11** | ~20 min |
| 12 | **La prueba de tres minutos**: cambiar un texto, subir una descarga, crear un cliente | Solo el navegador · `README.md` | **DU-24** y el gate **D12** | ~15 min |

**Fuera de esta lista quedan tres cosas que no son de despliegue**, y las tres son tuyas también:

- **Firmar el copy** de FU-01 (los 74 registros están redactados y sin marcadores) y las cuatro
  enumeraciones literales que faltan.
- **El CRM real** (F.2-5): sus dos claves se ponen siguiendo **§4septies**, y hasta entonces DU-09 y
  DU-13 están probados contra un doble.
- **La URL de agenda** de la Sesión Cero (F.2-6): mientras no exista, el portal enseña
  «próximamente», que es la mitad degradada del criterio 4 de DU-21.
- **La rotación de S-01**, diferida por decisión tuya al final del proyecto. Es requisito de go-live.

> **Lo que NO hace falta que hagas:** ninguna decisión de producto ni de configuración sigue abierta.
> P-1 a P-5 están las cinco cerradas. No hay nada esperando a que elijas entre opciones.

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

### 2.1 Lo que queda por hacer — **casi todo lo hace una página, tú pones valores**

> **Antes de nada, lee esto:** hay una página en el propio sitio que **hace el trabajo** y que te
> dice, variable por variable, qué falta. Se llama `/api/ops`. Lo único que tienes que hacer a mano
> es **pegar valores en Easypanel**; ni consolas de PostgreSQL, ni consola de MinIO, ni comandos.

---

#### Paso 1 · Encender la página de puesta en marcha

1. Abre **Easypanel** → proyecto **`slg_website`** → servicio **`slg-web`**.
2. Pestaña **Environment**. Es una caja de texto con una variable por línea, con la forma
   `NOMBRE=valor`.
3. Añade una línea nueva al final:

   ```
   OPS_TOKEN=<aquí una palabra larga y rara que te inventes>
   ```

   **Sustituye lo que va entre `<` y `>`, corchetes angulares incluidos**, por una cadena larga (30
   caracteres o más) que no uses en ningún otro sitio. Si no se te ocurre: abre una pestaña nueva con
   el generador de contraseñas de tu navegador o de tu gestor de contraseñas, pídele 40 caracteres y
   pega eso.

   **Aquí no hay ningún ejemplo copiable, y es a propósito**: un valor de muestra escrito en una guía
   se pega tal cual, y entonces la llave de esta página está publicada en un repositorio público.
   **Es la llave de esa página**: quien la tenga, la abre.
4. Botón **Save**, y después botón **Deploy**. Espera a que el servicio quede verde.
5. Abre en el navegador:

   ```
   https://softlandingglobal.com/api/ops?token=inventate-aqui-una-palabra-larga-y-rara
   ```

   (la misma palabra que pusiste arriba)

**Qué vas a ver.** Una tabla con **todas** las variables, un ✅ o un ❌ en cada una, y debajo dos
botones. Las que están en ❌ son las que faltan, con el nombre exacto que hay que escribir. **A
partir de aquí, esa página es el guion**: pones lo que te pide, recargas, y vuelves a mirar.

> Si te sale **«404 Not Found»**: o la variable `OPS_TOKEN` no se guardó, o no le diste a **Deploy**,
> o la palabra de la URL no es idéntica a la de Easypanel. La página **no existe** sin esa variable,
> y devuelve 404 en vez de «no autorizado» a propósito: un «no autorizado» le confirmaría a un
> desconocido que la página está ahí.

---

#### Paso 2 · La base de datos

Aquí hay **tres** variables, y las tres van en **Easypanel → `slg-web` → Environment**.

**2.a — La contraseña del usuario del sitio.** Invéntate una larga (20 caracteres o más, letras y
números, **sin comillas ni espacios**) y ponla en dos sitios:

```
APP_DB_PASSWORD=<la que te inventes, 20 caracteres o más>
```

**Sustituye lo de entre `<` y `>` por la tuya, corchetes angulares incluidos.** No hay ejemplo
escrito: una contraseña de muestra en una guía acaba siendo la contraseña de alguien.

**2.b — La cadena de conexión del sitio.** Lleva esa misma contraseña dentro. **No está escrita
entera aquí a propósito**: el análisis de secretos del CI pone el pipeline en rojo si aparece una
cadena de conexión con contraseña dentro del repositorio, y tiene razón aunque sea de ejemplo. Se
escribe pegando estos **cinco trozos seguidos, sin espacios**, en una sola línea:

| # | Trozo | Qué es | De dónde sale |
|---|---|---|---|
| 1 | `DATABASE_URL=postgresql://` | El principio | Siempre igual |
| 2 | `slg_app` | El usuario con el que el sitio entra a la base | Lo crea la migración. **No lo cambies** |
| 3 | `:` y después **la contraseña de 2.a** | Dos puntos pegados, y la contraseña | **Te la inventas tú** |
| 4 | `@slgwebpostgres` | El nombre del servicio de PostgreSQL en Easypanel | Está en la tabla de arriba |
| 5 | `:5432/slg` | El puerto y el nombre de la base | Siempre igual |

Con la contraseña del ejemplo (`LaQueTeInventes123456`) la línea empezaría por
`DATABASE_URL=postgresql://slg_app:LaQueTe…` y terminaría en `@slgwebpostgres:5432/slg`.

**2.c — La cadena del usuario dueño**, que es el que aplica las migraciones y el que le pondrá la
contraseña a `slg_app`. **Mismos cinco trozos**, cambiando dos:

| # | Trozo | Qué cambia |
|---|---|---|
| 1 | `DATABASE_URL_MIGRATIONS=postgresql://` | Otro nombre de variable |
| 2 | `postgres` | Aquí va el usuario **dueño**, no `slg_app` |
| 3 | `:` y después **la contraseña que ya existe** | **No te la inventas** — ver abajo |
| 4 | `@slgwebpostgres` | Igual |
| 5 | `:5432/slg` | Igual |

**La contraseña del dueño no te la inventas: ya existe.** Para verla: Easypanel → servicio
**`slgwebpostgres`** → pestaña **Environment** → busca la línea `POSTGRES_PASSWORD=…`. Copia lo que
haya después del `=` y pégalo ahí. Mira también `POSTGRES_USER=…`: si no pone `postgres`, usa ese
nombre en vez de `postgres`.

> **No pegues ninguna de estas dos cadenas en un chat ni en un documento.** Van de la pestaña de
> Easypanel a la pestaña de Easypanel y nada más.

**2.d — Guardar, desplegar y pulsar el botón.**

1. **Save** y **Deploy** en `slg-web`.
2. Vuelve a abrir `/api/ops?token=…`.
3. Pulsa el botón **«Ponerle la contraseña al usuario de la base»**.
4. Tiene que salir *El rol slg_app ya tiene contraseña* y, debajo, *Conecta como «slg_app»*.
5. Si lo segundo sigue en rojo, pulsa **Restart** en `slg-web` y recarga: el servidor guarda
   conexiones abiertas con la contraseña vieja y hay que echarlas.

Eso sustituye entero al «hazlo en la consola de `slgwebpostgres`» de antes. **No hay consola que
buscar.**

---

#### Paso 3 · Los archivos (MinIO)

**No tienes que entrar a la consola de MinIO.** Lo que el sitio necesita es un usuario y una
contraseña de MinIO, y **ya existen**: son las del propio servicio.

1. Easypanel → servicio **`minio`** → pestaña **Environment**. Verás dos líneas parecidas a estas:

   ```
   MINIO_ROOT_USER=<un usuario>
   MINIO_ROOT_PASSWORD=<una contraseña>
   ```

   Lo que veas ahí ya está puesto por Easypanel: **no lo cambies**, solo léelo.

2. Copia esos **dos valores**.
3. Easypanel → servicio **`slg-web`** → **Environment**, y añade estas cinco líneas:

   ```
   S3_ENDPOINT=http://minio:9000
   S3_REGION=us-east-1
   S3_ACCESS_KEY_ID=<lo que ponía en MINIO_ROOT_USER>
   S3_SECRET_ACCESS_KEY=<lo que ponía en MINIO_ROOT_PASSWORD>
   S3_BUCKET_DOWNLOADS=downloads
   S3_BUCKET_DELIVERABLES=deliverables
   ```

   `http://minio:9000` es el nombre del servicio y su puerto interno: los dos servicios viven en la
   misma red de Easypanel y se llaman por su nombre. **No lleva `https` ni dominio.**

4. **Save** → **Deploy**.
5. Vuelve a `/api/ops?token=…` y pulsa **«Crear los dos buckets y cerrarlos»**.
6. Mira el bloque **«Almacenamiento de archivos»** de la misma página. La línea que importa es
   **«Lectura SIN firma (tiene que FALLAR)»**: si sale ✅, el bucket es privado y todo está bien.

> **Si prefieres una clave aparte** en vez de la del administrador —es más limpio, y se puede hacer
> después—: la consola de MinIO que te abrió Easypanel pide usuario y contraseña, y son **esos mismos
> dos valores** de `MINIO_ROOT_USER` y `MINIO_ROOT_PASSWORD`. Dentro: **Access Keys → Create access
> key → Create**, copias las dos cadenas que salen y sustituyes `S3_ACCESS_KEY_ID` y
> `S3_SECRET_ACCESS_KEY`. Pero **para arrancar no hace falta**.

---

#### Paso 4 · Las variables que no se pueden inventar solas

Estas cuatro van también en **`slg-web` → Environment**:

```
NEXT_PUBLIC_SITE_URL=https://softlandingglobal.com
BETTER_AUTH_SECRET=<otra palabra larga, distinta de la de OPS_TOKEN>
OPS_MAIL_TO=torresoliva.ricardo@gmail.com
PRIVACY_POLICY_VERSION=2026-09-13
```

Las tres que llevan valor escrito **se pegan tal cual**: son decisiones del proyecto, no secretos.
La de `BETTER_AUTH_SECRET` **no**: sustituye lo de entre `<` y `>` por una cadena larga tuya, del
mismo generador de antes. Firma las sesiones, así que tiene que ser larga y **no se cambia después**,
porque cambiarla cierra la sesión de todo el mundo.

---

#### Paso 5 · Lo que NO se pone en producción

**`STAGING_BASIC_AUTH_USER` y `STAGING_BASIC_AUTH_PASSWORD` NO van en `slg-web`.** El candado de
staging se enciende **por la mera presencia** de esas dos variables: ponerlas en producción deja el
sitio público pidiendo usuario y contraseña. Si están, bórralas de `slg-web`.

---

#### Paso 6 · El comando de despliegue

Easypanel → `slg-web` → pestaña **Deploy** (o **Build**, según la versión) → campo **Deploy command**
(a veces se llama *Post-deploy command* o *Release command*):

```
npm run db:migrate
```

Eso aplica las migraciones usando `DATABASE_URL_MIGRATIONS`, o sea el usuario dueño. **El sitio en
marcha nunca migra**, y por eso la migración va aquí y no en el arranque.

Para comprobar que funcionó, vuelve a `/api/ops?token=…`: la línea **«Migraciones aplicadas»** tiene
que decir un número, no «la base está vacía».

---

### 2.2 `slgweb-staging` — lo mismo, con tres diferencias

Es el **mismo servicio con otras variables**. Copia todo lo del §2.1 en
**Easypanel → `slgweb-staging` → Environment**, y cambia solo estas tres cosas:

| Qué cambia | Valor en `slgweb-staging` | Por qué |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://staging.softlandingglobal.com` | Si apunta a producción, los enlaces de los correos de prueba llevan al sitio real |
| **Base de datos** | La misma cadena pero terminada en **`/slg_staging`** en vez de `/slg` | Probar con los datos de producción es probar con los datos de los clientes |
| **Dos variables nuevas** | `STAGING_BASIC_AUTH_USER=<un usuario que elijas>` y `STAGING_BASIC_AUTH_PASSWORD=<una contraseña que elijas>` | Son las que ponen el candado. Sustituye lo de entre `<` y `>`, ángulos incluidos: un valor de muestra en una tabla se pega tal cual |

**La base `slg_staging` hay que crearla una vez.** Cuando pongas la cadena terminada en
`/slg_staging` y despliegues, `/api/ops` de staging te dirá que no existe. Para crearla: Easypanel →
servicio **`slgwebpostgres`** → pestaña **Console** (es una terminal dentro del propio panel, no hay
que instalar nada) → escribe esto y pulsa Enter:

```
psql -U postgres -c "CREATE DATABASE slg_staging;"
```

Si contesta `CREATE DATABASE`, hecho. Si dice que ya existe, también.

#### Y una cuarta cosa, cuando quieras mirar las intranets

**Solo en `slgweb-staging`.** Añade una línea más en su **Environment**:

```
SUPERFICIES_EN_REVISION=hq,portal
```

Esta se pega **tal cual** —no es un secreto, es una lista de nombres— y con ella `/hq` y `/portal`
dejan de dar 404 **en staging** y se pueden mirar. Sin ella siguen invisibles.

**Por qué hacía falta.** Cinco pantallas de las intranets estaban construidas y probadas, y la única
cosa que les faltaba era que alguien las mirara. Pero mirarlas exigía que la superficie se abriera, y
la superficie se abría «al cerrar el milestone», y el milestone no cerraba hasta que las unidades
cerraran. Nadie podía ver una sola pantalla, nunca. Esta variable rompe ese círculo por el único sitio
donde es seguro romperlo.

> **En `slg-web` NO.** Y si la pegas ahí por error, **no pasa nada**: la apertura solo funciona donde
> hay candado de staging delante, y producción no lo lleva. Está comprobado con una sesión de verdad
> en `npm run test:acceso`, no solo leyendo el código. Aun así, no la pongas: lo que está comprobado
> es que no abre, no que sea buena idea tenerla ahí.
>
> **Sigue haciendo falta entrar.** Esto no abre las intranets al mundo: retira el «todavía no», nada
> más. Dentro se sigue pidiendo sesión válida y el rol que corresponda.

**Cuándo se quita.** Cuando M3 y M4 cierren, las superficies se abren en el código y esta variable se
retira. Si sigue puesta después de eso, sobra.

**Qué hace el candado de staging.** Con esas dos variables puestas, `slgweb-staging` pide usuario y
contraseña en **todas** las rutas menos `/api/health`, y marca todo como `noindex` para que Google no
lo encuentre. `/api/health` queda abierta a propósito: el monitor de caída no lleva credenciales, y
si recibiera un 401 estaría midiendo el candado en vez del servicio. Está comprobado de forma
automatizada en `check:runtime`.

---

### 2.3 Resumen: qué variables van en cada servicio

| Variable | `slg-web` | `slgweb-staging` |
|---|---|---|
| `OPS_TOKEN` | sí (se borra al terminar) | sí |
| `APP_DB_PASSWORD` | sí | sí |
| `DATABASE_URL` | `…/slg` | `…/slg_staging` |
| `DATABASE_URL_MIGRATIONS` | `…/slg` | `…/slg_staging` |
| `NEXT_PUBLIC_SITE_URL` | `https://softlandingglobal.com` | `https://staging.softlandingglobal.com` |
| `BETTER_AUTH_SECRET` | sí | sí (otra distinta) |
| `S3_*` (seis) | sí | sí, las mismas |
| `MAIL_*` (§4bis) | sí | sí |
| `OPS_MAIL_TO` | sí | sí |
| `PRIVACY_POLICY_VERSION` | sí | sí |
| `STAGING_BASIC_AUTH_USER` / `_PASSWORD` | **NO** | **sí** |

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

> **Aquí NO hay nada que teclear.** Los dos comandos que esta sección tenía
> —línea base y verificación— **los ejecuta el asistente**, no tú. Tu parte es el
> panel de Hostinger, y son tres entradas.

### 4.1 La línea base — **ya está hecha**

El estado anterior de la zona está capturado en **`docs/dns_baseline.txt`**, en el
repositorio, con fecha. Se tomó contra un resolutor público (8.8.8.8) a propósito:
el resolutor de una máquina concreta puede llevar la zona cacheada de antes del
cambio y dar un verde falso.

Y ya dice algo útil: **la raíz, `www` y `staging` YA resuelven a `167.88.42.76`**.
Los tres registros de §4.3 estaban puestos antes de empezar. Lo que queda de esta
sección es comprobar que nada se movió, no crear nada.

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

**La ejecuta el asistente** (`npm run check:dns`) y pega la salida en
`docs/work_log.md`, que es lo que pide el criterio 3. Compara **nombre por
nombre** contra `docs/dns_baseline.txt` y falla si un nombre protegido se movió.

**Lo único que es tuyo**: si el freno dice que un nombre protegido cambió, entra
en Hostinger → *Dominios* → `softlandingglobal.com` → *DNS / Nameservers*, busca
esa entrada y devuélvela a como está en `docs/dns_baseline.txt` **antes de
seguir**. Un `crm` caído es el CRM de la empresa fuera de servicio.

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

### 4bis.0 El remitente — **`slg-web` está bien; revisa `slgweb-staging`**

> **Corrección de una corrección.** Este apartado decía que `slg-web` tenía puesto
> `noreply@mail.softlandingglobal.com` y había que cambiarlo. **Era falso**: en `slg-web` el valor
> es y era `noreply@mailweb.softlandingglobal.com`, que es el correcto. El que estaba mal era el de
> **`slgweb-staging`**. Lo doy por comprobado por Ricardo contra el propio panel, que es la fuente,
> y no por lo que yo había supuesto.

El dominio verificado en Resend es **`mailweb.`**, con `web`. Comprobado contra un resolutor público:

| Nombre consultado | Respuesta |
|---|---|
| `resend._domainkey.mailweb.softlandingglobal.com` | clave DKIM publicada ✅ |
| `send.mailweb.softlandingglobal.com` | `v=spf1 ip4:52.3.252.119 …` ✅ |
| `resend._domainkey.mail.softlandingglobal.com` | **no existe** ❌ |
| `send.mail.softlandingglobal.com` | **no existe** ❌ |

Enviar desde `mail.` —sin `web`— significa **salir sin firma DKIM**: no rebota con un error claro, se
entrega directo a la carpeta de spam, y desde fuera parece que todo funciona. Por eso importa que
esté idéntico en los dos servicios.

**Qué queda por hacer:**

1. Easypanel → servicio **`slgweb-staging`** → pestaña **Environment**.
2. Busca `MAIL_FROM_ADDRESS=` y comprueba que pone exactamente
   `noreply@mailweb.softlandingglobal.com`. Si pone `mail.` sin `web`, cámbialo.
3. **Save** → **Deploy**.
4. En **`slg-web`** no toques nada: ya está bien.

**Y no tienes que fiarte de mí ni de la vista.** Abre `/api/ops?token=…` y mira el bloque de correo:
comprueba el DKIM y el SPF **del dominio que esté realmente configurado**, sea cual sea, y te dice si
ese dominio está verificado. Si sale ✅, el remitente es el bueno. Si sale ❌, la propia página dice
qué nombre de DNS no encontró.

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
| `MAIL_FROM_ADDRESS` | `noreply@mailweb.softlandingglobal.com` — **con `web`**, ver §4bis.0 |
| `MAIL_FROM_NAME` | `SLG Agency` |
| `MAIL_REPLY_TO` | `support@softlandingglobal.com` |
| `MAIL_ALERTS_TO` | `support@softlandingglobal.com` |

**No existe ninguna variable con el nombre del producto**, y esa ausencia es la decisión (D-55): el
adaptador habla SMTP estándar, así que cambiar de proveedor son cuatro variables y ninguna línea de
código.

### 4bis.3 La prueba de bandeja de entrada (criterio 3)

**No tienes que mandar el correo desde ninguna cuenta tuya.** El correo lo manda **el sitio**, desde
`MAIL_FROM_ADDRESS`, usando la credencial SMTP que ya pusiste. Tu papel es decir a qué tres buzones
tiene que llegar, y luego mirar si llegaron.

Se hace desde el navegador, con la página `/api/ops`. Paso a paso:

1. **Inventa un testigo largo.** Cualquier cadena aleatoria de 40 caracteres o más, sin espacios. Por
   ejemplo la que te dé cualquier generador de contraseñas. Llamémosla `TESTIGO`.
2. **Easypanel** → proyecto **`slg`** → servicio **`slg-web`** → pestaña **Environment**. Añade estas
   dos líneas al final:
   ```
   OPS_TOKEN=<el testigo del paso 1>
   OPS_MAIL_TO=tu-correo@gmail.com,otro@outlook.com,torresoliva.ricardo@gmail.com
   ```

   La primera línea lleva **tu** testigo en lugar de lo que va entre `<` y `>`; la segunda se pega
   cambiando las dos primeras direcciones por las tuyas.
   Las tres direcciones tienen que ser de **proveedores distintos**: ahí está la gracia de la prueba.
3. **Save** y luego **Deploy**.
4. Cuando el despliegue termine, abre en el navegador:
   `https://softlandingglobal.com/api/ops?token=TESTIGO`
   (sustituyendo `TESTIGO` por el tuyo).
5. Verás una página con dos bloques y una lista de ✅ y ❌. Comprueba:
   - **DKIM y SPF del remitente** — si sale ❌, es lo de §4bis.0: el remitente apunta a un dominio sin
     verificar.
   - **Un correo por destinatario** — ✅ significa que el servidor SMTP lo aceptó.
6. **Abre los tres buzones** y anota en cuál cayó en bandeja de entrada y en cuál en spam. Mándame esa
   lista: es lo que cierra el criterio 3 y va al `work_log`.
7. **Cuando esté cerrado, borra `OPS_TOKEN` y `OPS_MAIL_TO`** en Easypanel y vuelve a hacer **Deploy**.
   Sin `OPS_TOKEN` la página deja de existir: devuelve 404 como cualquier dirección inventada.

Si alguno cae en spam, el sospechoso habitual es el DMARC: dime si aparece o no
`_dmarc.mailweb.softlandingglobal.com` en la página y te doy la entrada exacta a añadir. Solo en el
subdominio; el de la raíz no se toca.

---

## 4ter. Los dos buckets de archivos (FU-09) — **ya no hace falta entrar a MinIO**

> **Esto cambió.** Antes te mandaba a la consola de MinIO a crear dos buckets y marcarlos privados.
> **Ya no.** Lo hace el botón **«Crear los dos buckets y cerrarlos»** de `/api/ops`. El paso a paso
> está en el **§2.1, paso 3**, y se resume en: copiar `MINIO_ROOT_USER` y `MINIO_ROOT_PASSWORD` del
> servicio `minio` a las variables `S3_*` de `slg-web`, desplegar, y pulsar el botón.

**Si llegaste a la pantalla de login de MinIO**, la de fondo blanco que pone *MINIO OBJECT STORE*:
el usuario y la contraseña son exactamente los valores de `MINIO_ROOT_USER` y `MINIO_ROOT_PASSWORD`
que hay en **Easypanel → servicio `minio` → pestaña Environment**. Pero **no necesitas entrar**: esos
mismos dos valores, pegados en `S3_ACCESS_KEY_ID` y `S3_SECRET_ACCESS_KEY` de `slg-web`, son lo único
que hace falta.

### 4ter.1 La comprobación que de verdad importa

Un botón que dice «hecho» no es un bucket privado. Lo que lo demuestra está en la misma página
`/api/ops`, en el bloque **«Almacenamiento de archivos»**, y son tres líneas seguidas:

| Línea | Qué significa que salga ✅ |
|---|---|
| Subida firmada al bucket «downloads» | El sitio puede escribir |
| Lectura CON firma | El sitio puede leer lo que escribió |
| **Lectura SIN firma (tiene que FALLAR)** | **Nadie puede leerlo desde fuera** |

**La tercera es la que cuenta.** Si esa línea sale en rojo diciendo que consiguió leer el archivo, el
bucket es público: vuelve a pulsar el botón, y si sigue igual entra a la consola de MinIO y pon los
dos buckets en *Access Policy → Private* a mano.

La página deja un archivo de prueba llamado `ops/comprobacion-…`; puedes borrarlo desde la consola de
MinIO cuando quieras, o dejarlo: pesa unos bytes.

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

## 4quinquies. La analítica autoalojada (DU-12) — **opcional, y el sitio funciona sin ella**

Hasta que hagas esto, **el sitio no mide nada**. No está roto: ese es el estado por defecto correcto
(RF-127). Hazlo cuando quieras saber qué páginas se visitan, no antes.

**Por qué Umami y no Google Analytics.** RF-35 y RF-127 prohíben scripts de terceros y cookies de
seguimiento en la capa pública, y hay un freno del CI que lo mide con un navegador de verdad
(`npm run check:terceros`): si alguien mete Google Analytics, el pipeline se pone rojo. Umami
autoalojado no pone cookies y los datos se quedan en **tu** VPS.

### 4quinquies.1 Crear el servicio, paso a paso

1. **Easypanel** → proyecto **`slg_website`** → botón **+ Service** → **App**.
2. *Name*: `slg-analytics`. **Create**.
3. Dentro del servicio nuevo → pestaña **Source** → elige **Docker Image** y escribe:
   `ghcr.io/umami-software/umami:postgresql-latest`. **Save**.
4. Pestaña **Environment**. Añade **tres** variables:

   | Variable | Valor |
   |---|---|
   | `DATABASE_TYPE` | `postgresql` |
   | `APP_SECRET` | una cadena larga que te inventes ahora y no uses en ningún otro sitio |
   | `DATABASE_URL` | ver justo debajo |

   **Cómo se escribe `DATABASE_URL`** (no está escrita aquí entera a propósito: este repositorio es
   público y el freno `npm run check:secrets` pone el CI en rojo si aparece una cadena de conexión
   con contraseña). Es una sola línea, sin espacios, con estas cinco piezas en este orden:

   `postgres://` + `slg` + `:` + **la contraseña** + `@slg-postgres:5432/umami`

   **La contraseña** es la que ya tiene el servicio `slg-postgres` en **su** pestaña Environment, en
   `POSTGRES_PASSWORD`: cópiala desde ahí y pégala en el hueco. **No la pegues en ningún otro sitio**
   —ni en un chat, ni en un documento, ni en este repositorio—.
5. La base `umami` **tiene que existir antes de arrancar**. En Easypanel → servicio
   **`slg-postgres`** → pestaña **Console** (o **Terminal**) → escribe:
   `psql -U slg -c "CREATE DATABASE umami;"` y pulsa Enter. Si contesta `CREATE DATABASE`, hecho; si
   dice que ya existe, también hecho.
6. Vuelve a `slg-analytics` → pestaña **Domains** → **Add Domain**. *Host*:
   `analytics.softlandingglobal.com`. *Port*: **3000**. Marca **HTTPS**. **Create**.
7. **Hostinger** → DNS de `softlandingglobal.com` → **Add record**. *Type*: `A`. *Name*:
   `analytics`. *Points to*: `167.88.42.76`. *TTL*: el que venga por defecto. **Add**.
   (Este nombre **no** está en la lista de protegidos de §4.2: se puede crear sin riesgo.)
8. **Deploy** en `slg-analytics`. Espera a que quede verde.

### 4quinquies.2 Sacar el identificador del sitio

1. Abre `https://analytics.softlandingglobal.com`.
2. Entra con el usuario inicial de Umami: **`admin`** / **`umami`**.
3. **Lo primero, antes que nada**: arriba a la derecha, tu usuario → **Profile** → **Change
   password**. Pon una contraseña tuya. Dejar `umami` es dejar el panel abierto a cualquiera.
4. **Settings → Websites → Add website**. *Name*: `softlandingglobal.com`. *Domain*:
   `softlandingglobal.com`. **Save**.
5. En la lista, botón **Edit** del sitio recién creado. Verás un **Website ID** con forma de
   `xxxxxxxx-xxxx-...`. **Cópialo.**

### 4quinquies.3 Las dos variables

En Easypanel, en **`slg-web`** y en **`slgweb-staging`**, pestaña **Environment**:

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_UMAMI_SCRIPT_URL` | `https://analytics.softlandingglobal.com/script.js` |
| `NEXT_PUBLIC_UMAMI_WEBSITE_ID` | el **Website ID** del paso anterior |

> **Importante y fácil de olvidar**: estas dos empiezan por `NEXT_PUBLIC_`, así que **se leen al
> COMPILAR, no al arrancar**. Ponerlas y reiniciar no basta: hay que **volver a desplegar**
> (`slg-web` → **Deploy**). Si el script no aparece, casi siempre es esto.

La política de seguridad del sitio (CSP) **se ajusta sola** al dominio que pongas ahí: no hay nada
más que tocar.

### 4quinquies.4 Comprobación

Abre `https://softlandingglobal.com`, navega dos o tres páginas, espera un minuto y mira el panel de
Umami: tienen que aparecer las visitas. Si no aparecen, repasa el aviso del recuadro anterior —
**volver a desplegar**, no solo reiniciar.

---

## 4sexies. Los webhooks salientes (DU-12) — **opcional, y el sitio funciona sin ellos**

**No hace falta hacer nada de esto para que el sitio funcione.** Sin suscriptor configurado, los
nueve eventos **quedan registrados igual** en la tabla `webhook_delivery` y no se pierde ninguno
(RF-115). Esto solo hace falta cuando quieras que **n8n** reciba los eventos y automatice algo —por
ejemplo, publicar en LinkedIn cuando salga un artículo.

Cuando lo quieras, en Easypanel → `slg-web` → **Environment**, dos variables:

| Variable | Valor |
|---|---|
| `N8N_WEBHOOK_URL` | la URL del webhook que te dé n8n al crear el flujo |
| `WEBHOOK_SIGNING_SECRET` | una cadena larga que te inventes. **Es la llave con la que n8n comprueba que el mensaje viene de tu sitio y no de otro.** |

**Cómo verifica n8n la firma.** Cada envío lleva tres cabeceras: `x-slg-event` (qué pasó),
`x-slg-timestamp` (cuándo) y `x-slg-signature` (la firma). La firma es
`sha256=` + HMAC-SHA256 de la cadena `<timestamp>.<cuerpo crudo>` con tu secreto. **Sobre el cuerpo
crudo, tal cual llega**: si n8n vuelve a convertir el JSON a texto antes de comprobar, un espacio de
más hace que la firma no cuadre y parezca un fallo del sitio.

**Si más adelante quieres más de un destino**, usa `WEBHOOK_SUBSCRIBERS` en vez de las dos de arriba:
una lista JSON con `nombre`, `url` y `secreto` por destino. **Cada destino lleva su propio secreto** —
así, si mañana quitas uno, no tienes que cambiarle la llave al otro.

**Los artículos.** Si además quieres que el evento `post.published` salga cuando publiques un
artículo nuevo, añade `WEBHOOK_ANNOUNCE_POSTS` con valor `1`. Va apagado a propósito: encendida por
primera vez sobre un sitio que ya tiene artículos, anunciaría **todos los antiguos de golpe**, como
si se acabaran de publicar. Enciéndela **antes** de conectar el flujo de n8n a redes sociales, no
después.

---

## 4septies. Las dos claves del CRM (F.2-5) — **esto sí hace falta**

Sin esto, la web **captura leads igual** —quedan guardados y en cola— pero **no llegan al CRM**, y el
tablero de HQ no puede enseñar las métricas. Es la dependencia externa que más tiempo lleva parada.

**Son DOS claves y no una**, y no es burocracia: si el tablero leyera con la clave que escribe, el
día que haya que revocar la de lectura se apagaría también la captura de leads. Cada una lleva el
permiso mínimo de lo suyo.

### 4septies.1 Crearlas en el CRM

1. Entra en el CRM en `https://crm.softlandingglobal.com` con tu cuenta.
2. Busca **Settings** (o **Configuración**) → **API keys** / **Claves de API** → botón para crear
   una nueva. (Si no encuentras la sección, es porque hace falta un usuario administrador: entra con
   ese.)
3. Crea la **primera**:
   - *Nombre*: `Website — captura`
   - *Permisos / scopes*: `contacts:write`, `activities:write`, `crm:read`
   - **Copia la clave ahora**: casi todos los CRM la enseñan **una sola vez**.
4. Crea la **segunda**:
   - *Nombre*: `Website — tablero`
   - *Permisos / scopes*: **solo** `crm:read`
   - Cópiala también.

> **No las pegues en un chat, ni en un documento, ni en este repositorio.** Van directas de la
> pantalla del CRM a Easypanel. Este repositorio es público y hay un freno del CI que pone el
> pipeline en rojo si aparece una credencial.

### 4septies.2 Ponerlas en Easypanel

**Easypanel** → proyecto `slg_website` → servicio **`slg-web`** → pestaña **Environment**. Y lo mismo
en **`slgweb-staging`**.

| Variable | Valor |
|---|---|
| `CRM_BASE_URL` | la base de la API del CRM (normalmente `https://crm.softlandingglobal.com`, **sin barra al final**) |
| `CRM_API_KEY_CAPTURE` | la clave de «Website — captura» |
| `CRM_API_KEY_READ` | la clave de «Website — tablero» |
| `CRM_MODE` | `contact_note` |
| `CRM_APP_URL` | `https://crm.softlandingglobal.com` — a donde lleva el botón «Abrir CRM» |
| `CRM_CONTACT_URL_TEMPLATE` | ver justo debajo |

**`CRM_CONTACT_URL_TEMPLATE`** es la dirección de la **ficha de un contacto**, con `{id}` donde va el
identificador. Para saber cuál es: abre cualquier contacto en el CRM y mira la barra de direcciones
del navegador. Si ves algo como `https://crm.softlandingglobal.com/contacts/abc123`, entonces el
valor es `https://crm.softlandingglobal.com/contacts/{id}`.

Si **no** la pones, no pasa nada malo: el tablero enseña las capturas igual, simplemente sin el
enlace «Abrir el contacto». Es a propósito — un enlace inventado llevaría a un 404 que parece culpa
del CRM.

Cuando las pongas, **Deploy** en `slg-web`.

### 4septies.3 Por qué `contact_note` y qué trabajo deja

Hoy el CRM **no permite crear empresa ni oportunidad por clave de API**. Así que cada captura
entregada deja en el CRM **un contacto y una nota** con todo el contexto (documento, página, idioma,
UTM), y **abrir la oportunidad lo tiene que hacer una persona**.

El tablero de HQ te dice **cuántas capturas están esperando ese paso**, para que no sea trabajo
invisible. El día que el CRM publique el endpoint de admisión, se cambia `CRM_MODE` a
`lead_admission` y ya está: no hay que migrar nada ni tocar código.

### 4septies.4 Cómo se vacía la cola en Vercel (y en cualquier plataforma de funciones)

El barrendero original es un `setInterval` dentro del proceso (A-01). En un VPS el proceso vive
siempre y eso basta. **En Vercel no**: la función solo existe mientras atiende una petición, así que
el temporizador no dispara y las capturas se quedan `pending` con las claves bien puestas. Se vio la
noche del 2026-09-17 con el CRM vacío.

Desde entonces **la cola se vacía por acontecimientos** (`lib/colas/barrer.ts`):

1. **Tras cada captura**, el manejador barre una vez después de responder. El visitante no espera;
   el contacto y la nota aparecen en el CRM segundos después.
2. **Cada visita de la sonda `/api/health`** recoge los reintentos vencidos, también después de
   responder. El monitor externo la visita cada cinco minutos (D-49): esa es la cadencia de reintento
   sin configurar nada.
3. **`/api/colas`** con `CRON_SECRET` (opcional, ≥ 32 caracteres) es el gancho para un planificador
   que quiera una cadencia garantizada: un cron de Vercel en el plan Pro, un temporizador del sistema
   en un VPS, o un monitor que envíe `Authorization: Bearer <CRON_SECRET>`. Sin la variable, 404.

No hay nada que hacer en el despliegue para que funcione lo 1 y lo 2. Para lo 3, poner `CRON_SECRET`
y programar la llamada.

---

## 4octies. El subdominio del visor de entregables (DU-19) — **dos clics y un registro DNS**

Hace falta **antes de enseñar un entregable HTML a un cliente**, no antes. Mientras no exista, el
portal muestra un cartel que dice que el visor no está disponible; no se rompe nada y no se sirve
nada desde el dominio equivocado.

**Por qué un subdominio y no el mismo dominio.** Parte de los entregables HTML los generan agentes.
Servido desde `softlandingglobal.com`, un script dentro de uno de esos HTML **comparte origen con la
sesión del cliente**: podría leer su cookie y llamar a la API en su nombre. Desde
`visor.softlandingglobal.com` no puede, y no porque nosotros lo impidamos: **porque el navegador lo
aísla**. Es la norma que fija D-45 y no hay repliegue: si el subdominio no está, el visor no sirve.

### 4octies.1 El registro DNS

**Hostinger** → DNS de `softlandingglobal.com` → **Add record**:

| Campo | Valor |
|---|---|
| *Type* | `A` |
| *Name* | `visor` |
| *Points to* | `167.88.42.76` |
| *TTL* | el que venga por defecto |

Este nombre **no** está en la lista de protegidos del §4.2: se puede crear sin riesgo.

### 4octies.2 El dominio en Easypanel

**Easypanel** → proyecto `slg_website` → servicio **`slg-web`** → pestaña **Domains** → **Add
Domain**:

| Campo | Valor |
|---|---|
| *Host* | `visor.softlandingglobal.com` |
| *Port* | **3000** (el mismo de la aplicación) |
| *HTTPS* | marcado |

**Es el mismo servicio, no uno nuevo.** El sitio sabe distinguir por el nombre con el que se le
llama: en `visor.` solo responde `/visor/...` y todo lo demás es 404; en el dominio normal,
`/visor/...` es 404. Eso está comprobado en `check:runtime`.

### 4octies.3 La variable

**Easypanel** → `slg-web` → **Environment**, y lo mismo en `slgweb-staging` con su propio subdominio
si lo quieres ahí:

```
DELIVERABLE_VIEWER_ORIGIN=https://visor.softlandingglobal.com
```

> **No la pongas apuntando a `https://softlandingglobal.com`.** Todo seguiría compilando, la pantalla
> funcionaría y el aislamiento **no existiría**. El código se niega a servir en ese caso —compara los
> dos orígenes— pero no lo pongas igualmente.

**Save** → **Deploy**. Para comprobarlo, abre `https://visor.softlandingglobal.com/` a secas: tiene
que dar **404**. Si te sale la portada del sitio, el dominio está apuntando mal.

### 4octies.4 El vale del visor — **la segunda variable, y sin ella el visor no enseña nada**

El visor vive en un origen **sin sesión**: el navegador no le manda las cookies de la aplicación, y
eso es justo lo que se buscaba. Pero entonces, ¿con qué autoriza? La primera versión no autorizaba:
bastaba conocer el identificador del entregable para leerlo, **fuera de la empresa que fuera**. Ese
identificador no caduca, no se revoca, y viaja en el `src` de un `iframe` hasta el historial del
navegador y los registros de cualquier proxy por el que pase.

Ahora **firma la pantalla del portal**, que sí comprobó la empresa, la visibilidad y el rol, y emite
un permiso **con caducidad** para ese entregable concreto. El visor no autoriza: **verifica**.

En la misma pantalla de antes —**Easypanel** → `slg-web` → **Environment**, y también en
`slgweb-staging`— añade:

```
DELIVERABLE_VIEWER_SECRET=
```

El valor es **una cadena larga al azar**, distinta de cualquier otra del archivo. Si no tienes de
dónde sacarla: entra en `https://staging.softlandingglobal.com/api/ops?token=…` y usa el generador de
cadenas; o teclea 40 caracteres seguidos sin mirar. No la escribas en un correo ni en un chat.

> **Falla cerrado, a propósito.** Sin esta variable el visor **no sirve ningún entregable** —no cae a
> servirlos sin vale «mientras tanto»—. Si después de desplegar el visor sale vacío, esta variable es
> lo primero que hay que mirar.

Cuánto dura el permiso lo decide `SIGNED_URL_TTL_DELIVERABLE_MINUTES` (15 minutos por defecto), el
mismo reloj que el enlace firmado del archivo.

**Save** → **Deploy**.

---

## 4nonies. Las copias de seguridad (FU-14) — **la parte que no se puede posponer**

Esto es lo único de la lista que protege de lo que no se puede arreglar después. Un despliegue que
sale mal se vuelve a desplegar; una base de datos perdida no se vuelve a escribir.

Son **cuatro cosas**, y tres de ellas se hacen una vez.

### a) El par de claves — **lo genera la web por ti**

1. Abre `https://staging.softlandingglobal.com/api/ops?token=…` (el mismo enlace de siempre; el token
   está en la variable `OPS_TOKEN` del servicio).
2. Pulsa **«Generar el par de claves de las copias de seguridad»**.
3. Verás **dos bloques de texto**. Haz esto, en este orden, antes de cerrar la pestaña:
   - **Copia el segundo** (la clave privada) y **guárdalo en tu gestor de contraseñas**, con el
     nombre «SLG · clave privada de backups». **No se vuelve a enseñar.** Sin ella no se puede
     restaurar ninguna copia: si la pierdes, los backups son archivos ilegibles.
   - **Copia el primero** (la pública). Lo necesitas en el paso (c).

> **Por qué son dos y no una.** La pública **solo cifra**; la privada **solo descifra**. Así el
> servidor puede hacer copias sin tener a mano nada que las abra: quien entre en el servidor se
> encuentra con que las copias no las puede leer. Por eso la privada **no va a ningún servidor**.

### b) El bucket de destino, en Cloudflare R2

**Fuera de Hostinger a propósito** (D-20): una copia en la misma casa que el original no es una copia.

1. Entra en `https://dash.cloudflare.com` → menú lateral → **R2**.
2. **Create bucket**. Nombre: `slg-backups`. Ubicación: la que te ofrezca por defecto. **Create**.
3. Dentro del bucket, arriba a la derecha: **Settings** → apunta el **S3 API endpoint** (una
   dirección que acaba en `.r2.cloudflarestorage.com`). Es el valor de `BACKUP_S3_ENDPOINT`.
4. Vuelve a la pantalla de R2 → **Manage API tokens** (o **API** → **Manage API Tokens**).
5. **Create API token**, y créalo **dos veces**, con permisos distintos:
   - Primero: nombre `slg-backup-escritura`, permiso **Object Read & Write**, acotado al bucket
     `slg-backups`. Copia el **Access Key ID** y el **Secret Access Key**.
   - Segundo: nombre `slg-backup-purga`, permiso **Admin Read & Write** (el que incluye borrar),
     mismo bucket. Copia los dos valores otra vez.

> **Por qué dos credenciales y hasta dónde llegan.** Aquí ponía que «lo que impide que alguien borre
> el histórico es que la credencial que vive en el servidor no pueda borrar», y **eso no es cierto**:
> el permiso más acotado que R2 ofrece para un token de objeto, *Object Read & Write*, **incluye
> borrar**. En R2 no existe un token que escriba y no borre. La revisión final lo encontró escrito
> como si existiera.
>
> Lo que las dos credenciales **sí** consiguen: la limpieza de copias viejas corre en otra tarea, en
> otro momento, con otro token, y sus variables no están en `slg-web`. Eso evita el borrado
> accidental desde la web y acota quién borra a propósito. Lo que **no** consiguen es impedir que
> quien se haga con la credencial del servidor destruya el histórico.
>
> **Como la prevención no existe, existe la detección**, y es el apartado (f): la tarea de purga
> comprueba, antes de borrar nada, que las copias que deberían seguir ahí siguen ahí, y te avisa por
> correo si falta alguna.

### c) Las variables, en Easypanel

**Easypanel → proyecto `slg_website` → servicio `slg-web` → pestaña `Environment`.** Añade estas
líneas al final, cada una con su valor a la derecha del `=`:

| Variable | De dónde sale |
|---|---|
| `BACKUP_S3_ENDPOINT` | El endpoint del paso (b.3) |
| `BACKUP_S3_REGION` | Escribe `auto` |
| `BACKUP_S3_BUCKET` | `slg-backups` |
| `BACKUP_S3_ACCESS_KEY_ID` | Del token `slg-backup-escritura` |
| `BACKUP_S3_SECRET_ACCESS_KEY` | Del token `slg-backup-escritura` |
| `BACKUP_PUBLIC_KEY` | **La clave PÚBLICA** del paso (a.3) |
| `BACKUP_VOLUME_PATHS` | La ruta del volumen de MinIO dentro del servidor |
| `BACKUP_ALERT_EMAIL` | Tu correo, para que un fallo te avise |
| `BACKUP_FIRST_DATE` | **Solo en la tarea de purga**, no aquí. Ver el apartado (f) |

**Lo que NO se pone aquí, y es importante:** `BACKUP_PRIVATE_KEY` (la privada) y las dos variables
`BACKUP_PURGE_*`. Si aparecen en este panel, la protección del punto (b) deja de existir.

Guarda y **Deploy**.

### d) Las dos tareas programadas

**Easypanel → proyecto `slg_website` → botón `+ Service` → `Cron`** (si tu versión no lo tiene, sirve
una tarea del sistema en el VPS; el comando es el mismo).

| Tarea | Cuándo | Comando |
|---|---|---|
| Copia | `0 3 * * *` (cada día a las 3:00) | `npm run backup` |
| Purga | `0 4 * * 0` (domingos a las 4:00) | `npm run backup:purge` |

La tarea de **purga** necesita las dos variables `BACKUP_PURGE_*`; las pones **en esa tarea**, no en
`slg-web`.

### e) Y lo que cierra el criterio: **restaurar una vez**

Un backup que no se ha restaurado no es un backup. Cuando haya copias de más de un día, avísame y lo
hago yo contra staging: necesito que me pases la clave **privada por el canal privado**, nunca por
aquí ni por el repositorio, y la borro del entorno al terminar.

Mientras tanto, el mecanismo entero —copiar, cifrar, subir, purgar y **restaurar desde una copia
antigua**— está probado de punta a punta contra un almacenamiento real en `npm run test:respaldos`.

### f) El centinela — **la variable que detecta que alguien borró el histórico**

Es **una sola línea**, y va **en la tarea de purga**, no en `slg-web`.

1. **Easypanel** → proyecto `slg_website` → la tarea **Cron** de purga que creaste en (d) →
   **Environment**.
2. Añade al final, poniendo **la fecha del día en que se hizo la primera copia**, en formato
   `AAAA-MM-DD`:

   ```
   BACKUP_FIRST_DATE=<la fecha de tu primera copia>
   ```

   Sustituye lo de entre `<` y `>` por la fecha, corchetes angulares incluidos. Si no sabes cuál fue:
   abre `/api/ops?token=…`, mira la sección de copias, y usa la fecha más antigua que aparezca.
3. **Save**.

**Qué hace.** Cada domingo, antes de borrar nada, la tarea comprueba una por una que las copias
diarias que deberían seguir existiendo **siguen existiendo**. Si falta alguna: te manda un correo a
`BACKUP_ALERT_EMAIL` diciendo **cuáles** faltan, **no purga nada** y sale con error para que el cron
también lo note.

**Sin esta variable el centinela no corre**, y lo dice en el registro de la tarea en vez de callarse.
No pasa nada grave por dejarla sin poner unos días; lo que no puede pasar es creer que está puesta.

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
