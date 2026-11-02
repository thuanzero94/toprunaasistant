# 🏃‍♂️ TOPRunAssistant — Multi-Platform Running, Challenge & Virtual Race Platform

**TOPRunAssistant** là nền tảng Quản lý Chạy bộ, Tracklog, Lịch sử, Thử thách (**Challenge**) và Giải chạy ảo (**Virtual Race**) hoạt động trên cả 3 nền tảng (**Android, iOS, Web**), tích hợp đồng bộ tự động qua **Strava API (OAuth2 + Webhook)** và hỗ trợ tải file **GPX/TCX**.

---

## ✨ Điểm Khác Biệt Cốt Lõi (Key Highlights)

1. **🎯🏆 Mô hình Tích lũy & Chấm điểm 2 Tầng (Dual-Goal Architecture)**:
   - **Tầng 1 — Mốc TARGET (Finisher Goal)**: Vận động viên đăng ký hạng mục mục tiêu cơ bản (VD: `30KM`, `50KM`, `100KM`, hoặc `Half Marathon 21.1KM`). Hoàn thành Mốc Target sẽ mở khóa **Giấy chứng nhận điện tử (E-Certificate)** và đủ điều kiện nhận **Bộ vật phẩm Race-kit (Huy chương Finisher thật + Áo chạy bộ)**.
   - **Tầng 2 — Mốc CHALLENGE Mở Rộng (Tiered Awards)**: Nằm ngay trong cùng giải đấu dành cho các VĐV muốn bứt phá giới hạn sau khi (hoặc song song khi) chinh phục Target: Vượt ngưỡng `100KM` (Bạc), `150KM` (Vàng), Chuỗi ngày chạy liên tiếp (`Streak 5–7 ngày`), hoặc `Single Long Run >= 15KM` để nhận các **Huy hiệu Danh Giá (Digital Awards)**.
2. **🛡️ Chống Gian Lận Thông Minh Từng Km (Split-Level Anti-Cheat Engine)**:
   - Tự động chặn các hoạt động nhập tay (`manual == true`), sai môn thể thao, hoặc thiếu nhịp tim/guồng chân (nếu giải yêu cầu).
   - **Cắt Split quá tốc độ thông minh**: Nếu VĐV chạy bộ 5km đầu hợp lệ nhưng quên tắt đồng hồ Strava khi lên xe máy về nhà ở km cuối (Pace `< 03:00/km`), hệ thống tự động **loại bỏ km đi xe máy** và **vẫn bảo toàn 5km chạy bộ hợp lệ trước đó**!
3. **🟠 Đồng Bộ Strava API Thời Gian Thực & Phân Tích GPX**:
   - Hỗ trợ luồng OAuth2 (`scope=read,activity:read_all`), nhận sự kiện tức thì qua **Strava Webhook** (`POST /api/v1/webhooks/strava`), tự động nhân hệ số ngày cuối tuần (`Weekend Multiplier x2`) và hỗ trợ upload trực tiếp file `.gpx`.
4. **📸 Bản Đồ Polyline, Biểu Đồ Splits Xanh/Đỏ & Share Card**:
   - Giải mã chuỗi Google Polyline từ Strava để vẽ bản đồ đường chạy, hiển thị biểu đồ từng km trực quan, tự động sinh **E-BIB**, **E-Certificate** và ghép ảnh **Share Card** khoe thành tích lên Facebook/Zalo.
5. **📦 Quản Trị Giải Đấu & Đơn Hàng Vật Phẩm (Race-kit Fulfillment)**:
   - Cổng Admin hỗ trợ duyệt các Tracklog nghi vấn, quản lý Size áo, khắc tên huy chương, cập nhật mã vận đơn (`GHTK`, `GHN`, `ViettelPost`) và xuất file CSV/Excel giao hàng.

---

## 🗂️ Cấu Trúc Dự Án (Turborepo Monorepo)

```text
TOPRunAssistant/
├── apps/
│   ├── api/                 # Backend NestJS (REST API, Swagger Docs, Strava Webhook, E-BIB/E-Cert SVG Generator)
│   ├── web/                 # Ứng dụng Web Next.js 15 (Giao diện Runner + Cổng Quản trị Admin/Organizer)
│   └── mobile/              # Ứng dụng Di động React Native (Expo) cho Android & iOS (5 Bottom Tabs)
├── packages/
│   ├── shared/              # Thư viện Lõi dùng chung: Split-Level Anti-Cheat, Dual-Goal Calculator, Polyline, GPX Parser
│   └── database/            # Prisma ORM Schema (PostgreSQL 16 - 15 bảng) & Seed Data
├── docker/
│   └── docker-compose.yml   # Hạ tầng PostgreSQL + PostGIS, Redis 7, MinIO S3
└── docs/                    # Hệ thống Tài liệu Kiến trúc, API & Hướng dẫn sử dụng đầy đủ
```

---

## 📚 Danh Mục Tài Liệu Đầy Đủ (`docs/`)

- 📘 [**Master Plan & Bộ Prompt Thực Thi (`docs/MASTER_PLAN_AND_PROMPTS.md`)**](file:///c:/Users/thuang/OneDrive%20-%20ASSA%20ABLOY%20Group/alan/TOPRunAssistant/docs/MASTER_PLAN_AND_PROMPTS.md)
- 🏛️ [**Kiến Trúc Chi Tiết & Thuật Toán Chấm Điểm (`docs/ARCHITECTURE.md`)**](file:///c:/Users/thuang/OneDrive%20-%20ASSA%20ABLOY%20Group/alan/TOPRunAssistant/docs/ARCHITECTURE.md)
- 📡 [**Đặc Tả REST API & Strava Webhook (`docs/API_REFERENCE.md`)**](file:///c:/Users/thuang/OneDrive%20-%20ASSA%20ABLOY%20Group/alan/TOPRunAssistant/docs/API_REFERENCE.md)
- 🚀 [**Hướng Dẫn Cài Đặt, Cấu Hình Strava & Sử Dụng (`docs/DEPLOYMENT_AND_USER_GUIDE.md`)**](file:///c:/Users/thuang/OneDrive%20-%20ASSA%20ABLOY%20Group/alan/TOPRunAssistant/docs/DEPLOYMENT_AND_USER_GUIDE.md)

---

## ⚡ Hướng Dẫn Chạy Nhanh (Quickstart)

### Cách 1: Khởi chạy trọn gói bằng Docker Compose (Khuyên dùng)
```bash
# Khởi chạy toàn bộ hệ sinh thái (PostgreSQL 5433, Redis 6380, API 4000, Web 3005)
docker compose up -d

# Xem log thời gian thực
docker compose logs -f

# Dừng hệ thống
docker compose down
```

### Cách 2: Chạy chế độ Development trên máy cục bộ
```bash
# 1. Cài đặt toàn bộ dependencies cho Monorepo
npm install

# 2. Build & Chạy Unit Tests kiểm chứng bộ máy Chấm điểm & Anti-Cheat
npm run build --workspace=@toprun/shared
npm test --workspace=@toprun/shared

# 3. Khởi chạy Backend API (http://localhost:4000 & Swagger: http://localhost:4000/api/docs)
npm run dev:api

# 4. Khởi chạy Ứng dụng Web & Admin Portal (http://localhost:3005)
npm run dev:web

# 5. Khởi chạy Ứng dụng Mobile iOS/Android (Expo)
npm run dev:mobile
```

