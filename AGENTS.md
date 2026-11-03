# AGENTS.md — TOPRunAssistant Workspace Rules & Skill Routing

This workspace enforces a 5-pillar engineering and design system:

1. **Ponytail (Always-On Engineering Minimalism):** Defined in [.agents/rules/ponytail.md](./.agents/rules/ponytail.md).
   - Walk the 5-step Ladder of Minimalism before writing code.
   - **Shared-First:** Always reuse domain functions and schemas from `@toprun/shared` ([packages/shared/src/index.ts](./packages/shared/src/index.ts)) instead of duplicating pace, split, polyline, or dual-goal calculations in `apps/api`, `apps/web`, or `apps/mobile`.
   - **Anti-Monolith Guardrail:** Do not add new feature blocks directly into files exceeding 400 lines (such as `apps/web/src/app/page.tsx`, `UserTracklogExplorer.tsx`, or `AccountAndStravaPanel.tsx`). Extract focused components instead.
2. **Database-First Persistence & Cross-Session Sync (Always-On SSOT Rule):** Defined in [.agents/rules/database-persistence.md](./.agents/rules/database-persistence.md).
   - **Single Source of Truth:** PostgreSQL (`packages/database`) is the sole authoritative storage of truth. All domain entities (Events, Categories, Challenge Tiers, Participations, BIBs, Race-Kit Orders, Activities, Splits) must write-through directly to PostgreSQL via Prisma.
   - **No Orphan In-Memory Storage:** In-memory state is strictly an algorithmic calculation cache ($<5\text{ms}$), never the sole storage.
   - **Hydration Lifecycle:** All stateful engine services must implement `OnModuleInit` and hydrate from PostgreSQL on startup, guaranteeing parity across sessions and pods.
3. **Mobile Web & Identity Consistency (Always-On Responsive & Profile Integrity Rule):** Defined in [.agents/rules/mobile-web-and-identity.md](./.agents/rules/mobile-web-and-identity.md).
   - **Responsive & Touch Ergonomics:** Ensure mobile bottom navigation (`MobileBottomNav.tsx`), $\ge 44 \times 44\text{px}$ touch targets, safe area padding (`pb-safe`), and `<main className="... pb-24 lg:pb-8">`.
   - **Brand Identity:** Standardize on `<TopRunLogo />` and unified Lucide domain icons across all views.
   - **Identity Cascade:** Ensure profile updates (`fullName`, `avatarUrl`, `departmentOrUnit`) synchronously cascade to tournaments, leaderboards, and tracklogs.
   - **Pre-filled Registration & Custom BIB:** Auto-fill athlete profile data, support custom unique BIB numbers, and allow opt-in for Special Challenges.
4. **UI/UX Pro Max (On-Demand New UI Architecture Skill):** Defined in [.agents/skills/ui-ux-pro-max/SKILL.md](./.agents/skills/ui-ux-pro-max/SKILL.md).
   - Activate when creating **new pages, new mobile screens, data visualizations, or page-specific design specs**.
   - Follows the single source of truth in [design-system/toprunassistant/MASTER.md](./design-system/toprunassistant/MASTER.md).
5. **Impeccable (On-Demand UI Audit, Polish & Anti-Slop Skill):** Defined in [.agents/skills/impeccable/SKILL.md](./.agents/skills/impeccable/SKILL.md).
   - Activate when **auditing, critiquing, typesetting, simplifying, or polishing existing UI** (`/audit`, `/critique`, `/polish`, `/typeset`, `/simplify-ui`).
   - Grounded in [PRODUCT.md](./PRODUCT.md) and [design-system/toprunassistant/MASTER.md](./design-system/toprunassistant/MASTER.md).

