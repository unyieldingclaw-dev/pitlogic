# Progress Tracker

**Last Updated**: 2026-05-10

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

## 🚧 In Progress

Nothing currently in flight.

## 📋 Planned / Parking Lot

### ThermoWorks Real-Time Integration
- [ ] Research ThermoWorks API / Smoke X connectivity
- [ ] MCP server or CLI bridge to pipe live sensor data
- [ ] Wire live data into `ActiveTab` temp readings

### Probe Target Alerts
- [ ] Browser notification when a probe hits its target temp
- [ ] Depends on real-time data feed

### Cook Comparison Charts
- [ ] Overlay temp curves from multiple cooks of same cut
- [ ] UI in AnalyticsTab or HistoryTab detail view

## 📊 Test Coverage

- **Total tests**: 58 passing (as of 2026-05-08)
- `analytics.test.js` — 273 lines, 7 analytics functions
- `dataPortability.test.js` — 133 lines, export/import round-trip + merge logic
- `planToEatParser.test.js` — 54 lines, CSV parsing edge cases
- `helpers.test.js` — 34 lines, formatting + PROBE_COLORS
- `useRecipes.test.js` — 27 lines, Plan to Eat integration + schema
