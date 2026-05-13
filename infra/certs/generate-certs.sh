#!/bin/bash
# [FIX C-01] Script sinh TLS certificates cho Redis cluster và Nginx
# Chạy một lần trước khi deploy: bash infra/certs/generate-certs.sh
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== Generating Redis TLS Certificates ==="

# CA key + cert
openssl genrsa -out ca.key 4096
openssl req -new -x509 -days 3650 -key ca.key \
  -out ca.crt -subj "/CN=scmd-redis-ca"

# Redis server key + cert (signed by CA)
openssl genrsa -out redis.key 2048
openssl req -new -key redis.key \
  -out redis.csr -subj "/CN=redis"
openssl x509 -req -days 3650 -in redis.csr \
  -CA ca.crt -CAkey ca.key \
  -CAcreateserial -out redis.crt

echo "=== Generating Nginx Self-Signed Certificate ==="

# Self-signed cert cho Nginx (localhost/dev)
openssl req -x509 -newkey rsa:4096 -keyout ssl/privkey.pem \
  -out ssl/fullchain.pem -days 365 -nodes \
  -subj "/CN=localhost"

# Chmod để Redis có thể đọc
chmod 600 *.key ssl/privkey.pem
chmod 644 *.crt *.csr ssl/fullchain.pem 2>/dev/null || true

echo ""
echo "✅ Certificates generated:"
echo "   Redis: ca.crt, redis.crt, redis.key"
echo "   Nginx: ssl/fullchain.pem, ssl/privkey.pem"
echo ""
echo "⚠️  Đã thêm vào .gitignore — KHÔNG commit files này lên git"
echo "   Production: thay thế bằng Let's Encrypt certificates"
