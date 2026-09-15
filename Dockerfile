# syntax=docker/dockerfile:1
# ============================================================================
# slg-web — imagen de producción
# ----------------------------------------------------------------------------
# Construye la salida `standalone` de Next.js. Next NO copia `static/` ni
# `public/` dentro de `standalone/` por diseño; hacerlo a mano produjo durante
# FU-02 un fallo real (HTML de una compilación sirviendo chunks de otra, CSS en
# HTTP 500, la página cayendo a una serif sin tokens). Aquí ese paso está
# guionizado, que es la razón de que exista `build:standalone`.
# ============================================================================

# ─── Dependencias ───────────────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# `npm ci` respeta el lockfile exactamente: las versiones están fijadas sin
# rangos a propósito (FU-02, criterio 8), y esto lo hace valer en el despliegue.
RUN npm ci

# ─── Compilación ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1

# ─── Las dos variables de MENTIRA que la compilación necesita ───────────────
#
# SOLO EN ESTA ETAPA. `builder` y `runner` son imágenes distintas: nada de esto
# llega al contenedor que sirve peticiones, y eso es deliberado. Poner un
# DATABASE_URL falso en `runner` taparía la ausencia del de verdad con uno que
# no conecta — el sitio arrancaría y fallaría por dentro, sin decir qué falta.
#
# POR QUÉ HACEN FALTA AQUÍ. `lib/db/scope.ts` exige DATABASE_URL **al evaluarse
# el módulo**, y la recolección de datos de página de Next evalúa las rutas de
# API. Sin ella la compilación muere en `/api/acceso/cerrar-todo`, que es
# exactamente lo que pasó en el primer despliegue: la imagen no se construía,
# Easypanel seguía sirviendo la anterior, y el sitio parecía sano estando viejo.
#
# Nada consulta la base durante la compilación —las páginas prerenderizadas son
# las públicas—, así que una cadena que NO CONECTA es suficiente, y además
# garantiza que la compilación no habla con ninguna base de verdad.
#
# Es el mismo arreglo que el trabajo `gates` de CI. Allí lo puse y aquí no, y
# por eso el pipeline estaba verde mientras el despliegue llevaba horas roto:
# **dos sitios construyen esta aplicación, y solo uno estaba arreglado**.
ENV DATABASE_URL=postgresql://nadie@127.0.0.1:1/no-se-usa
ENV BETTER_AUTH_SECRET=solo-para-compilar-la-imagen

# El contenido se valida aquí: un frontmatter inválido detiene la IMAGEN, no
# solo el despliegue (FU-03, criterio 1).
RUN npm run build:standalone

# ─── Ejecución ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# ─── Lo que el despliegue necesita y la imagen no tenía ─────────────────────
#
# ESTA IMAGEN NO PODÍA MIGRAR NI RESPALDAR, y las dos cosas están documentadas
# como comandos de producción en `docs/deployment.md`:
#
#   · `npm run db:migrate`   — el *Deploy command* de Easypanel.
#   · `npm run backup`       — la tarea programada de las 3:00.
#   · `npm run backup:purge` — la de los domingos.
#
# Ninguno podía ejecutarse: la salida `standalone` no lleva `package.json` con
# guiones, ni `scripts/`, ni `drizzle/`, ni `pg_dump`. El primer despliegue
# habría fallado en el paso de migración y las copias no habrían existido nunca
# —y una copia que no existe se descubre el día que hace falta—. Lo encontró la
# revisión final, no una ejecución.
#
# `pg_dump` y `pg_restore`, con CADENA DE RESPALDO y no un nombre fijo.
#
# Aquí había `apk add --no-cache postgresql16-client` a secas, y eso es una
# apuesta: Alpine mantiene una o dos versiones de PostgreSQL a la vez, así que
# `postgresql16-client` existe en unas versiones de Alpine y **no existe** en
# otras. El día que la imagen base de Node cambie de Alpine —que cambia sola, sin
# tocar nosotros nada— `apk add` falla, la COMPILACIÓN ENTERA falla, y Easypanel
# se queda sirviendo la imagen anterior **sin decir que el sitio está viejo**.
# Es el fallo más caro posible: silencioso y disfrazado de normalidad.
#
# El orden va del más nuevo al genérico a propósito. La regla de PostgreSQL es
# que el cliente puede ser MÁS NUEVO que el servidor pero nunca más viejo: un
# `pg_dump` de 17 vuelca una base 16 sin problema, y uno de 15 se niega. Así que
# equivocarse hacia arriba es seguro y hacia abajo no.
RUN apk add --no-cache postgresql17-client \
 || apk add --no-cache postgresql16-client \
 || apk add --no-cache postgresql-client

# Usuario sin privilegios: el proceso web no necesita ser root.
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone/public ./public

# `package.json` COMPLETO, no el reducido que Next deja en `standalone`: es el
# que tiene los guiones, y sin él `npm run db:migrate` responde que no existe.
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# El SQL versionado y su `meta/_journal.json`. El migrador lee de aquí.
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle

# `drizzle-orm` y `postgres` **NO están** en el `node_modules` de la salida
# `standalone`, y esto no es un descuido de Next: el código de servidor de la
# aplicación va empaquetado en sus propios chunks, así que Next no necesita
# dejar los paquetes sueltos. Un GUION suelto sí los necesita —`node
# scripts/db/migrar.ts` los resuelve por `node_modules` como cualquier proceso
# de Node—, y sin ellos el migrador muere con «Cannot find module» en el primer
# despliegue. Ninguno de los dos arrastra dependencias propias.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/postgres ./node_modules/postgres

# Solo los dos guiones que producción ejecuta y la biblioteca de la que tiran.
# `scripts/` entero NO: ahí viven las pruebas, que arrastran `postgres`, dobles
# de SMTP y fixtures que no pintan nada en un contenedor que sirve peticiones.
COPY --from=builder --chown=nextjs:nodejs /app/scripts/db/migrar.ts ./scripts/db/migrar.ts
COPY --from=builder --chown=nextjs:nodejs /app/scripts/backup ./scripts/backup
COPY --from=builder --chown=nextjs:nodejs /app/lib/backup ./lib/backup

# La prueba de las copias no viaja: necesita PostgreSQL y un almacenamiento de
# mentira, y en producción sería una forma de escribir en el bucket real.
RUN rm -f ./scripts/backup/test-respaldos.ts

USER nextjs
EXPOSE 3000

# Sonda de vida propia del contenedor. NO sustituye al monitor externo de D-49:
# esta sonda vive dentro del VPS, y un VPS caído no puede informar de su caída.
# SIN HEALTHCHECK PROPIA, y no por descuido. La imagen traía una que consultaba
# `/api/health` cada 30 s con 20 s de gracia. En Docker Swarm —que es lo que
# Easypanel usa por debajo— una tarea marcada «unhealthy» se mata y se reprograma:
# si el arranque tarda más que la gracia, o si la sonda falla por cualquier
# motivo ajeno a la aplicación, el resultado es un ciclo de reinicios que acaba
# **sin ningún contenedor en ejecución** y con la compilación en verde. Ese es
# exactamente el estado en el que apareció el servicio nuevo.
#
# Easypanel ya vigila el servicio por su cuenta y el monitor externo de D-49 mira
# desde fuera del VPS, que es lo único que detecta un VPS caído. Una tercera
# sonda no añadía cobertura y sí añadía una forma de matar el contenedor.

CMD ["node", "server.js"]
