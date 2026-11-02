# Impeccable Anti-Slop Checklist for TOPRunAssistant

Run through this deterministic checklist whenever auditing or polishing `apps/web` or `apps/mobile`:

## 1. Anti-AI-Slop Visual Checks
- [ ] **No Generic AI Gradients:** Remove random `bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500` or cyan-to-purple backgrounds unless specifically designating the Diamond Challenge Tier.
- [ ] **No Card-Inside-Card-Inside-Card:** Maximum 2 surface layers (Page Background -> Card -> Subtle Section/Row with hairline border).
- [ ] **No Emoji Soup in Navigation/Headers:** On Web (`apps/web`), use `lucide-react` icons with consistent stroke width (`strokeWidth={2}`, `w-4 h-4` or `w-5 h-5`) rather than mixing raw emojis and SVG icons in the same nav bar or button group.
- [ ] **Dual-Theme Integrity (`darkMode: 'class'`):** Every background, border, and text utility in `apps/web` must remain legible in both Light Mode (`bg-white text-slate-900 border-slate-200`) and Dark Mode (`dark:bg-slate-900 dark:text-slate-50 dark:border-slate-800`).

## 2. Athletic Telemetry & Typography Checks
- [ ] **Tabular Numerals (`tabular-nums`):** Applied to all distances (`km`), paces (`mm:ss /km`), durations (`hh:mm:ss`), heart rates (`bpm`), cadences (`spm`), and leaderboard ranks.
- [ ] **Unit Consistency:** Always separate number and unit with a non-breaking space or consistent styling (e.g. `21.1` + smaller muted `KM`, or `04:45` + `/km`).
- [ ] **Split Status Clarity:** Valid splits (`#10B981`), weekend bonus (`#F59E0B`), and rejected splits (`#EF4444`) must use both **color** and **icon/text label** so colorblind runners can distinguish them.

## 3. Interaction & UX Hygiene Checks
- [ ] **Zero Blocking Dialogs:** Replace `window.alert()` and `window.confirm()` with inline toast/banner feedback or accessible confirmation UI.
- [ ] **Touch & Click Targets:** Buttons and tab triggers have at least `36px` height on desktop and `44px` on mobile/touch viewports.
- [ ] **Component File Hygiene (Ponytail Synergy):** Any component file over `400 lines` flagged during an audit should have a clear decomposition plan before adding new UI features.

