---
name: ui-ux-pro-max
description: >-
  Design intelligence and system architecture skill for building NEW pages, new
  mobile screens, telemetry charts, leaderboards, E-BIB/E-Certificate layouts,
  and page-level design specs in TOPRunAssistant. Activate when creating new
  frontend features or expanding the design system in apps/web or apps/mobile.
---

# UI/UX Pro Max — Athletic & Running Platform Design System Skill

Use this skill whenever you are **designing or building a new screen, page, dashboard section, chart, or component** in `apps/web` (Next.js 15 + Tailwind CSS) or `apps/mobile` (React Native / Expo).

> **Note:** If you are auditing, critiquing, or polishing *existing* UI components to remove visual defects or "AI slop", use the `impeccable` skill instead.

---

## 1. Hierarchical Design System Lookup (Mandatory First Step)

Before generating any JSX/TSX or styling:

1. **Read the Master Design System:**
   - Open [design-system/toprunassistant/MASTER.md](../../../design-system/toprunassistant/MASTER.md).
2. **Check for Page-Specific Overrides:**
   - Check if `design-system/toprunassistant/pages/<page-name>.md` exists.
   - If it exists, its layout and component rules override `MASTER.md`.
   - If the user asks to persist a new page design (`--persist`), create or update `design-system/toprunassistant/pages/<page-name>.md`.
3. **Consult Athletic Pattern Reference (On Demand):**
   - For specialized sports widgets (Splits bar chart, Dual-Goal Target vs Challenge cards, Leaderboard podiums, GPS Polyline maps, Share Cards), read [references/athletic-ui-patterns.md](./references/athletic-ui-patterns.md).

---

## 2. Priority Rules When Architecting New UI

Follow these 5 priorities in strict order:

1. **Accessibility & Outdoor Readability (WCAG 2.2 AA+):**
   - Contrast ratio >= `4.5:1` for body text and >= `7:1` for primary running metrics (Distance, Pace, Duration) in both Dark Mode (`slate-950`) and Light Mode (`slate-50`).
   - All interactive controls must have visible keyboard focus rings (`focus-visible:ring-2 focus-visible:ring-[#FC4C02]`) and minimum touch targets of `44x44px` on Mobile.
2. **Numeric Telemetry Precision (`tabular-nums`):**
   - Every numeric running metric (Pace `mm:ss /km`, Distance `0.00 km`, Split time, Heart Rate `bpm`, Cadence `spm`, Leaderboard rank/points, BIB number) MUST use `font-mono tabular-nums`.
3. **Brand & Semantic Color Discipline:**
   - Primary Brand / CTA: **Strava Orange (`#FC4C02`)**, hover `#E34402`.
   - Tier 1 Finisher Target: **Sky Blue (`#0EA5E9`)** or Brand Orange.
   - Split-level Anti-Cheat states: **Emerald (`#10B981`)** for valid km, **Amber (`#F59E0B`)** for flagged/weekend `x2`, **Red/Rose (`#EF4444`)** for invalid fast/vehicle splits.
4. **Component Modularity (Ponytail Alignment):**
   - Never inline a new 300-line tab or modal into `apps/web/src/app/page.tsx`. Create a dedicated component in `apps/web/src/components/` or `apps/mobile/components/`.
5. **Micro-Interactions & States:**
   - Every data-fetching view must design 4 explicit states: **Loading (Skeleton/Shimmer)**, **Empty State (with clear CTA like "Kết nối Strava" or "Tải lên GPX")**, **Populated State**, and **Inline Error Banner** (never browser `alert()`).

