#!/usr/bin/env bash
#
# check-dns.sh — La lista de "no tocar" del DNS, verificada nombre por nombre.
#
# FU-05 criterio 3 y R-25: tras publicar los registros NUEVOS de la raíz, `www`
# y `staging`, los nombres que ya estaban vivos deben seguir resolviendo IGUAL.
# `crm`, `n8n` y `evolution` son sistemas en producción sirviendo desde la misma
# IP; `academy` apunta fuera; los MX sostienen el correo corporativo, que se
# queda en Microsoft 365 (D-23).
#
# Se usa DOS veces, y el orden importa:
#
#   1. ANTES de tocar nada:   ./scripts/ci/check-dns.sh --baseline
#      Escribe docs/dns_baseline.txt. Ese archivo ES el estado anterior que
#      `architecture` §13.1 exige copiar a `docs/`.
#
#   2. DESPUÉS del cambio:    ./scripts/ci/check-dns.sh
#      Compara nombre por nombre contra la línea base. Cualquier diferencia en
#      un nombre protegido es un fallo, no un aviso.
#
# Se consulta a un resolutor PÚBLICO (8.8.8.8 por defecto) y no al del sistema:
# el resolutor local puede llevar la zona cacheada de antes del cambio y dar un
# verde falso. Sobreescribible con DNS_RESOLVER.
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BASELINE="${DNS_BASELINE:-$REPO_ROOT/docs/dns_baseline.txt}"
RESOLVER="${DNS_RESOLVER:-8.8.8.8}"
DOMAIN="${DNS_DOMAIN:-softlandingglobal.com}"

# ── Nombres que NO se tocan (architecture §13.2) ────────────────────────────
PROTEGIDOS=(
  "crm.$DOMAIN A"
  "crm.$DOMAIN CNAME"
  "n8n.$DOMAIN A"
  "n8n.$DOMAIN CNAME"
  "evolution.$DOMAIN A"
  "evolution.$DOMAIN CNAME"
  "academy.$DOMAIN A"
  "academy.$DOMAIN CNAME"
  "$DOMAIN MX"
  "$DOMAIN TXT"
)

# ── Nombres que FU-05 añade (architecture §13.1) ────────────────────────────
NUEVOS=(
  "$DOMAIN A"
  "www.$DOMAIN CNAME"
  "staging.$DOMAIN A"
)

if ! command -v dig >/dev/null 2>&1; then
  echo "✗ DNS: falta 'dig'." >&2
  echo "    Debian/Ubuntu: sudo apt-get install -y dnsutils" >&2
  echo "    macOS:         ya viene instalado" >&2
  echo "    Alpine:        apk add bind-tools" >&2
  exit 1
fi

consulta() { # nombre tipo -> respuesta normalizada y ordenada, o "(vacío)"
  local salida
  salida="$(dig +short +tries=3 +time=3 "@$RESOLVER" "$2" "$1" 2>/dev/null | sed 's/[[:space:]]*$//' | sort | paste -sd'|' -)"
  [ -z "$salida" ] && salida="(vacío)"
  printf '%s' "$salida"
}

# ── Modo línea base ─────────────────────────────────────────────────────────
if [ "${1:-}" = "--baseline" ]; then
  mkdir -p "$(dirname "$BASELINE")"
  {
    echo "# dns_baseline.txt — estado ANTERIOR de la zona de $DOMAIN"
    echo "# Generado por scripts/ci/check-dns.sh --baseline"
    echo "# Fecha: $(date -u +%Y-%m-%dT%H:%M:%SZ) · Resolutor: $RESOLVER"
    echo "#"
    echo "# architecture §13.1: 'Zona previa copiada a docs/ como estado anterior"
    echo "# antes de tocar nada'. Este archivo es ese estado anterior."
    echo "#"
    echo "# Formato: <nombre> <tipo> <respuestas separadas por |>"
    echo ""
    for entrada in "${PROTEGIDOS[@]}" "${NUEVOS[@]}"; do
      # shellcheck disable=SC2086
      set -- $entrada
      echo "$1 $2 $(consulta "$1" "$2")"
    done
  } > "$BASELINE"
  echo "✓ DNS: línea base escrita en ${BASELINE#"$REPO_ROOT"/}"
  echo "  Revísala, haz commit, y SOLO ENTONCES toca la zona."
  exit 0
fi

# ── Modo verificación ───────────────────────────────────────────────────────
if [ ! -f "$BASELINE" ]; then
  echo "✗ DNS: no existe ${BASELINE#"$REPO_ROOT"/}." >&2
  echo "    Ejecuta './scripts/ci/check-dns.sh --baseline' ANTES de tocar la zona." >&2
  exit 1
fi

fallos=0
comprobaciones=0

echo "Resolutor: $RESOLVER · línea base: ${BASELINE#"$REPO_ROOT"/}"
echo ""
echo "Nombres protegidos (deben seguir IGUAL):"
for entrada in "${PROTEGIDOS[@]}"; do
  # shellcheck disable=SC2086
  set -- $entrada
  nombre="$1"; tipo="$2"
  antes="$(grep -E "^$nombre $tipo " "$BASELINE" | head -1 | cut -d' ' -f3- || true)"
  [ -z "$antes" ] && antes="(vacío)"
  ahora="$(consulta "$nombre" "$tipo")"
  comprobaciones=$((comprobaciones + 1))
  if [ "$antes" = "$ahora" ]; then
    printf '  · %-34s %-6s sin cambios\n' "$nombre" "$tipo"
  else
    printf '  ✗ %-34s %-6s CAMBIÓ\n' "$nombre" "$tipo"
    printf '      antes: %s\n      ahora: %s\n' "$antes" "$ahora"
    fallos=$((fallos + 1))
  fi
done

echo ""
echo "Nombres nuevos (deben resolver a la IP del VPS):"
for entrada in "${NUEVOS[@]}"; do
  # shellcheck disable=SC2086
  set -- $entrada
  nombre="$1"; tipo="$2"
  ahora="$(consulta "$nombre" "$tipo")"
  comprobaciones=$((comprobaciones + 1))
  if [ "$ahora" = "(vacío)" ]; then
    printf '  ✗ %-34s %-6s no resuelve todavía\n' "$nombre" "$tipo"
    fallos=$((fallos + 1))
  else
    printf '  · %-34s %-6s %s\n' "$nombre" "$tipo" "$ahora"
  fi
done

echo ""
if [ "$fallos" -gt 0 ]; then
  echo "✗ DNS: $fallos fallo(s) sobre $comprobaciones comprobaciones." >&2
  echo "  Un nombre protegido que cambia es una caída de un sistema vivo (R-25)." >&2
  echo "  Revierte la entrada en el panel del proveedor ANTES de seguir." >&2
  exit 1
fi
echo "✓ DNS: $comprobaciones comprobaciones. Los nombres protegidos no se movieron."
