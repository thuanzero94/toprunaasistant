# 🏃‍♂️ TOPRunAssistant — Master Architecture Plan & Execution Prompts

> Tài liệu này tổng hợp toàn bộ quyết định kiến trúc và nghiệp vụ từ phiên thảo luận thiết kế hệ thống **TOPRunAssistant** — nền tảng Quản lý Chạy bộ, Thử thách (Challenge) & Giải chạy ảo (Virtual Race) đa nền tảng (**Android, iOS, Web**) đồng bộ với **Strava API**.

---

## 1. Tổng Quan Sản Phẩm & Định Hướng Chiến Lược

### 1.1. Tầm nhìn & Lộ trình Triển khai (Rollout Strategy)
- **Định hướng kiến trúc**: Xây dựng nền tảng theo chuẩn **Public SaaS** (tương tự *84RACE, VietRace365, iRace*), sẵn sàng mở rộng quy mô lớn, phân quyền tổ chức giải đấu và thương mại hóa.
- **Chiến lược Giai đoạn 1 (MVP - Internal First)**:
  - Triển khai trước cho **nội bộ Công ty / Câu lạc bộ** sử dụng thực tế.
  - Đầy đủ tính năng cốt lõi: Quản lý người dùng, Đội/Nhóm (Clubs/Teams), Đồng bộ Strava tự động, Tạo giải Virtual Race & Challenge, Phân tách **Target** & **Challenge Tier**, Bảng xếp hạng (Cá nhân & Đội), Sinh E-BIB & E-Certificate tự động, Quản lý đơn hàng vật phẩm (Race-kit: Áo, Huy chương, vận chuyển), Tương tác mạng xã hội (Activity Feed, Kudos, Comment, Share Card).
  - **Tạm hoãn sang Giai đoạn 2**: Tích hợp cổng thanh toán trực tuyến (VietQR/VNPay/Momo) và hệ thống Voucher/Coupon giảm giá phức tạp (Giai đoạn 1 hỗ trợ đăng ký miễn phí hoặc xác nhận kích hoạt thủ công/danh sách nội bộ).

---

## 2. Kiến Trúc Công Nghệ (Full-Stack TypeScript Monorepo)

Hệ thống sử dụng kiến trúc **Turborepo Monorepo** giúp chia sẻ 100% kiểu dữ liệu (TypeScript interfaces), logic kiểm tra quy tắc giải đấu (Validation schemas - Zod), và các hàm tính toán Pace/Splits giữa Backend, Web và Mobile.

### Cấu trúc thư mục Monorepo (`TOPRunAssistant`)
```text
TOPRunAssistant/
├── apps/
│   ├── api/                 # NestJS Backend (REST API, BullMQ Workers, Strava Sync, Scoring Engine)
│   ├── web/                 # Next.js 15 (Runner Web App + Admin/Organizer Portal)
│   └── mobile/              # React Native (Expo) cho iOS & Android
├── packages/
│   ├── database/            # Prisma Schema, Migrations, Seeders (PostgreSQL)
│   ├── shared/              # Shared TypeScript Types, Zod Schemas, Rule Validators, Pace Formatters
│   └── config/              # ESLint, TypeScript, Tailwind configs dùng chung
├── docker/
│   └── docker-compose.yml   # PostgreSQL, Redis, MinIO (S3 Local)
└── docs/                    # Tài liệu kiến trúc, API Specs và Prompts
```

---

## 3. Phân Tích Nghiệp Vụ Cốt Lõi (Core Domain Logic)

### 3.1. Quản lý Tài khoản & Liên kết Strava (Auth & Strava Link)
1. **Đăng nhập độc lập**: Người dùng đăng nhập qua **Google, Apple ID hoặc Email/Password** (JWT Access Token + Refresh Token). Việc tách tài khoản gốc khỏi Strava giúp user không bị mất lịch sử giải đấu nếu đổi tài khoản Strava hoặc tải file GPX thủ công.
2. **Liên kết Strava (Connect Strava)**:
   - Trong trang Hồ sơ / Cài đặt, user bấm **"Kết nối Strava"** -> Chuyển hướng OAuth2 (`scope=read,activity:read_all`).
   - Lưu `strava_athlete_id`, `access_token`, `refresh_token`, và `expires_at` vào bảng `StravaConnection`.
   - Cơ chế **Auto-Refresh Token**: Trước mỗi lần gọi Strava API lấy chi tiết buổi chạy, nếu `expires_at` còn dưới 5 phút, Worker tự động làm mới token.

### 3.2. Đồng bộ Tracklog từ Strava & Xử lý GPX/TCX
1. **Strava Webhook API (Real-time)**:
   - Khi Runner hoàn thành buổi chạy trên đồng hồ (Garmin, Coros, Apple Watch) hoặc app Strava -> Strava bắn sự kiện `aspect_type: create | update | delete` (`object_type: activity`) tới `POST /api/v1/webhooks/strava`.
   - Server trả về `200 OK` ngay lập tức (dưới 200ms) và đẩy sự kiện vào hàng đợi **BullMQ (`strava-sync-queue`)**.
   - **Rate Limit Protection**: Strava giới hạn 100 requests / 15 phút và 1.000 requests / ngày (mặc định). BullMQ được cấu hình `limiter` để điều tiết tốc độ gọi API `GET /activities/{id}` và `GET /activities/{id}/streams`, đảm bảo không bao giờ bị lỗi `429 Too Many Requests`.
2. **Upload GPX / TCX thủ công & Nút "Đồng bộ lại" (Manual Sync)**:
   - Hỗ trợ user tải file `.gpx` / `.tcx` (hệ thống parse XML lấy tọa độ GPS, thời gian, nhịp tim, độ cao để tự tính Splits).
   - Nút **"Sync thủ công 7 ngày gần nhất"** phòng trường hợp Strava Webhook bị trễ.

### 3.3. Phân tách "Virtual Race" vs "Challenge" & Mô hình 2 Tầng Giải Thưởng (Target vs Challenge Tier)

| Tiêu chí | Giải chạy ảo (Virtual Race) | Thử thách (Mini Challenge) |
| :--- | :--- | :--- |
| **Quyền tạo** | Chỉ **Admin** hoặc **Organizer (Ban tổ chức)** được cấp quyền | **Mọi User** có thể tạo cho nhóm, phòng ban, bạn bè |
| **Vật phẩm & Chứng nhận** | Có **E-BIB**, **E-Certificate**, **Huy chương vật lý (Medal)**, **Áo (Race-kit)**, Ship COD/GHTK | Huy hiệu điện tử (**Digital Badge**), Bảng xếp hạng nhóm |
| **Đội nhóm (Teams)** | Hỗ trợ chia Đội/Phòng ban/CLB thi đấu (Team Leaderboard) | Cá nhân hoặc Nhóm nhỏ |

#### Mô hình 2 Mốc trong cùng một Giải đấu (Dual-Goal Architecture):
1. **🎯 Mốc TARGET (Mục tiêu Cơ bản - Finisher Goal)**:
   - Là cự ly đăng ký chính thức của vận động viên (Ví dụ: Đăng ký hạng mục **50km**, **100km** trong tháng, hoặc chạy 1 lần **21km Half Marathon**).
   - **Quyền lợi khi đạt Target**: Được công nhận là **Finisher**, mở khóa **E-Certificate (Giấy chứng nhận hoàn thành)** và đủ điều kiện nhận **Finisher Medal / Race-kit**.
2. **🏆 Mốc CHALLENGE (Thử thách Mở rộng - Award / Tiered Goal)**:
   - Là các mốc thử thách nâng cao nằm trong cùng giải đấu dành cho những người muốn bứt phá sau khi (hoặc song song khi) đạt Target.
   - Bao gồm:
     - **Over-achievement Tiers (Mốc vượt ngưỡng)**: Ví dụ Target là 50km, nhưng đạt mốc Challenge Bạc (100km), Vàng (150km), Kim Cương (250km) sẽ nhận thêm **Award/Badge đặc biệt** hoặc quà tặng bậc cao.
     - **Sub-Challenges / Nhiệm vụ phụ**: Chuỗi ngày chạy liên tiếp (Streak 7 ngày), hoàn thành 1 buổi Long Run cuối tuần > 15km, hoặc Đua Top Bảng xếp hạng (Top 1, 2, 3 chung cuộc / theo lứa tuổi / theo giới tính).

### 3.4. Hệ thống Quy tắc Nâng cao (Rule Engine) & Chống Gian Lận Từng Km (Split-Level Anti-Cheat)
1. **Lọc cấp độ Hoạt động (Activity-Level Filter)**:
   - Loại bỏ nếu `manual == true` (nhập tay trên Strava không có GPS).
   - Loại bỏ nếu `type` không nằm trong danh sách cho phép của giải (`Run`, `TrailRun`, `VirtualRun`).
   - Kiểm tra trùng lặp thời gian (Overlapping activities).
   - Kiểm tra ngưỡng **Cadence (Guồng chân)** trung bình hoặc **Heart Rate** hoặc **Elevation Gain**.
2. **Lọc cấp độ Từng Km (Split-Level Filtering - Chống gian lận thông minh)**:
   - Duyệt mảng `splits_metric` (từng đoạn 1.000m từ Strava):
   - Với mỗi Split $i$: Kiểm tra `min_pace_sec <= Split Pace <= max_pace_sec` (Ví dụ: Pace hợp lệ từ `03:00/km` đến `15:00/km`).
   - **Nếu Split vi phạm** (VD: km cuối có pace `01:45/km` do quên tắt Strava khi lên xe máy): Đánh dấu Split đó là `INVALID_FAST_PACE`, **loại bỏ km đó**, nhưng **vẫn giữ lại và cộng điểm cho các km hợp lệ trước đó**.
   - Gắn cờ `FLAGGED_FOR_REVIEW` nếu có dấu hiệu bất thường để Admin kiểm duyệt.
3. **Cơ chế Báo cáo Cộng đồng (Community Flag/Report) & Admin Duyệt tay**:
   - Người chơi trong giải có thể bấm **"Báo cáo (Report)"** một tracklog nghi vấn trên Bảng xếp hạng kèm lý do.
   - Admin có giao diện xem trực quan đường chạy (Polyline), biểu đồ Pace/HR từng km để quyết định: **Approve**, **Sửa số km hợp lệ**, hoặc **Reject**.

### 3.5. Hiển thị Bản đồ (Tracklog Visualization) & Tính năng "Share Card"
- **Bản đồ tương tác**: Giải mã `summary_polyline` / `polyline` từ Strava hiển thị trên nền **MapLibre GL / Mapbox / OpenStreetMap**.
- **Biểu đồ chuyên sâu**: Biểu đồ cột ngang cho **Splits từng km** (hiển thị rõ km hợp lệ màu xanh, km bị loại màu đỏ), biểu đồ đường cho **Nhịp tim (HR)** và **Độ cao (Elevation)**.
- **Share Card Generator**: Ghép lớp (overlay) đường vẽ GPS Polyline, Quãng đường, Pace, Thời gian, Logo Giải đấu & Tiến độ Target/Challenge lên ảnh chụp để chia sẻ Facebook, Zalo, Instagram.

### 3.6. Quản lý Vật phẩm (Race-kit Fulfillment), E-BIB & E-Certificate
- **E-BIB tự động**: Sinh số BIB theo quy tắc giải (VD: `TOP-21K-00128`) và render ảnh E-BIB ngay khi đăng ký.
- **E-Certificate tự động**: Render Giấy chứng nhận điện tử ngay khi `is_target_completed == true`.
- **Quản lý Race-kit & Vận chuyển**: Chọn Size áo, khắc tên huy chương, địa chỉ nhận hàng; Admin xuất Excel giao hàng (GHTK/GHN/ViettelPost) và cập nhật mã vận đơn (`tracking_code`).

---

## 4. Bộ Prompt Thực Thi Chi Tiết (Master Prompts cho từng Phase)

### Prompt 1 — Khởi tạo Monorepo, Docker & Database Schema (Phase 1)
> Hãy đóng vai Principal Full-Stack Architect. Dựa trên tài liệu Master Plan của dự án **TOPRunAssistant**, hãy thực hiện **Phase 1: Monorepo Foundation, Shared Rules & Database Schema**:
> 1. **Cấu trúc Monorepo (Turborepo + pnpm)**: Khởi tạo workspace tại thư mục gốc gồm: `apps/api` (NestJS), `apps/web` (Next.js 15 App Router), `apps/mobile` (Expo React Native), `packages/database` (Prisma), và `packages/shared` (TypeScript types, Zod schemas, Utils).
> 2. **Hạ tầng Local (`docker-compose.yml`)**: Cấu hình PostgreSQL 16, Redis 7 (cho BullMQ & Leaderboard cache), và MinIO (S3-compatible storage cho E-BIB, E-Cert, GPX files).
> 3. **Thiết kế Prisma Schema (`packages/database/prisma/schema.prisma`)**: Cài đặt đầy đủ các bảng: `User`, `StravaConnection`, `Club`, `ClubMember`, `Activity`, `ActivitySplit`, `ActivityReport`, `ActivityKudo`, `ActivityComment`, `Event`, `EventCategory` (Mốc Target), `EventChallengeTier` (Mốc Challenge mở rộng), `EventTeam`, `EventParticipation`, `ParticipationActivityLog`, `ParticipationAward`, `RaceKitOrder`, `Notification`.
> 4. **Thư viện dùng chung (`packages/shared`)**: Viết hàm tiện ích chuyển đổi Pace (`sec/km` <-> `"mm:ss /km"`), giải mã Google Polyline, và bộ hàm thuần túy `evaluateActivitySplits(activity, eventRules)` để kiểm tra hợp lệ từng km (Split-level filtering) và tính hệ số nhân, kèm Unit Test.

### Prompt 2 — Backend Auth, Strava OAuth2, Webhook & GPX Parser (Phase 2)
> Tiếp tục thực hiện **Phase 2: Backend Core, Authentication & Strava Synchronization Engine** trong `apps/api` (NestJS):
> 1. **Module Authentication (`AuthModule`)**: Hỗ trợ đăng ký/đăng nhập bằng Email/Password và Google/Apple OAuth2, trả về JWT Access Token & Refresh Token. Phân quyền Role-based Guards: `RUNNER`, `ORGANIZER`, `ADMIN`.
> 2. **Module Liên kết Strava (`StravaModule`)**: Endpoint tạo URL OAuth2 (`read,activity:read_all`), Callback đổi `code` lấy token lưu vào `StravaConnection`, và cơ chế Auto-Refresh Token.
> 3. **Strava Webhook & BullMQ Queue (`StravaWebhookController` & `StravaSyncProcessor`)**:
>    - `GET /api/v1/webhooks/strava` xác thực `hub.challenge` và `POST /api/v1/webhooks/strava` nhận sự kiện real-time, đẩy job vào BullMQ `strava-sync`.
>    - Cấu hình Rate Limiter trên BullMQ (tối đa 80 requests / 15 phút) để gọi Strava API `GET /activities/:id` lấy đầy đủ `splits_metric`, `map.polyline`, `average_heartrate`, `average_cadence`.
>    - Thêm endpoint Sync thủ công 7 ngày gần nhất và Upload file GPX/TCX.

### Prompt 3 — Rule Engine, Dual-Goal (Target vs Challenge), BXH & E-BIB/E-Cert (Phase 3)
> Thực hiện **Phase 3: Scoring Engine, Dual-Goal Progression (Target vs Challenge), Anti-Cheat & Certificate Generator** trong `apps/api`:
> 1. **Scoring & Split-Level Anti-Cheat Engine (`ScoringService`)**:
>    - Duyệt từng `ActivitySplit`: Loại bỏ các km có `pace_sec < min_pace_sec` hoặc `pace_sec > max_pace_sec`. Cộng tổng các km hợp lệ thành `valid_raw_distance_km`.
>    - Áp dụng hệ số nhân (VD: ngày Thứ 7/Chủ nhật nhân `weekend_multiplier`) để ra `final_distance_km` và ghi vào `ParticipationActivityLog`.
> 2. **Cập nhật Tiến độ 2 Tầng (Target vs Challenge Tiers)**:
>    - **Tầng Target**: Khi đạt 100% `target_distance_km` của `EventCategory`, đánh dấu `is_target_completed = true`, chuyển `RaceKitOrder` sang `QUALIFIED_FINISHER` và sinh **E-Certificate**.
>    - **Tầng Challenge (Awards)**: Kiểm tra tất cả `EventChallengeTier` (Mốc vượt ngưỡng 100km/150km, Streak ngày liên tiếp, Long Run). Nếu đạt, trao huy hiệu vào `ParticipationAward` và bắn Push Notification.
> 3. **Bảng xếp hạng (Leaderboard) & E-BIB/E-Cert**: API lấy BXH Cá nhân & Đội/CLB, tự động render ảnh E-BIB và E-Certificate.

### Prompt 4 — Web Application & Admin/Organizer Portal (Phase 4)
> Thực hiện **Phase 4: Web Runner App & Admin/Organizer Portal** trong `apps/web` (Next.js 15 App Router, TailwindCSS, Shadcn UI):
> 1. **Khu vực Dành cho Runner**: Trang chủ, Chi tiết Giải đấu (Đăng ký chọn Target, chọn Đội, đặt size áo Race-kit, nhận E-BIB, xem thanh tiến trình kép Target vs Challenge, BXH trực tiếp), Chi tiết Tracklog (Bản đồ MapLibre GL vẽ Polyline, biểu đồ Splits từng km xanh/đỏ, HR, Elevation, nút Report), và Hồ sơ Tủ Huy Chương (`Trophy Case` + Connect Strava).
> 2. **Cổng Quản trị Admin & Organizer (`/admin/*`)**: Trình tạo Giải đấu (Event Builder cấu hình Target, Challenge Tiers, Rule Anti-cheat), Trung tâm Kiểm duyệt Chống gian lận (Moderation Queue xem bản đồ & duyệt/hủy km), và Quản lý Đơn hàng Race-kit (xuất Excel giao hàng, cập nhật mã vận đơn).

### Prompt 5 — Mobile App iOS & Android + Share Card Generator (Phase 5 & 6)
> Thực hiện **Phase 5 & 6: Mobile App (iOS & Android) & Share Card Generator** trong `apps/mobile` (React Native - Expo Router):
> 1. **5 Bottom Tabs**: Home (Activity Feed, Kudos, Comment), Events (Tham gia Virtual Race, tạo Mini Challenge, xem tiến độ Target/Challenge & BXH), Tracklog/Sync (Đồng bộ Strava, upload GPX, thống kê tuần/tháng), Clubs (Đội/Phòng ban), và Profile (Tủ huy chương, E-BIB, E-Cert, trạng thái giao hàng Race-kit).
> 2. **Chi tiết Tracklog & Share Card (`ShareCardModal`)**: Vẽ bản đồ Polyline, biểu đồ Splits từng km, và tính năng ghép thông số chạy + đường vẽ GPS Polyline + huy hiệu lên ảnh để chia sẻ Facebook/Zalo/Instagram.
> 3. **Push Notifications (`expo-notifications`)**: Thông báo đẩy ngay khi Strava đồng bộ xong và khi đạt mốc Target/Challenge.

