---
name: impeccable
description: >-
  Anti-AI-slop detector, UI auditor, typographer, and visual polish skill for
  TOPRunAssistant (inspired by pbakaus/impeccable). Activate when the user asks
  to audit, critique, polish, typeset, or simplify existing UI in apps/web or
  apps/mobile, or invokes commands like /audit, /critique, /polish, /typeset,
  or /simplify-ui.
---

# Impeccable — Anti-Slop Design Audit & Polish Skill

Use this skill to **audit, critique, refine, and polish existing frontend code** in `apps/web` and `apps/mobile` so it looks crafted by a senior sports product designer rather than generic AI output.

---

## 1. Grounding in Product Truth (Mandatory First Step)

Before running any audit or applying visual edits:
1. Read [PRODUCT.md](../../../PRODUCT.md) to understand the runner/organizer personas and domain priorities.
2. Read [design-system/toprunassistant/MASTER.md](../../../design-system/toprunassistant/MASTER.md) for the canonical color tokens, typography, and forbidden anti-patterns.
3. Read [references/anti-slop-checklist.md](./references/anti-slop-checklist.md) for deterministic inspection rules.

---

## 2. Core Impeccable Modes / Commands

When the user asks to improve existing UI (or names one of these modes), execute the corresponding workflow:

### 🔍 `audit` (Deterministic Anti-Slop & Accessibility Scan)
Scan target files for visual, UX, and code-health anti-patterns and report findings grouped by severity (**Critical**, **Major**, **Minor**) with exact file & line links:
- Native browser `alert()`, `confirm()`, or `prompt()` blocking the UI thread.
- Numbers (pace, distance, splits, duration, rank) missing `font-mono` or `tabular-nums`.
- Contrast failures in Light Mode or Dark Mode (e.g., `text-slate-400` on light backgrounds or hardcoded dark colors that break light theme).
- Cards nested inside cards (>2 levels deep) with redundant borders and shadows.
- Generic AI purple/indigo gradients or stray `#16A34A` RPA green that clashes with Strava Orange (`#FC4C02`).
- Oversized monolithic component files (>400 lines) mixing mock data, API calls, and UI rendering.

### 🎯 `critique` (Senior Product Designer Review)
Evaluate a screen's **information hierarchy and runner UX**:
- What catches the eye in the first 2 seconds? (Should be primary run progress / CTA, not secondary metadata).
- Is Dual-Goal progress (Target Finisher vs Challenge Tiers) immediately understandable?
- Are anti-cheat split rejections explained empathetically and clearly?

### ✨ `polish` (Visual Craft & Micro-Interaction Refinement)
Apply surgical edits to elevate component quality:
- Unify border radii, padding scales, and hairline borders (`border-slate-200 dark:border-slate-800`).
- Replace native `alert()`/`confirm()` with inline status banners or confirmation states.
- Ensure interactive buttons have crisp active/hover states, loading spinners, and `cursor-pointer`.

### 🔤 `typeset` (Vietnamese Typography & Telemetry Alignment)
- Enforce `Be Vietnam Pro` for headings/body and `JetBrains Mono` (`font-mono tabular-nums`) for all numeric columns, timers, paces, BIB numbers, and leaderboard tables.
- Fix awkward Vietnamese line breaks (`whitespace-nowrap` on badges, unit labels like `04:30 /km`, `150 KM`).

### 🧹 `simplify-ui` (De-clutter & Component Extraction)
- Flatten deeply nested `div` wrappers and redundant status badges.
- Extract self-contained sub-panels from bloated files (`page.tsx`, `UserTracklogExplorer.tsx`, `AccountAndStravaPanel.tsx`) following the Ponytail `<400 lines` rule.

