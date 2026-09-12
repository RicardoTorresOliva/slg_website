# syntax=docker/dockerfile:1
# ============================================================================
# slg-backup-purga — servicio de PURGA (FU-14, mitigación 2 de R-37)
# ----------------------------------------------------------------------------
# SEGUNDO servicio App en Easypanel, separado del de copia. No es una manía de
# orden: `architecture` §9.2 dice que "el borrado de copias antiguas lo hace un
# proceso distinto con otras credenciales", y dos servicios es la única forma
# de que el proceso de copia NO tenga en su entorno la credencial que borra.
# Un solo contenedor con dos entradas de cron tendría las dos credenciales, y
# quien comprometiera el VPS podría borrar los backups además de los datos —
# que es exactamente el escenario que R-37 describe.
#
# CREDENCIAL: SOLO `R2_ACCESS_KEY_ID_PRUNE` / `R2_SECRET_ACCESS_KEY_PRUNE`.
#
# Este servicio NO lleva `BACKUP_ENCRYPTION_KEY`. Purgar es borrar objetos por
# su clave, nunca abrirlos: sin la clave de cifrado, ni comprometido puede leer
# un backup. `leerConfigDePurga()` tampoco la pide.
#
# Tampoco lleva `BACKUP_DATABASE_URL` ni las credenciales de `slg-files`: la
# purga no toca ni la base de datos ni los volúmenes.
# ============================================================================

FROM node:22-alpine

# Sin `postgresql16-client`: este proceso no vuelca nada. Sin `tar`: no
# empaqueta nada. Lo que no está instalado no se puede usar.
RUN apk add --no-cache tzdata

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY lib/backups ./lib/backups
COPY scripts/backups ./scripts/backups

COPY ops/backups/purga/crontab /etc/crontabs/root

RUN chown -R node:node /app

CMD ["crond", "-f", "-l", "8"]
