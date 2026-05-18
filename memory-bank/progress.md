# Progress Tracker

**Last Updated**: 2026-05-18

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

### Utilities
- [x] Mop timer with browser Notification API (permission request + fires at zero)
- [x] Share card (html2canvas screenshot export)

### Visual Design — "Smoke & Fire" (2026-05-10)
- [x] CSS Foundation: 4 tokens, 4 keyframes, 6 utility classes (`live-pulse`, `breathe-glow`, `shimmer-bar`, `gradient-text`, `card-interactive`, `temp-card`) with `prefers-reduced-motion` guard
- [x] Navigation: `live-pulse` ripple dots, gradient+glow sidebar active item
- [x] Dashboard: gradient stat pills, breathing active cook cards, warm hover on recent cards
- [x] Active Cook View: `.temp-card` inset with ambient orb, shimmer progress fill, CSS-driven hot card glow
- [x] Live Intelligence Panel: gradient-text on climb rate and ETA values
- [x] TempChart: `ComposedChart` with `Area` fill layers under probe lines, vertical gradients, warm grid
- [x] History Tab: `card-interactive` hover glow, gradient peak temp, live-pulse dot
- [x] Analytics Tab: gradient stat values, amber avg curve with drop-shadow filter, scatter drop-shadow
- [x] Settings: gradient Backup/Restore headers

### Compare Mode — AnalyticsTab (2026-05-10)
- [x] Cook comparison charts — overlay temp curves from multiple past cooks of same cut
- [x] `CompareChart` component with Recharts overlay
- [x] `buildCompareCurves` utility
- [x] Comparison checklist with keyboard/WCAG 2.1 support (Space key on rows)
- [x] aria-pressed on mode toggle, fadein on mode content

## 🚧 In Progress

### PitLogic Rebrand + SDK Compliance + Telemetry Architecture (2026-05-18)
- [x] Phase 0: Design spec doc (`docs/superpowers/specs/2026-05-18-pitlogic-sdk-compliance-rebrand-design.md`)
- [x] Phase 1: `src/lib/compliance/` — ADR-001 through ADR-004, providerGuardrails.md
- [x] Phase 1: CLAUDE.md ThermoWorks SDK compliance section
- [x] Phase 1: memory-bank/ updates (all 5 files)
- [ ] Phase 1: auto-memory updates
- [ ] Phase 2: Zod + TypeScript (tsconfig.lib.json, vite.config.js)
- [ ] Phase 3: Migration system + tests + wire into main.jsx
- [ ] Phase 4: Full rebrand (16 files)
- [ ] Phases 5–9: src/lib/ domain types, normalizer, EventBus, Store, providers
- [ ] Phase 10: Wire + verify
- [ ] Phase 11: Tests
- [ ] Phase 12: Final cleanup

## 📋 Planned / Parking Lot

### ThermoWorks Real-Time Integration
- [ ] Implement `ThermoWorksAdapter` (currently a stub pending official SDK access)
- [ ] Wire live data into `ActiveTab` temp readings via `TelemetryStore`

### Probe Target Alerts
- [ ] Browser notification when a probe hits its target temp
- [ ] Depends on real-time data feed

## 📊 Test Coverage

- **Total tests**: 58 passing (as of 2026-05-08)
- `analytics.test.js` — 273 lines, 7 analytics functions
- `dataPortability.test.js` — 133 lines, export/import round-trip + merge logic
- `planToEatParser.test.js` — 54 lines, CSV parsing edge cases
- `helpers.test.js` — 34 lines, formatting + PROBE_COLORS
- `useRecipes.test.js` — 27 lines, Plan to Eat integration + schema
