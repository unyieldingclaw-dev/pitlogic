---
authority: accumulating
review-cycle: 30d
retention: rolling-3-months
staleness-threshold: 30
tags: [progress, completed, planned]
last-reviewed: 2026-11-01
compaction_generation: 0
source_type: human
confidence: high
lineage: initial
---

# Progress Tracker

## PR #12 merged and deployed — 2026-11-27

- [x] PR #12 merged to `main` as `a3b505d` (2026-11-25) and deployed to GitHub Pages; 357/357 tests and build passed before merge.
- [x] Live-site smoke test passed (start/log/reload/end cook, Settings, Devices) with no console errors.
- [x] Chart rendering fixes (359/359 tests) merged via PR #13 as `809b9c4` and verified live: hourly compare ticks, expanded chart sized with no warnings, title color fixed.
- [ ] Service worker is stale-while-revalidate: the first visit after a deploy shows the previous build, and the next load gets the new one.
- [ ] PMB tooling 1.2.1 upgrade preserved on local branch `chore/pmb-1.2.1` — needs its own PR.
- [ ] Remaining release gates: real RFX hardware, iPhone Safari/Android Chrome, unattended long cook; 8 pre-existing `tsc` diagnostics.

## Compare chart regression check — 2026-11-25

- [x] Reproduced and removed transient Recharts sizing warnings on expanded Compare chart; verified inline/expanded desktop and mobile chart rendering with isolated synthetic cooks.
- [x] Current shared snapshot passed 359/359 tests; production build, changed-file ESLint and diff check passed for this edit. Existing large-chunk warning remains.
- [ ] Stage B storage/recording proof and B3 analytics/history gate remain separate; no integration or deployment from this check.

**Last Updated**: 2026-11-27

## RFX setup research — 2026-11-12

- [x] Checked live official ThermaConnect GitHub README and manufacturer setup/session/sensor/cadence documentation; distinguished physical probes, minimum-derived channels, ambient capture and Cloud session archives.
- [ ] Run a named fresh test cook and verify archive completeness; existing historical data validity remains unassessed.
- [ ] Include temperature-change triggers/read/heartbeat semantics in B3 freshness/advice proof; current 30-second staleness policy needs validation against actual device configuration. No device or application behavior changed during research.

## Realistic background and usability follow-up — 2026-11-12

- [x] Replaced illustrated SVG flame with a local 64.5 KB generated photographic WebP and theme-aware luminance masking; user likes the result.
- [x] Verified 357/357 tests, production build, App lint/diff checks, and Chrome desktop/mobile dark plus mobile light appearance. Existing build chunk warning remains.
- [x] Inspected authorized ThermoWorks Cloud UI read-only to establish new-session and saved-session paths; no real device/session/account changes.
- [ ] Walk through starting/monitoring and reviewing cooks in ThermoWorks' app; user also wants PitLogic to be more user friendly. B3 analytics/history proof remains pending separately.

## Stage B storage/recording checkpoint — 2026-11-01

- [x] User agreed to begin isolated Stage B storage/recording proof; branch `codex/recording-storage-proof`, base `1067690`, head `a40df15`.
- [x] Implemented repository/migration, epoch/conflict recovery, accepted-event bridge, opt-in recorder, binding/end lifecycle and bounded recovery release without App/source integration or user migration.
- [x] Passed 384/384 tests,17 real Chromium scenarios, build/lint/diff/script checks and172,800 exact accelerated long-fixture samples. Same eight baseline TS diagnostics/build warning. Independent adversarial findings corrected and rechecked. See `docs/qa/STORAGE_RECORDING_PROOF.md` and `docs/qa/evidence/storage-recording-proof/`.
- [ ] B3 cadence/history/analytics proof; then B4 source/application/import integration and B5 full resource/native-device/PWA acceptance. Primary remains Stage A `1067690`. No proof merge/push/deployment or actual unattended-duration claim.

## Stage A integrated locally — 2026-11-01

- [x] User approved local integration; fast-forwarded primary `backlog/rfx-sdk-capabilities` from `2e53431` to `1067690`, including QA-004 prerequisite.
- [x] Reran full tests (357/357, 32 files), production build and diff check on merged checkout; passed with existing bundle warning. Verified reviewed source equality and preserved premerge originals against SHA-256 manifest.
- [x] Preserved audit/memory work and the host-managed feature worktree. No push, PR or deployment.
- [x] Opened integrated local preview on port 5181 and completed synthetic manual start/Devices draft return/log/end/History walkthrough via visible Chrome; screenshot saved. Preview remains open for user.
- [ ] Receive user's own flow feedback; retain separate Stage B/storage approval and real-device/mobile/sustained-session release gates.

## Stage A implementation and verification — 2026-11-01

- [x] User approved Stage A only; implemented in `codex/usability-stage-a`, head `1067690`, carrying reviewed QA-004 `21eef18` as prerequisite.
- [x] Delivered consistent primary navigation, essential manual setup, Devices/draft return, edited-config connection and truthful live-versus-recorded copy without cook schema changes.
- [x] Fixed independent review findings and walkthrough recovery issues with focused regressions; final review found no concrete remaining regression.
- [x] Passed 357/357 tests, build/diff check and four dark/light mobile/desktop production-preview browser flows including synthetic broker reconnect and real backup restore. Evidence: `docs/qa/STAGE_A_VERIFICATION.md`, `docs/qa/evidence/stage-a/`. Existing lint/TS/bundle diagnostics documented. Preview stopped.
- [x] Chose local integration; primary now `1067690` (see integration entry above). Stage B recording/storage exception and real-device/native-mobile/sustained-session checks remain gated.

## Two-stage plan revision and follow-up review — 2026-10-31

- [x] User approved revision work; split usability Stage A from recording/storage Stage B in active v2 plan/spec, retaining original review baselines.
- [x] Addressed R1–R11 with explicit contracts/file ownership/tests; independently re-reviewed, corrected StallCoach and recipe-import coordination gaps, and obtained design-level clearance in both reviewer lenses.
- [x] Saved disposition and limits in `docs/qa/FLOW_PLAN_REVISION_2_REVIEW.md`. No product implementation or migration run.
- [ ] Obtain Stage A execution approval separately; Stage B and the localStorage-rule amendment remain gated. Implementation/performance/device proof still required.

## Adversarial implementation-plan review — 2026-10-31

- [x] Ran independent data, UX, and performance reviews plus opponent validation; saved findings in `docs/qa/FLOW_PLAN_ADVERSARIAL_REVIEW.md`.
- [x] Independently reproduced cadence-sensitive analytics and a large-history Chrome peak-calculation failure; challenged storage conclusions with additional cadence/size evidence.
- [ ] Revise the eleven plan findings and re-review before requesting storage/implementation approval. No product code or migration run; the currently reviewed plans remain unchanged.

## Flow implementation planning — 2026-10-31

- [x] User approved equal manual/RFX flow, design defaults, and simplified navigation.
- [x] Completed six-task implementation plan and separate IndexedDB storage/migration proposal after a synthetic localStorage capacity check failed at 4h for four 1-Hz probes. No product code or migration run.
- [ ] Obtain plan review and approval for the storage-rule amendment; recommend inline execution. Then implement/test scoped tasks in an isolated branch with final independent review.

## Cooking-flow review — 2026-10-30

- [x] Clarified that ThermoWorks' own app is the user's confusing reference; reviewed current PitLogic via source and isolated mobile Chrome walkthrough.
- [x] Drafted `docs/specs/2026-10-30-intuitive-cook-flow.md` with verified friction, alternative approaches, a connected journey, and usability acceptance scenarios.
- [x] User chose equal support for RFX recording and manual entry. Updated the draft with equal source choices, direct manual start, and a shared cook/history experience.
- [x] Full flow and proposed recording rules approved on 2026-10-31. Storage amendment and implementation-plan review remain pending.

## QA-004 isolated remediation — 2026-10-30

- [x] Reproduced dark cook-card title failures at 1.14:1, including the Dashboard active-card variant discovered in visual inspection.
- [x] Committed two theme color declarations as `21eef18` on `codex/cook-card-contrast`; independent review found no issues.
- [x] Final branch passed 342/342 tests, build, changed-JSX lint, and 16 browser contrast checks across four card types, two themes, and two viewport sizes. Settled screenshots inspected; local server stopped.
- [ ] Integrate the isolated branch locally. No push/deployment. Other accessibility findings and real mobile/hardware/sustained-cook release gates remain open.

## QA-003 isolated remediation — 2026-10-30

- [x] User agreed to QA-003 correction; committed narrow top-level navigation fix and six-case App regression as `2e53431` on `codex/detail-navigation`.
- [x] Observed five relevant red cases before the fix; after the fix, 342/342 tests, changed-file lint, and production build passed. Independent review found no code issues.
- [x] Controlled local Chrome production-preview rerun passed six destinations from completed-cook detail and reload to Dashboard at 390×844 and 1440×900 with no page errors; evidence in `docs/qa/evidence/qa003-navigation-after-fix.json`.
- [x] User authorized local integration; fast-forwarded `backlog/rfx-sdk-capabilities` to `2e53431`. The merged checkout passed 342/342 tests and a production build. No push or deployment. QA-004 and real mobile/hardware/long-cook release checks remain open.

## QA-005 local integration — 2026-10-30

- [x] Fast-forwarded `backlog/rfx-sdk-capabilities` locally to reviewed QA-005 head `1fad7a5` while preserving uncommitted audit reports and memory notes.
- [x] Merged checkout passed 336/336 tests, production build, and changed-file ESLint with zero errors. Existing build chunk and hook lint warnings remain.
- [ ] Push/deployment not authorized or performed. QA-003/004 and cloud broker, hardware, mobile, and sustained-session release gates remain open.

## QA-005 remediation milestone — 2026-10-29

- [x] User authorized narrow correction; committed MQTT lifecycle status and successful-resubscription gating in `50a2742` on `codex/broker-reconnect-status`.
- [x] Independent review found failed-shutdown and connected-error edges; failing tests reproduced both and follow-up `1fad7a5` resolved them. Reviewer confirmed no remaining Critical/Important finding.
- [x] Final isolated branch passed 336/336 tests, production build, and changed-file lint with zero errors. Controlled 37-second local broker outage displayed Reconnecting with stale probe, then Connected with fresh 190°F after recovery; evidence in `docs/qa/evidence/controlled-broker-qa005-after-fix.json`.
- [x] Integrated the reviewed branch locally on 2026-10-30. No push or deployment. QA-003/004 and cloud broker, hardware, mobile, and sustained-cook release gates remain open.

## QA follow-up milestone — 2026-10-28

- [x] Independent review identified disconnect-order and CSV replay gaps in the approved telemetry fix; added failing regressions and committed narrow follow-up `1b4253c`.
- [x] Fast-forwarded `backlog/rfx-sdk-capabilities` locally to `1b4253c`; merged checkout passed 326/326 tests, build, and changed JavaScript lint. No push or deployment.
- [x] Controlled local MQTT/Chrome outage reproduced QA-005: Settings remained Connected for a 37-second broker outage, while the probe became stale; new reading recovered after reconnect. Evidence recorded in `docs/qa/evidence/controlled-broker-qa005.{mjs,json}`.
- [x] Obtained narrow authorization for QA-005 broker-status correction; see 2026-10-29 milestone. QA-003/004 remain confirmed P1s.

## QA remediation milestone — 2026-10-24

- [x] User authorized QA-001/QA-002; committed isolated fix `55200a8` on `codex/telemetry-freshness-order` with nine new regression checks (five UI, four store) and a corrected reconnect fixture.
- [x] Verified 322/322 tests, a passing production build, changed-file ESLint, and independent synthetic browser outcomes for late/equal-time/stale/disconnect replay.
- [x] Review/integrate the isolated fix locally; QA-003/004 remain confirmed P1s, and QA-005 was verified with a controlled local broker before any fix.
- [ ] Run real mobile/hardware and sustained-session release gates; existing source-wide lint and library TypeScript errors are unchanged.

## QA milestone — 2026-10-23

- [x] Completed read-only PitLogic/RFX audit reports and local synthetic evidence in `docs/qa/` on `backlog/rfx-sdk-capabilities`.
- [x] Verified 313/313 existing tests with workspace-local temp, a passing production build, and browser create/log/reload/end and recipe/theme flows.
- [x] Triaged twelve findings with confirmed versus code-reviewed status; see `docs/qa/ISSUES.md`.
- [x] Adversarially challenged the five P1 findings and updated their scope/evidence; see `docs/qa/ADVERSARIAL_REVIEW.md`.
- [ ] Review findings and authorize isolated P1 corrections; keep the current audit separate from remediation.
- [ ] Verify broker outage/reconnection with controlled MQTT and RFX hardware, native mobile accessibility, and sustained cook performance before release.

The historical progress below reflects earlier branch work and older test totals.

## ✅ Completed Features

Full completed-items history archived in `progress-archive.md`.

### Recent Milestones
- **2026-07-03 (PRs #9, #10)**: Live Device config copy/paste (cross-device transfer), ThermoWorks channel labels, settings sheet no longer closes on backdrop click; 183 → 218 tests
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

- (none currently — CSP eval error fixed via `server.headers` config in `vite.config.js`)

## 📊 Test Coverage

- **Total tests**: 218 passing (19 test files) as of 2026-07-03
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
- `useCsvProvider.test.js` — CSV replay lifecycle: load, play/pause, event pipeline wiring, unmount cleanup
- `useLiveProbes.test.js` — globalStore subscription, stale-check lifecycle, `Map<probeId, ProbeState>` shape
- `SettingsSheet.test.jsx` — Live Device config copy/paste (clipboard write, paste-and-apply, overwrite confirmation), channel label rendering
