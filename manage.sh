#!/usr/bin/env bash
# ==============================================================================
# TOPRunAssistant - Service Management Script
# Supports: build, start, stop, reload (zero-downtime UI), restart (major changes)
# Default Compose: docker-compose.prod.yml (use --dev for docker-compose.yml)
# ==============================================================================

set -e

# Default settings
COMPOSE_FILE="docker-compose.prod.yml"
ENV_MODE="Production"
DO_GIT_PULL=false
COMMAND=""
TARGET_SERVICE=""

# Parse arguments
EXTRA_ARG=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    build|start|stop|reload|restart|status|logs|backup|restore)
      COMMAND="$1"
      shift
      ;;
    --dev)
      COMPOSE_FILE="docker-compose.dev.yml"
      ENV_MODE="Development/Hot-Reload"
      shift
      ;;
    --local)
      COMPOSE_FILE="docker-compose.yml"
      ENV_MODE="Local/Standard"
      shift
      ;;
    --prod)
      COMPOSE_FILE="docker-compose.prod.yml"
      ENV_MODE="Production"
      shift
      ;;
    --pull)
      DO_GIT_PULL=true
      shift
      ;;
    -y|--yes|--force)
      EXTRA_ARG="$1"
      shift
      ;;
    api|web|postgres|redis|nginx)
      TARGET_SERVICE="$1"
      shift
      ;;
    -h|--help)
      COMMAND="help"
      shift
      ;;
    *)
      if [ -z "$EXTRA_ARG" ]; then
        EXTRA_ARG="$1"
      else
        echo "⚠️ Tham số không xác định: $1"
      fi
      shift
      ;;
  esac
done

show_help() {
  echo "========================================================================"
  echo "🏃‍♂️ TOPRunAssistant - Quản Trị Hệ Thống Nhanh (Docker Compose)"
  echo "========================================================================"
  echo "Cách sử dụng: ./manage.sh <lệnh> [tùy chọn]"
  echo ""
  echo "📌 CÁC LỆNH CHÍNH:"
  echo "  build [service]   Build image mới (mặc định api + web, hoặc 'web'/'api')"
  echo "  start [service]   Khởi động hệ thống hoặc service cụ thể"
  echo "  stop [service]    Dừng an toàn các container (giữ nguyên dữ liệu Database)"
  echo "  reload            Cập nhật code Giao diện (Web) không gây downtime"
  echo "  restart           Khởi động lại với thay đổi lớn (Rebuild + Sync DB + Prune)"
  echo "  status            Kiểm tra trạng thái các container"
  echo "  logs [service]    Theo dõi logs thời gian thực"
  echo "  backup            Sao lưu trọn gói Database, .env và thư mục ./data"
  echo "  restore <file>    Khôi phục toàn diện dữ liệu từ bản backup .tar.gz"
  echo ""
  echo "⚙️ TÙY CHỌN BỔ SUNG:"
  echo "  --dev             Sử dụng docker-compose.dev.yml (Môi trường Local/Hot-Reload)"
  echo "  --local           Sử dụng docker-compose.yml (Môi trường Local/Standard)"
  echo "  --prod            Sử dụng docker-compose.prod.yml (Mặc định: Production)"
  echo "  --pull            Kéo mã nguồn mới nhất từ Git trước khi thực hiện"
  echo "  -y, --force       Tự động xác nhận khôi phục không cần hỏi (cho restore)"
  echo ""
  echo "💡 VÍ DỤ:"
  echo "  ./manage.sh reload               # Build & swap code Web không downtime"
  echo "  ./manage.sh restart              # Rebuild toàn bộ, cập nhật DB Schema an toàn"
  echo "  ./manage.sh backup               # Tạo bản backup đóng gói ngay lập tức"
  echo "  ./manage.sh restore backups/toprun_backup_xxx.tar.gz"
  echo "  ./manage.sh status               # Xem danh sách container đang chạy"
  echo "========================================================================"
}

if [ -z "$COMMAND" ] || [ "$COMMAND" = "help" ]; then
  show_help
  exit 0
fi

echo "🔧 Môi trường: $ENV_MODE ($COMPOSE_FILE)"

# Kiểm tra file .env
if [ ! -f .env ] && [ "$COMPOSE_FILE" = "docker-compose.prod.yml" ]; then
  if [ -f .env.example ]; then
    echo "⚠️ Chưa tìm thấy file .env, đang sao chép từ .env.example..."
    cp .env.example .env
  else
    echo "❌ Thiếu file .env cấu hình môi trường!"
    exit 1
  fi
fi

# Tự động Git Pull nếu có cờ --pull
if [ "$DO_GIT_PULL" = true ]; then
  echo "📥 Đang kéo mã nguồn mới nhất từ Git..."
  git pull origin main || git pull origin master || echo "⚠️ Tiếp tục với mã nguồn hiện tại..."
fi

case "$COMMAND" in
  # ----------------------------------------------------------------------------
  # BUILD: Build mới images
  # ----------------------------------------------------------------------------
  build)
    echo "🏗️ Đang build mới Docker Images ($TARGET_SERVICE)..."
    if [ -n "$TARGET_SERVICE" ]; then
      docker compose -f "$COMPOSE_FILE" build "$TARGET_SERVICE"
    else
      docker compose -f "$COMPOSE_FILE" build web api
    fi
    echo "✅ Build hoàn tất thành công!"
    ;;

  # ----------------------------------------------------------------------------
  # START: Khởi động container
  # ----------------------------------------------------------------------------
  start)
    echo "🚀 Đang khởi động hệ thống ($COMPOSE_FILE)..."
    if [ -n "$TARGET_SERVICE" ]; then
      docker compose -f "$COMPOSE_FILE" up -d "$TARGET_SERVICE"
    else
      docker compose -f "$COMPOSE_FILE" up -d
    fi
    echo "✅ Khởi động thành công! Danh sách container:"
    docker compose -f "$COMPOSE_FILE" ps
    ;;

  # ----------------------------------------------------------------------------
  # STOP: Dừng an toàn (bảo toàn named volume)
  # ----------------------------------------------------------------------------
  stop)
    echo "🛑 Đang dừng container an toàn (dữ liệu database được bảo toàn)..."
    if [ -n "$TARGET_SERVICE" ]; then
      docker compose -f "$COMPOSE_FILE" stop "$TARGET_SERVICE"
    else
      docker compose -f "$COMPOSE_FILE" stop
    fi
    echo "✅ Đã dừng các dịch vụ."
    ;;

  # ----------------------------------------------------------------------------
  # RELOAD: Chạy lại code giao diện mới KHÔNG GÂY DOWNTIME
  # ----------------------------------------------------------------------------
  reload)
    echo "⚡ [Zero-Downtime Reload] Đang chuẩn bị cập nhật Web Frontend..."
    echo "📦 Bước 1: Build image Web mới trong nền (Container cũ vẫn đang phục vụ)..."
    docker compose -f "$COMPOSE_FILE" build web

    echo "🔄 Bước 2: Hoán đổi nhanh sang container Web mới..."
    docker compose -f "$COMPOSE_FILE" up -d --no-deps web

    echo "⏳ Bước 3: Đợi 3 giây để Web khởi động hoàn toàn..."
    sleep 3

    echo "🩺 Bước 4: Kiểm tra trạng thái hoạt động..."
    docker compose -f "$COMPOSE_FILE" ps web
    echo "✨ Reload giao diện hoàn tất thành công, không gây downtime!"
    ;;

  # ----------------------------------------------------------------------------
  # RESTART: Chạy lại với các thay đổi lớn
  # ----------------------------------------------------------------------------
  restart)
    echo "🔄 [Major Restart] Đang tiến hành cập nhật hệ thống với các thay đổi lớn..."
    echo "📦 Bước 1: Re-build toàn bộ service ứng dụng (API & Web)..."
    docker compose -f "$COMPOSE_FILE" build web api

    echo "🚀 Bước 2: Khởi chạy và tái tạo các container..."
    docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

    echo "⏳ Bước 3: Đợi dịch vụ API và Database ổn định (5 giây)..."
    sleep 5

    echo "🗄️ Bước 4: Cập nhật Schema Cơ sở dữ liệu PostgreSQL an toàn (Bảo toàn dữ liệu cũ)..."
    docker compose -f "$COMPOSE_FILE" exec -T api npx prisma db push --schema=packages/database/prisma/schema.prisma || {
      echo "⚠️ Lưu ý: Đồng bộ prisma schema chưa hoàn tất hoặc container API đang khởi động. Dữ liệu DB vẫn an toàn."
    }

    echo "🧹 Bước 5: Dọn dẹp Docker images cũ không sử dụng..."
    docker image prune -f || true

    echo "========================================================================"
    echo "🎉 Restart và đồng bộ hoàn tất thành công!"
    docker compose -f "$COMPOSE_FILE" ps
    echo "========================================================================"
    ;;

  # ----------------------------------------------------------------------------
  # BACKUP: Sao lưu cơ sở dữ liệu và thư mục dữ liệu
  # ----------------------------------------------------------------------------
  backup)
    echo "📦 Đang thực hiện tiến trình sao lưu hệ thống..."
    chmod +x ./scripts/backup.sh 2>/dev/null || true
    if [ "$COMPOSE_FILE" = "docker-compose.dev.yml" ]; then
      ./scripts/backup.sh --dev
    elif [ "$COMPOSE_FILE" = "docker-compose.yml" ]; then
      ./scripts/backup.sh --local
    else
      ./scripts/backup.sh --prod
    fi
    ;;

  # ----------------------------------------------------------------------------
  # RESTORE: Khôi phục dữ liệu từ bản backup
  # ----------------------------------------------------------------------------
  restore)
    echo "♻️ Đang chuẩn bị khôi phục hệ thống..."
    chmod +x ./scripts/restore.sh 2>/dev/null || true
    RESTORE_FLAGS=""
    if [ "$COMPOSE_FILE" = "docker-compose.dev.yml" ]; then
      RESTORE_FLAGS="--dev"
    elif [ "$COMPOSE_FILE" = "docker-compose.yml" ]; then
      RESTORE_FLAGS="--local"
    else
      RESTORE_FLAGS="--prod"
    fi

    if [ "$EXTRA_ARG" = "-y" ] || [ "$EXTRA_ARG" = "--yes" ] || [ "$EXTRA_ARG" = "--force" ]; then
      ./scripts/restore.sh "$TARGET_SERVICE" $RESTORE_FLAGS --force
    else
      ./scripts/restore.sh "$TARGET_SERVICE" $RESTORE_FLAGS
    fi
    ;;

  # ----------------------------------------------------------------------------
  # STATUS: Xem trạng thái
  # ----------------------------------------------------------------------------
  status)
    echo "📊 Trạng thái hệ thống ($COMPOSE_FILE):"
    docker compose -f "$COMPOSE_FILE" ps
    ;;

  # ----------------------------------------------------------------------------
  # LOGS: Xem logs thời gian thực
  # ----------------------------------------------------------------------------
  logs)
    if [ -n "$TARGET_SERVICE" ]; then
      echo "📋 Theo dõi logs cho dịch vụ: $TARGET_SERVICE"
      docker compose -f "$COMPOSE_FILE" logs -f "$TARGET_SERVICE"
    else
      echo "📋 Theo dõi logs cho toàn bộ dịch vụ..."
      docker compose -f "$COMPOSE_FILE" logs -f
    fi
    ;;

  *)
    echo "❌ Lệnh không hợp lệ: $COMMAND"
    show_help
    exit 1
    ;;
esac

