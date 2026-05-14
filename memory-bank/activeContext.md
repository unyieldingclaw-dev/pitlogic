# Active Context - Current State

**Last Updated**: 2026-05-10

## Current Focus

No active in-flight feature work. Cuts & Cook Preferences feature is complete and pushed to main.

## What's Working

- All 66 tests passing
- Production build clean
- GitHub Pages deployed and auto-deploying on push to main
- PWA installable on mobile
- Full data export/import (JSON backup with merge/replace modes)
- Stall Intelligence v2 with real-time ETA, climb rate, stall probability
- Accessibility: keyboard nav, aria-*, semantic HTML throughout
- Expanded cuts library: 21 total cuts across 5 categories including new Lamb category
- Per-cut cook preferences: inline save + Settings manager with reset

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

## Claude Code Infrastructure (2026-05-14)

Two PRs open — merge these before next dev session:

**`feat/token-budget-karpathy`**
- `.claude/settings.json`: added `model: sonnet`, env vars (`MAX_THINKING_TOKENS=10000`, `CLAUDE_CODE_SUBAGENT_MODEL=haiku`, `DISABLE_NON_ESSENTIAL_MODEL_CALLS=1`), replaced PostToolUse lint hook with Stop notification hook (Windows MessageBox / macOS notify-send)
- `CLAUDE.md`: appended `## Token Budget` (model escalation rules, compact timing, session commands) and `## Karpathy Coding Principles` (Think Before Coding, Simplicity First, Surgical Changes, Goal-Driven Execution)

**`feat/standards-and-hooks-guide`**
- Added `standards/` directory with 7 files: `SECURITY-GUARDRAILS.md`, `CODE-QUALITY.md`, `AGENTIC-SAFETY.md`, `ACCESSIBILITY.md`, `LOGGING.md`, `WORKFLOW.md`, `MCP-SECURITY.md`
- Added `standards/extensions/`: `typescript.md`, `python.md`, `logging-python.md`, `_template.md`
- Added `docs/HOOKS-GUIDE.md`
- Resolves all broken cross-references in `CLAUDE.md`

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
| `src/components/SettingsSheet.jsx` | Backup/restore UI + My Defaults section |
| `src/hooks/usePrefs.js` | Per-cut temp preferences, localStorage `rfx-prefs-v1` |
| `src/data/meats.js` | Meat categories + cuts lists |
| `src/data/cuts.js` | Cut guides (temps, stages, pellets, tips) |
| `.github/workflows/deploy.yml` | CI/CD auto-deploy |

## Recent Session History

- **2026-05-10**: Cuts & Cook Preferences — 12 new cuts + Lamb category, `usePrefs` hook, inline "Save as default" badge in ActiveTab, "My Defaults" section in SettingsSheet, service worker cache fix (rfx-v2 + localhost bypass)
- **2026-05-10**: "Smoke & Fire" visual refresh — warm amber gradients, breathing animations, ambient orbs, gradient text, TempChart area fills across all tabs
- **2026-05-08**: Stall Intelligence v2, Accessibility Sprint, PWA/GitHub Pages Deploy, Data Export/Import
- **Earlier**: Multi-probe temp tracking, cook history, recipe management, Plan to Eat CSV import, share card, mop timer
