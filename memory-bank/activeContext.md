---
authority: volatile
review-cycle: 7d
retention: rolling-3-months
staleness-threshold: 7
tags: [current-focus, active]
last-reviewed: 2026-07-03
compaction_generation: 0
source_type: human
confidence: high
lineage: initial
---

# Active Context - Current State

**Last Updated**: 2026-08-31

## Current Focus

ThermoWorks live probe pipeline is merged to main and deployed. Recent work has layered on top of it: CSV replay (PR #7), copy/paste Live Device config for cross-device transfer, ThermoWorks channel labels, and a settings-sheet backdrop-click fix (PRs #9, #10). In parallel, `backlog/rfx-sdk-capabilities` (PR #12) built Device Health, bidirectional device config, completed-cook CSV import, and the BLE provisioning wizard on the same telemetry foundation — merged into this branch from main to reconcile both feature sets before landing.

**Branch**: `backlog/rfx-sdk-capabilities`, merging `origin/main` to reconcile with PRs #7/#9/#10. GitHub Pages auto-deploying from `main`.

## What's Working

- 218 tests passing (19 files) — production build clean
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
- **Live probe pipeline**: MQTT → ThermoWorksAdapter → useThermoWorksProvider → globalEventBus → globalStore (TelemetryStore) → useLiveProbes → DashboardTab "Live Readings" card + SettingsSheet probe list
- **CSV replay pipeline**: CSV file → `useCsvProvider` → `CsvProvider` → telemetry pipeline → Live Readings card (Settings "Replay CSV" card)
- **Live Device config copy/paste**: SettingsSheet — copy current MQTT config to clipboard, paste-and-apply with overwrite confirmation, for cross-device transfer
- **ThermoWorks channel labels**: per-channel high/low alarm labels rendered from `device.channels[]` in SettingsSheet, delivered via `subscribeDeviceMeta()` and kept in hook-local `deviceState` (not the event bus)
- Device Health panel in Settings: per-gateway wifi/battery/firmware and per-probe battery, sourced from `TelemetryStore` via `useTelemetryStore()`; hidden entirely when no gateway is known
- Bidirectional device config: `ThermoWorksAdapter` subscribes to `/devices/+/config`, caches the full retained baseline per gateway, and exposes `publishConfig(gatewayId, edits, fallbackBaseline?)` which merges edits onto that baseline and republishes the complete object (retained) — never a partial config, which the RFX SDK would otherwise silently wipe. Settings now has a "Device Settings"/"Initialize Configuration" card per gateway (`DeviceSettingsCard.jsx`) for editing channel labels, alarm thresholds, and transmit/recording intervals
- CSV import completion: historical (completed) cooks can now import a CSV export too, via a new "Import CSV" card in `DetailView.jsx`'s Overview tab (mirrors `ActiveTab.jsx`'s existing control, wired to the same cook-agnostic `handleCSV`). The unused `CsvProvider`/`csvSchemas.ts` (dead `TemperatureProvider` implementation, registered but never connected) was deleted
- BLE provisioning wizard ships: `ThermoWorksBleProvisioner.ts` (connect/scanWifiNetworks/provision over the ThermaConnect open BLE GATT protocol) behind `useBleProvisioning.js` (the ADR-001 crossing point), driving `BleProvisioningWizard.jsx` — a single-screen idle→connecting→form→provisioning→success/error flow reachable from a new "Set Up New Device" card in Settings, gated on `navigator.bluetooth` support. Manually verified in-browser: entry point renders/gates correctly, wizard opens, `connect()` invokes the real native device chooser and a cancelled/failed pick correctly lands on the error phase with retry, unsupported-browser fallback text replaces the button when `navigator.bluetooth` is absent, no console errors, production build clean

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

1. **Verify HiveMQ Cloud ACL** topic isolation before first live use (each device locked to its own `devices/{id}/events`; see Broker Setup Reference in plan)
2. **End-to-end smoke test** with a real RFX Gateway + HiveMQ Cloud broker (manual — requires hardware) — open deployed app at https://unyieldingclaw-dev.github.io/pitlogic/, connect via Settings → Live Device, confirm temps appear in Dashboard "Live Readings" card

## Open Issues

- iOS silent switch bypasses all browser audio/notifications — investigate PWA push notifications
- BLE provisioning wizard has **not** been verified against real hardware (an actual RFX/NODE device in SETUPMODE) — Web Bluetooth's GATT connect/scan/provision flow can only be exercised end-to-end with physical hardware and a Chrome/Edge browser. Flag for a follow-up manual test with real hardware before considering it fully production-verified.

## Environment Status

**Dev server**: run `npm run dev` → http://localhost:5173/pitlogic/
**Git**: on `main`, fully merged and pushed; remote URL updated to `https://github.com/unyieldingclaw-dev/pitlogic.git`
**GitHub Pages**: live at https://unyieldingclaw-dev.github.io/pitlogic/

## Key Files

| File | Purpose |
|------|---------|
| `src/App.jsx` | Root — all state, nav, wiring; imports `useLiveProbes`/`useTelemetryStore`/`useCsvProvider`, passes `liveProbes`/`gatewayHealth` to DashboardTab + SettingsSheet |
| `src/hooks/useLiveProbes.js` | Subscribes to globalStore, manages stale check, returns `Map<probeId, ProbeState>` |
| `src/lib/telemetry/store/globalStore.ts` | Singleton: `TelemetryStore` wired to `globalEventBus` — the domain boundary crossing point |
| `src/lib/providers/adapters/thermoworks/ThermoWorksAdapter.ts` | ThermaConnect MQTT adapter: topics `/probes/+/events`, `/devices/+/events`, `/devices/+/state`, `/devices/+/config`; `channels[]` array; probeId `{topicId}-ch{channelNumber}`. Gateway-level state summary (wifi/battery/firmware/units) flows through `subscribe()`/globalEventBus for Device Health; full per-channel state (labels/alarms) stays hook-local via `subscribeDeviceMeta()` for Channel Labels |
| `src/lib/providers/adapters/thermoworks/ThermoWorksBleProvisioner.ts` | Web Bluetooth GATT provisioning (connect/scanWifiNetworks/provision) behind `useBleProvisioning.js` |
| `src/components/BleProvisioningWizard.jsx` | BLE device setup wizard, reachable from Settings' "Set Up New Device" card |
| `src/components/DeviceSettingsCard.jsx` | Per-gateway channel labels/alarms/interval editor, backed by `publishConfig()` |
| `src/utils/deviceHealth.js` | `computeGatewayHealth(gatewayState, telemetryProbes)` — derives the Device Health panel's per-gateway view |
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

