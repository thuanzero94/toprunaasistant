#!/usr/bin/env bash
# ==============================================================================
# TOPRunAssistant - Disaster Recovery & Database Restore Script
# Usage: ./scripts/restore.sh <path/to/toprun_backup_YYYYMMDD_HHMMSS.tar.gz> [--force|-y] [--prod|--dev|--local]
# ==============================================================================

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${ROOT_DIR}"

COMPOSE_FILE="docker-compose.prod.yml"
BACKUP_ARCHIVE=""
FORCE_RESTORE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --force|-y|--yes)
      FORCE_RESTORE=true
      shift
      ;;
    --prod)
      COMPOSE_FILE="docker-compose.prod.yml"
      shift
      ;;
    --dev)
      COMPOSE_FILE="docker-compose.dev.yml"
      shift
      ;;
    --local)
      COMPOSE_FILE="docker-compose.yml"
      shift
      ;;
    *)
      if [ -z "${BACKUP_ARCHIVE}" ]; then
        BACKUP_ARCHIVE="$1"
      fi
      shift
      ;;
  esac
done

if [ -z "${BACKUP_ARCHIVE}" ]; then
  echo "========================================================================"
  echo "❌ Lỗi: Bạn chưa cung cấp đường dẫn tới file backup!"
  echo "📖 Cách dùng:"
  echo "   ./scripts/restore.sh <duong_dan_file_backup.tar.gz> [tùy chọn]"
  echo ""
  echo "Tùy chọn:"
  echo "   --force, -y    Bỏ qua bước xác nhận (dùng cho tự động hóa/script)"
  echo "   --prod         Sử dụng docker-compose.prod.yml (Mặc định)"
  echo "   --dev          Sử dụng docker-compose.dev.yml"
  echo "   --local        Sử dụng docker-compose.yml"
  echo ""
  echo "Ví dụ:"
  echo "   ./scripts/restore.sh backups/toprun_backup_20261104_120000.tar.gz"
  echo "========================================================================"
  exit 1
fi

if [ ! -f "${BACKUP_ARCHIVE}" ]; then
  echo "❌ Lỗi: File backup không tồn tại: ${BACKUP_ARCHIVE}"
  exit 1
fi

echo "========================================================================"
echo "⚠️  CẢNH BÁO NGUY HIỂM: TIẾN TRÌNH KHÔI PHỤC DỮ LIỆU (DISASTER RESTORE)"
echo "========================================================================"
echo "📦 File backup mục tiêu: ${BACKUP_ARCHIVE}"
echo "🔧 Compose file:         ${COMPOSE_FILE}"
echo "⚠️  LƯU Ý: Thao tác này sẽ GHI ĐÈ toàn bộ cơ sở dữ liệu hiện tại và"
echo "    thay thế thư mục ./data bằng dữ liệu từ bản backup."
echo "========================================================================"

if [ "$FORCE_RESTORE" = false ]; then
  read -r -p "Bạn có chắc chắn muốn khôi phục không? Nhập chính xác 'RESTORE' để tiếp tục: " CONFIRMATION
  if [ "$CONFIRMATION" != "RESTORE" ]; then
    echo "🛑 Đã hủy bỏ tiến trình khôi phục. Dữ liệu hiện tại không thay đổi."
    exit 0
  fi
fi

RESTORE_TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
TEMP_RESTORE_DIR="${ROOT_DIR}/temp_restore_${RESTORE_TIMESTAMP}"
mkdir -p "${TEMP_RESTORE_DIR}"

cleanup() {
  if [ -d "${TEMP_RESTORE_DIR}" ]; then
    rm -rf "${TEMP_RESTORE_DIR}"
  fi
}
trap cleanup EXIT

echo "📦 Bước 1/5: Đang giải nén gói backup..."
tar -xzf "${BACKUP_ARCHIVE}" -C "${TEMP_RESTORE_DIR}"

if [ ! -f "${TEMP_RESTORE_DIR}/toprun_db.dump" ]; then
  echo "❌ Lỗi: Bản backup không hợp lệ! Không tìm thấy toprun_db.dump bên trong gói."
  exit 1
fi

# Load variables from restored or existing .env
if [ -f "${TEMP_RESTORE_DIR}/.env.backup" ]; then
  echo "🔒 Bước 2/5: Kiểm tra và phục hồi file cấu hình môi trường (.env)..."
  if [ -f ".env" ]; then
    cp .env ".env.bak_${RESTORE_TIMESTAMP}"
    echo "ℹ️ Đã tạo bản sao lưu file .env hiện tại: .env.bak_${RESTORE_TIMESTAMP}"
  fi
  cp "${TEMP_RESTORE_DIR}/.env.backup" .env
  echo "✅ Đã khôi phục file .env từ bản backup."
fi

# Export environment variables for database restore
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source <(grep -E '^[A-Za-z0-9_]+=' .env | sed -e 's/\r$//') || true
  set +a
fi

DB_USER="${POSTGRES_USER:-toprun}"
DB_PASS="${POSTGRES_PASSWORD:-toprun_secure_prod_2026}"
DB_NAME="${POSTGRES_DB:-toprun_db}"

echo "🚀 Bước 3/5: Đảm bảo PostgreSQL container đang hoạt động..."
docker compose -f "${COMPOSE_FILE}" up -d postgres

echo "⏳ Đang chờ PostgreSQL sẵn sàng kết nối..."
MAX_RETRIES=30
RETRY_COUNT=0
until docker compose -f "${COMPOSE_FILE}" exec -T \
  -e PGPASSWORD="${DB_PASS}" \
  postgres pg_isready -U "${DB_USER}" -d "${DB_NAME}" > /dev/null 2>&1; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ "${RETRY_COUNT}" -ge "${MAX_RETRIES}" ]; then
    echo "❌ Lỗi: Container PostgreSQL không thể sẵn sàng sau 30 giây!"
    exit 1
  fi
  sleep 1
done
echo "✅ PostgreSQL đã sẵn sàng!"

echo "🗄️ Bước 4/5: Đang khôi phục cơ sở dữ liệu PostgreSQL '${DB_NAME}'..."

# Ngắt các kết nối active tới database để việc khôi phục không bị lock
docker compose -f "${COMPOSE_FILE}" exec -T \
  -e PGPASSWORD="${DB_PASS}" \
  postgres psql -U "${DB_USER}" -d postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();" > /dev/null 2>&1 || true

# Khôi phục dữ liệu bằng pg_restore
docker compose -f "${COMPOSE_FILE}" exec -T \
  -e PGPASSWORD="${DB_PASS}" \
  postgres pg_restore -U "${DB_USER}" -d "${DB_NAME}" --clean --if-exists --no-owner --no-privileges -v < "${TEMP_RESTORE_DIR}/toprun_db.dump" || {
    echo "ℹ️ Lưu ý: pg_restore có thể hiển thị một vài thông báo không nguy hại nếu một số đối tượng chưa tồn tại trước đó."
  }

echo "✅ Khôi phục Database thành công!"

# Phục hồi thư mục ./data
if [ -d "${TEMP_RESTORE_DIR}/data" ]; then
  echo "📁 Đang khôi phục thư mục dữ liệu ứng dụng (./data)..."
  if [ -d "./data" ]; then
    cp -r "./data" "./data.bak_${RESTORE_TIMESTAMP}"
    echo "ℹ️ Đã tạo bản sao lưu thư mục data cũ: ./data.bak_${RESTORE_TIMESTAMP}"
  fi
  mkdir -p "./data"
  cp -r "${TEMP_RESTORE_DIR}/data/." "./data/"
  echo "✅ Đã khôi phục toàn bộ tệp trong ./data."
fi

echo "🔄 Bước 5/5: Đang khởi động lại toàn bộ dịch vụ (API, Web, Nginx)..."
docker compose -f "${COMPOSE_FILE}" up -d

echo "⏳ Đợi 5 giây để các dịch vụ ổn định..."
sleep 5

echo "🩺 Kiểm tra trạng thái các container:"
docker compose -f "${COMPOSE_FILE}" ps

echo ""
echo "========================================================================"
echo "🎉 KHÔI PHỤC HỆ THỐNG THÀNH CÔNG!"
echo "========================================================================"
echo "✅ Cơ sở dữ liệu PostgreSQL đã được nạp lại hoàn tất."
echo "✅ Thư mục ./data và cấu hình .env đã được khôi phục."
echo "✅ Toàn bộ container ứng dụng đã khởi động lại."
echo "👉 Bạn có thể kiểm tra logs hệ thống bằng lệnh: ./manage.sh logs"
echo "========================================================================"

