# 📡 Tài Liệu Đặc Tả REST API & Strava Webhook (`API_REFERENCE.md`)

Backend API chạy mặc định tại địa chỉ: `http://localhost:4000/api/v1`
Tài liệu **Swagger UI tương tác trực tiếp** tại: `http://localhost:4000/api/docs`

---

## 1. Nhóm API Liên Kết Strava & Webhook Thời Gian Thực

### 1.1. Lấy URL OAuth2 Liên Kết Tài Khoản Strava
- **Endpoint**: `GET /api/v1/strava/connect?userId=usr_admin_01`
- **Mô tả**: Trả về đường dẫn chuẩn Strava OAuth2 với quyền `read,activity:read_all`.
- **Response mẫu**:
```json
{
  "oauthUrl": "https://www.strava.com/oauth/authorize?client_id=128990&response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A4000%2Fapi%2Fv1%2Fstrava%2Fcallback&approval_prompt=auto&scope=read,activity:read_all&state=usr_admin_01",
  "scopes": ["read", "activity:read_all"]
}
```

### 1.2. Xác Thực Đăng Ký Strava Webhook (`GET`)
- **Endpoint**: `GET /api/v1/webhooks/strava?hub.mode=subscribe&hub.verify_token=TOPRUN_STRAVA_VERIFY_TOKEN_2026&hub.challenge=15f7d1a91c1f40f8a748fd134752feb3`
- **Response**:
```json
{
  "hub.challenge": "15f7d1a91c1f40f8a748fd134752feb3"
}
```

### 1.3. Nhận Sự Kiện Hoạt Động Mới Từ Strava Webhook (`POST`)
- **Endpoint**: `POST /api/v1/webhooks/strava`
- **Request Body** (do Strava Server gọi tới):
```json
{
  "object_type": "activity",
  "object_id": 1298000999,
  "aspect_type": "create",
  "owner_id": 98812345,
  "subscription_id": 202601,
  "event_time": 1761715000
}
```

### 1.4. Giả Lập Đồng Bộ Strava & Kiểm Thử Chống Gian Lận (`POST`)
- **Endpoint**: `POST /api/v1/strava/simulate-sync`
- **Request Body**:
```json
{
  "userId": "usr_admin_01",
  "scenario": "mixed_motorbike_cheat"
}
```
*(Các giá trị `scenario` hỗ trợ: `"clean_run"`, `"weekend_double"`, `"mixed_motorbike_cheat"`)*

---

## 2. Nhóm API Quản Lý Tracklog & Upload GPX

| Phương thức | Endpoint | Mô tả |
| :--- | :--- | :--- |
| `GET` | `/api/v1/activities` | Lấy danh sách toàn bộ Tracklog trên Activity Feed kèm trạng thái Anti-Cheat và Splits từng km. |
| `GET` | `/api/v1/activities/:id` | Lấy chi tiết 1 buổi chạy (chuỗi Google Polyline, Splits xanh/đỏ, nhịp tim, độ cao, đóng góp vào các giải). |
| `POST` | `/api/v1/activities/upload-gpx` | Tải nội dung XML của file `.gpx` để tự động bóc tách tọa độ GPS, chia từng đoạn 1.000m và chấm điểm. |
| `POST` | `/api/v1/activities/:id/kudos` | Thả tim (Kudos) cho một buổi chạy. |
| `POST` | `/api/v1/activities/:id/comments` | Thêm bình luận vào buổi chạy. |

---

## 3. Nhóm API Giải Chạy Ảo (Virtual Race), Thử Thách (Challenge) & BXH

| Phương thức | Endpoint | Mô tả |
| :--- | :--- | :--- |
| `GET` | `/api/v1/events` | Danh sách tất cả giải Virtual Race & Mini Challenge kèm cấu hình `ruleConfig`, `categories` (Target) và `challengeTiers` (Awards). |
| `GET` | `/api/v1/events/:idOrSlug` | Chi tiết giải đấu + **Bảng xếp hạng Cá nhân (`individualLeaderboard`)** + **Bảng xếp hạng Đội/Phòng ban (`teamLeaderboard`)**. |
| `POST` | `/api/v1/events` | Tạo giải đấu mới (cấu hình ngưỡng Pace min/max, hệ số nhân cuối tuần, danh sách Mốc Target & Mốc Challenge). |
| `POST` | `/api/v1/events/:id/register` | Đăng ký tham gia giải: Chọn hạng mục Target, chọn Đội, chọn Size áo Race-kit & sinh mã số **E-BIB** tức thì. |

---

## 4. Nhóm API Hồ Sơ VĐV, Tủ Huy Chương & Quản Trị Admin

| Phương thức | Endpoint | Mô tả |
| :--- | :--- | :--- |
| `GET` | `/api/v1/users/:userId/profile` | Lấy Hồ sơ VĐV, thống kê PR (5K, 10K, 21K, 42K) và **Tủ Huy Chương (`trophyCase`)** chứa ảnh SVG của **E-BIB**, **E-Certificate** và các Huy hiệu Challenge đã mở khóa. |
| `GET` | `/api/v1/admin/moderation-queue` | **[Admin]** Lấy danh sách các Tracklog bị cắt Split quá tốc độ (`PARTIAL_VALID`) hoặc nghi vấn gian lận (`FLAGGED`). |
| `PATCH` | `/api/v1/admin/activities/:id/moderate` | **[Admin]** Phê duyệt (`APPROVE_VALID`), điều chỉnh số km hợp lệ (`ADJUST_DISTANCE`), hoặc hủy bỏ (`REJECT_ALL`) một buổi chạy. |
| `GET` | `/api/v1/admin/race-kit-orders` | **[Admin]** Danh sách đơn hàng Áo & Huy chương kèm trạng thái hoàn thành Target (`QUALIFIED_FINISHER`). |
| `PATCH` | `/api/v1/admin/race-kit-orders/:participationId` | **[Admin]** Cập nhật đơn vị vận chuyển (`GHTK`, `GHN`, `ViettelPost`) và mã vận đơn (`trackingCode`). |

