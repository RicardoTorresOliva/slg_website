# syntax=docker/dockerfile:1
# ============================================================================
# slg-backup — servicio de COPIA (FU-14, D-66)
# ----------------------------------------------------------------------------
# Servicio App APARTE en Easypanel. Nunca dentro de `slg-web`: §9.1 dice que el
# proceso "no se ejecuta dentro de `slg-web`", y D-66 fija este mecanismo
# después de verificar que Easypanel no tiene programador nativo para scripts
# arbitrarios y que su backup nativo no sirve (no cifra antes de subir y su
# credencial necesita permiso de borrado).
#
# El crontab se hornea aquí y `crond -f` lo ejecuta en primer plano, que es la
# forma que la propia guía de Easypanel (`docs/guides/cron-job`) documenta.
#
# CREDENCIAL: este servicio lleva SOLO `R2_ACCESS_KEY_ID_WRITE` /
# `R2_SECRET_ACCESS_KEY_WRITE`. La de purga vive en OTRO servicio
# (`ops/backups/purga/`) — mitigación 2 de R-37. Si alguien las junta aquí,
# `leerConfigDeCopia()` lanza y la copia no arranca: la separación se rompe en
# rojo, no en silencio.
#
# NINGÚN valor de credencial entra en esta imagen. Todos llegan por variables
# de entorno de Easypanel (RNF-26). El repositorio es público.
# ============================================================================

FROM node:22-alpine

# `postgresql16-client` da `pg_dump` de la MISMA versión mayor que `slg-db`
# (postgres:16): un `pg_dump` más viejo que el servidor se niega a volcar.
# `tar` es GNU tar, no el de busybox — el paquete de volúmenes lo desempaqueta
# la restauración, y no queremos depender de las diferencias del applet.
# `tzdata` porque el cron sigue la hora del SERVIDOR, no UTC (D-66 lo deja
# anotado como lo único a confirmar en el panel al desplegar).
RUN apk add --no-cache postgresql16-client tar tzdata

WORKDIR /app

# `npm ci` respeta el lockfile exactamente, igual que el Dockerfile de la web.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Solo lo que el proceso de copia necesita. No se copia `app/`, ni `content/`,
# ni el resto del sitio: este contenedor no sirve peticiones.
COPY lib/backups ./lib/backups
COPY lib/email ./lib/email
COPY scripts/backups ./scripts/backups

COPY ops/backups/copia/crontab /etc/crontabs/root

# Sin privilegios: volcar una base de datos y subir un objeto no necesita root.
# El propio `crond` de busybox corre las tareas como el dueño del crontab.
RUN mkdir -p /var/log/slg && chown -R node:node /app /var/log/slg

# `crond -f` en primer plano: si muere, Easypanel reinicia el servicio. `-l 8`
# baja el nivel de registro para que la salida del contenedor sea la de las
# tareas (la línea JSON de `run-backup.ts`) y no el ruido del propio cron.
CMD ["crond", "-f", "-l", "8"]
