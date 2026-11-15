#!/bin/sh
# Builds an empty database: runs every schema file, then every seed file, in name order.
# Stops at the first error. Works against the local Docker database and against Render.
#
# Against Render (its External Database URL), or any server (needs psql), from the repository root:
#   DATABASE_URL="postgresql://user:password@host:5432/postgres" sh database/postgresql/scripts/apply.sh
#
# Without DATABASE_URL it uses the local socket. That is how the Docker container runs it on its
# first start, where POSTGRESQL_DIR points to the mounted folder.
# Environment variables, not arguments, because the container may source this file instead of running it.
set -eu

POSTGRESQL_DIR="${POSTGRESQL_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"

for file in "$POSTGRESQL_DIR"/schema/*.sql "$POSTGRESQL_DIR"/seeds/*.sql; do
  echo "Applying $(basename "$(dirname "$file")")/$(basename "$file")"
  if [ -n "${DATABASE_URL:-}" ]; then
    psql "$DATABASE_URL" --quiet --no-psqlrc --single-transaction -v ON_ERROR_STOP=1 -f "$file"
  else
    psql --quiet --no-psqlrc --single-transaction -v ON_ERROR_STOP=1 \
      --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$file"
  fi
done
