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

# Usuario sin privilegios: el proceso web no necesita ser root.
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone/public ./public

USER nextjs
EXPOSE 3000

# Sonda de vida propia del contenedor. NO sustituye al monitor externo de D-49:
# esta sonda vive dentro del VPS, y un VPS caído no puede informar de su caída.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
