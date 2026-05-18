# Active Context - Current State

**Last Updated**: 2026-05-18

## Current Focus

**PitLogic compliance + rebrand + telemetry architecture milestone** (active).
Branch: `claude/frosty-hellman-9c2f1d`. Spec: `docs/superpowers/specs/2026-05-18-pitlogic-sdk-compliance-rebrand-design.md`.

## What's Working

- All 58 tests passing
- Production build clean
- GitHub Pages deployed and auto-deploying on push to main
- PWA installable on mobile
- Full data export/import (JSON backup with merge/replace modes)
- Stall Intelligence v2 with real-time ETA, climb rate, stall probability
- Accessibility: keyboard nav, aria-*, semantic HTML throughout

## Immediate Next Steps

Active milestone phases (in order):

1. ✅ Phase 0: Design spec doc committed
2. ✅ Phase 1: Compliance ADRs + CLAUDE.md + memory-bank updates (in progress)
3. Phase 2: Install Zod, create `tsconfig.lib.json`, update `vite.config.js` for .ts in lib/
4. Phase 3: Migration system (`src/lib/migrations/`) + 6 regression tests + wire into `src/main.jsx`
5. Phase 4: Full rebrand — 16 files (package.json, manifest, sw.js, App.jsx, etc.)
6. Phases 5–9: `src/lib/` implementation — domain types, normalizer, EventBus, Store, providers
7. Phase 10: Wire CSV end-to-end through new pipeline, verify all tests pass
8. Phase 11: Tests for normalization, MockProvider, TelemetryStore
9. Phase 12: Final memory/docs cleanup

## Environment Status

**Dev server**: run `npm run dev` → http://localhost:5173/rfx-cook-tracker/
**Git**: main branch, fully pushed, clean
**GitHub Pages**: live at https://unyieldingclaw-dev.github.io/rfx-cook-tracker/

## Key Files

| File | Purpose |
|------|---------|
| `src/App.jsx` | Root — all state, nav, wiring |
| `src/hooks/useStorage.js` | localStorage `rfx-v5` (cooks, activeCooks, dis) |
| `src/hooks/useRecipes.js` | localStorage `rfx-recipes-v1` |
| `src/utils/analytics.js` | All analytics + stall detection |
| `src/utils/dataPortability.js` | Export/import pure functions |
| `src/components/SettingsSheet.jsx` | Backup/restore UI |
| `.github/workflows/deploy.yml` | CI/CD auto-deploy |

## Recent Session History

- **2026-05-18**: PitLogic compliance + rebrand + telemetry architecture design (extended brainstorming → approved plan → Phase 0+1 implementation)
- **2026-05-10**: "Smoke & Fire" visual refresh — warm amber gradients, breathing animations, ambient orbs, gradient text, TempChart area fills across all tabs; cook comparison charts shipped in AnalyticsTab
- **2026-05-08**: Stall Intelligence v2, Accessibility Sprint, PWA/GitHub Pages Deploy, Data Export/Import
- **Earlier**: Multi-probe temp tracking, cook history, recipe management, Plan to Eat CSV import, share card, mop timer
