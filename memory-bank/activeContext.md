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

**Last Updated**: 2026-07-02

## Current Focus

Post-merge cleanup — PR #8 (channel labels + device health + unit toggle) squash-merged to main 2026-07-01. GitHub Pages auto-deploying. CSV import UI confirmed already complete (see below). Only remaining blocker: HiveMQ Cloud ACL topic isolation — in progress, see "HiveMQ ACL Investigation" below.

**Branch**: `main` — all ThermoWorks work merged (PR #6 2026-06-30, PR #8 2026-07-01).

## HiveMQ ACL Investigation (2026-07-02, in progress)

Cluster: "Free #1" (HiveMQ Cloud **Free tier**), org "UnyieldingClaw". Two credentials exist: `pitlogic-browser` (declared permission `SUBSCRIBE_ONLY`), `rfxgateway` (declared permission `PUBLISH_ONLY`). No per-device (per-topic) isolation configured yet as of session start.

**App's actual topic shape** (`src/lib/providers/adapters/thermoworks/ThermoWorksAdapter.ts`):
- Subscribe: `/probes/+/events`, `/devices/+/events`, `/devices/+/state`
- Publish: `/devices/{deviceId}/config` (via `publishDeviceConfig` — not currently wired to any UI, dead code path today)

**Findings so far:**
- Access Management → Authorization → Permissions form has only 4 fields: Name, Description, Permission Type, Topic Filter. **No credential/client-ID selector.**
- Per HiveMQ docs: a created permission isn't bound to anything by itself — it becomes selectable *during credential creation*. Credentials are assigned a single permission, or a **role** that bundles multiple permissions (roles likely gated to Starter+ tier, unconfirmed — same pattern as Client Certificate/JWT which explicitly say "available in Cloud Starter and higher tier plans").
- Free/PAYG tier: **one topic filter per permission** (confirmed via HiveMQ blog).
- Existing credentials (`pitlogic-browser`, `rfxgateway`) have **no visible Edit action** — only a delete (trash) icon. Clicking the credential name did nothing. Likely means permission-at-creation-time is immutable after the fact on Free tier.
- 6 narrow custom permissions were created (`browser-probe-events`, `browser-device-events`, `browser-device-state` → SUBSCRIBE_ONLY; `gateway-probe-events`, `gateway-device-events`, `gateway-device-state` → PUBLISH_ONLY), each scoped to one of the app's real topics. **These are not yet attached to the two credentials** — likely still inert since credentials predate them and can't be edited.
- Three pre-existing default permissions also present: "Subscribe Only" / "Publish Only" / "Publish and Subscribe", all on topic `#` (HiveMQ's built-in defaults, not user-created).

**Working theory / next step:** Since Free tier gives one topic filter per permission and (probably) no role-bundling, the credentials need to be **deleted and recreated**, this time picking the permission at creation time. Because 3 separate topic filters can't be attached to one credential without roles, the practical compromise is a single filter `/+/+/+` (matches all 3 real topic shapes — `/probes/{id}/events`, `/devices/{id}/events`, `/devices/{id}/state` — since all are exactly 3 segments) instead of the current default `#` (unbounded depth, matches `$SYS` diagnostics too). Not yet executed — user was about to check the credential-creation form's Permission dropdown to confirm custom permissions appear there before proceeding.

**Resume point:** Check whether "Add Credentials" → Permission field lists the 6 custom permissions (confirms attach-at-creation theory) or only the 3 built-in defaults (would mean custom permissions are decorative-only on Free tier and the `/+/+/+` single-filter approach must be applied by editing/recreating the *permission* the credential already defaults to, if that's even possible — needs verification). Ambient/pit probe needs no separate rule — it shares the gateway's existing topic pattern via the `+` wildcard on channel number.

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
- **Live probe pipeline (main)**: MQTT → ThermoWorksAdapter → useThermoWorksProvider → globalEventBus → globalStore (TelemetryStore) → useLiveProbes → DashboardTab "Live Readings" card + SettingsSheet probe list
- **Channel labels (PR #8, 2026-07-01)**: `subscribeDeviceMeta` → `/devices/+/state` → `channelMeta` Map with `Ch N` fallback; `shortProbeLabel()` last-resort in DashboardTab; unit toggle (°F/°C) in SettingsSheet; Non-TLS `role=alert` warning; `publishDeviceConfig` deviceId injection guard; Device Health panel; 211 tests passing

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

1. **Verify HiveMQ Cloud ACL** topic isolation before first live use (each device locked to its own `devices/{id}/events`) — requires HiveMQ dashboard access, user action
2. **End-to-end smoke test** with real RFX Gateway — open deployed app at https://unyieldingclaw-dev.github.io/pitlogic/, connect via Settings → Live Device, confirm labels appear in "Live Readings" card (should show "Ch 1", "Ch 2", etc. or user-defined names from device state) — requires hardware, user action

CSV import UI is done (commit `35c5ea4`, 2026-06-30): `useCsvProvider` hook bridges `CsvProvider` → normalizer → `globalEventBus`; "Replay CSV" section live in SettingsSheet with file picker, status, error display. Verified 2026-07-02: 211/211 tests passing.

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

