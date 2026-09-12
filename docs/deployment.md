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

**Valores fijados** (P-3 y P-4, 2026-09-12):

| | |
|---|---|
| Subdominio de envío | `mail.softlandingglobal.com` |
| Remitente (`From`) | `no-reply@mail.softlandingglobal.com` |
| `Reply-To` | `support@softlandingglobal.com` |
| Avisos internos | `support@softlandingglobal.com` |

### 4bis.1 Dar de alta el subdominio en Resend

1. Entra en **resend.com** → menú lateral **Domains** → botón **Add Domain**.
2. En *Domain* escribe exactamente **`mail.softlandingglobal.com`** — el subdominio, no la raíz.
3. En *Region* elige la más cercana a tus destinatarios (LATAM y EE. UU. → **N. Virginia
   `us-east-1`**). **Apunta cuál eliges**: el valor del registro MX la lleva dentro.
4. **Add**. Resend abre la ficha del dominio con una tabla de registros DNS. Esa tabla es lo que vas
   a copiar. **Déjala abierta.**

Tendrá esta forma — **tres registros**, y uno opcional:

| # | Type | Name (lo que muestra Resend) | Value |
|---|---|---|---|
| 1 | `MX` | `send.mail.softlandingglobal.com` | `feedback-smtp.<región>.amazonses.com`, prioridad **10** |
| 2 | `TXT` | `send.mail.softlandingglobal.com` | `v=spf1 include:amazonses.com ~all` |
| 3 | `TXT` | `resend._domainkey.mail.softlandingglobal.com` | `p=MIGfMA0GCSq...` (una cadena larga) |
| 4 | `TXT` | `_dmarc.mail.softlandingglobal.com` | `v=DMARC1; p=none;` — opcional, recomendado |

> Los valores exactos **los da tu panel**, no este documento: la región y la clave DKIM son tuyas.
> Cópialos de ahí.

### 4bis.2 Pegarlos en Hostinger — **la trampa está aquí**

hPanel → **Dominios** → `softlandingglobal.com` → **DNS / Nameservers** → **Zona DNS**.

**Hostinger pide el nombre RELATIVO a la raíz, y Resend te lo muestra COMPLETO.** Hay que quitarle
`.softlandingglobal.com` al final. Si lo pegas entero, creas
`send.mail.softlandingglobal.com.softlandingglobal.com` y nada verifica, sin decirte por qué.

| # | Tipo | En Hostinger, «Nombre» | Valor | TTL | Prioridad |
|---|---|---|---|---|---|
| 1 | `MX` | `send.mail` | `feedback-smtp.<región>.amazonses.com` | 3600 | **10** |
| 2 | `TXT` | `send.mail` | `v=spf1 include:amazonses.com ~all` | 3600 | — |
| 3 | `TXT` | `resend._domainkey.mail` | la cadena `p=MIGf...` completa, **sin espacios ni saltos** | 3600 | — |
| 4 | `TXT` | `_dmarc.mail` | `v=DMARC1; p=none;` | 3600 | — |

**Lo que NO tocas, y por qué esto no puede romper tu correo:** el SPF de la raíz (`@`) y los MX de
Outlook se quedan como están. Los registros de arriba cuelgan todos de `mail`, que es **otra entrada
de la zona**. Publicarlos no puede afectar al correo humano (R-38, D-24).

### 4bis.3 Verificar

1. Vuelve a la ficha del dominio en Resend y pulsa **Verify DNS Records**. Tarda de minutos a una
   hora; si sigue en *Pending* pasada una hora, casi siempre es el nombre pegado entero (§4bis.2).
2. Comprueba que no moviste nada: `npm run check:dns` — o pásame una captura de la zona y lo miro yo.

### 4bis.4 Apagar el seguimiento — **clic a clic**

Resend crea los dominios **sin** seguimiento, pero hay que confirmarlo por escrito:

1. **Domains** → clic en **`mail.softlandingglobal.com`**.
2. Arriba a la derecha, **Settings** (o la pestaña **Settings** de la ficha del dominio).
3. Busca los dos interruptores:
   - **Open Tracking** → **apagado**
   - **Click Tracking** → **apagado**
4. Si alguno está encendido, apágalo y guarda.
5. **Hazle una captura a esos dos interruptores.** Es la evidencia del criterio 6 de FU-08 y va al
   `work_log`.

**Por qué importa y no es una manía:** el seguimiento de aperturas mete un píxel invisible en cada
correo, y el de clics **reescribe todos los enlaces** para pasar por el proveedor. Lo segundo es lo
grave aquí: un enlace de invitación reescrito deja de ser nuestro enlace. Nuestras plantillas no
llevan ni una imagen remota ni un parámetro de campaña —está verificado por prueba—, pero si el
proveedor lo inyecta, lo inyecta él.

### 4bis.5 La credencial SMTP

**API Keys** → **Create API Key** → permiso **Sending access** → cópiala (se muestra **una sola
vez**). En Easypanel, en `slg-web` y en `slgweb-staging`:

| Variable | Valor |
|---|---|
| `MAIL_SMTP_HOST` | `smtp.resend.com` |
| `MAIL_SMTP_PORT` | `587` |
| `MAIL_SMTP_USERNAME` | `resend` |
| `MAIL_SMTP_PASSWORD` | la clave de API que acabas de crear |
| `MAIL_FROM_ADDRESS` | `no-reply@mail.softlandingglobal.com` |
| `MAIL_FROM_NAME` | `SLG Agency` |
| `MAIL_REPLY_TO` | `support@softlandingglobal.com` |
| `MAIL_ALERTS_TO` | `support@softlandingglobal.com` |

**No existe ninguna variable con el nombre del producto**, y esa ausencia es la decisión (D-55): el
adaptador habla SMTP estándar, así que cambiar de proveedor son cuatro variables y ninguna línea de
código.

### 4bis.6 La prueba de bandeja de entrada (criterio 3)

Con el dominio verificado, manda una invitación de prueba a **tres buzones de proveedores distintos**
—por ejemplo uno de Gmail, uno de Outlook y uno de otro— y anota en cuál cayó en **bandeja de
entrada** y en cuál en spam. Esa tabla cierra el criterio 3 y va al `work_log`. Si alguno cae en
spam, el sospechoso habitual es el DMARC: súbelo de `p=none` a `p=quarantine` **solo** en el
subdominio.

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
