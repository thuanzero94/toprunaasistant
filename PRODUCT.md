# PRODUCT.md — TOPRunAssistant Product & Design Context

> Durable product truth consumed by **Impeccable** (`/audit`, `/critique`, `/polish`, `/typeset`, `/simplify-ui`), **UI/UX Pro Max**, and **Ponytail**.

## 1. Product Identity
- **Name:** TOPRunAssistant (`@toprun/web`, `@toprun/mobile`, `@toprun/api`, `@toprun/shared`, `@toprun/database`)
- **Domain:** Multi-platform Running Management, Tracklog Analytics, Club Challenges & Virtual Race SaaS Platform integrated with **Strava OAuth2 & Webhook API**.
- **Primary Language:** Vietnamese UI (`vi-VN`) with universal running terminology (`Pace`, `Splits`, `Tracklog`, `Finisher`, `E-BIB`, `E-Certificate`, `Cadence`, `Strava Sync`).

## 2. Target Personas & Usage Context
1. **Runner (Vận động viên phong trào / Nhân viên công ty):**
   - Checks progress right after morning/evening runs (often outdoors in bright sunlight or early morning low light -> requires **high contrast** and clear **Light/Dark mode**).
   - Cares most about: *Did my Strava run sync? How many valid km were counted? Did I hit my Finisher Target or unlock a Challenge Tier badge? What is my rank on the Individual/Team Leaderboard?*
2. **Club / Team Captain (Đội trưởng CLB / Phòng ban):**
   - Monitors team cumulative distance, weekend `x2` bonus runs, and member streaks.
3. **Race Organizer & Anti-Cheat Moderator (Ban Tổ Chức / Admin):**
   - Configures Virtual Race rules (`minPace`, `maxPace`, `weekendMultiplier`, Target categories, Challenge tiers).
   - Reviews flagged activities (`FLAGGED_FOR_REVIEW`), inspects kilometer-by-kilometer splits (`splits_metric`) and GPS polylines to approve or reject suspicious tracklogs, and manages Race-kit fulfillment (shirt sizes, medal engraving, shipping codes).

## 3. Aesthetic & Functional Pillars
1. **Athletic Precision over Decoration:**
   - Every screen is data-dense yet scannable at a glance. Numbers (`km`, `mm:ss /km`, `bpm`, `spm`) are the hero elements and must use `JetBrains Mono` with `tabular-nums`.
2. **Transparent Anti-Cheat Feedback:**
   - Because `TOPRunAssistant` filters cheating at the **1-kilometer split level** (keeping valid km while discarding vehicle-assisted km), the UI must clearly distinguish **Raw Distance**, **Valid Distance**, and **Multiplied Distance (`x2`)** without confusing the runner.
3. **Dual-Goal Clarity (Target vs Challenge):**
   - Runners must immediately see the difference between **Tier 1: Target (Finisher Goal -> E-Cert & Medal)** and **Tier 2: Challenge Tiers (Over-achievement Silver/Gold/Diamond & Streak Awards)**.

## 4. Design System Reference
- Single source of visual tokens, colors, and component specs: [design-system/toprunassistant/MASTER.md](./design-system/toprunassistant/MASTER.md).
- Shared domain calculations and formatters: [packages/shared/src/index.ts](./packages/shared/src/index.ts).

