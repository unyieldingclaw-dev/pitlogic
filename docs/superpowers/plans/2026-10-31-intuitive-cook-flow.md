# Equal manual and RFX cooking flow implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans for inline execution, or superpowers:subagent-driven-development if the user selects delegation. Steps use checkbox syntax for tracking.

**Goal:** Give manual and RFX cooks equal, clear paths from setup through saved history, with truthful recording and recovery states.

**Architecture:** Keep React, App-owned application state, current provider/normalization boundaries, existing styles, and static offline hosting. Introduce a transactional local cook repository and an event-level recorder; expose materialized cook models to existing charts/analytics. Preferences, recipes, and connection configuration retain their current keys.

**Tech Stack:** Existing React/Vite/Vitest, native IndexedDB, current local Playwright/Chrome runtime. No new dependency or server in the application.

**Spec:** `docs/specs/2026-10-30-intuitive-cook-flow.md` (flow approved 2026-10-31), plus proposed `docs/specs/2026-10-31-cook-recording-storage.md` (storage amendment pending).

## Authorization and isolation

- Flow design is approved; implementation waits for the required plan review and approval of the storage-rule amendment. No automatic sampling/retention policy substitutes for that decision.
- Execute on `codex/intuitive-cook-flow` in the existing clean managed worktree, starting at QA-004 commit `21eef18`. This carries the reviewed QA-004 correction as a prerequisite without merging either branch into the original checkout. Primary checkout currently remains `2e53431` with uncommitted audit notes.
- This work spans more than five files and changes the persistence boundary; use the independently testable commits below. Every file must trace to the approved flow. Preserve old localStorage data and backup format.
- Commit approved specs and this plan on the execution branch before product code. Keep original audit evidence separate. No push, deployment, destructive cleanup, auth/security edit, or CI change is part of this plan.

## Global constraints

- Manual and RFX paths have equal prominence; manual cooks require no gateway, broker, or device setup.
- No backend, account, external sync, cloud relay, SDK redistribution, or reverse engineering.
- UI/analytics do not import providers or eventBus; accepted readings cross through the existing `useTelemetryStore` hook.
- Canonical temperature is Fahrenheit. Preserve capture and receipt times and explicit sample sources.
- No hardware configuration writes from cook labels, targets, or source selection.
- Phone locking/background/closure do not imply uninterrupted recording or notifications.
- Existing cooks, simultaneous cooks, backup/import, recipes, guides, and preferences remain usable.

## Review focus

1. Partial migration or quota failure must not replace saved data or report success (Task 1/2).
2. React batching, delayed writes, and End cook races must not lose or misassign readings (Task 2).
3. Manual readings and stale device readings must not impersonate fresh live samples or trigger misleading software alerts (Task 3).
4. Returning from device setup must preserve the pending cook and use edited connection fields (Task 4/5).
5. Large histories must not freeze charts, balloon queued writes, or hide recording gaps (Task 3/6).

## Task 1: Transactional cook repository and non-destructive migration

**Files:** Create `src/data/cookRepository.js`, `src/utils/cookPersistence.js`, `src/utils/__tests__/cookPersistence.test.js`, `scripts/qa/cook-storage.mjs`. Modify `src/hooks/useStorage.js` only to expose an explicit legacy read for migration; preserve its existing API until Task 2 switches App. Database schema and rollback policy are exactly those in the storage amendment.

**Interfaces:**
- `openCookRepository(): Promise<CookRepository>` opens/migrates the native database.
- `loadState(): Promise<{ cooks, activeCooks, dis }>` returns metadata/latest values without loading every archived history.
- `getCook(id, { readings: true }): Promise<Cook>` materializes ordered committed history for a selected cook.
- `createCook(cook): Promise<Cook>`, `appendReadings(records): Promise<{ committed, ignored }>`, `endCook(id, endedAt): Promise<Cook>`, `updateCook(id, changes): Promise<Cook>`, `deleteCook(id): Promise<void>`.
- `importState({cooks, activeCooks, dis}, mode): Promise<void>`, `exportState(): Promise<{cooks, activeCooks, dis}>` use all committed readings and one database transaction for destructive replacement.
- `appendReadings` checks the current stored status, exact bindings, mode, capture bounds, and watermark inside its write transaction; callers cannot override validation by passing an older cook object.

- [ ] Write mapper tests for legacy equal-time rows, missing source, preserved original time, and additive mode default. Expected legacy mode is manual, legacy sample source is `legacy` (not invented manual/live).
- [ ] Preserve the distinction between no legacy data and unreadable/malformed legacy data. Corrupt JSON or invalid collections must show recovery rather than completing an empty migration; the raw localStorage value remains untouched.
- [ ] Write real-browser repository tests in `scripts/qa/cook-storage.mjs` using a fresh disposable browser context/origin. Assert migration copies two equal-time rows, leaves original `pitlogic-v5` untouched, and retry produces the same row count. Force an aborted transaction and assert no migration marker or partial database state.
- [ ] Run the tests before implementation and observe missing repository/mapper failures. Browser tests use the existing runtime, a loopback Vite server, and explicit imports of source modules; no production data or package installation.
- [ ] Implement the repository and pure mapper. Preserve all current metadata. A read/write error rejects with a recoverable error; no catch may silently load stale legacy state after migration.
- [ ] Verify import merge preserves existing IDs, replace failure preserves all original rows, export is self-contained JSON, deletion removes only that cook's readings, and reopening returns committed values.
- [ ] Commit this independently tested persistence foundation.

## Task 2: Accepted-event recording and saved-state truth

**Files:** Modify `src/lib/telemetry/store/TelemetryStore.ts`, its existing test, `src/hooks/useTelemetryStore.js`, `src/App.jsx`, `src/hooks/useStorage.js`. Create `src/hooks/useCookState.js`, `src/hooks/useCookRecorder.js`, `src/utils/cookRecording.js`, `src/utils/__tests__/cookRecording.test.js`, `src/hooks/__tests__/useCookRecorder.test.js`. Extend browser repository tests.

**Interfaces:**
- `TelemetryStore.subscribeReadings(listener: (reading: ActiveReading) => void): () => void` emits each accepted reading exactly once after store ordering validation. Rejected duplicates/older events and metadata-only events do not emit. Existing snapshot subscriptions remain unchanged.
- `useTelemetryStore()` additionally exposes stable `subscribeReadings`; only this permitted hook imports the telemetry store for the recorder bridge.
- `useCookState()` exposes committed `cooks/activeCooks/dis`, `loading/error`, and async repository commands; App owns navigation/selected cook and passes data down. Commands update visible state after transaction completion.
- `useCookRecorder({ subscribeReadings, repository, onCommitted })` exposes `status`, `pendingCount`, `error`, `flush()`, `retry()`. It consumes every accepted sample, filters to live source, and queues writes for at most 250 ms. Bound pending samples at 1,000; pause and disclose a gap on overflow/failure. Stop callbacks after unmount; no React effect performs hardware writes.
- Pure `routeReading(cooks, reading)` resolves exact food bindings and explicit shared ambient bindings. It never binds by label, changes manual cooks, or writes completed sessions.

- [ ] Add red cases: accepted burst of three readings before React rerender yields three saved rows; equal/older/retained pre-start events produce none; source `replay/csv-import/synthetic` never enters RFX recording.
- [ ] Test two active cooks, exclusive food ownership, shared ambient, fresh C input normalized to F, manual spot entries, explicit probe replacement, and no completed-cook mutation. Reject starting a second active cook with the same food binding.
- [ ] Implement async App commands for create/log/end/delete/import/update. Manual entries use unique IDs and explicit `manual`; CSV uses `csv-import`. Flush before End cook/export and wait for transaction success before navigating or displaying Saved. Block destructive replace while recording until the queue is flushed; export failure keeps the user on the current screen.
- [ ] Route backup through an async `onExportCooks()` callback returning repository `exportState()`, then existing `buildExport` with recipes. Modify `src/utils/dataPortability.js` only if validation needs additive source metadata support; keep version 1 and its existing round-trip tests. Settings must await this callback rather than exporting metadata-only state. Verify raw readings/source fields survive export and reimport.
- [ ] Test end/write transactions in both orders, quota failure with unchanged committed values, bounded pending queue, retry idempotency, unmount cleanup, reload reconstruction, and interrupted-recording disclosure.
- [ ] Run full Vitest plus real IndexedDB browser cases. Commit only after sample counts and statuses agree.

## Task 3: Shared monitoring, truthful freshness, and scalable history

**Files:** Modify `src/components/ActiveTab.jsx`, `src/components/DetailView.jsx`, `src/components/TempChart.jsx`, `src/hooks/useProbeAlert.js`, `src/hooks/useSmokerAlert.js`, `src/components/DashboardTab.jsx`; create `src/components/CookRecordingStatus.jsx`, `src/utils/cookChartData.js` and focused tests; extend App tests and existing alert tests.

**Interfaces:**
- `CookRecordingStatus({ mode, connectionStatus, recorderStatus, pendingCount, error, onRetry })` renders Manual entry, Waiting for readings, Saving, Recording, or Recording paused with useful action. Connected alone never implies samples were saved.
- Active/detail histories load through `getCook(id, {readings:true})` on demand. Cancel/ignore a response for an obsolete selected ID. Home/History lists use metadata/latest samples rather than fetching every archived row.
- `buildCookChartData(cook, { maxPoints: 1200 })` constructs time rows in one pass and uses a bounded min/max display envelope preserving first/last, extrema, and explicit gap separators. Raw data remains intact; analytics requests raw history. No line/area connects across a recording gap.
- Source labels accompany readings; live age comes from capture time. Manual samples have entry timestamps, without a Live indicator. Empty RFX chart says Waiting for probe readings rather than Log your first temperature.

- [ ] Write tests for a stale high device reading, disconnect/reconnect, a manual spot reading, and failed storage. Only a fresh saved device sample or explicit current manual entry is eligible for the corresponding software alert; no replayed/pre-session data triggers one.
- [ ] Write chart tests for 172,800 inputs: bounded display points, extrema and first/last preserved, independent gaps for shared series, and unchanged stored sample count. Test asynchronous navigation from cook A to B does not show A's history.
- [ ] Implement the shared states, selected-history loading, linear chart construction, and gap rendering. Keep existing target/guide behavior and cook switching.
- [ ] Verify manual log/chart/detail and RFX log/chart/detail use the same committed values; commit.

## Task 4: Guided Devices path and correct connection action

**Files:** Modify `src/components/SettingsSheet.jsx`, `src/hooks/useThermoWorksProvider.js`, `src/components/BleProvisioningWizard.jsx` and their existing tests. Create `src/hooks/useDeviceConnectionConfig.js` and `src/components/DevicesPanel.jsx`. App navigation wiring is completed in Task 5.

**Interfaces:**
- `useDeviceConnectionConfig()` owns reading/saving the existing `pitlogic-mqtt-v1` key. No credentials go into cook records, logs, evidence, or error text.
- `connect(config)` in the provider hook accepts the currently submitted config; `connect()` still loads the saved config for existing callers. `Save and connect` saves/submits the same validated current values; a save failure does not display Saved.
- `DevicesPanel` consumes existing provider/config hooks through props: choose already-configured gateway or setup, connect app, verify fresh incoming readings, return to pending cook. Connection, fresh sample receipt, and hardware provisioning are separate displayed states.
- Bluetooth success offers Continue to connection as an explicit action while preserving the pending form. Unsupported Bluetooth offers the already-configured path and supported-environment guidance. Required endpoints remain visible when needed; clipboard, CSV replay, and hardware settings are under Advanced. No normal setup step publishes device edits.

- [ ] Red regressions: fill connection fields and press primary action without separate Save; assert exact edited config reaches adapter and is saved once. Failed save and failed connection show distinct recovery actions.
- [ ] Test fresh reading verification, a connected gateway without probes, stale readings, reconnecting, unavailable Bluetooth, existing configuration, and successful return to an unchanged pending cook.
- [ ] Move device-only content into DevicesPanel, leaving ordinary preferences/backup in Settings. Preserve config copy/paste and existing protections in Advanced; do not add a second competing device-status system.
- [ ] Run focused provider/Settings/Bluetooth tests and browser setup path; commit.

## Task 5: Equal-source cook setup and consistent navigation

**Files:** Modify `src/App.jsx`, `src/components/ActiveTab.jsx`, `src/components/DashboardTab.jsx`, `src/components/HistoryTab.jsx`, `src/components/MultiCookBar.jsx`, `src/index.css`, `src/tests/AppNavigation.test.jsx`. Create `src/components/NewCookSetup.jsx`, `src/components/MoreTab.jsx` and focused setup tests.

**Interfaces and fixed copy:**
- Primary navigation labels on both surfaces: `Home`, `Cook`, `History`, `More`. More links to `Devices`, `Guides`, `Recipes`, `Stats`, `Settings`; the corresponding More nav item remains selected on those secondary screens.
- `NewCookSetup({form, onChange, availableProbes, occupiedFoodBindings, onOpenDevices, onStart, saving, error})` shows Food/cut, two equally sized unselected source choices `Enter temperatures manually` / `Use RFX probes`, then source-specific probe names/bindings and targets. Preserve pending form while visiting Devices. Name, equipment, pellets, timers, and guide content are secondary expandable sections. RFX start requires at least one explicit eligible food binding; missing/stale readings explain how to verify rather than silently allowing a false Recording state.
- Home prioritizes Resume cook/current temperatures when active; otherwise Start a cook, with Connect probes secondary. Move empty historical statistics below the task actions. Preserve Add cook and multi-cook selection.
- Both modes reach the same ActiveTab; manual has visible Log reading, RFX has recorder state and secondary manual spot entry. End cook leads to the saved detail with a clear History return.

- [ ] Red App tests: manual cook starts with no MQTT configuration; source choice is required and neither preselected; both choices equally discoverable; optional sections do not block Start; RFX cannot start with another cook's food probe; Devices round-trip preserves food/targets.
- [ ] Update navigation regression to all four primary destinations plus More's children from detail, including mobile/desktop current state. Preserve active cook, new cook, guide-to-start, completed detail entry, Back to History, Settings close, and reload behavior.
- [ ] Implement the bounded component changes using existing theme/typography. Semantic form groups, associated labels, error focus, 44px touch targets, keyboard navigation, reduced motion, and AA contrast are required.
- [ ] Verify phone/desktop, dark/light, manual/RFX flows; commit.

## Task 6: End-to-end, sustained fixture, and independent review

**Files:** Create `scripts/qa/cook-flow.mjs`; extend `scripts/qa/cook-storage.mjs`. Update `docs/qa/UX_FLOW_REVIEW.md`, Memory Bank, approved plan checkboxes, and saved synthetic evidence. No production fixture topics or credentials.

- [ ] Run full `npm test -- --pool=forks --maxWorkers=1`, changed-file ESLint, production build, and `git diff --check`. Library TypeScript currently has eight pre-existing errors; compare exact diagnostics and resolve any introduced errors. Do not claim the pre-existing gate is green.
- [ ] Use isolated Playwright contexts and a controlled local MQTT fixture to create two cooks, record distinct live channels plus explicit shared ambient, enter a manual reading, interrupt/recover, reload, finish, deliver a late packet, export/reimport, and assert exact values/counts/source/cook associations.
- [ ] Run accelerated 12-hour/4-probe/1-Hz ingest of 172,800 samples. Require exact raw count/values, queue <=1,000, chart <=1,200 points per series, no failed persistence, and no more than 2x deterioration in the same fixture's first-versus-final transaction and chart timings. Record absolute timings too; a small ratio alone does not establish usable performance. If these fail, investigate the measured bottleneck before release.
- [ ] Advance the fixture's application clock with sample capture time; do not inject a twelve-hour stream of future timestamps into the normalizer or bypass the actual live-recording path to obtain a passing count.
- [ ] Capture and inspect settled screenshots at 390×844 and 1440×900, dark/light. Complete task-based keyboard and small-screen walkthroughs. Report wrong turns and any task requiring coaching; do not call an expert walkthrough a novice user study.
- [ ] Request independent whole-branch review, fix verified Important/Critical findings, rerun affected checks, and commit verification notes. Native mobile/hardware/background and actual unattended duration remain external release gates.
- [ ] Report branch commits, source-mode behaviors, migration/rollback boundary, evidence, and remaining limits. Local integration remains a separate explicit decision; no push/deploy.

## Plan self-review

Flow requirements map to Tasks 4/5; persistence/session integrity to Tasks 1/2; freshness, alerts and chart gaps to Task 3; all recovery and sustained workload gates to Task 6. Equal manual/RFX prominence and existing feature preservation are explicit in Tasks 2/5. No source history is reconstructed from React snapshots. The storage amendment is the only proposed exception to project constraints and must be approved before execution.

Recommended execution: inline, sequentially, because storage, recorder, and UI interfaces depend on the preceding task. Use an independent reviewer at the whole-branch gate; do not implement multiple overlapping App changes concurrently.

Historical review baseline: this revision was rejected by adversarial review. Use [revision 2](2026-10-31-intuitive-cook-flow-v2.md) for the revised two-stage proposal; no implementation is approved by this historical document.
