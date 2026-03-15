FROM node:22-alpine AS base
WORKDIR /app

COPY lancache.config.json tsconfig.json package*.json ./
COPY migrations ./migrations

RUN mkdir -m 755 -p /data/storage ;\
    npm ci --omit=dev


# Build
FROM base AS builder
WORKDIR /app

COPY src/ ./src

RUN npm ci ;\
    npm run build


# Production image
FROM base AS runner
LABEL version=1
LABEL description="Node web storage server. Proxy http traffic and store it if needed"
LABEL maintainer="DjoSmer <djos.ghub@mail.ru>"

WORKDIR /app

ENV APP_STORAGE_DIR=/data/storage \
    LOG_LEVEL=info \
    DB_LOG=0 \
    STORAGE_DISK_SIZE=512G \
    STORAGE_MAX_AGE=1w

COPY docker-entrypoint.sh /usr/local/bin
COPY --from=builder /app/build ./build

EXPOSE 80

CMD ["npm", "run", "start"]
