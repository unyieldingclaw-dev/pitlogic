---
authority: accumulating
review-cycle: 30d
retention: rolling-3-months
staleness-threshold: 30
tags: [progress, completed, planned]
last-reviewed: 2026-05-26
compaction_generation: 0
source_type: human
confidence: high
lineage: initial
---

# Progress Tracker

**Last Updated**: 2026-05-26

## ✅ Completed Features

Full completed-items history archived in `progress-archive.md`.

### Recent Milestones
- **2026-05-27**: CSV parser extracted to `src/utils/csvTemperatureParser.js` (9 tests); inline `thin()`/`parseCSV()` removed from `App.jsx`
- **2026-05-26**: PitLogic rebrand + telemetry architecture merged to main; Claude Code infrastructure (hooks, agents, commands, CI, standards) merged to main; 137 → 146 tests
- **2026-05-19**: PitLogic Phases 0–12 complete — SDK compliance ADRs, migrations, src/lib/ provider pipeline, Zod normalizer
- **2026-05-10**: "Smoke & Fire" visual refresh; expanded cuts library (21 cuts); CompareChart; probe/smoker alerts

## 📋 Planned / Parking Lot

### ThermoWorks Real-Time Integration
- [x] Design spec complete — `docs/superpowers/specs/2026-05-27-thermoworks-mqtt-adapter-design.md`
- [ ] Write implementation plan (writing-plans skill)
- [ ] Implement `ThermoWorksAdapter` — replace stub with `mqtt.js` over WebSocket (ThermaConnect protocol)
- [ ] Implement `useThermoWorksProvider` hook — lifecycle orchestration, normalizer → eventBus wiring
- [ ] Add "Live Device" section to `SettingsSheet.jsx` — broker URL, credentials, connect/disconnect
- [ ] Wire `{ status, error }` from hook into App.jsx / header status indicator
- [ ] Add `mqtt` npm dependency
- [ ] Verify HiveMQ Cloud ACL topic isolation before shipping wildcard subscription

### iOS Alarm
- [ ] **iOS alarm options** — silent switch bypasses all browser audio/notifications on iOS; investigate native PWA push notifications or other iOS-specific workaround when ready

## 🐛 Known Bugs (Low Priority)

- CSP eval error in dev server from `vite.config.js` configureServer approach

## 📊 Test Coverage

- **Total tests**: 146 passing (14 test files) as of 2026-05-27
- `analytics.test.js` — analytics functions, edge cases
- `dataPortability.test.js` — export/import round-trip + merge logic
- `planToEatParser.test.js` — CSV parsing edge cases
- `helpers.test.js` — formatting + PROBE_COLORS
- `useRecipes.test.js` — hook API (add, update, remove, importMany, replaceAll, load) + Plan to Eat integration
- `usePrefs.test.js` — per-cut pref CRUD, localStorage round-trip, invalid JSON (`src/tests/usePrefs.test.js`)
- `useStorage.test.js` — load/save/replaceAll, legacy aid migration, error swallowing
- `useProbeAlert.test.js` — probe target notification tests
- `useSmokerAlert.test.js` — smoker low temp alarm tests
- `migrationRunner.test.ts` — 6 cases: fresh install, success, corrupted data, partial, idempotent, no-overwrite
- `normalize.test.ts` — 6 cases: active, disconnected, C→F, normalizedBy, malformed
- `MockProvider.test.ts` — 5 cases: tick interval, rate, disconnect, multi-probe, unsubscribe
- `TelemetryStore.test.ts` — 7 cases: register, disconnect, reconnect, stale, fresh, notify, unsubscribe
- `csvTemperatureParser.test.js` — 9 cases: empty input, header-only, probe temps, smoker column, time as minutes, skip non-numeric, thinning, empty pData, case-insensitive headers
