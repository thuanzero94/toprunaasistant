# AGENTS.md — TOPRunAssistant Workspace Rules & Skill Routing

This workspace enforces a 3-pillar engineering and design system:

1. **Ponytail (Always-On Engineering Minimalism):** Defined in [.agents/rules/ponytail.md](./.agents/rules/ponytail.md).
   - Walk the 5-step Ladder of Minimalism before writing code.
   - **Shared-First:** Always reuse domain functions and schemas from `@toprun/shared` ([packages/shared/src/index.ts](./packages/shared/src/index.ts)) instead of duplicating pace, split, polyline, or dual-goal calculations in `apps/api`, `apps/web`, or `apps/mobile`.
   - **Anti-Monolith Guardrail:** Do not add new feature blocks directly into files exceeding 400 lines (such as `apps/web/src/app/page.tsx`, `UserTracklogExplorer.tsx`, or `AccountAndStravaPanel.tsx`). Extract focused components instead.
2. **UI/UX Pro Max (On-Demand New UI Architecture Skill):** Defined in [.agents/skills/ui-ux-pro-max/SKILL.md](./.agents/skills/ui-ux-pro-max/SKILL.md).
   - Activate when creating **new pages, new mobile screens, data visualizations, or page-specific design specs**.
   - Follows the single source of truth in [design-system/toprunassistant/MASTER.md](./design-system/toprunassistant/MASTER.md).
3. **Impeccable (On-Demand UI Audit, Polish & Anti-Slop Skill):** Defined in [.agents/skills/impeccable/SKILL.md](./.agents/skills/impeccable/SKILL.md).
   - Activate when **auditing, critiquing, typesetting, simplifying, or polishing existing UI** (`/audit`, `/critique`, `/polish`, `/typeset`, `/simplify-ui`).
   - Grounded in [PRODUCT.md](./PRODUCT.md) and [design-system/toprunassistant/MASTER.md](./design-system/toprunassistant/MASTER.md).

