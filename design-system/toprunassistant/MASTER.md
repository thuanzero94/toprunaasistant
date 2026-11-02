# Design System Master File — TOPRunAssistant

> **HIERARCHICAL LOGIC (UI/UX Pro Max & Impeccable Shared Source of Truth):**
> 1. When building or auditing a specific page/screen, first check `design-system/toprunassistant/pages/[page-name].md`.
> 2. If that page file exists, its layout/component rules **override** this Master file.
> 3. Otherwise, strictly follow the global tokens, typography, and athletic telemetry rules below.
> 4. For product context, domain personas, and anti-slop philosophy, see [PRODUCT.md](../../PRODUCT.md).

---

**Project:** TOPRunAssistant
**Updated:** 2026-11-02
**Category:** Athletic / Running Management, Virtual Race & Strava Telemetry Platform (Web + iOS/Android)
**Aesthetic Direction:** High-Contrast Athletic Performance (Strava-inspired Energetic Orange + Precision Telemetry Monospace + Dual Light/Dark Mode)

---

## 1. Global Color Tokens (Dual Theme: Light & Dark Mode)

`TOPRunAssistant` uses `darkMode: 'class'` in Tailwind CSS (`apps/web`) and adaptive athletic themes on Mobile (`apps/mobile`). Never hardcode random greys or generic AI purple/indigo gradients.

### Brand & Semantic Accents

| Role | Token / Tailwind | Hex | Usage |
| :--- | :--- | :--- | :--- |
| **Brand Primary (Strava Orange)** | `strava` / `--color-brand` | `#FC4C02` | Primary CTAs, Strava Sync buttons, active route polylines, Target progress highlights |
| **Brand Primary Hover** | `strava-hover` | `#E34402` | Hover/active state for primary brand buttons |
| **Brand Tint Surface** | `strava-light` | `#FFF3EE` (Light) / `rgba(252,76,2,0.12)` (Dark) | Subtle badge backgrounds, selected state highlights |
| **Target Finisher (Tier 1)** | `sky-500` / `--color-target` | `#0EA5E9` | Finisher Target progress bar, E-BIB & E-Certificate qualification indicators |
| **Challenge Tier — Silver** | `slate-300` | `#CBD5E1` | Over-achievement Silver milestone badges |
| **Challenge Tier — Gold** | `amber-400` | `#FBBF24` | Over-achievement Gold milestone badges, PR crowns, top-3 podium |
| **Challenge Tier — Diamond** | `cyan-400` | `#22D3EE` | Elite Diamond tier badges & streak rewards |

### Telemetry & Anti-Cheat Split Status Colors

| Telemetry State | Hex | Tailwind | Usage |
| :--- | :--- | :--- | :--- |
| **Valid Split / Approved** | `#10B981` | `emerald-500` | Valid km split bar (`min_pace <= pace <= max_pace`), `APPROVED` badge |
| **Warning / Flagged Review** | `#F59E0B` | `amber-500` | Cadence/HR anomaly warning, `FLAGGED_FOR_REVIEW`, weekend `x2` multiplier tag |
| **Invalid Split / Anti-Cheat Reject** | `#EF4444` | `rose-500` / `red-500` | Excluded km split (`INVALID_FAST_PACE` e.g. motorbike `< 03:00/km`), `REJECTED` status |
| **Heart Rate Zone Accent** | `#F43F5E` | `rose-500` | Heart rate (bpm) chart line & icon |
| **Elevation Gain Accent** | `#8B5CF6` | `violet-500` | Elevation profile (m) area chart |

### Surface Palette (Dark Mode Default & Outdoor High-Contrast Light Mode)

| Surface Role | Dark Mode (`html.dark`) | Light Mode (`html`) |
| :--- | :--- | :--- |
| **App Background** | `#090D16` (`slate-950`) | `#F8FAFC` (`slate-50`) |
| **Card / Panel Surface** | `#0F172A` (`slate-900`) | `#FFFFFF` (`white`) |
| **Elevated / Sub-card Surface** | `#1E293B` (`slate-800/70`) | `#F1F5F9` (`slate-100`) |
| **Border / Hairline** | `#1E293B` (`slate-800`) | `#E2E8F0` (`slate-200`) |
| **Primary Text** | `#F8FAFC` (`slate-50`) | `#0F172A` (`slate-900`) |
| **Secondary / Label Text** | `#94A3B8` (`slate-400`) | `#475569` (`slate-600`) |
| **Muted / Caption Text** | `#64748B` (`slate-500`) | `#64748B` (`slate-500`) |

---

## 2. Typography & Numeric Telemetry Rules

### Font Stack
- **Sans-Serif (UI & Vietnamese Copy):** `'Be Vietnam Pro', Inter, 'Segoe UI', Roboto, sans-serif`
  - Chosen specifically for crisp Vietnamese diacritics (`Giải chạy ảo`, `Bảng xếp hạng`, `Kiểm duyệt Tracklog`).
- **Monospace (Telemetry, Pace, Distance, Splits, BIB):** `'JetBrains Mono', 'Fira Code', Consolas, monospace`

### Mandatory Numeric Formatting (`tabular-nums`)
All running telemetry MUST use `font-mono tabular-nums` so columns and live counters never jitter:
- **Pace:** `04:35 /km`
- **Distance:** `21.10 km` (2 decimal places via `roundKm`)
- **Duration:** `01:42:18` (`hh:mm:ss` or `mm:ss` via `formatDuration`)
- **Cadence & HR:** `178 spm`, `162 bpm`
- **E-BIB Number:** `TOP-21K-00128`

---

## 3. Core Domain Component Specifications

### 3.1. Dual-Goal Progress Card (Target vs Challenge Tiers)
- **Tier 1 (Target Finisher):** Full-width primary progress bar (`#0EA5E9` or `#FC4C02`) showing `currentMultipliedDistanceKm / targetDistanceKm` and Finisher E-Cert unlock status.
- **Tier 2 (Challenge Awards):** Distinct milestone pills/cards (Silver 100K, Gold 150K, Streak 5d/7d, Single Long Run >= 15K) with clear locked/unlocked visual states.

### 3.2. Split-Level Anti-Cheat Chart (`splits_metric`)
- Horizontal bar list or compact table indexed by `Km 1, Km 2, ...`.
- Each row shows: `Km #` | visual pace bar | `Pace (mm:ss/km)` | `HR / Cadence` | `Status Badge`.
- **Valid km:** Emerald bar (`#10B981`).
- **Violating km (`pace < minPace` or `pace > maxPace`):** Red bar (`#EF4444`) with strikethrough distance and explicit reason tag (e.g., `Vi phạm tốc độ < 03:00/km - Không tính điểm`).

### 3.3. Interactive GPS Polyline Map & Share Card
- Render decoded polyline (`polylineToSvgPath` or MapLibre/MapView) with high-contrast stroke (`#FC4C02`, `strokeWidth: 3.5`, rounded caps).
- Mark Start point (Emerald dot `#10B981`) and Finish point (Checkered/Orange dot `#FC4C02`).

---

## 4. Forbidden Anti-Patterns (Strict Enforcement)

- ❌ **No RPA/Terminal Green Default:** Never revert to `#16A34A` terminal matrix theme as the primary brand color.
- ❌ **No Generic AI Purple/Indigo Gradients:** Avoid `from-indigo-500 via-purple-500 to-pink-500` on cards or headers.
- ❌ **No Proportional Fonts on Leaderboards/Splits:** Never render pace, rank, distance, or time columns without `tabular-nums` / `font-mono`.
- ❌ **No Native Browser `alert()` / `confirm()` in New UI:** Use inline status banners, toast notifications, or confirmation modals instead of blocking browser dialogs.
- ❌ **No Emojis as Functional Navigation Icons on Web:** Use `lucide-react` icons consistently (`Activity`, `Trophy`, `Target`, `ShieldCheck`, `MapPin`, `Flame`, `Award`).
- ❌ **No Nested Cards-in-Cards (>2 levels):** Keep hierarchy flat using hairline borders (`border-slate-800` / `border-slate-200`) and spacing.
