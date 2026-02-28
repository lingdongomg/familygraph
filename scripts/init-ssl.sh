#!/bin/bash
# Let's Encrypt SSL 证书初始化脚本
# 用法: ./init-ssl.sh <域名>
# 前提: 已安装 certbot，DNS 已解析到本服务器

set -e

DOMAIN="${1}"
EMAIL="${2:-}"
NGINX_SSL_DIR="$(dirname "$0")/../nginx/ssl"

if [ -z "$DOMAIN" ]; then
    echo "Usage: $0 <domain> [email]"
    echo "Example: $0 family.example.com admin@example.com"
    exit 1
fi

mkdir -p "$NGINX_SSL_DIR"

echo "=== FamilyGraph SSL Certificate Setup ==="
echo "Domain: $DOMAIN"

# Generate self-signed cert first (so Nginx can start)
if [ ! -f "$NGINX_SSL_DIR/fullchain.pem" ]; then
    echo "Generating temporary self-signed certificate..."
    openssl req -x509 -nodes -days 1 -newkey rsa:2048 \
        -keyout "$NGINX_SSL_DIR/privkey.pem" \
        -out "$NGINX_SSL_DIR/fullchain.pem" \
        -subj "/CN=$DOMAIN"
fi

# Start Nginx for ACME challenge
echo "Starting Nginx..."
docker compose up -d nginx

# Request certificate
EMAIL_ARG=""
if [ -n "$EMAIL" ]; then
    EMAIL_ARG="--email $EMAIL"
else
    EMAIL_ARG="--register-unsafely-without-email"
fi

echo "Requesting certificate from Let's Encrypt..."
docker run --rm \
    -v "$(pwd)/nginx/ssl:/etc/letsencrypt/live/$DOMAIN" \
    -v "$(pwd)/certbot-data:/var/www/certbot" \
    certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    -d "$DOMAIN" \
    $EMAIL_ARG \
    --agree-tos \
    --non-interactive

echo "Reloading Nginx with new certificate..."
docker compose exec nginx nginx -s reload

echo ""
echo "=== SSL Setup Complete ==="
echo "Certificate files:"
echo "  $NGINX_SSL_DIR/fullchain.pem"
echo "  $NGINX_SSL_DIR/privkey.pem"
echo ""
echo "To auto-renew, add to crontab:"
echo "  0 0 1 * * cd $(pwd) && ./scripts/init-ssl.sh $DOMAIN"
