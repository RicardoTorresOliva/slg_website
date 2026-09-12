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

## 2. Los cinco servicios de Easypanel

Todos dentro del proyecto **`website`**. El proyecto `clientes` (donde vive el CRM)
**no se toca**.

### 2.1 `slg-db` — PostgreSQL 16

1. **Create Service → Postgres**. Nombre: `slg-db`. Versión: `16`.
2. Usuario `slg`, base de datos `slg`, contraseña generada por Easypanel.
3. **No publicar puerto.** Solo red interna: `architecture` §7.1 lo exige.
4. Tras el primer despliegue de `slg-web`, abre una consola contra la base y pon
   contraseña al rol de aplicación —la migración `0002` lo crea con `LOGIN` pero
   **sin contraseña**, a propósito:

   ```sql
   ALTER ROLE slg_app WITH PASSWORD '<la que generaste en §1>';
   ```

   **Por qué dos roles:** el usuario que crea la imagen de PostgreSQL es
   superusuario y lleva `rolbypassrls`. Conectando con él **las políticas de fila no
   se aplican** y todo el aislamiento entre empresas es decorativo. Lo encontró
   FU-04 y la prueba `test:isolation` falla si alguien vuelve a apuntar
   `DATABASE_URL` al dueño.

### 2.2 `slg-files` — MinIO (API S3)

1. **Create Service → MinIO** (o App con la imagen `minio/minio`). Nombre: `slg-files`.
2. Dos buckets, los dos **privados**: `downloads` y `deliverables`.
3. Sin acceso anónimo de lectura. Ninguna ruta de la aplicación lista un bucket
   (RF-123, gate D10): todo acceso es por URL firmada.
4. Anota endpoint interno, `access key` y `secret key` → van a `S3_*` en §2.4.

### 2.3 `slg-analytics` — Umami

1. **Create Service → App**, imagen oficial de Umami. Nombre: `slg-analytics`.
2. Base de datos: una propia dentro de `slg-db` o un Postgres aparte; no comparte
   esquema con la aplicación.
3. Dominio interno o subdominio propio, a elección. **No entra en la lista de
   nombres protegidos** porque es nuevo.
4. Anota `script url` y `website id` → `NEXT_PUBLIC_UMAMI_*`.

### 2.4 `slg-web` — la aplicación (producción)

1. **Create Service → App**. Nombre: `slg-web`.
2. **Source**: GitHub, repositorio `RicardoTorresOliva/slg_website`, rama **`main`**.
3. **Build**: `Dockerfile` (está en la raíz; ya produce la salida `standalone`).
4. **Port**: `3000`.
5. **Domains**: `softlandingglobal.com` y `www.softlandingglobal.com`, HTTPS con
   Let's Encrypt, redirección de HTTP a HTTPS activada.
6. **Environment**: copia los NOMBRES de `.env.example` y rellena los valores aquí.
   Para el arranque de M0 bastan estos; el resto entra con su unidad:

   | Variable | Valor |
   |---|---|
   | `DATABASE_URL` | `postgresql://slg_app@slg-db:5432/slg` — intercala la contraseña de `slg_app` tras `slg_app` y antes de `@` |
   | `DATABASE_URL_MIGRATIONS` | `postgresql://slg@slg-db:5432/slg` — igual, con la contraseña del rol dueño |
   | `NEXT_PUBLIC_SITE_URL` | `https://softlandingglobal.com` |
   | `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | de §2.2 |
   | `S3_BUCKET_DOWNLOADS` / `S3_BUCKET_DELIVERABLES` | `downloads` / `deliverables` |
   | `NEXT_PUBLIC_UMAMI_SCRIPT_URL` / `NEXT_PUBLIC_UMAMI_WEBSITE_ID` | de §2.3 |


   > Las dos cadenas se escriben **sin contraseña** en este documento a propósito: el
   > análisis de secretos (`npm run check:secrets`) marca en rojo cualquier cadena de
   > conexión con contraseña dentro del repositorio, y tiene razón al hacerlo aunque
   > sea un ejemplo. La forma es la estándar de PostgreSQL: usuario, dos puntos,
   > contraseña, arroba, host, dos puntos, puerto, barra, base de datos.

   **`STAGING_BASIC_AUTH_USER` y `STAGING_BASIC_AUTH_PASSWORD` NO se definen aquí.**
   El middleware se activa por la presencia de esas dos variables: definirlas en
   producción pondría un candado delante del sitio público.

7. **Deploy command** (paso previo al arranque): `npm run db:migrate`.
   Usa `DATABASE_URL_MIGRATIONS`, el rol dueño. El runtime nunca migra.

### 2.5 `slg-web-staging` — la misma imagen desde `develop`

Idéntico a §2.4 salvo cuatro cosas:

| Campo | Valor |
|---|---|
| Nombre | `slg-web-staging` |
| Rama | **`develop`** |
| Dominio | `staging.softlandingglobal.com` |
| Extra | `STAGING_BASIC_AUTH_USER` y `STAGING_BASIC_AUTH_PASSWORD` **sí se definen** |

Con esas dos variables definidas, el middleware devuelve `401` con
`WWW-Authenticate: Basic` y `X-Robots-Tag: noindex` en todas las rutas **menos
`/api/health`**, que queda abierta a propósito: UptimeRobot no lleva credenciales
y un monitor que recibe `401` estaría midiendo la compuerta, no el servicio.

Base de datos de staging: **una distinta**. Nunca la de producción.

**Comprobación del criterio 1** (con los valores reales, desde tu máquina):

```bash
curl -sI https://staging.softlandingglobal.com/            # 401 + WWW-Authenticate + X-Robots-Tag: noindex
curl -sI -u "$USUARIO:$CLAVE" https://staging.softlandingglobal.com/   # 200 + X-Robots-Tag: noindex
curl -s  https://staging.softlandingglobal.com/api/health  # {"status":"ok"}
```

Lo mismo ya está probado **de forma automatizada** contra el servidor real en
`npm run check:runtime` (19 comprobaciones). Este `curl` solo confirma que el
despliegue lleva las variables puestas.

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
