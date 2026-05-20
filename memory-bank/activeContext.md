# Active Context - Current State

**Last Updated**: 2026-05-19

## Current Focus

**PitLogic milestone complete.** Branch `claude/frosty-hellman-9c2f1d` is ready to PR into main.

Next: open PR, merge, update GitHub Pages repo name from `rfx-cook-tracker` → `pitlogic` when ready.

## What's Working

- All 96 tests passing (up from 66)
- Production build clean
- GitHub Pages deployed and auto-deploying on push to main
- PWA installable on mobile
- Full data export/import (JSON backup with merge/replace modes)
- Stall Intelligence v2 with real-time ETA, climb rate, stall probability
- Accessibility: keyboard nav, aria-*, semantic HTML throughout
- PitLogic branding throughout — no RFX visible in UI
- Migration system: first-run key rename `rfx-* → pitlogic-*`, idempotent
- Telemetry architecture: domain types, normalizer, EventBus, TelemetryStore, SessionStore, providers

## Immediate Next Steps

1. Open PR from `claude/frosty-hellman-9c2f1d` → `main`
2. After merge: rename GitHub repo to `pitlogic` (or `pitlogic-app`), update Pages URL in manifest + sw.js
3. Implement `ThermoWorksAdapter` when official SDK access is available
4. Wire CSV import UI through `CsvProvider` (existing UI untouched for now)

## Environment Status

**Dev server**: run `npm run dev` → http://localhost:5173/rfx-cook-tracker/
**Git**: branch `claude/frosty-hellman-9c2f1d`, clean, ahead of main by ~8 commits
**GitHub Pages**: live at https://unyieldingclaw-dev.github.io/rfx-cook-tracker/

## Key Files

| File | Purpose |
|------|---------|
| `src/App.jsx` | Root — all state, nav, wiring |
| `src/hooks/useStorage.js` | localStorage `pitlogic-v5` (cooks, activeCooks, dis) |
| `src/hooks/useRecipes.js` | localStorage `pitlogic-recipes-v1` |
| `src/lib/migrations/` | Idempotent key-rename migration, run at startup |
| `src/lib/telemetry/` | Domain types, normalizer (Zod), EventBus, Store |
| `src/lib/providers/` | TemperatureProvider interface + adapters (CSV, Mock, ThermoWorks stub) |
| `src/lib/compliance/` | ADR-001 through ADR-004, providerGuardrails.md |
| `src/utils/analytics.js` | All analytics + stall detection |

## Recent Session History

- **2026-05-19**: PitLogic milestone fully implemented — Phases 2–12 complete (Zod/TS, migrations, rebrand, src/lib/ architecture, tests)
- **2026-05-18**: PitLogic compliance + rebrand + telemetry architecture design; Phase 0+1 implemented
- **2026-05-10**: "Smoke & Fire" visual refresh; cook comparison charts in AnalyticsTab
- **2026-05-08**: Stall Intelligence v2, Accessibility Sprint, PWA/GitHub Pages Deploy, Data Export/Import
