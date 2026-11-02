# Athletic UI Patterns Reference — TOPRunAssistant

## 1. Dual-Goal Progress Architecture (Target vs Challenge Tiers)

When rendering race progress on Web or Mobile, visually separate the two tiers:

- **Tier 1 — Target (Finisher Goal):**
  - Header badge: `🎯 MỤC TIÊU TARGET (FINISHER)`
  - Large hero metric in `font-mono tabular-nums`: e.g. `42.50 / 50.00 KM (85%)`
  - Primary progress bar (`h-3 rounded-full bg-slate-800` with fill `bg-sky-500` or `bg-[#FC4C02]`).
  - Unlock callout: Shows whether **E-Certificate** and **Finisher Medal / Race-kit** are unlocked (`isTargetCompleted`).
- **Tier 2 — Challenge Tiers (Over-achievement & Sub-challenges):**
  - Grid of milestone cards (`Silver 100K`, `Gold 150K`, `Diamond 250K`, `5-Day Streak`, `Long Run >= 15K`).
  - Each card displays its tier badge color, current progress ratio, and unlocked status.

---

## 2. Split-Level Anti-Cheat Visualization (`splits_metric`)

`TOPRunAssistant` filters cheating per kilometer rather than discarding the entire run. The UI must make this crystal clear:

- **Summary Strip:**
  - `Tổng quãng đường gốc (Raw)` -> `Km hợp lệ (Valid)` -> `Km nhân hệ số (Final x1 / x2)`.
- **Per-Kilometer Split Table / Horizontal Bar Chart:**
  - Columns: `KM` (`#1, #2...`), `Pace Thanh Biểu Đồ`, `Pace (mm:ss/km)`, `Nhịp tim / Guồng chân`, `Trạng thái`.
  - Bar width proportional to speed (or normalized against average pace), colored `#10B981` for valid splits and `#EF4444` for splits violating `minPaceSecPerKm` / `maxPaceSecPerKm`.
  - Invalid rows must show a clear badge: `Loại bỏ (< 03:00/km - Nghi vấn phương tiện)`.

---

## 3. Leaderboard (Individual & Club/Team)

- **Top 3 Podium Cards:** Highlight Rank 1 (Gold `#FBBF24`), Rank 2 (Silver `#CBD5E1`), Rank 3 (Bronze `#D97706`) with avatar, BIB badge, valid km, and average pace.
- **Data Table:** Sticky header, right-aligned numeric columns (`font-mono tabular-nums`), current user row highlighted (`bg-[#FC4C02]/10 border-l-4 border-[#FC4C02]`), and a subtle `"Báo cáo (Report)"` action button for community anti-cheat moderation.

---

## 4. E-BIB, E-Certificate & Share Card Overlays

- **E-BIB Card:** Aspect ratio `4:3`, high-contrast race header, oversized `font-mono font-extrabold tracking-tight` BIB number (e.g. `TOP-21K-00128`), Runner Name, Club/Department, and Category pill.
- **Share Card (Social Overlay):** `1:1` or `9:16` canvas combining dark gradient scrim, GPS SVG Polyline (`#FC4C02`), 3 core stats (`Distance`, `Pace`, `Time`), and Event Finisher badge.

