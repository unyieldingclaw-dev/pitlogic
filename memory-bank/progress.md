# Progress Tracker

**Last Updated**: 2026-05-20

## ✅ Completed Features

### Core Cook Tracking
- [x] Cook logging (meat, cut, pellets, probe names, start time)
- [x] Multi-probe temperature entry (manual + Plan to Eat CSV import)
- [x] Active cook dashboard (one card per active cook, navigates correctly)
- [x] Cook detail view with inline delete confirm (Yes/No)
- [x] Cook history list

### Stall Intelligence & Analytics
- [x] `computeClimbRate` — per-probe climb rate (°F/min over last N readings)
- [x] `computeETA` — projected finish time from current rate and target temp
- [x] `computeStallProbability` — sigma-based stall likelihood score
- [x] `buildAverageCurve` — average temp curve across historical cooks of same cut
- [x] `LiveIntelligencePanel` — per-probe climb rate, ETA, stall probability dots
- [x] `StallCoach` — approaching/confirmed stall cards with action buttons
- [x] `AnalyticsTab` — gradient bar chart, sigma-band average curve, cook quality scatter
- [x] `TempChart` — EmberTooltip + per-probe gradients
- [x] Compare mode in Analytics tab (`CompareChart` component, checklist selection)

### Recipes
- [x] Recipe CRUD
- [x] Plan to Eat CSV import (parser + hook integration)

### Data Portability
- [x] JSON backup export (full cooks + recipes)
- [x] JSON import with merge mode (deduplicate by cook ID)
- [x] JSON import with replace mode (full overwrite)
- [x] `SettingsSheet` gear icon modal — download + restore UI

### PWA & Deployment
- [x] PWA manifest (standalone, theme #FF6B35, flame icon)
- [x] Service worker (stale-while-revalidate)
- [x] GitHub Actions auto-deploy to GitHub Pages on push to main
- [x] Live at https://unyieldingclaw-dev.github.io/rfx-cook-tracker/

### Accessibility
- [x] All clickable divs converted to `<button>` elements
- [x] `aria-current`, `aria-expanded`, `aria-label` throughout
- [x] `role="alert"/"status"` on dynamic content
- [x] `htmlFor`/`id` label associations on all form inputs
- [x] `:focus-visible` keyboard navigation styles
- [x] `aria-pressed` on mode toggle buttons
- [x] Space key support on comparison checklist rows

### Utilities
- [x] Mop timer with browser Notification API (permission request + fires at zero)
- [x] Share card (html2canvas screenshot export)

### Visual Design — "Smoke & Fire" (2026-05-10)
- [x] CSS Foundation: 4 tokens, 4 keyframes, 6 utility classes with `prefers-reduced-motion` guard
- [x] Navigation, Dashboard, Active Cook View, Live Intelligence Panel, TempChart gradient treatment
- [x] History Tab: `card-interactive` hover glow, gradient peak temp, live-pulse dot
- [x] Analytics Tab: gradient stat values, amber avg curve, scatter drop-shadow, fade-in on mode switch

### Cuts & Cook Preferences (2026-05-10)
- [x] Expanded MEATS: Plate Ribs, Beef Cheeks, Picanha (Beef); Spare Ribs, Pork Belly, Ham, Pork Chops (Pork); Wings, Cornish Hen (Poultry); Lamb category
- [x] 12 new cut guides with pellets, temps, stages, tips
- [x] `usePrefs` hook — per-cut pit/pull overrides in `rfx-prefs-v1` localStorage
- [x] ActiveTab inline "Save as default" amber badge
- [x] SettingsSheet "My Defaults" section with per-cut reset

### Claude Code Infrastructure (2026-05-20)
- [x] `.claude/settings.json` — tracked project settings (Haiku env, permission denies, hook registrations)
- [x] `block-dangerous-ops.sh` — 15 dangerous patterns blocked at PreToolUse
- [x] `user-prompt-submit.sh` — memory-bank + context reminder at each turn
- [x] `pre-edit-karpathy.sh` — Karpathy reminder + task contract path warning (never blocks)
- [x] `test-strategist.md` agent — diff-scoped test gap analysis (haiku/effort:low)
- [x] `maintainability-reviewer.md` agent — dead code + abstraction audit (haiku/effort:low)
- [x] `security-reviewer.md` + `researcher.md` — model:haiku/effort frontmatter added
- [x] `code-review.md` — upgraded to 8-phase with 5 parallel subagents + Opponent-Auditor + contract generation
- [x] `test-audit.md` command — whole-codebase test gap analysis
- [x] `comment-pass.md` command — dead code scan + WHY comment audit
- [x] `memory-prune.md` command — memory-bank staleness/contradiction/sensitive data scan
- [x] `handoff.md` command — graceful handoff with contract archival
- [x] `.claude/contracts/.gitkeep` — contracts directory placeholder
- [x] CI: test step + file size gate (400 warn / 650 fail, grandfathered, fetch-depth:2)
- [x] 4 Cursor rules: architecture, code-quality (augmented), accessibility, memory-bank (augmented)
- [x] Design doc: `docs/superpowers/specs/2026-05-20-testing-agent-flow-design.md`
- [x] Global CLAUDE.md — corrected Haiku subagent configuration claim

## 🚧 In Progress

Nothing currently in flight. All infra changes pending commit on `chore/update-memory-bank-2026-05-14`.

## 📋 Planned / Parking Lot

### ThermoWorks Real-Time Integration
- [ ] Research ThermoWorks API / Smoke X connectivity
- [ ] MCP server or CLI bridge to pipe live sensor data
- [ ] Wire live data into `ActiveTab` temp readings

### Probe Target Alerts
- [ ] Browser notification when a probe hits its target temp
- [ ] Depends on real-time data feed

## 🐛 Known Bugs (Low Priority)

- TempChart `width(-1) height(-1)` Recharts warning: `src/components/TempChart.jsx:88` — fix: move height to `<ResponsiveContainer height={h}>` not the wrapping div
- CSP eval error in dev server from `vite.config.js` configureServer approach

## 📊 Test Coverage

- **Total tests**: 169 passing (16 test files) as of 2026-05-20
- `analytics.test.js` — analytics functions, edge cases
- `dataPortability.test.js` — export/import round-trip + merge logic
- `planToEatParser.test.js` — CSV parsing edge cases
- `helpers.test.js` — formatting + PROBE_COLORS
- `useRecipes.test.js` — Plan to Eat integration + schema
- (11 additional test files covering components, hooks, utils)
