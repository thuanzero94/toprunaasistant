# Ponytail Minimalist Engineering Discipline — TOPRunAssistant

> *"The best code is the code you never wrote."* — Inspired by `DietrichGebert/ponytail`, tailored for the `TOPRunAssistant` Full-Stack TypeScript Monorepo.

Before writing, editing, or generating any code in this repository, you MUST walk down the **Ladder of Minimalism** in order and stop at the highest rung that solves the problem:

## 1. The 5-Step Ladder of Minimalism

1. **Rung 1 — Does this need to exist? (YAGNI)**
   - Do not build speculative abstractions, wrapper classes, generic factories, or unrequested configuration layers.
   - Solve only the concrete requirement requested by the user.
2. **Rung 2 — Is it already in `@toprun/shared` or the codebase?**
   - **Mandatory Shared-First Rule:** All running domain logic—Pace formatting (`formatPace`), Duration formatting (`formatDuration`), Distance rounding (`roundKm`), Split-level anti-cheat evaluation (`evaluateActivitySplits`), Dual-Goal Target/Challenge calculation (`calculateDualGoalProgress`), Polyline encoding/decoding (`encodePolyline`, `decodePolyline`, `polylineToSvgPath`), GPX parsing (`parseGpxToActivityInput`), and Zod schemas (`EventRuleConfigSchema`)—lives in `packages/shared`.
   - NEVER re-implement or copy-paste these functions inside `apps/api`, `apps/web`, or `apps/mobile`. Import from `@toprun/shared` or extend `packages/shared` if a domain primitive is missing.
3. **Rung 3 — Can the platform / standard library handle it?**
   - Use native browser/Node APIs (`Intl.DateTimeFormat`, `Intl.NumberFormat`, `URLSearchParams`, native `fetch`, standard `Array`/`Map`/`Set` methods, CSS Flexbox/Grid, native `<dialog>` or CSS transitions) before reaching for custom JS state machines.
4. **Rung 4 — Can an already-installed dependency handle it?**
   - Check `package.json` first (`zod`, `lucide-react`, ` tailwindcss`, `@prisma/client`). Do not install new npm packages if existing workspace dependencies suffice.
5. **Rung 5 — What is the smallest, clearest code change?**
   - Write flat, direct, readable TypeScript. Prefer pure functions and early returns over deeply nested conditionals.

---

## 2. Monorepo Anti-Bloat & File Size Guardrails

- **No Further Monolith Growth (>400 Lines Rule):**
  - Existing files like `apps/web/src/app/page.tsx`, `apps/web/src/components/UserTracklogExplorer.tsx`, and `apps/web/src/components/AccountAndStravaPanel.tsx` are already oversized.
  - When adding a new feature, modal, tab, or admin section, **do NOT dump hundreds of new lines into a file that exceeds 400 lines**. Extract a focused, single-purpose component under `apps/web/src/components/` or `apps/mobile/components/`.
- **No Dead Mock Data Duplication:**
  - Keep sample/demo fallback data isolated in dedicated constants or seed modules rather than inline inside UI render functions.
- **No Unnecessary Comments or Boilerplate:**
  - Preserve existing documentation, but do not add noisy comments restating what obvious code does.

---

## 3. Skill Routing Matrix (When to Activate Design Skills)

| Task Type | Active Rule / Skill | Action |
| :--- | :--- | :--- |
| **Backend API, Database, Shared Logic, Bugfixes, Refactoring** | `ponytail` (Always-On Rule) | Apply the 5-Step Ladder of Minimalism & `@toprun/shared` reuse. |
| **Designing New Pages, New Screens, New Charts, or Design Tokens** | Activate skill `ui-ux-pro-max` | Check `design-system/toprunassistant/MASTER.md` and `pages/[page].md` before building UI. |
| **Auditing, Critiquing, Polishing Existing UI, Fixing "AI Slop" or Typography** | Activate skill `impeccable` | Read `PRODUCT.md` & `MASTER.md`, then run `/audit`, `/critique`, `/polish`, `/typeset`, or `/simplify-ui`. |

