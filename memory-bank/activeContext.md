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

**Last Updated**: 2026-06-29

## Current Focus

ThermoWorks end-to-end pipeline — complete on feature branch, ready to merge and smoke-test with real hardware.

**Branch**: `claude/thermoworks-integration-dou7k5` — merged to main 2026-06-30 (PR #6). GitHub Pages auto-deploying.

## What's Working

- 171 tests passing — production build clean
- GitHub Pages deployed and auto-deploying on push to main
- PWA installable on mobile
- Full data export/import (JSON backup with merge/replace modes)
- Stall Intelligence v2 with real-time ETA, climb rate, stall probability
- Accessibility: keyboard nav, aria-*, semantic HTML throughout
- Expanded cuts library: 21 total cuts across 5 categories including Lamb
- Per-cut cook preferences: inline save + Settings manager with reset
- Compare mode in Analytics tab (CompareChart, HistoryTab updates)
- PitLogic branding throughout — no RFX visible in UI
- Migration system: first-run key rename `rfx-* → pitlogic-*`, idempotent
- Telemetry architecture: domain types, normalizer, EventBus, TelemetryStore, SessionStore, providers
- **Live probe pipeline (feature branch)**: MQTT → ThermoWorksAdapter → useThermoWorksProvider → globalEventBus → globalStore (TelemetryStore) → useLiveProbes → DashboardTab "Live Readings" card + SettingsSheet probe list

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

## Immediate Next Steps

1. **Verify HiveMQ Cloud ACL** topic isolation before first live use (each device locked to its own `devices/{id}/events`)
2. **End-to-end smoke test** with real RFX Gateway — open deployed app at https://unyieldingclaw-dev.github.io/pitlogic/, connect via Settings → Live Device, confirm temps appear in Dashboard "Live Readings" card
3. **Wire CSV import UI** through `CsvProvider` (`parseCsvReadings` utility extracted to `src/utils/csvTemperatureParser.js`; App.jsx wired; CsvProvider bridge not yet built)

## Open Issues

- CSP eval error in dev server: `vite.config.js` configureServer approach (low priority)
- iOS silent switch bypasses all browser audio/notifications — investigate PWA push notifications

## Environment Status

**Dev server**: run `npm run dev` → http://localhost:5173/pitlogic/
**Git**: on `main`, fully merged and pushed; remote URL updated to `https://github.com/unyieldingclaw-dev/pitlogic.git`
**GitHub Pages**: live at https://unyieldingclaw-dev.github.io/pitlogic/

## Key Files

| File | Purpose |
|------|---------|
| `src/App.jsx` | Root — all state, nav, wiring; imports `useLiveProbes`, passes `liveProbes` to DashboardTab + SettingsSheet |
| `src/hooks/useLiveProbes.js` | Subscribes to globalStore, manages stale check, returns `Map<probeId, ProbeState>` |
| `src/lib/telemetry/store/globalStore.ts` | Singleton: `TelemetryStore` wired to `globalEventBus` — the domain boundary crossing point |
| `src/lib/providers/adapters/thermoworks/ThermoWorksAdapter.ts` | ThermaConnect MQTT adapter: topics `/probes/+/events`, `/devices/+/events`, `/devices/+/state`; `channels[]` array; probeId `{topicId}-ch{channelNumber}` |
| `src/hooks/useStorage.js` | localStorage `pitlogic-v5` (cooks, activeCooks, dis) |
| `src/hooks/useRecipes.js` | localStorage `pitlogic-recipes-v1` |
| `src/hooks/useProbeAlert.js` | Browser notification when probe hits target temp |
| `src/hooks/useSmokerAlert.js` | Browser notification + Web Audio when pit drops below threshold |
| `src/lib/migrations/` | Idempotent key-rename migration, run at startup |
| `src/lib/telemetry/` | Domain types, normalizer (Zod), EventBus, TelemetryStore, SessionStore |
| `src/lib/providers/` | TemperatureProvider interface + adapters (CSV, Mock, ThermoWorks) |
| `src/lib/compliance/` | ADR-001 through ADR-004, providerGuardrails.md |
| `src/utils/analytics.js` | All analytics + stall detection |
| `src/utils/dataPortability.js` | Export/import pure functions |
| `src/components/DashboardTab.jsx` | Dashboard — includes "Live Readings" card when `liveProbes.size > 0` |
| `src/components/SettingsSheet.jsx` | Backup/restore + My Defaults + Live Device section with probe list |
| `src/hooks/usePrefs.js` | Per-cut temp preferences, localStorage `pitlogic-prefs-v1` |
| `src/data/meats.js` | Meat categories + cuts lists |
| `src/data/cuts.js` | Cut guides (temps, stages, pellets, tips) |
| `.github/workflows/deploy.yml` | CI/CD auto-deploy + test gate + file size gate |
| `.claude/settings.json` | Hooks, permission denies, Haiku subagent config |

