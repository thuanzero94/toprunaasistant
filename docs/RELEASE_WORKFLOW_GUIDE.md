# 🏷️ Quy Trình Quản Lý Phiên Bản & Tự Động Hóa Release Với `agy` CLI

Tài liệu quy chuẩn kỹ thuật cho quy trình phát hành phiên bản (**Release Workflow**), đánh số phiên bản lịch (**CalVer**) và tự động hóa tổng hợp Release Notes thông minh bằng **Antigravity CLI (`agy`)** trong nền tảng **TOPRunAssistant**.

---

## 1. Tổng Quan Kiến Trúc Quy Trình Release

```
               ┌────────────────────────────────────────────────────────┐
               │ 1. Git Inspection & Version Resolution                 │
               │    - Lấy tag gần nhất (VD: v26.11.0) hoặc Initial      │
               │    - Tự động tính CalVer YY.MM.Ver (VD: 26.11.1)       │
               │    - Kiểm tra tính hợp lệ của Git Working Tree         │
               └───────────────────────────┬────────────────────────────┘
                                           │
                                           ▼
               ┌────────────────────────────────────────────────────────┐
               │ 2. Thu Thập Commits (Range: latestTag..HEAD)           │
               │    - Trích xuất hash, commit message, author           │
               └───────────────────────────┬────────────────────────────┘
                                           │
                                           ▼
               ┌────────────────────────────────────────────────────────┐
               │ 3. Tổng Hợp Changelog Bằng AI (agy CLI)                │
               │    - Chạy agy --print với prompt kỹ thuật chuyên sâu   │
               │    - Phân loại: Features, Fixes, Perf, Refactor, Chores│
               │    - Fallback Engine: Regex Conventional Commits       │
               └───────────────────────────┬────────────────────────────┘
                                           │
                                           ▼
               ┌────────────────────────────────────────────────────────┐
               │ 4. Đồng Bộ Monorepo & Ghi File                         │
               │    - Chèn phiên bản mới vào đầu CHANGELOG.md           │
               │    - Cập nhật version trong root package.json          │
               │    - Cập nhật 5 workspaces: apps/*, packages/*         │
               └───────────────────────────┬────────────────────────────┘
                                           │
                                           ▼
               ┌────────────────────────────────────────────────────────┐
               │ 5. Tự Động Hóa Git & Phân Phối                         │
               │    - git commit -m "chore(release): vYY.MM.Ver"        │
               │    - git tag -a "vYY.MM.Ver" -m "Release vYY.MM.Ver"   │
               │    - git push origin <branch> --tags                   │
               └────────────────────────────────────────────────────────┘
```

---

## 2. Quy Chuẩn Đánh Số Phiên Bản (CalVer: `YY.MM.Ver`)

TOPRunAssistant sử dụng hệ thống đánh số phiên bản theo lịch (**Calendar Versioning - CalVer**) kết hợp thứ tự bản phát hành trong tháng:

$$\text{Format: } \mathbf{YY.MM.Ver}$$

- **`YY`**: 2 chữ số cuối của năm hiện tại (Ví dụ: `26` cho năm 2026).
- **`MM`**: 2 chữ số của tháng hiện tại (Ví dụ: `01`, `02`, ..., `11`, `12`).
- **`Ver`**: Thứ tự phiên bản phát hành trong tháng đó (Bắt đầu từ `0`, tăng dần: `0`, `1`, `2`, ...).

### Quy tắc chuyển đổi:
1. **Bản phát hành đầu tiên trong tháng mới**: Tự động đặt là `YY.MM.0` (Ví dụ: `26.11.0` hoặc bước sang tháng 12 là `26.12.0`).
2. **Các bản phát hành tiếp theo cùng tháng**: Tự động tăng phần `Ver` (Ví dụ: `26.11.0` $\rightarrow$ `26.11.1` $\rightarrow$ `26.11.2`).
3. **Chỉ định thủ công**: Người dùng có thể truyền trực tiếp số version mong muốn qua đối số CLI: `npm run release -- 26.11.5`.

---

## 3. Tổng Hợp Release Notes Tự Động Bằng `agy` CLI

Script phát hành (`scripts/release.ts`) đọc toàn bộ lịch sử commit kể từ git tag liền trước (hoặc từ commit khởi tạo nếu là lần release đầu tiên), sau đó chuyển giao cho `agy` CLI xử lý:

### Cấu Trúc Các Nhóm Mục Trong Changelog:
- **🚀 Features**: Các tính năng mới dành cho vận động viên, ban tổ chức giải hoặc quản trị viên.
- **🐛 Bug Fixes**: Các bản vá lỗi, sửa sai thuật toán split hoặc tính toán thời gian chạy.
- **⚡ Performance & Optimization**: Tối ưu tốc độ xử lý tracklog, nén ảnh, truy vấn cơ sở dữ liệu.
- **♻️ Refactoring & Code Quality**: Tái cấu trúc mã nguồn, chuẩn hóa component, tuân thủ nguyên tắc Ponytail.
- **⚠️ Breaking Changes**: Các thay đổi có thể ảnh hưởng đến tương thích API hoặc cấu trúc dữ liệu.
- **📝 Documentation & Chores**: Cập nhật tài liệu, nâng cấp dependencies, tinh chỉnh script hệ thống.

### Cơ Chế An Toàn (Zero-Failure Fallback):
Nếu `agy` CLI không phản hồi, bị timeout ($> 120\text{s}$) hoặc không tìm thấy binary trong môi trường CI/CD, script tự động kích hoạt **Bộ phân tích Regex Conventional Commits** tích hợp sẵn. Quy trình release **luôn luôn thành công** và không bao giờ bị gián đoạn.

---

## 4. Hướng Dẫn Sử Dụng Chi Tiết

### Cách 1: Chạy Thử Nghiệm Xem Trước (Khuyên Dùng Trước Khi Release Thật)
Để kiểm tra phiên bản dự kiến, xem nội dung Changelog do AI sinh ra và danh sách file sẽ được cập nhật mà **không làm thay đổi code hay Git**:
```bash
# Qua npm script
npm run release -- --dry-run

# Hoặc qua PowerShell script
.\scripts\release.ps1 --dry-run
```

### Cách 2: Tự Động Đề Xuất & Xác Nhận Phiên Bản (Quy Trình Chuẩn)
```bash
npm run release
```
*Script sẽ hiển thị version đề xuất (VD: `26.11.1`). Nhấn Enter để đồng ý hoặc nhập version tùy chỉnh.*

### Cách 3: Chỉ Định Trực Tiếp Phiên Bản
```bash
npm run release -- 26.11.1
```

### Cách 4: Các Tùy Chọn Nâng Cao (Flags)

| Cờ (Flag) | Tác dụng | Trường hợp sử dụng |
| :--- | :--- | :--- |
| `--dry-run` | Chạy mô phỏng, xem trước changelog, không ghi file/git | Kiểm tra nội dung release notes trước khi công bố |
| `--skip-push` | Tạo commit và tag cục bộ, không đẩy lên remote GitHub | Cần kiểm tra lại tag cục bộ trước khi push |
| `--allow-dirty` | Cho phép chạy release ngay cả khi git còn file uncommitted | Môi trường thử nghiệm / phát triển cục bộ |
| `-h`, `--help` | Hiển thị hướng dẫn sử dụng và danh sách các cờ | Tra cứu cú pháp nhanh |

---

## 5. Danh Sách Tệp Tự Động Cập Nhật Trong Monorepo

Mỗi lần chạy release thành công, script sẽ tự động đồng bộ số phiên bản mới vào:

1. 📄 `CHANGELOG.md` (Thư mục gốc — chèn bản phát hành mới nhất lên đầu trang)
2. 📦 `package.json` (Root Monorepo manifest)
3. 📦 `apps/api/package.json` (Backend NestJS)
4. 📦 `apps/mobile/package.json` (Mobile App Expo/React Native)
5. 📦 `apps/web/package.json` (Web App Next.js 15)
6. 📦 `packages/database/package.json` (Prisma ORM & PostgreSQL Client)
7. 📦 `packages/shared/package.json` (Thư viện dùng chung Anti-cheat & Dual-goal)

---

## 6. Quy Trình Đồng Bộ Lên Server Production Sau Release

Sau khi bản release đã được gắn tag và đẩy lên GitHub (`git push origin main --tags`), bạn có thể deploy lên máy chủ VPS Production:

```bash
# Truy cập vào thư mục dự án trên VPS
cd /opt/TOPRunAssistant

# Kéo mã nguồn mới nhất từ nhánh main
git pull origin main

# Cập nhật Web Frontend không downtime (nếu chỉ thay đổi giao diện)
./manage.sh reload

# Hoặc cập nhật toàn diện cả API, DB Schema và Web:
./manage.sh restart
```

---

## 7. Xử Lý Sự Cố Thường Gặp (Troubleshooting)

### 1. Lỗi: `Git working tree has uncommitted changes!`
- **Nguyên nhân**: Bạn còn các file đang chỉnh sửa dở dang chưa được commit.
- **Giải pháp**: 
  - Cách 1: Chạy `git add . && git commit -m "feat/fix: ..."` trước khi release.
  - Cách 2: Nếu muốn bỏ qua, thêm cờ `--allow-dirty`: `npm run release -- --allow-dirty`.

### 2. Lỗi: `Git tag "vXX.YY.Z" already exists!`
- **Nguyên nhân**: Tag này đã được tạo trước đó trên máy hoặc trên remote.
- **Giải pháp**: Truyền một số phiên bản cao hơn: `npm run release -- 26.11.2`.

### 3. Lỗi: `agy CLI execution returned empty or non-zero exit code`
- **Nguyên nhân**: CLI `agy` bị quá tải hoặc chưa được nạp vào PATH hệ thống.
- **Hành vi hệ thống**: Script tự động kích hoạt bộ **Conventional Commits fallback**, không làm ngắt quãng phiên bản release. Changelog vẫn được nhóm đầy đủ theo các mục Features, Bug Fixes, Chores.

