#!/usr/bin/env bash
#
# local-pg.sh — Levanta un PostgreSQL 16 efímero para verificar contra una base
# REAL sin depender de Docker.
#
# Existe porque las pruebas de aislamiento y de autorización no valen nada
# contra un doble: lo que se está probando son POLÍTICAS DE FILA de PostgreSQL,
# y un doble no las tiene. Sin esto, `test:db` y `test:auth` solo se podrían
# correr donde haya Docker.
#
#   ./scripts/db/local-pg.sh up     levanta, migra y siembra
#   ./scripts/db/local-pg.sh down   para y borra
#   ./scripts/db/local-pg.sh env    imprime las dos cadenas de conexión
#
# El puerto es el 5434, el mismo que docker-compose: el 5432 lo ocupa la base
# del CRM y el 5433 otro proyecto.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PGDATA="${PGDATA:-/tmp/slg-pgdata}"
PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
PUERTO="${PGPORT:-5434}"

export DATABASE_URL_MIGRATIONS="postgresql://slg@127.0.0.1:$PUERTO/slg"
export DATABASE_URL="postgresql://slg_app@127.0.0.1:$PUERTO/slg"

case "${1:-up}" in
  env)
    echo "export DATABASE_URL_MIGRATIONS=\"$DATABASE_URL_MIGRATIONS\""
    echo "export DATABASE_URL=\"$DATABASE_URL\""
    ;;

  down)
    su postgres -c "$PGBIN/pg_ctl -D $PGDATA stop -m immediate" >/dev/null 2>&1 || true
    rm -rf "$PGDATA"
    echo "✓ PostgreSQL local parado y borrado."
    ;;

  up)
    if ! command -v "$PGBIN/initdb" >/dev/null 2>&1; then
      echo "✗ No hay PostgreSQL 16 en $PGBIN." >&2
      echo "    Debian/Ubuntu: sudo apt-get install -y postgresql-16" >&2
      echo "    O usa docker-compose: docker compose up -d slg-db" >&2
      exit 1
    fi

    su postgres -c "$PGBIN/pg_ctl -D $PGDATA stop -m immediate" >/dev/null 2>&1 || true
    rm -rf "$PGDATA"; mkdir -p "$PGDATA"; chown postgres:postgres "$PGDATA"; chmod 700 "$PGDATA"

    su postgres -c "$PGBIN/initdb -D $PGDATA -U slg --auth=trust" >/tmp/slg-initdb.log 2>&1
    su postgres -c "$PGBIN/pg_ctl -D $PGDATA -o '-p $PUERTO -k /tmp' -l /tmp/slg-pg.log start" >/dev/null

    for _ in $(seq 1 30); do
      psql -h 127.0.0.1 -p "$PUERTO" -U slg -d postgres -c "select 1" >/dev/null 2>&1 && break
      sleep 0.5
    done

    psql -h 127.0.0.1 -p "$PUERTO" -U slg -d postgres -c "CREATE DATABASE slg" >/dev/null
    ( cd "$REPO_ROOT" && npm run --silent db:migrate >/dev/null 2>&1 )
    ( cd "$REPO_ROOT" && npm run --silent db:seed >/dev/null 2>&1 )

    echo "✓ PostgreSQL local en el puerto $PUERTO, migrado y sembrado."
    echo "  $DATABASE_URL"
    ;;

  *)
    echo "Uso: $0 [up|down|env]" >&2
    exit 1
    ;;
esac
