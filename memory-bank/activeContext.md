# Active Context - Current State

**Last Updated**: 2026-05-20

## Current Focus

Claude Code infrastructure plan complete. Branch `chore/update-memory-bank-2026-05-14` has both memory-bank updates and infra work uncommitted — ready for commit + PR.

## What's Working

- 169 tests passing (16 test files)
- Production build clean
- GitHub Pages deployed and auto-deploying on push to main
- PWA installable on mobile
- Full data export/import (JSON backup with merge/replace modes)
- Stall Intelligence v2 with real-time ETA, climb rate, stall probability
- Accessibility: keyboard nav, aria-*, semantic HTML throughout
- Expanded cuts library: 21 total cuts across 5 categories including Lamb
- Per-cut cook preferences: inline save + Settings manager with reset
- Compare mode in Analytics tab (CompareChart, HistoryTab updates)

## Claude Code Infrastructure (completed 2026-05-20)

All 22 operations from the testing agent flow plan are complete:

**Hooks** (`.claude/hooks/`):
- `block-dangerous-ops.sh` — blocks 15 dangerous patterns (force-push, reset --hard, DROP TABLE, curl|bash, etc.)
- `user-prompt-submit.sh` — memory-bank + context reminder at each turn
- `pre-edit-karpathy.sh` — Karpathy reminder + task contract path warning

**Agents** (`.claude/agents/`):
- `test-strategist.md` — diff-scoped test gap analysis, haiku/effort:low
- `maintainability-reviewer.md` — dead code + abstraction + comment audit, haiku/effort:low
- `security-reviewer.md` — updated: model:haiku, effort:low
- `researcher.md` — updated: model:haiku, effort:medium

**Commands** (`.claude/commands/`):
- `code-review.md` — upgraded to 8-phase: Scope → Context+Contract → 5 parallel subagents → Opponent-Auditor
- `test-audit.md` — whole-codebase test gap analysis
- `comment-pass.md` — dead code scan + WHY comment audit
- `memory-prune.md` — stale/duplicate/sensitive data scan in memory-bank/
- `handoff.md` — graceful context handoff with contract archival

**Settings** (`.claude/settings.json` — new tracked file):
- `CLAUDE_CODE_SUBAGENT_MODEL: haiku` env
- Permission denies: .env, .env.*, settings.local.json
- Hook registrations: block-dangerous-ops (Bash), pre-edit-karpathy (Edit|Write), user-prompt-submit

**CI** (`.github/workflows/deploy.yml`):
- `fetch-depth: 2` on checkout
- `npm test -- --run` step (tests must pass before build)
- File size gate: warn at 400 lines, fail new/modified files at 650 (grandfathered)

**Cursor Rules** (`.cursor/rules/`):
- `architecture.mdc` — state/localStorage/purity/button/size constraints
- `code-quality.mdc` — augmented with 3 testable constraints
- `accessibility.mdc` — aria-label, aria-pressed, keyboard, heading order
- `memory-bank.mdc` — augmented with 4 testable rules section

**Global CLAUDE.md** — fixed incorrect Haiku claim (line 20)

## Immediate Next Steps

1. **Commit + PR** — stage and commit all infra changes on current branch, open PR to main
2. **Open bugs** (lower priority):
   - TempChart `width(-1) height(-1)` warning: `src/components/TempChart.jsx:88` — change `<div height={h}><ResponsiveContainer height="100%">` to `<div><ResponsiveContainer height={h}>`
   - CSP eval error in dev server: `vite.config.js` configureServer approach

## Parking Lot Features

1. **ThermoWorks real-time integration** — MCP server / CLI bridge for live sensor data
2. **Probe target alerts** — browser notification at target temp (depends on real-time feed)
3. **Cook comparison charts** — already in progress on this branch (CompareChart complete)

## Environment Status

**Dev server**: run `npm run dev` → http://localhost:5173/rfx-cook-tracker/
**Git**: branch `chore/update-memory-bank-2026-05-14`, changes uncommitted
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
| `.github/workflows/deploy.yml` | CI/CD auto-deploy + test gate + file size gate |
| `.claude/settings.json` | Hooks, permission denies, Haiku subagent config |
