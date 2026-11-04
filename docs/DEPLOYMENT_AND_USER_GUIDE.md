# 🚀 Hướng Dẫn Triển Khai Chi Tiết: Máy Dev (Hot-Reload) & Máy Prod (VPS 24/7)

Tài liệu quy trình kỹ thuật chuẩn hóa cho nền tảng **TOPRunAssistant** (Giải chạy ảo Virtual Race & Đồng bộ Strava Tracklog tự động) dành cho cả 2 môi trường:
1. **Môi trường DEV (Máy phát triển hiện tại)**: Hot-Reload < 1s, sửa code ăn ngay, không cần rebuild image, lưu dữ liệu bền vững trên ổ cứng vật lý.
2. **Môi trường PROD (Máy chủ VPS / Cloud Production)**: Vận hành 24/7 với tên miền `toprunassistant.io.vn` và `api.toprunassistant.io.vn`, Nginx Reverse Proxy, SSL Cloudflare, PostgreSQL và Redis độc lập.

---

## 1. Bản Đồ File & Cấu Hình Cần Thiết

```
TOPRunAssistant/
├── .env.development           <-- Template mẫu cho máy DEV (Port 3005, 4000, 5433, 6380)
├── .env.production            <-- Cấu hình chính thức triển khai PROD (Tên miền, DB bảo mật)
├── .env                       <-- File môi trường đang active tại thư mục gốc
├── docker-compose.dev.yml     <-- Docker Dev: Volume mount host code + Fast Refresh / TSX Watch
├── docker-compose.prod.yml    <-- Docker Prod: Nginx + Web Standalone + API + Postgres + Redis
├── docker-compose.yml         <-- Docker Local: Chế độ Production-like trên máy cá nhân
├── Dockerfile.dev             <-- Image Node 20 Dev môi trường đồng nhất
├── manage.sh                  <-- Script quản trị trên Linux / VPS Ubuntu
├── manage.ps1                 <-- Script quản trị trên Windows PowerShell
├── data/
│   └── toprun-engine-state.json <-- File lưu trữ bền vững (Tự động tạo & nạp lại sau restart)
└── docker/
    └── nginx/conf.d/default.conf <-- Cấu hình Reverse Proxy chuyển tiếp Web & API
```

---

## 2. QUY TRÌNH DÀNH CHO MÁY DEV (LẬP TRÌNH NHANH - HOT RELOAD)

### Bước 2.1: Chuẩn bị file `.env`
Sao chép hoặc sử dụng nội dung file `.env.development` vào `.env`:
```powershell
# Trên Windows PowerShell
Copy-Item .env.development .env -Force
```
*Các giá trị mặc định đã được cấu hình tối ưu:*
* `DATABASE_URL`: `postgresql://toprun:toprun_secret_2026@localhost:5433/toprun_db?schema=public`
* `FRONTEND_URL`: `http://localhost:3005`
* `API_BASE_URL`: `http://localhost:4000/api/v1`
* `DATA_DIR`: `./data` (Tự động lưu giải đấu & kết quả vào ổ đĩa vật lý của máy)

### Bước 2.2: Khởi động Docker Dev Mode (Hot-Reload)
Chạy lệnh một chạm:
```powershell
npm run docker:dev
# hoặc qua PowerShell script:
.\manage.ps1 -Dev start
```
> Nếu là lần đầu chạy hoặc vừa thay đổi dependencies trong `package.json`, dùng lệnh build:
> ```powershell
> npm run docker:dev:build
> ```

### Bước 2.3: Trải nghiệm lập trình tốc độ cao
* Mở trình duyệt tại: **`http://localhost:3005`**
* Mở Swagger API tại: **`http://localhost:4000/api/docs`**
* **Cơ chế Hot-Reload**: Bạn mở VS Code, chỉnh sửa bất kỳ file nào trong `apps/web` hoặc `apps/api`, nhấn `Ctrl + S`. Trình duyệt tự Fast Refresh trong **dưới 1 giây** mà **KHÔNG CẦN CHẠY BẤT KỲ LỆNH BUILD HAY RELOAD NÀO**!

### Bước 2.4: Dừng container Dev an toàn
```powershell
npm run docker:dev:down
# hoặc
.\manage.ps1 -Dev stop
```
> ⚠️ **Lưu ý**: Không bao giờ dùng cờ `-v` (`docker compose down -v`) vì cờ này sẽ xóa volume của database PostgreSQL!

---

## 3. QUY TRÌNH DÀNH CHO MÁY PROD (TRIỂN KHAI VPS CHÍNH THỨC)

### Thông số triển khai chính thức:
| Hạng mục | Giá trị Prod | Ghi chú |
| :--- | :--- | :--- |
| **Domain Web Runner** | `https://toprunassistant.io.vn` | Reverse Proxy Nginx qua Cloudflare |
| **Domain API & Webhook** | `https://api.toprunassistant.io.vn` | Xử lý Strava Webhook tự động |
| **Email SMTP** | `toprunassistant@gmail.com` | Gửi link kích hoạt & mã OTP xác thực |
| **Database** | PostgreSQL 15 (Container `toprun-prod-postgres`) | Lưu trữ trong volume `toprun_pgdata_prod` |
| **Cache & Queue** | Redis 7 (Container `toprun-prod-redis`) | Lưu trữ trong volume `toprun_redisdata_prod` |
| **Engine State** | Mount host `./data:/app/data` | Lưu trữ file `toprun-engine-state.json` |

---

### Bước 3.1: Chuẩn bị máy chủ VPS (Ubuntu 22.04 LTS)
Đăng nhập SSH vào VPS và cài đặt Docker + Git:
```bash
# 1. Cập nhật hệ thống & cài Docker Engine
sudo apt update && sudo apt upgrade -y
curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh
sudo usermod -aG docker $USER

# 2. Cài đặt Git & cấu hình Firewall UFW
sudo apt install -y git curl ufw
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

### Bước 3.2: Kéo mã nguồn & Cấu hình môi trường Production
```bash
# 1. Clone repository về VPS (hoặc rsync/scp thư mục dự án)
git clone <URL_REPO_CUA_BAN> /var/www/TOPRunAssistant
cd /var/www/TOPRunAssistant

# 2. Tạo file .env từ template production
cp .env.production .env

# 3. Tạo thư mục data và cấp quyền
mkdir -p data
chmod -R 775 data

# 4. Kiểm tra hoặc điều chỉnh mật khẩu bảo mật trong .env nếu muốn
nano .env
```

### Bước 3.3: Khởi động hệ thống Production
Hệ thống hỗ trợ script điều phối đa nền tảng:
- **Trên Linux/VPS:**
  ```bash
  chmod +x manage.sh
  ./manage.sh build
  ./manage.sh start
  ```
- **Trên Windows Docker Production:**
  ```powershell
  .\manage.ps1 build
  .\manage.ps1 start
  ```

> 💡 **Khởi tạo bảng cơ sở dữ liệu PostgreSQL (Tự động):**
> Container `api` đã được tích hợp cơ chế tự động chạy `npx prisma db push` ngay khi khởi động.
> Nếu khởi tạo database lần đầu thủ công, bạn chỉ cần gõ 1 lệnh duy nhất:
> ```bash
> docker compose -f docker-compose.prod.yml exec -T api npx prisma db push --schema=packages/database/prisma/schema.prisma --accept-data-loss
> docker compose -f docker-compose.prod.yml restart api
> ```

### Bước 3.4: Kiểm tra trạng thái hệ thống
```bash
# Xem trạng thái các container
./manage.sh status
# Hoặc xem logs thời gian thực
./manage.sh logs
```
Tất cả 5 containers (`toprun-prod-nginx`, `toprun-prod-web`, `toprun-prod-api`, `toprun-prod-postgres`, `toprun-prod-redis`) phải hiển thị trạng thái `Up`.

---

## 4. CẤU HÌNH CLOUDFLARE CHO TÊN MIỀN TENTEN.VN & ĐỊNH TUYẾN (CHUẨN HOÁ)

Hệ thống hỗ trợ 2 phương án tùy thuộc vào hạ tầng mạng của bạn, trong đó **Phương án A (Cloudflare Tunnel)** là giải pháp tối ưu nhất cho máy Production hiện tại (không cần mở port router, không lo IP động):

---

### PHƯƠNG ÁN A: MÁY PRODUCTION KHÔNG THỂ MỞ PORT (CLOUDFLARE TUNNEL - KHUYÊN DÙNG CHUẨN)
> **Áp dụng cho:** Máy chủ Windows Production, máy đặt tại văn phòng/mạng nội bộ không thể mở port router hoặc không có IP tĩnh.  
> **Ưu điểm:** Hoàn toàn miễn phí, không cần mở bất kỳ cổng nào trên modem, bảo vệ IP gốc, tự động có chứng chỉ bảo mật HTTPS/SSL từ Cloudflare.

#### Bước 4.1. Cập nhật 2 Nameserver chính thức từ TenTen.vn sang Cloudflare
1. Đăng nhập trang quản trị tên miền tại **[TenTen.vn](https://tenten.vn)**.
2. Vào mục **Quản lý dịch vụ** ➔ **Tên miền** ➔ Chọn tên miền **`toprunassistant.io.vn`**.
3. Nhấn nút **Cập nhật thông tin Nameserver** và điền chính xác 2 Nameserver được Cloudflare cấp:
   - **NS1**: `cody.ns.cloudflare.com`
   - **NS2**: `lara.ns.cloudflare.com`
   - **NS3**: *(Xoá trống hoặc để trống)*
4. Nhấn nút màu cam: **CẬP NHẬT**.
5. Đăng nhập vào **[Cloudflare Dashboard](https://dash.cloudflare.com/)** ➔ Chọn tên miền `toprunassistant.io.vn` ➔ Nhấn **Done, check nameservers**. Chờ 1 - 5 phút để trạng thái tên miền chuyển sang **Active (Màu xanh lá)**.

#### Bước 4.2. Tạo Cloudflare Tunnel trên Dashboard
1. Truy cập trang quản trị Cloudflare Zero Trust: **[https://one.dash.cloudflare.com/](https://one.dash.cloudflare.com/)**.
2. Vào menu bên trái: **Networks** ➔ chọn **Tunnels** ➔ nhấn **Add a tunnel** (hoặc chọn tunnel đã tạo).
3. Chọn loại kết nối: **Cloudflared** ➔ Đặt tên tunnel (ví dụ: `toprun-prod-tunnel`) ➔ nhấn **Save tunnel**.
4. Tại mục chọn hệ điều hành, chọn **Windows (64-bit)**:
   - Cloudflare sẽ hiển thị lệnh cài đặt kèm mã **Token** dịch vụ:
     ```powershell
     cloudflared.exe service install <TOKEN_DO_CLOUDFLARE_CAP>
     ```

#### Bước 4.3. Cài đặt và kích hoạt Cloudflare Tunnel trên máy Production (Windows)
Mở **PowerShell với quyền Admin** (Run as Administrator) trên máy Production và thực hiện:
```powershell
# 1. Tải và cài đặt công cụ cloudflared chính thức
winget install --id Cloudflare.cloudflared -e

# 2. Cài đặt dịch vụ chạy ngầm với Token do Cloudflare cấp
cloudflared.exe service install <TOKEN_DO_CLOUDFLARE_CAP>

# 3. Khởi động dịch vụ
Start-Service cloudflared
```
*Trạng thái Tunnel trên Dashboard Cloudflare sẽ hiển thị **Connected (Màu xanh lá)**.*

#### Bước 4.4. Cấu hình định tuyến (Public Hostnames) kết hợp với Nginx Docker
Trong trang quản trị Tunnel trên Cloudflare, chọn tab **Public Hostnames** ➔ Nhấn **Add a public hostname** để tạo 2 bản ghi định tuyến:

##### 1. Bản ghi Web Frontend:
- **Subdomain:** *(để trống)*
- **Domain:** `toprunassistant.io.vn`
- **Path:** *(để trống)*
- **Service Type:** `HTTP`
- **URL:** `localhost:80` (Nginx tự động proxy sang container `toprun-prod-web:3000`)
- Nhấn **Save hostname**.

##### 2. Bản ghi Backend API & Strava Webhook:
- **Subdomain:** `api`
- **Domain:** `toprunassistant.io.vn`
- **Path:** *(để trống)*
- **Service Type:** `HTTP`
- **URL:** `localhost:80` (Nginx tự động proxy sang container `toprun-prod-api:4000`)
- Nhấn **Save hostname**.

> [!TIP]
> **Vì sao cả 2 đều trỏ về `localhost:80`?**  
> Do file cấu hình `docker/nginx/conf.d/default.conf` đã thiết lập sẵn 2 khối `server`:
> - Nhận request tên miền `toprunassistant.io.vn` ➔ chuyển tiếp nội bộ đến `http://web:3000`.
> - Nhận request tên miền `api.toprunassistant.io.vn` ➔ chuyển tiếp nội bộ đến `http://api:4000`.  
> Nginx đóng vai trò là Reverse Proxy tập trung giúp xử lý headers, timeout, và chuyển tiếp IP thực (`CF-Connecting-IP`).

#### Bước 4.5. Kiểm tra kết nối sau khi cấu hình hoàn tất
1. **Kiểm tra API Backend & Tài liệu Swagger:**
   Mở trình duyệt truy cập: 👉 **`https://api.toprunassistant.io.vn/api/docs`**
   - Màn hình hiển thị giao diện **Swagger UI** màu xanh lá của NestJS ➔ API đã thông mạng thành công 100%!
2. **Kiểm tra Giao diện Web Runner:**
   Mở trình duyệt truy cập: 👉 **`https://toprunassistant.io.vn`**
   - Giao diện Next.js 15 hiển thị đầy đủ, không bị lỗi CORS hay lỗi mất kết nối API.

---

### PHƯƠNG ÁN B: MÁY CHỦ VPS LINUX CÓ IP TĨNH CÔNG KHAI (CLOUDFLARE DNS A RECORD)
> Áp dụng cho: VPS thuê tại Data Center (Vietnix, Linode, AWS...) có IP tĩnh và mở được port 80/443.

1. Đăng nhập trang quản trị **[Cloudflare Dashboard](https://dash.cloudflare.com/)**.
2. Chọn tên miền **`toprunassistant.io.vn`** ➔ vào mục **DNS** ➔ **Records**:
   - Thêm bản ghi **A**:
     - Name: `@`
     - IPv4 address: `<IP_CUA_VPS>`
     - Proxy status: **Proxied (Đám mây màu cam)**
   - Thêm bản ghi **A**:
     - Name: `api`
     - IPv4 address: `<IP_CUA_VPS>`
     - Proxy status: **Proxied (Đám mây màu cam)**
3. Vào mục **SSL/TLS**:
   - Chọn chế độ mã hóa: **Full** hoặc **Full (strict)**.
   - Bật tính năng **Always Use HTTPS** và **Automatic HTTPS Rewrites**.

---

## 5. CẤU HÌNH STRAVA DEVELOPERS CHO DOMAIN PROD

### Bước 5.1: Cập nhật Callback Domain trên Strava
1. Đăng nhập: **[https://www.strava.com/settings/api](https://www.strava.com/settings/api)**
2. Nhấn nút **Edit**:
   - **Authorization Callback Domain**: `api.toprunassistant.io.vn`
3. Nhấn **Save**.

### Bước 5.2: Kích hoạt Webhook Subscription tự động
Khi tên miền `https://api.toprunassistant.io.vn` đã online, chạy lệnh curl sau trên Terminal máy tính hoặc VPS:
```bash
curl -X POST https://www.strava.com/api/v3/push_subscriptions \
  -F client_id=292007 \
  -F client_secret=54eb7308f454c98fb5e452edb41f1108afb66b10 \
  -F callback_url=https://api.toprunassistant.io.vn/api/v1/webhooks/strava \
  -F verify_token=TOPRUN_STRAVA_VERIFY_TOKEN_2026
```
Strava sẽ gửi xác thực đến endpoint `GET /api/v1/webhooks/strava` và trả về `id` của subscription. Kể từ lúc này, mọi VĐV kết nối Strava khi chạy xong sẽ tự động có tracklog được đồng bộ và chấm điểm ngay lập tức!

---

## 6. QUY TRÌNH UPDATE CODE TRÊN MÁY PROD (ZERO-DOWNTIME)

Khi bạn phát triển xong tính năng mới trên máy Dev và đẩy lên Git:

### Cách 1: Chỉ cập nhật Giao diện (Web Frontend) không gây gián đoạn API:
```bash
./manage.sh reload --pull
```
*Script sẽ tự động kéo code mới từ Git, build image Web mới và hoán đổi container trong vài giây.*

### Cách 2: Cập nhật lớn (Cả API, Web & Database Schema):
```bash
./manage.sh restart --pull
```
*Script sẽ tự động: git pull -> build lại image -> khởi động lại -> chạy `prisma db push` -> dọn dẹp docker cache cũ an toàn.*

---

## 7. BẢO TOÀN DỮ LIỆU KHI REBOOT MÁY CHỦ HOẶC CONTAINER RESET

Toàn bộ hệ thống áp dụng cơ chế bảo toàn dữ liệu 2 lớp:
1. **Lớp Relational Data (Tài khoản, Xác thực, Quan hệ)**: Nằm trong PostgreSQL volume `toprun_pgdata_prod` với chính sách `restart: always`.
2. **Lớp Engine Data (Giải đấu mới tạo, BXH, Cấu hình Thử thách, Tracklogs Strava)**: Nằm trong file vật lý `./data/toprun-engine-state.json` trên ổ cứng của VPS.

> 🛡️ **Bảo đảm an toàn**: Kể cả khi bạn khởi động lại VPS (`sudo reboot`), nâng cấp Docker Engine hoặc tắt container bằng `./manage.sh stop`, toàn bộ dữ liệu giải đấu, thành tích chạy và tài khoản người dùng được tự động nạp lại 100% nguyên vẹn ngay khi hệ thống bật lên.

---

## 8. SAO LƯU & PHỤC HỒI THẢM HỌA (DISASTER RECOVERY)

Khi cần sao lưu định kỳ, di chuyển sang Server mới hoặc chuẩn bị cho tình huống Server bị sập:
- **Tài liệu chi tiết:** Xem hướng dẫn hoàn chỉnh tại [DISASTER_RECOVERY_AND_BACKUP_GUIDE.md](./DISASTER_RECOVERY_AND_BACKUP_GUIDE.md).
- **Lệnh tạo bản backup nhanh:**
  ```bash
  ./manage.sh backup
  ```
- **Lệnh khôi phục sang máy chủ mới:**
  ```bash
  ./manage.sh restore backups/toprun_backup_YYYYMMDD_HHMMSS.tar.gz
  ```
- **Lịch cronjob định kỳ:** Tự động chạy 2 lần/ngày (12:00 trưa & 00:00 đêm) và tự động đồng bộ lên Cloud Storage / NAS Synology.
