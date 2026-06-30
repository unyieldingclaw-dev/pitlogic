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
- **2026-06-30**: `useCsvProvider` hook + Settings "Replay CSV" card — CSV file → CsvProvider → telemetry pipeline → Live Readings card; 171 → 183 tests
- **2026-06-30**: ThermoWorks integration merged to main (PR #6) — full live probe UI pipeline deployed to GitHub Pages; 43 pre-existing lint errors resolved (0 errors, 0 warnings); 171 tests passing
- **2026-06-29**: Live probe UI pipeline complete (feature branch) — `globalStore.ts` singleton, `useLiveProbes` hook, Dashboard "Live Readings" card, SettingsSheet probe list; ThermoWorksAdapter payload parser fixed for real gateway format (`sensors[]`, `/devices/+/events`, probeId `{deviceId}-s{sensorId}`); 169 → 171 tests
- **2026-05-28**: ThermoWorks MQTT adapter complete — `ThermoWorksAdapter`, `useThermoWorksProvider`, "Live Device" UI; 146 → 169 tests across 16 files
- **2026-05-27**: CSV parser extracted to `src/utils/csvTemperatureParser.js` (9 tests); inline `thin()`/`parseCSV()` removed from `App.jsx`
- **2026-05-26**: PitLogic rebrand + telemetry architecture merged to main; Claude Code infrastructure (hooks, agents, commands, CI, standards) merged to main; 137 → 146 tests
- **2026-05-19**: PitLogic Phases 0–12 complete — SDK compliance ADRs, migrations, src/lib/ provider pipeline, Zod normalizer
- **2026-05-10**: "Smoke & Fire" visual refresh; expanded cuts library (21 cuts); CompareChart; probe/smoker alerts

## 📋 Planned / Parking Lot

### ThermoWorks Real-Time Integration
- [x] Design spec complete — `docs/superpowers/specs/2026-05-27-thermoworks-mqtt-adapter-design.md`
- [x] Implementation plan — `docs/superpowers/plans/2026-05-27-thermoworks-mqtt-adapter.md`
- [x] `ThermoWorksAdapter` — ThermaConnect MQTT implementation with full test coverage (16 tests)
- [x] `useThermoWorksProvider` hook — lifecycle orchestration + normalizer → eventBus wiring (7 tests)
- [x] "Live Device" section in `SettingsSheet.jsx` — broker URL, credentials, connect/disconnect, status indicator, probe list
- [x] Hook wired into `App.jsx` — `mqttStatus`, `mqttError`, `onMqttConnect`, `onMqttDisconnect`, `liveProbes` props
- [x] `mqtt` npm dependency added
- [x] `globalStore.ts` singleton + `useLiveProbes` hook — TelemetryStore → React bridge
- [x] Dashboard "Live Readings" card — appears when `liveProbes.size > 0`
- [x] `transformPayload` fixed for real gateway format (`sensors[]`, `/devices/+/events`)
- [x] Merge `claude/thermoworks-integration-dou7k5` → main (PR #6, merged 2026-06-30)
- [ ] Verify HiveMQ Cloud ACL topic isolation before first live use
- [ ] End-to-end smoke test with real RFX Gateway + HiveMQ Cloud broker

### iOS Alarm
- [ ] **iOS alarm options** — silent switch bypasses all browser audio/notifications on iOS; investigate native PWA push notifications or other iOS-specific workaround when ready

## 🐛 Known Bugs (Low Priority)

- CSP eval error in dev server from `vite.config.js` configureServer approach

## 📊 Test Coverage

- **Total tests**: 169 passing (16 test files) as of 2026-05-28
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
- `ThermoWorksAdapter.test.ts` — 16 cases: transformPayload (8: single channel, multi-channel, non-T type, seconds-epoch, non-integer ts, malformed JSON, no channels, unknown topic) + lifecycle (8: connect/subscribe, idempotent connect, exactly-one message listener, disconnect+reconnect, no handler after disconnect, multi-channel emit, reconnect sessionPresent=true, reconnect sessionPresent=false)
- `useThermoWorksProvider.test.js` — 7 cases: initial state, connect success, missing config error, adapter throw, disconnect, unmount cleanup, event pipeline wiring
