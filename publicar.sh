#!/usr/bin/env bash
# ============================================================================
# publicar.sh — Publica el sitio en Vercel y conecta softlandingglobal.com
# ----------------------------------------------------------------------------
# Un solo comando. El proyecto ya está enlazado (.vercel/project.json) y la
# compilación ya se verificó en local, así que esto no explora nada: ejecuta.
#
#   bash publicar.sh
#
# Qué hace, en orden:
#   1. Genera un secreto de sesión real y aleatorio (no uno de ejemplo).
#   2. Compila y despliega a producción, pasando las variables EN EL PROPIO
#      despliegue en vez de guardarlas en el proyecto.
#   3. Conecta el dominio y te dice el registro DNS exacto que falta.
#
# La base de datos apunta a propósito a una dirección que NO CONECTA: el sitio
# público no la necesita — se verificó sirviendo 20 de 23 rutas con la base
# caída— y una cadena falsa que no conecta es más segura que una que sí.
# Los formularios quedarán inactivos hasta que haya una base real.
# ============================================================================
set -euo pipefail

cd "$(dirname "$0")"

SECRET="$(openssl rand -base64 32)"
SITIO="https://softlandingglobal.com"
BD="postgresql://nadie@127.0.0.1:1/no-se-usa"

echo "▸ Desplegando a producción…"
URL="$(vercel deploy --prod --yes \
  --build-env DATABASE_URL="$BD" \
  --build-env BETTER_AUTH_SECRET="$SECRET" \
  --build-env NEXT_PUBLIC_SITE_URL="$SITIO" \
  --env DATABASE_URL="$BD" \
  --env BETTER_AUTH_SECRET="$SECRET" \
  --env NEXT_PUBLIC_SITE_URL="$SITIO" \
  --env BETTER_AUTH_URL="$SITIO" \
  | tail -1)"

echo
echo "▸ Desplegado en: $URL"
echo
echo "▸ Conectando el dominio…"
vercel domains add softlandingglobal.com || true
vercel alias set "$URL" softlandingglobal.com || true

echo
echo "════════════════════════════════════════════════════════════════════"
echo " Lo único que queda es el DNS, y está en tu panel de Hostinger."
echo
echo " Cambia el registro A de la raíz (@):"
echo "     de   167.88.42.76      (tu VPS, hoy caído)"
echo "     a    76.76.21.21       (Vercel)"
echo
echo " Y el CNAME de www → cname.vercel-dns.com"
echo
echo " NO TOQUES nada más de la zona: los MX de Outlook, ni crm, n8n,"
echo " evolution, academy, abril, xic, sabha, easypanel ni panel."
echo "════════════════════════════════════════════════════════════════════"
