#!/bin/sh
set -e

npx typeorm-ts-node-commonjs migration:run -d ./build/db-typeorm/data-source.migration.js

if [ ! -e $APP_STORAGE_DIR/LANCACHE_VERSION ]; then
  node build/tools/import-targets-typeorm.js
  echo 1 > $APP_STORAGE_DIR/LANCACHE_VERSION
fi

exec "$@"