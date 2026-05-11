# Active Context - Current State

**Last Updated**: 2026-05-10

## Current Focus

No active in-flight feature work. "Smoke & Fire" visual refresh is complete and committed to main.

## What's Working

- All 58 tests passing
- Production build clean
- GitHub Pages deployed and auto-deploying on push to main
- PWA installable on mobile
- Full data export/import (JSON backup with merge/replace modes)
- Stall Intelligence v2 with real-time ETA, climb rate, stall probability
- Accessibility: keyboard nav, aria-*, semantic HTML throughout

## Immediate Next Steps

The parking lot items (in priority order, none started):

1. **ThermoWorks real-time integration**
   - Goal: pipe live sensor data into the app so ETA and probe alerts are genuinely useful
   - Approach TBD: MCP server, CLI bridge, or polling local endpoint
   - Blocked on: research into ThermoWorks API / Smoke X connectivity

2. **Probe target alerts**
   - Browser notification when a probe hits its target temperature
   - Depends on: real-time data feed (item 1)

3. **Cook comparison charts**
   - Overlay temperature curves from multiple past cooks of the same cut
   - Independent of real-time integration

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

- **2026-05-10**: "Smoke & Fire" visual refresh — warm amber gradients, breathing animations, ambient orbs, gradient text, TempChart area fills across all tabs
- **2026-05-08**: Stall Intelligence v2, Accessibility Sprint, PWA/GitHub Pages Deploy, Data Export/Import
- **Earlier**: Multi-probe temp tracking, cook history, recipe management, Plan to Eat CSV import, share card, mop timer
