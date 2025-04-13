FROM nginx:latest
LABEL version=1
LABEL description="Save only http traffic through nginx -> node or direct connection to node and steam https traffic."
LABEL maintainer="DjoSmer <djos.ghub@mail.ru>"

ENV NGINX_ACCESS_LOG=0 \
    NGINX_STORAGE_HOST=storage \
    NGINX_RESOLVERS="127.0.0.11"

COPY root/ /

RUN rm /etc/nginx/conf.d/default.conf ;\
    chmod 754 /docker-entrypoint.d/* ;\
    mkdir -m 755 -p /data/storage ;\
    mkdir -m 755 -p /data/logs

VOLUME ["/data/logs"]

EXPOSE 80 443
WORKDIR /data
