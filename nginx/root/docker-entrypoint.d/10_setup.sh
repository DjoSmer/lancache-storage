#!/bin/bash
set -e

sed -i "s/NGINX_STORAGE_HOST/${NGINX_STORAGE_HOST}/" /etc/nginx/http.d/conf.d/10_root.conf
