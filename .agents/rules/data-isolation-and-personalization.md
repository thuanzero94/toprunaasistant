# Data Isolation, Zero-Fallback & Personalization Rule

> **Mandatory Rule:** In TOPRunAssistant, every runner's data (Profile, Strava Connections, Access Tokens, Tracklogs, Splits, Event Participations, BIBs, Race-Kit Orders, and Dual-Goal Progress) is strictly private, tenant-isolated, and personalized. Under NO circumstances may one user's credentials, tokens, activities, or stats be shared, leaked, or fallen back to another user (especially Admin).

---

## 1. The Zero-Fallback Principle (Tuyệt đối không Fallback ngầm)

1. **No Shared or Fallback Tokens:**
   - Background services and sync engines MUST NEVER fallback to global `.env` tokens (such as `STRAVA_ACCESS_TOKEN`, `STRAVA_REFRESH_TOKEN`) when syncing a specific athlete.
   - Every athlete's live sync (`syncLiveStravaActivities`) MUST resolve their own access/refresh token from `prisma.stravaConnection`.
   - If an athlete has not linked Strava or their token is missing/expired, the engine MUST fail gracefully with `status: 'NOT_CONNECTED'` and prompt the user to link their account. It must NEVER silently use Admin's credentials to pull data.

2. **No Singleton State Contamination:**
   - Services registered as NestJS Singletons (`TopRunEngineService`, `AccountService`) must NEVER store a specific user's `accessToken`, `refreshToken`, or `athleteId` in class instance variables (e.g., `this.stravaConfig.accessToken = ...`).
   - All authorization tokens are scoped strictly to database records in PostgreSQL (`strava_connections`).

3. **No `|| this.users[0]` or `|| 'usr_admin_01'` Fallbacks:**
   - Code patterns like `const user = this.users.find(u => u.id === userId) || this.users[0];` or `const adminId = adminUser?.id || 'usr_admin_01'` are STRICTLY FORBIDDEN.
   - If a `userId` is not found, the service must either throw `NotFoundException` or explicitly call `await this.ensureUser(userId)` to hydrate from PostgreSQL.

---

## 2. Strict User-Level Data Isolation (Cô lập Dữ liệu Người dùng)

1. **Activity Feed & Tracklogs Scope (`GET /activities`):**
   - For athletes (`role: 'RUNNER'`), the API endpoint MUST enforce `userId = req.user.userId` derived strictly from the verified JWT token (`Authorization: Bearer <token>`).
   - Runners MUST NEVER receive or view another athlete's private tracklogs, split metrics, or raw Strava activities.
   - For `role: 'ADMIN'`, queries without a specific `userId` return all activities across the platform solely for moderation, while filtering by `?userId=xxx` must only return that specific user's activities.

2. **Event Participations & Dual-Goal Progress:**
   - An athlete's tournament progress (`dualGoalProgress`, `validRawDistanceKm`, `validMultipliedDistanceKm`) MUST ONLY be calculated from activities where `activity.userId === user.id`.
   - The engine must NEVER evaluate or sum activities belonging to other runners, even within the same team or tournament category.
   - Registrations (`registerForEvent`) must check uniqueness on the compound key `(eventId, userId)` so that registering one runner never overwrites or retrieves another runner's existing participation.

---

## 3. Clean Empty States vs Demo/Seed Data (Phân định Tài khoản Thật và Seed)

1. **Real Athletes Start with Clean Slate (Zero Slop):**
   - When a new athlete registers on Web/Mobile, their tracklog count is 0 and total km is 0.
   - Under no circumstances should demo runs (e.g., 16km Sala Thủ Thiêm, 5km Hồ Tây) or Admin's runs be copied or assigned to newly registered users.
   - If a new runner has 0 runs, the UI MUST render a clean, motivating Empty State (e.g., "Chưa có bài chạy nào. Kết nối Strava hoặc tải lên file GPX để bắt đầu hành trình!").

2. **Seed Data Boundaries:**
   - Seed/demo activities created during initial bootstrap must belong strictly to dedicated demo fixtures (`usr_admin_01`, `usr_runner_02`) and MUST NEVER be transferred, merged, or dynamically reassigned to real registered accounts.

---

## 4. Script & Database Migration Guardrails (Quy tắc An toàn cho Script & Di chuyển Dữ liệu)

1. **Ban on Blind Bulk Updates:**
   - SQL queries such as `UPDATE activities SET "userId" = targetUser.id WHERE "userId" = adminId` are CATEGORICALLY BANNED. Such blind updates cause catastrophic cross-contamination of unrelated runs.
2. **Explicit External ID Matching:**
   - Any data reassignment script MUST verify ownership using the runner's unique external identifier:
     - For Strava: Query the runner's Strava API using their dedicated token to get their exact `activity.id` list (`longStravaExternalIds`).
     - Only records matching `externalId IN (runnerStravaIds)` may have their `userId` assigned to that runner.
     - All other activities must remain with their original owner.

---

## 5. Verification Checklist for New Features

Before merging or deploying any code touching activities, users, or sync:
- [ ] Does `syncLiveStravaActivities` read solely from `prisma.stravaConnection` of the requested `userId`?
- [ ] Are all `|| this.users[0]` or default admin ID fallbacks absent?
- [ ] Does `GET /activities` enforce `callerUserId = decoded.userId` for `role === 'RUNNER'`?
- [ ] When a fresh user logs in, is their tracklog strictly empty until they sync their own Strava?
- [ ] In tournament leaderboards and detail views, are BIB, Category, and Progress strictly calculated from the athlete's own matching runs?

