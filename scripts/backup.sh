#!/usr/bin/env bash
# ==============================================================================
# TOPRunAssistant - Automated Database & Data Backup Script
# Usage: ./scripts/backup.sh [--prod|--dev|--local]
# ==============================================================================

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${ROOT_DIR}"

COMPOSE_FILE="docker-compose.prod.yml"
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-7}
BACKUP_DIR="${ROOT_DIR}/backups"
LOG_DIR="${ROOT_DIR}/logs"
LOG_FILE="${LOG_DIR}/backup.log"

# Parse CLI options
while [[ $# -gt 0 ]]; do
  case "$1" in
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
      shift
      ;;
  esac
done

mkdir -p "${BACKUP_DIR}" "${LOG_DIR}"

log() {
  local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
  echo -e "$msg"
  echo "$msg" >> "${LOG_FILE}"
}

log "========================================================================"
log "📦 BẮT ĐẦU TIẾN TRÌNH BACKUP TOPRUNASSISTANT"
log "🔧 Cấu hình Compose: ${COMPOSE_FILE}"

# Load .env variables if present
if [ -f .env ]; then
  # export only valid shell variables safely
  set -a
  # shellcheck disable=SC1091
  source <(grep -E '^[A-Za-z0-9_]+=' .env | sed -e 's/\r$//') || true
  set +a
fi

DB_USER="${POSTGRES_USER:-toprun}"
DB_NAME="${POSTGRES_DB:-toprun_db}"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
TEMP_DIR="${BACKUP_DIR}/temp_${TIMESTAMP}"
ARCHIVE_NAME="toprun_backup_${TIMESTAMP}.tar.gz"
ARCHIVE_PATH="${BACKUP_DIR}/${ARCHIVE_NAME}"

mkdir -p "${TEMP_DIR}"

# 1. Check if postgres container is running
POSTGRES_CONTAINER=$(docker compose -f "${COMPOSE_FILE}" ps -q postgres 2>/dev/null || true)

if [ -z "${POSTGRES_CONTAINER}" ]; then
  log "❌ Lỗi: Container PostgreSQL không hoạt động trong ${COMPOSE_FILE}!"
  log "💡 Gợi ý: Khởi động container trước với: ./manage.sh start postgres"
  rm -rf "${TEMP_DIR}"
  exit 1
fi

log "🗄️ Bước 1/4: Đang kết xuất (Dump) PostgreSQL Database '${DB_NAME}'..."
DUMP_FILE="${TEMP_DIR}/toprun_db.dump"

docker compose -f "${COMPOSE_FILE}" exec -T \
  -e PGPASSWORD="${POSTGRES_PASSWORD:-toprun_secure_prod_2026}" \
  postgres pg_dump -U "${DB_USER}" -d "${DB_NAME}" -F c -b -v > "${DUMP_FILE}"

if [ ! -s "${DUMP_FILE}" ]; then
  log "❌ Lỗi: File dump cơ sở dữ liệu rỗng hoặc tạo thất bại!"
  rm -rf "${TEMP_DIR}"
  exit 1
fi

DUMP_SIZE=$(du -h "${DUMP_FILE}" | cut -f1)
log "✅ Dump DB thành công! Kích thước: ${DUMP_SIZE}"

# 2. Backup ./data directory
log "📁 Bước 2/4: Đang sao chép thư mục dữ liệu ứng dụng (./data)..."
if [ -d "./data" ]; then
  cp -r "./data" "${TEMP_DIR}/data"
  log "✅ Đã sao chép thư mục ./data."
else
  mkdir -p "${TEMP_DIR}/data"
  log "ℹ️ Không tìm thấy thư mục ./data, tạo thư mục trống để bảo đảm cấu trúc."
fi

# 3. Backup .env configuration file (with strict permission check)
log "🔒 Bước 3/4: Đang đóng gói file cấu hình môi trường (.env)..."
if [ -f ".env" ]; then
  cp .env "${TEMP_DIR}/.env.backup"
  log "✅ Đã đính kèm file .env vào gói backup."
else
  log "⚠️ Chú ý: Không tìm thấy file .env tại thư mục gốc."
fi

# Write metadata info into the package
cat <<EOF > "${TEMP_DIR}/backup_manifest.json"
{
  "timestamp": "${TIMESTAMP}",
  "created_at": "$(date -u +'%Y-%m-%dT%H:%M:%SZ')",
  "database": "${DB_NAME}",
  "db_user": "${DB_USER}",
  "compose_file": "${COMPOSE_FILE}",
  "retention_days": ${RETENTION_DAYS}
}
EOF

# 4. Create compressed tar.gz bundle
log "📦 Bước 4/4: Đang nén toàn bộ thành file lưu trữ: ${ARCHIVE_NAME}..."
tar -czf "${ARCHIVE_PATH}" -C "${TEMP_DIR}" .

# Secure permissions of the backup archive
chmod 600 "${ARCHIVE_PATH}"
rm -rf "${TEMP_DIR}"

FINAL_SIZE=$(du -h "${ARCHIVE_PATH}" | cut -f1)
log "🎉 TẠO BẢN BACKUP THÀNH CÔNG!"
log "📂 Đường dẫn: ${ARCHIVE_PATH} (${FINAL_SIZE})"

# 5. Backup Retention Cleanup (keep last N days locally)
log "🧹 Đang dọn dẹp các bản backup cũ hơn ${RETENTION_DAYS} ngày..."
CLEANED_COUNT=0
while IFS= read -r old_file; do
  if [ -n "$old_file" ]; then
    rm -f "$old_file"
    log "🗑️ Đã xóa bản backup cũ: $(basename "$old_file")"
    CLEANED_COUNT=$((CLEANED_COUNT + 1))
  fi
done < <(find "${BACKUP_DIR}" -name "toprun_backup_*.tar.gz" -type f -mtime "+${RETENTION_DAYS}" 2>/dev/null)

if [ "${CLEANED_COUNT}" -eq 0 ]; then
  log "ℹ️ Không có file backup nào cũ hơn ${RETENTION_DAYS} ngày cần xóa."
fi

# 6. Offsite Cloud/NAS Sync via Rclone (if configured)
if [ -n "${RCLONE_REMOTE}" ]; then
  log "☁️ Phát hiện cấu hình Cloud Storage (RCLONE_REMOTE=${RCLONE_REMOTE}). Đang đồng bộ..."
  if command -v rclone &> /dev/null; then
    if rclone copy "${ARCHIVE_PATH}" "${RCLONE_REMOTE}"; then
      log "🚀 Đã tải bản backup lên Cloud Storage từ xa thành công: ${RCLONE_REMOTE}"
    else
      log "⚠️ Cảnh báo: Rclone tải lên Cloud thất bại! Bản backup cục bộ vẫn an toàn."
    fi
  else
    log "⚠️ Cảnh báo: RCLONE_REMOTE được chỉ định nhưng máy chủ chưa cài đặt công cụ 'rclone'!"
  fi
fi

log "🏁 TIẾN TRÌNH HOÀN TẤT."
log "========================================================================"

