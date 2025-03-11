#!/bin/bash
set -e

sed -i "s/LANCACHE_HOST/${NGINX_LANCACHE_HOST}/" /etc/nginx/http.d/conf.d/10_root.conf
