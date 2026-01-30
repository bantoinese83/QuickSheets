#!/bin/sh
set -e
if [ -n "$DATABASE_URL" ]; then
  echo "Waiting for Postgres..."
  for i in 1 2 3 4 5 6 7 8 9 10; do
    if /usr/bin/psql "$DATABASE_URL" -c "select 1" >/dev/null 2>&1; then
      echo "Running database schema..."
      /usr/bin/psql "$DATABASE_URL" -f db/schema.sql
      break
    fi
    sleep 2
  done
fi
exec "$@"
