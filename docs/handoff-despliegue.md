---
type: docs
title: Handoff — despliegue bloqueado
project: slg_website
description: Estado exacto del despliegue al cerrar la sesión del 2026-09-15. Qué está verificado, qué falla, qué se descartó y qué queda por probar.
status: active
timestamp: 2026-09-15
---

# Handoff — el despliegue no arranca

**Para quien retome esto.** El código está terminado y verificado. Lo que no funciona es el
despliegue en Easypanel. Este documento es el estado exacto, sin interpretación.

---

## 1. Estado del repositorio

| Rama | Commit | CI |
|---|---|---|
| `main` | `4da5bfa` | verde hasta `3e94194`; `4da5bfa` sin comprobar |
| `develop` | `4da5bfa` | ídem |
| `claude/nice-euler-0uhryc` | `4da5bfa` | rama de trabajo |
| `develop-linea-anterior-2026-09-10` | `b2bce2c` | **línea de código anterior, conservada a propósito** |

`main` y `develop` estaban divergidos: `develop` llevaba una implementación paralela (18 commits,
hasta FU-06, otros nombres de archivo) sin historia común con la actual. Se reemplazó `develop` con
la línea actual, con autorización explícita, y la anterior quedó en la rama nombrada arriba.

---

## 2. Lo que está verificado

Todo comprobado ejecutando, no leyendo:

- `test:db` — **842 comprobaciones** contra PostgreSQL, SMTP y servidores HTTP reales.
- `check:brakes` — **41 frenos**, cada uno visto en rojo por su motivo.
- `check:ci` completo en verde, Lighthouse incluido (98 / 97 / 90 de rendimiento, 100 de
  accesibilidad).
- La compilación de la imagen **funciona**: el último log de Easypanel llega a `exporting to image`
  y lista las 91 rutas correctas (`/ai/enterprise/readiness`, `/api/ops`, `/portal/*`, `/hq/*`).
- Compilando con la cadena falsa de la imagen y ejecutando con la base real, `/api/ops` responde
  «Migraciones aplicadas: 17» — Next **no** incrusta `DATABASE_URL` al compilar.
- El migrador de producción (`scripts/db/migrar.ts`) migra una base vacía: 17 migraciones, 21
  tablas, 11 con RLS forzada.

**El código no es el problema.**

---

## 3. El problema

`slg-web` y `web` sirven —o no sirven— código que no es el de `main`.

| Servicio | Estado |
|---|---|
| `slg-web` | Despliegues en verde, pero el contenedor sirve la **línea anterior**: `/ai/enterprise/readiness` da 404 y `/api/health` devuelve `{"status":"ok"}` sin los campos nuevos |
| `slgweb-staging` | Un despliegue terminó en **Success** (2026-09-14 23:48) y aun así sirve la respuesta antigua |
| `web` (creado nuevo) | La imagen **se construye bien**, pero acaba en «No se encontraron contenedores en ejecución» y la URL responde «Service is not reachable» |

### Cómo distinguir qué código corre

- `/api/health` → `{"status":"ok"}` a secas = **línea anterior o commit previo a `94a5189`**.
- `/api/health` → `{"status":"ok","app":"slg_website","migraciones":17,"faltan":[…]}` = línea actual.
- `/ai/enterprise/readiness` → 404 = línea anterior (esa ruta de tres segmentos no existe ahí).

---

## 4. Lo que ya se descartó

No repetir:

1. **Gancho de despliegue.** Dispara: hay despliegues con la fecha y el commit correctos.
2. **Rama mal configurada.** `slg-web` → Fuente → Github, repo correcto, rama `main`, ruta `/`.
3. **`DATABASE_URL` en la compilación.** Arreglado en `8add868` (etapa `builder` del Dockerfile) y
   en el trabajo `gates` de CI (`52421f5`). El log confirma que la compilación pasa.
4. **`postgresql16-client` inexistente en Alpine 3.24.** Arreglado con cadena de respaldo
   (`72ab516`); el log confirma que instala `postgresql17-client`.
5. **Diario de migraciones ausente en la imagen.** `.dockerignore` excluía `drizzle/meta` entero;
   arreglado en `94a5189`.
6. **gitleaks.** El único hallazgo era el fixture `scripts/ci/negative/secrets/filtrado.ts`, que
   existe para eso. Arreglado en `1875beb`.
7. **Caché del navegador.** Comprobado con `?x=N` y contra la URL directa
   `slg-website-slg-web.buul2l.easypanel.host`, que no pasa por el dominio.
8. **Arranque sin `DATABASE_URL`.** Probado: el servidor **no** se cae por eso.

---

## 5. Lo último que se probó, y su resultado

Se quitó la `HEALTHCHECK` del Dockerfile (`4da5bfa`), con esta hipótesis: en Docker Swarm —lo que
Easypanel usa por debajo— una tarea marcada *unhealthy* se mata y se reprograma, y eso deja
compilación en verde y cero contenedores.

**Al cerrar la sesión ese despliegue aparecía en ámbar (aviso), no en verde.** No se llegó a
comprobar si la hipótesis era correcta. **Es el primer sitio donde mirar.**

---

## 6. Por dónde seguir

En este orden:

1. **`web` → Implementaciones → el despliegue de `4da5bfa` → `Ver`.** Leer el final del log: dice
   si la imagen se exportó y qué pasó después. Si el contenedor arranca y muere, el motivo está ahí.
2. Si el log no dice nada: **`web` → Entorno**. Comprobar que están las variables. Después
   `web` → **Dominios** → el dominio generado debe apuntar al puerto **3000**.
3. Si sigue sin arrancar, el siguiente sospechoso es el propio `Dockerfile`: probarlo con un
   `CMD` mínimo (`node -e "require('http').createServer((_,r)=>r.end('ok')).listen(3000)"`) para
   separar «la imagen no arranca» de «la aplicación no arranca».
4. **No borrar `slg-web` hasta que `web` sirva `softlandingglobal.com` y esté comprobado.**

---

## 7. Datos del entorno

- VPS Hostinger `167.88.42.76`, Easypanel v2.34.0, proyecto `slg_website`.
- Servicios: `minio`, `slg-web`, `slgweb-staging`, `slgwebpostgres`, `umami`, `umami-db`, `web`.
- DNS en Hostinger, **ya correcto y verificado**: raíz, `www` y `staging` → `167.88.42.76`; ningún
  nombre protegido (`crm`, `n8n`, `evolution`, `academy`, MX de Outlook) se ha movido.
- Subdominio de envío `mailweb.softlandingglobal.com` creado y verificado (2026-09-11).
- El paso a paso de las variables está en `docs/deployment.md` §0ter.

---

## 8. Nota para quien retome

La sesión anterior perdió horas por un patrón concreto que conviene no repetir: **verificar en local
con una red de seguridad que el entorno real no tiene** (una base de datos levantada, variables
exportadas en la shell). Dos veces el mismo defecto —`DATABASE_URL` ausente al compilar— pasó
desapercibido por eso, primero en CI y luego en la imagen.

Antes de proponer un arreglo, reproducir el fallo en las mismas condiciones que el entorno que
falla. Y cuando el diagnóstico dependa de una pantalla de Easypanel, pedirla una vez y leerla
entera, en vez de ir preguntando dato a dato.

---

## 9. Sesión 2026-09-15 (tarde) — la imagen queda descartada

Se reprodujo el despliegue **fuera de Easypanel**, en una máquina limpia, siguiendo la nota del §8:
compilación `linux/amd64` de `4da5bfa` y ejecución del contenedor con la base de datos
**deliberadamente inalcanzable**, sin ninguna red de seguridad local.

| Comprobación | Resultado |
|---|---|
| `docker build --platform linux/amd64` | ✅ sin errores |
| Contenedor con `DATABASE_URL` que no conecta | ✅ arranca y **permanece vivo** |
| `/api/health` | ✅ `{"app":"slg_website","migraciones":17,…}` — línea actual |
| `/ai/enterprise/readiness` | ✅ 200 (en la línea anterior daba 404) |
| Barrido de 23 rutas | ✅ 20 × 200; `/hq` y `/portal` → 307 a `/acceder`; inexistente → 404 |
| CSS, fuentes, chunks y prefetch | ✅ todo 200 |

**Consecuencia: el paso 3 del §6 ya no hace falta.** La imagen arranca y sirve; no hay que separar
«la imagen no arranca» de «la aplicación no arranca», porque las dos arrancan.

### Hipótesis que el §5 no contempla

Los tres síntomas del §3 se explican con una sola causa: **Swarm no consigue arrancar ninguna tarea
nueva en ese nodo.**

- `slg-web` y `slgweb-staging` sirven la línea anterior porque sus contenedores **antiguos siguen
  vivos**: nunca fueron reemplazados.
- `web` es un servicio nuevo, sin contenedor previo que sobreviva → «cero contenedores en ejecución».
- Los despliegues salen verdes porque **construir y programar son pasos distintos**, y solo falla el
  segundo.

Esto predice que quitar la `HEALTHCHECK` (§5) **no** arregla nada, y que la causa está en la
programación de la tarea, no en la imagen.

**El comando que lo responde**, en el VPS:

```
docker service ps $(docker service ls --format '{{.Name}}' | grep -E 'slg-web|web') --no-trunc
```

La columna `ERROR` da el motivo literal por el que muere cada tarea. Complementos útiles en la misma
sesión: `df -h`, `free -m` y `docker system df`.

### No se pudo verificar

El acceso por SSH al VPS quedó fuera de alcance en esta sesión: `root@167.88.42.76` rechaza la clave
del equipo (`Permission denied (publickey,password)`). Hace falta autorizar una clave, o ejecutar el
comando de arriba a mano.

### Ramas

`develop` local llevaba 29 commits **sin publicar** de la línea anterior (punta `9e2c7b0`, 2026-09-11).
Se preservaron en `origin/develop-linea-2026-09-11-local` antes de alinear la copia local con
`origin/main` / `origin/develop`. No se borró nada.
