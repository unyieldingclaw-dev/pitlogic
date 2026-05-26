---
authority: accumulating
review-cycle: 30d
retention: rolling-3-months
staleness-threshold: 30
tags: [progress, completed, planned]
last-reviewed: 2026-05-26
compaction_generation: 0
source_type: human
confidence: high
lineage: initial
---

# Progress Tracker

**Last Updated**: 2026-05-26

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
- [x] Live at https://unyieldingclaw-dev.github.io/pitlogic/

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
- [x] Probe target alerts — browser notification when probe hits target temp (`useProbeAlert`)
- [x] Smoker low temp alarm — browser notification + Web Audio beep when pit drops below threshold (`useSmokerAlert`)
- [x] Mid-cook threshold edit + on/off toggle in active view

### Visual Design — "Smoke & Fire" (2026-05-10)
- [x] CSS Foundation: 4 tokens, 4 keyframes, 6 utility classes with `prefers-reduced-motion` guard
- [x] Navigation, Dashboard, Active Cook View, Live Intelligence Panel, TempChart gradient treatment
- [x] History Tab: `card-interactive` hover glow, gradient peak temp, live-pulse dot
- [x] Analytics Tab: gradient stat values, amber avg curve, scatter drop-shadow, fade-in on mode switch

### Cuts & Cook Preferences (2026-05-10)
- [x] Expanded MEATS: Plate Ribs, Beef Cheeks, Picanha (Beef); Spare Ribs, Pork Belly, Ham, Pork Chops (Pork); Wings, Cornish Hen (Poultry); Lamb category
- [x] 12 new cut guides with pellets, temps, stages, tips
- [x] `usePrefs` hook — per-cut pit/pull overrides in `pitlogic-prefs-v1` localStorage
- [x] ActiveTab inline "Save as default" amber badge
- [x] SettingsSheet "My Defaults" section with per-cut reset

### Misc
- [x] MIT license added (repo root `LICENSE`)
- [x] CompareChart fullscreen mode (`be60511`)

### PitLogic Rebrand + SDK Compliance + Telemetry Architecture ✅ (2026-05-19)
- [x] Phase 0: Design spec doc (`docs/superpowers/specs/2026-05-18-pitlogic-sdk-compliance-rebrand-design.md`)
- [x] Phase 1: `src/lib/compliance/` — ADR-001 through ADR-004, providerGuardrails.md
- [x] Phase 1: CLAUDE.md ThermoWorks SDK compliance section
- [x] Phase 1: memory-bank/ + auto-memory updates
- [x] Phase 2: Zod + TypeScript (tsconfig.lib.json, vite.config.js)
- [x] Phase 3: Migration system + 6 tests + wire into main.jsx
- [x] Phase 4: Full rebrand (package.json, manifest, sw.js, App.jsx, hooks, components, data)
- [x] Phases 5–9: src/lib/ domain types, normalizer, EventBus, TelemetryStore, SessionStore, providers
- [x] Phase 10: CsvProvider adapter + ProviderRegistry wired at startup
- [x] Phase 11: Tests — normalize (6), MockProvider (5), TelemetryStore (7)
- [x] Phase 12: memory-bank/ + auto-memory final cleanup

### Test Coverage (2026-05-26)
- [x] `useStorage.test.js` — 10 tests: load (empty/valid/invalid JSON/aid migration × 4), save (writes/swallows errors), replaceAll
- [x] `useRecipes.test.js` — 15 hook tests added: add (prepend, persist, id), update (patch, persist, non-matching), remove (filter, persist), importMany (counts, case-insensitive dedup, source stamp), replaceAll (overwrite, persist)
- [x] Vitest worktree leak fixed — `exclude: ['.claude/**']` in vite.config.js

### Claude Code Infrastructure (2026-05-20 → 2026-05-26)
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
- [x] `scripts/update-reviewed.sh` — PostToolUse hook: auto-updates `last-reviewed:` frontmatter in memory-bank files on every Write/Edit
- [x] `health-check.md` command — runs mb doctor + test suite + build + git status; prints pass/warn/fail summary
- [x] `standards/` directory (8 files) — ACCESSIBILITY, AGENTIC-SAFETY, CODE-QUALITY, LOGGING, MCP-SECURITY, SECURITY-GUARDRAILS, WORKFLOW + docs/HOOKS-GUIDE.md

## 📋 Planned / Parking Lot

### ThermoWorks Real-Time Integration
- [ ] Implement `ThermoWorksAdapter` (currently a stub pending official SDK access)
- [ ] Wire live data into `ActiveTab` temp readings via `TelemetryStore`

### iOS Alarm
- [ ] **iOS alarm options** — silent switch bypasses all browser audio/notifications on iOS; investigate native PWA push notifications or other iOS-specific workaround when ready

## 🐛 Known Bugs (Low Priority)

- CSP eval error in dev server from `vite.config.js` configureServer approach

## 📊 Test Coverage

- **Total tests**: 137 passing (13 test files) as of 2026-05-26
- `analytics.test.js` — analytics functions, edge cases
- `dataPortability.test.js` — export/import round-trip + merge logic
- `planToEatParser.test.js` — CSV parsing edge cases
- `helpers.test.js` — formatting + PROBE_COLORS
- `useRecipes.test.js` — hook API (add, update, remove, importMany, replaceAll, load) + Plan to Eat integration
- `usePrefs.test.js` — per-cut pref CRUD, localStorage round-trip, invalid JSON (`src/tests/usePrefs.test.js`)
- `useStorage.test.js` — load/save/replaceAll, legacy aid migration, error swallowing
- `useProbeAlert.test.js` — probe target notification tests
- `useSmokerAlert.test.js` — smoker low temp alarm tests
- `migrationRunner.test.ts` — 6 cases: fresh install, success, corrupted data, partial, idempotent, no-overwrite
- `normalize.test.ts` — 6 cases: active, disconnected, C→F, normalizedBy, malformed
- `MockProvider.test.ts` — 5 cases: tick interval, rate, disconnect, multi-probe, unsubscribe
- `TelemetryStore.test.ts` — 7 cases: register, disconnect, reconnect, stale, fresh, notify, unsubscribe
