# Mobile Web, Responsive Cohesion & Identity Cascade Rules

> Standardized guidelines for responsive ergonomics, unified brand identity, and synchronized athlete profiles across the TOPRunAssistant platform.

---

## 1. Responsive Cohesion & Mobile-First Touch Ergonomics

Every frontend view in `apps/web` (and components shared or mirrored in `apps/mobile`) must be responsive and touch-friendly across viewport breakpoints:

### Mobile Viewport (`< lg` / `< 1024px`)
- **Mobile Bottom Navigation Bar (`MobileBottomNav.tsx`):**
  - Stays sticky at the bottom with standard iOS/Android safe area padding (`pb-safe`) and high z-index (`z-30`).
  - All interactive buttons must have a minimum touch target size of **$44 \times 44\text{px}$** (`min-h-[44px] min-w-[44px]`).
  - Always maintain a badge or visual count indicator for joined tournaments (`myEventsCount`).
- **Main Workspace Content Padding:**
  - The main scrollable workspace `<main>` must always include `pb-24 lg:pb-8` so that cards, tables, and modal triggers at the bottom of the page are never obscured by the mobile navigation bar.
- **Mobile Top Header:**
  - Compact height (`h-16`) containing:
    1. `<TopRunLogo variant="compact" size="sm" />` (brand identity anchor).
    2. Event Selector dropdown pill (truncated with maximum width `max-w-[160px] sm:max-w-[220px]`).
    3. Action cluster: Admin Shield (`ShieldCheck` if `user.role === 'ADMIN'`), Theme toggle (`Sun` / `Moon`), and Athlete Avatar button (`w-8 h-8 rounded-xl`).

### Desktop Viewport (`≥ lg` / `≥ 1024px`)
- **Sidebar (`<aside className="hidden lg:flex w-64 ...">`):**
  - Full branding anchor with `<TopRunLogo variant="full" size="md" />`.
  - Clean vertical navigation pills with active state (`bg-[#FC4C02] text-white`).
  - Bottom controls: Theme Switcher, Dev Test Mode Simulator trigger, and Athlete profile summary card.
- **Top Contextual Header:**
  - Page title + description breadcrumb, multi-event selector dropdown, and quick user profile chip with logout button.

---

## 2. Unified Brand Identity & Iconography

To maintain design integrity and eliminate UI discrepancies:

### 1. The `<TopRunLogo />` Component
- Always import and use `apps/web/src/components/TopRunLogo.tsx`.
- Never write ad-hoc SVG mountain/lightning paths or raw text titles for brand identity.
- Supported variants:
  - `variant="icon"`: 40x40 rounded-xl gradient mark with mountain path and finish star.
  - `variant="compact"`: Logo mark + "TOPRun" bold logotype.
  - `variant="full"`: Logo mark + "TOPRun" + subtitle ("VIRTUAL RACE & STRAVA SYNC").
- Supported sizes: `sm`, `md`, `lg`, `xl`.

### 2. Standardized Lucide Domain Icons
Use the canonical Lucide icons across all views to prevent semantic confusion:
- `Trophy`: Tournaments, virtual races, finisher goals, leaderboard rankings.
- `Flame`: Special challenges, streaks, intensity badges.
- `Activity`: Tracklogs, Strava GPS sync, pacing, cadence, heart rate.
- `Award` / `Medal`: E-Certificates, E-BIBs, achievement badges.
- `ShieldCheck`: Admin management portal, Strava Webhook verified status, GPS anti-cheat pass.
- `ShieldAlert`: Suspicious pace warning, motorized transport flag, anti-cheat penalty.
- `Compass`: Explore new tournaments, public directory.

---

## 3. Athlete Profile & Identity Cascade Rule

In running tournaments and leaderboards, an athlete's name, avatar, and department must remain strictly consistent across all views:

1. **Synchronous Cascade on Profile Update:**
   - When a user modifies their full name (`fullName`), avatar (`avatarUrl`), or department (`departmentOrUnit`) in `AccountAndStravaPanel`:
   - The backend API (`PATCH /auth/profile`) MUST update both the database record and the in-memory engine cache (`TopRunEngineService.updateUserProfile`).
   - The update must cascade synchronously to:
     - All active tournament participations (`participations`).
     - All historical and synced activities (`activities`).
     - In-memory user directory (`this.users`).
2. **Fresh Profile Resolution in Leaderboards & Tracklogs:**
   - Engine methods such as `getActivities()`, `getEventBySlugOrId()`, and leaderboard calculations must dynamically resolve the latest user profile rather than returning stale denormalized strings.
3. **Tournament Registration Pre-fill & Custom BIB:**
   - Registration modals must automatically pre-populate available profile data:
     - `fullName`, `phone`, `defaultShippingAddress`, `defaultShirtSize`.
   - BIB number generation:
     - Default auto-generated collision-free BIB (`TOP{km}-{random}`).
     - Allow athletes to edit their custom BIB number before registration and anytime after joining via `PATCH /events/:id/bib`.
     - Live collision validation (`GET /events/:id/check-bib`) to ensure unique BIBs per event.
   - Special Challenges Opt-in:
     - Allow runners to optionally opt into Special Challenges (speed challenge, consecutive streak, weekend long-run) during registration.

---

## 4. Architectural Harmony (The 4-Pillars)

This rule works in seamless harmony with the other workspace rules and skills:
1. **Ponytail:** Enforces minimal code, zero duplication, `@toprun/shared` domain logic, and `<400` lines file guardrail.
2. **Mobile Web & Identity (This Rule):** Enforces responsive touch targets, mobile navigation, unified brand logos, and athlete profile sync.
3. **UI/UX Pro Max:** Engaged when building new pages, design tokens, telemetry charts, or race medals.
4. **Impeccable:** Engaged when auditing, critiquing, fixing typography, or polishing existing UI.

