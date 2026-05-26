---
authority: volatile
review-cycle: 7d
retention: rolling-3-months
staleness-threshold: 7
tags: [current-focus, active]
last-reviewed: 2026-05-26
compaction_generation: 0
source_type: human
confidence: high
lineage: initial
---

# Active Context - Current State

**Last Updated**: 2026-05-26

## Current Focus

Branch `chore/update-memory-bank-2026-05-14` is 4 commits ahead of main — Claude Code infra, CompareChart fullscreen, and MIT license are all committed. **Next action: open PR to main.**

A separate branch `claude/frosty-hellman-9c2f1d` holds the PitLogic rebrand + telemetry architecture work (not yet merged — pending review/decision).

Three additional local branches exist, not yet merged or documented:
- `claude/ecstatic-golick-1ed1ab` — tip at main (`fb3d542`); stale Claude worktree, likely safe to delete
- `feat/standards-and-hooks-guide` — 1 commit ahead of main; adds `standards/` directory + `docs/HOOKS-GUIDE.md` from template
- `feat/token-budget-karpathy` — 1 commit ahead of main; adds Karpathy principles + token budget settings to CLAUDE.md

## What's Working

- 98 tests passing (7 test files) — real count after fixing Vitest worktree leak + adding useRecipes hook tests
- Production build clean
- GitHub Pages deployed and auto-deploying on push to main
- PWA installable on mobile
- Full data export/import (JSON backup with merge/replace modes)
- Stall Intelligence v2 with real-time ETA, climb rate, stall probability
- Accessibility: keyboard nav, aria-*, semantic HTML throughout
- Expanded cuts library: 21 total cuts across 5 categories including Lamb
- Per-cut cook preferences: inline save + Settings manager with reset
- Compare mode in Analytics tab (CompareChart, HistoryTab updates)

## Claude Code Infrastructure (2026-05-20 → 2026-05-26)

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
- Env: `MAX_THINKING_TOKENS: 10000`, `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: 50`, `CLAUDE_CODE_SUBAGENT_MODEL: haiku`, `DISABLE_NON_ESSENTIAL_MODEL_CALLS: 1`
- Permission denies: .env, .env.*, settings.local.json
- Hook registrations: block-dangerous-ops (PreToolUse/Bash), pre-edit-karpathy (PreToolUse/Edit|Write), user-prompt-submit (UserPromptSubmit), update-reviewed.sh (PostToolUse/Write|Edit)

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

1. **Open PR** — `chore/update-memory-bank-2026-05-14` → main (commits are already staged)
2. **PitLogic decision** — decide whether to merge/close `claude/frosty-hellman-9c2f1d` (full rebrand + telemetry arch)
3. **Open bugs** (lower priority):
   - CSP eval error in dev server: `vite.config.js` configureServer approach (TempChart height bug resolved in `be60511`)

## Parking Lot Features

1. **ThermoWorks real-time integration** — MCP server / CLI bridge for live sensor data
2. **Probe target alerts** — browser notification at target temp (depends on real-time feed)

## Environment Status

**Dev server**: run `npm run dev` → http://localhost:5173/rfx-cook-tracker/
**Git**: branch `chore/update-memory-bank-2026-05-14`, 4 commits ahead of main; working tree has uncommitted changes (memory-bank updates, useRecipes tests, vite.config.js, useStorage.test.js, health-check.md, scripts/)
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
