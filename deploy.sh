#!/usr/bin/env bash
# ==============================================================================
# TOPRunAssistant - One-Click Production Deployment Script
# Target Domain: https://toprunassistant.io.vn
# ==============================================================================

set -e

echo "🚀 [1/5] Kéo mã nguồn mới nhất từ Git Repository..."
git pull origin main || git pull origin master || echo "⚠️ Tiếp tục với mã nguồn hiện tại trên máy..."

echo "📦 [2/5] Kiểm tra file môi trường .env..."
if [ ! -f .env ]; then
  echo "⚠️ Chưa tìm thấy file .env, đang sao chép từ .env.example..."
  cp .env.example .env
  echo "❗ Vui lòng chỉnh sửa .env (STRAVA_CLIENT_ID, SMTP, JWT_SECRET...) trước khi chạy lại!"
  exit 1
fi

echo "🐳 [3/5] Build Docker Images và khởi động hệ thống Production..."
docker compose -f docker-compose.prod.yml build --pull
docker compose -f docker-compose.prod.yml up -d --remove-orphans

echo "🗄️ [4/5] Đồng bộ Schema Cơ sở dữ liệu PostgreSQL..."
sleep 5
docker compose -f docker-compose.prod.yml exec -T api npx prisma db push --schema=packages/database/prisma/schema.prisma || true

echo "🧹 [5/5] Dọn dẹp Docker images cũ..."
docker image prune -f || true

echo ""
echo "========================================================================"
echo "🎉 Triển khai TOPRunAssistant thành công!"
echo "🌐 Web App:    https://toprunassistant.io.vn"
echo "🔌 API Docs:   https://api.toprunassistant.io.vn/api/docs"
echo "========================================================================"
docker compose -f docker-compose.prod.yml ps

