#!/bin/sh
set -e

export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}/${POSTGRES_DB}?schema=public&connection_limit=${POSTGRES_POOL}&pool_timeout=30"
npx prisma db push

if [ ! -e $APP_STORAGE_DIR/LANCACHE_VERSION ]; then
  node build/tools/import-targets-prisma.js
  echo 1 > $APP_STORAGE_DIR/LANCACHE_VERSION
fi

exec "$@"