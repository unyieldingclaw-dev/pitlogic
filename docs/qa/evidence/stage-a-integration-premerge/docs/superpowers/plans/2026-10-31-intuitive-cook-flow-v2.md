# Equal manual and RFX cooking flow — implementation plan revision 2

> **For agentic workers:** use superpowers:executing-plans for approved inline execution, or superpowers:subagent-driven-development only if the user selects it. Track each step independently.

**Goal:** Deliver simpler cooking flows without making UX improvements depend on an unproven history migration; then give manual/RFX cooks equally clear, reliable recording and History.

**Architecture:** Stage A retains current localStorage data, provider boundaries, App state and manual cook semantics. Stage B introduces a proposed transactional local cook repository and accepted-event recorder after its own approval and proof. No backend, cloud relay, account, new dependency, or provider import in UI/analytics.

**Tech Stack:** Existing React/Vite/Vitest, current local Playwright/Chrome runtime; native IndexedDB and a dedicated JSON worker only in Stage B.

**Specs:** [approved flow direction](../../specs/2026-10-30-intuitive-cook-flow.md), [proposed storage/recording revision 2](../../specs/2026-10-31-cook-recording-storage-v2.md). This plan supersedes [revision 1](2026-10-31-intuitive-cook-flow.md), retained for the original adversarial findings.

## Scope, authorization, and review gates

- The user approved revising the plan after adversarial review. This is not authorization to execute the revised tasks or to change the localStorage-only project constraint.
- Review/approve Stage A independently. Its delivery has no new cook fields, migration, asynchronous cook repository, automatic RFX cook recording, or false Recorded state. It is an interim usability improvement, not completion of the equal-source product.
- Review/approve Stage B and its storage-rule exception separately. First prove B1/B2/B3 in isolation; only then integrate automatic recording with the equal-source UI.
- Execution uses a clean managed worktree branch from reviewed QA-004 `21eef18`; primary checkout remains `2e53431`. Stage A and B use separate branches/commits. Carry QA-004 explicitly as a prerequisite; no implicit merge of it into the main checkout.
- More than five files are affected overall. Keep commits at the task boundaries below, without adjacent refactoring. Approved specs/plan travel with the execution branch. Original audit evidence remains separate.
- No push, deployment, destructive cleanup, hardware edits, authentication/security-file edit, or CI change is authorized. Any service-worker behavior change discovered during B5 testing requires its own reviewed change.

## Global constraints

- Manual and RFX are equal in the completed flow. A manual cook never requires a gateway/broker setup.
- Keep existing React/brand/theme/provider boundaries, offline static hosting, simultaneous cooks, recipes/guides, backups and preferences.
- Use canonical Fahrenheit and preserve source/capture/receipt meaning. No sample is Recorded until its transaction committed to this cook/series.
- Cook labels/targets/software notifications never silently write device configuration.
- Foreground recording does not promise capture or notifications while locked/suspended/closed. Device behavior remains a release gate.
- Preserve old data and version-1 backup readability; do not delete the legacy snapshot.

## Review focus

1. Stage A must not accidentally claim live readings are saved to cook history (A2/A3 tests).
2. Old/new client coexistence, restore, and probe replacement must preserve dataset/association identity (B1/B2 tests).
3. Sparse/dense samples must have consistent analytics semantics and truthful per-cook advice/status (B3 tests).
4. Every consumer of archived history must distinguish loading, error and genuinely empty data (B3 tests).
5. Async mixed-storage import and large backup/worker failures must preserve recoverable state (B4/B5 tests).

## Stage A — independent usability improvement, existing data unchanged

### A1: Consistent navigation and essentials-first manual setup

**Files:** modify `src/App.jsx`, `src/components/ActiveTab.jsx`, `src/components/DashboardTab.jsx`, `src/index.css`, `src/tests/AppNavigation.test.jsx`; create `src/components/NewCookSetup.jsx`, `src/components/MoreTab.jsx`, `src/components/__tests__/NewCookSetup.test.jsx`.

**Interfaces:** `NewCookSetup({form,onChange,onStart,onOpenDevices})` is a presentation extraction of the existing manual form; no persistent mode/binding field yet. `MoreTab({onSelect})` links Devices/Guides/Recipes/Stats/Settings. Both surfaces use Home/Cook/History/More; More remains selected for secondary screens. App retains selected cook/detail and multi-cook state.

- [ ] Write failing navigation tests from detail to four main destinations and More children; preserve detail entry, active selection, Add cook, guide-to-start, History return, Settings close and reload.
- [ ] Write failing setup tests: no connection required; food/cut/probe names/targets precede optional name/equipment/pellets/timers/guidance; optional details can expand; values survive a Devices round-trip. Existing manual Start/Log/End values and backup data shape remain identical.
- [ ] Extract/reorder only the form presentation and implement the consistent navigation/Home priority. Resume active cook or Start a cook comes before historical statistics. Keep multi-cook selection.
- [ ] Run focused tests, changed-file lint, production build; visually inspect mobile/desktop in both themes. Commit A1.

### A2: Discoverable Devices and edited-config connection

**Files:** create `src/components/DevicesPanel.jsx`, `src/hooks/useDeviceConnectionConfig.js` and focused tests; modify `src/components/SettingsSheet.jsx`, `src/hooks/useThermoWorksProvider.js`, `src/components/BleProvisioningWizard.jsx` and existing tests; wire App props.

**Interfaces:** `useDeviceConnectionConfig()` owns the existing config key without changing its shape. Provider `connect(config?)` accepts submitted current values or loads existing saved values when omitted. Devices receives connection/config/probe state via props; Bluetooth success has an explicit Continue to connection action. Its return action restores the pending cook form.

- [ ] Red tests: edited fields reach Save and connect without a second Save; save failure never claims Saved; failed connect is distinct from failed save; no credentials in error/evidence/logs.
- [ ] Implement already-configured vs initial device-setup paths, required endpoint guidance, unsupported-Bluetooth recovery, independent Connected versus Fresh readings state. Hardware status/edits and clipboard/CSV replay remain explicit advanced actions.
- [ ] Existing live device readings must say **Device readings — not recorded in a cook**. Stage A does not add a disabled or apparently working RFX cook-source choice; do not imply source parity is complete yet.
- [ ] Test no probes/stale/reconnecting/readings received, form return, and no device-config publish from normal setup. Run focused tests/browser fixture; commit A2.

### A3: Stage A verification and independent review

**Files:** create `scripts/qa/usability-flow.mjs`; update audit evidence/Memory Bank and task checkboxes.

- [ ] Full Vitest, changed-file lint, build, diff check. Compare the eight known library TypeScript diagnostics if TS boundary files change; introduce none.
- [ ] Playwright empty Home → manual setup → log → end → History; Devices round-trip, error/reconnect and current-reading disclosure; preserve recipe/guide/stats access and two active cooks. Verify saved state/export against the pre-change schema.
- [ ] Inspect settled 390×844/1440×900 dark/light screenshots, keyboard/error focus and touch targets. Record hesitation/wrong turns; do not call this a novice user study.
- [ ] Independent branch review, correct verified findings and rerun affected checks. Hand over Stage A separately, with automatic RFX recording explicitly incomplete and no release-ready claim. Local merge is a separate decision.

## Stage B — storage and recording proof before full-flow integration

### B1: Transactional repository, safe migration and coexistence

**Files:** create `src/data/cookRepository.js`, `src/utils/cookPersistence.js`, `src/utils/__tests__/cookPersistence.test.js`, `scripts/qa/cook-storage.mjs`; preserve existing `src/hooks/useStorage.js` API during proof, adding a non-mutating raw legacy read only. Implement revision-2 database/identity/migration contracts exactly.

**Interfaces:** `openCookRepository() -> Promise<Repository>`; `loadSummaries() -> Promise<{epoch,cookSummaries,activeCookIds,dis}>` (distinct summary type); `getCookHistory({epoch,cookId}) -> Promise<CookWithReadings>`; `createCook({epoch,cook})`, `appendReadings({epoch,entries})`, `endCook({epoch,cookId,endedAt})`, `updateCook({epoch,cookId,changes})`, `deleteCook({epoch,cookId})`, `replaceDataset({expectedEpoch,state,pendingRecipes})`, `exportState({epoch})`. Stale epoch is an explicit result, not a retry against current data. All writes validate authoritative state inside the transaction.

- [ ] Red pure tests: legacy absence/corrupt/inaccessible storage, equal-time row preservation, IDs `[1,missing]`, canonical collisions `[1,"1"]`, duplicate IDs, deterministic unused missing IDs, and unchanged original values/ordering/metadata.
- [ ] Red real IndexedDB browser tests: abort migration at each store, no completion marker on partial failure, idempotent reopen, original legacy key unchanged, unavailable/quota storage and blocked/versionchange recovery.
- [ ] Implement migration/provenance/conflict recovery. Test old-version writes after migration, event missed during closure, concurrent new tabs, recovery-copy failure, and exports of both diverged versions. Never silently discard or merge a legacy change. Include raw-key check cost in benchmarks.
- [ ] Implement replacement epoch and atomic cook/readings/state transaction. In two tabs, enqueue before replacement and retry afterward with the same restored cook IDs; old jobs must be rejected. Restore RFX sessions paused until explicit verification/resume.
- [ ] Run pure/browser tests, commit repository proof. Do not switch App authority until B4 integration.

### B2: Accepted-event recorder, binding intervals, per-cook truth

**Files:** modify `src/lib/telemetry/store/TelemetryStore.ts` and tests, `src/hooks/useTelemetryStore.js`; create `src/hooks/useCookRecorder.js`, `src/utils/cookRecording.js` and focused tests. Extend browser repository tests.

**Interfaces:** `subscribeReadings(listener: (reading:ActiveReading)=>void):()=>void` emits each accepted store reading once, independent of React renders. Existing hook exposes this stable bridge; UI does not import eventBus/providers. `useCookRecorder({subscribeReadings,repository,onCommitted})` returns per-cook/per-series states keyed by epoch/binding revision plus `flush/retry/pause`. Entries retain their enqueue-time epoch/revision. `replaceBinding({epoch,cookId,seriesId,expectedRevision,newProbeId,effectiveFrom})` validates ownership and persists interval closure/new revision atomically.

- [ ] Red tests: accepted burst of three samples before a React render yields three rows; duplicate/older/non-live/replayed/pre-start entries do not enter live cook history; manual spot readings retain unique identity and never move a live watermark.
- [ ] Red two-cook tests: distinct food channels, explicit shared ambient, ignored unselected channels, no food ownership collision; one cook missing food while other/ambient receives must show partial/missing state only on the affected channel.
- [ ] Test 10:00 cook/10:20 replacement/10:10 retained sample, queued old-revision samples, old channel after replacement, replacement during writes, reload and retry. Add Change food/smoker probe UI action in B4 with exact identity preview/confirmation; no automatic name-based replacement.
- [ ] Implement <=250 ms batching/1,000 pending bound, committed callbacks only after completion, overflow/quota pause, epoch rejection, interrupted-session gap detection, pending-reading download, and explicit finish-with-gap recovery. End/write tested in both transaction orders; no post-end update.
- [ ] Commit recorder proof after full relevant unit and real-browser tests. A future/current advice decision cannot use global connection success as evidence this cook's sample saved.

### B3: Cadence-independent analytics, complete history consumers, scalable rendering

**Files:** modify `src/utils/analytics.js` and tests, `src/App.jsx`, `src/components/LiveIntelligencePanel.jsx`, `src/components/StallCoach.jsx`, `src/components/ActiveTab.jsx`, `src/components/DetailView.jsx`, `src/components/AnalyticsTab.jsx`, `src/components/CompareChart.jsx`, `src/components/TempChart.jsx`, `src/components/HistoryTab.jsx`, `src/components/DashboardTab.jsx`, `src/components/ShareCard.jsx`, existing alert hooks/tests. Create `src/hooks/useCookHistory.js`, `src/utils/cookChartData.js`, `src/utils/readingEligibility.js`, `src/components/CookRecordingStatus.jsx` and focused tests. Only change full-history/source-dependent lines in existing consumers.

**Interfaces:** `useCookHistory({repository,datasetEpoch,cookIds}) -> {status:loading|ready|error,cooks,error,retry}` loads all requested histories; obsolete results are ignored. Stats requests completed IDs explicitly, Compare requests both selected IDs, active/details request their IDs. StallCoach separately requests completed IDs matching the active cut for historical advice; pending/error state is visible only in that section, and active cook/cut/epoch changes invalidate it. Summary rows never pose as loaded-empty Cook histories. `CookRecordingStatus({cookId,mode,channels,onRetry,onChangeProbe})` consumes the per-channel revision-2 contract. `buildCookChartData(cook,{maxPoints:1200})` is linear, preserving raw data/extrema/gaps with bounded display. A pure eligibility utility supplies the same sample-source/freshness/gap decisions to advice and alert consumers.

- [ ] Add red cadence-equivalence fixtures using flat/rising/stall/noisy/dropout curves at sparse/irregular/1-Hz sampling. Implement the revision-2 elapsed-time windows/coverage policy, including historical stalls and App advice; no sample-count shortcuts. Exact linear rate tolerance 0.1°F/hour, ETA 1 minute; document noisy-fixture expectations before coding.
- [ ] Red tests on a fresh metadata-only reload: open Stats, compare two archived cooks, open detail/share; assert actual history/peaks/source. Simulate loading failure, navigation A→B and an epoch replacement; never render old response or false zero analytics.
- [ ] From that same reload, trigger an active stall with two matching archived cooks and assert StallCoach's real historical prediction after loading, plus loading/error/cut-switch cancellation. Replace its slice(-4) displayed duration with the shared elapsed-time result; sparse/dense fixtures must show consistent stall duration as well as diagnosis.
- [ ] Replace unsafe full-history `Math.max(...array)`/repeated timestamp scans with reductions/indexed construction. Open actual persisted 172,800-sample completed detail and comparison; verify peak/chart/analysis without RangeError. Test History/Dashboard summary peaks too.
- [ ] Test stale high readings and long manual pauses across notifications, LiveIntelligence/Done, ETA and App stall/wrap/carryover. Show age-qualified history or Insufficient recent data, not unqualified current advice. Verify current saved manual and fresh saved live samples remain eligible under their respective policy.
- [ ] Implement chart gap/envelope tests including >1,200 gap markers (disclose display limitation, preserve raw gaps), first/last/extrema, exact raw row count and sources. Commit B3.

### B4: Application integration, equal-source setup and recoverable backup

**Files:** create `src/hooks/useCookState.js`, `src/data/recipeStorage.js`, `src/workers/cookBackup.worker.js`, `src/utils/cookBackup.js` and tests; modify App, NewCookSetup, ActiveTab, SettingsSheet, DevicesPanel, `src/utils/dataPortability.js`, `src/hooks/useRecipes.js`, `src/components/RecipesTab.jsx`, their tests and navigation regression as necessary. Existing manual data is migrated only through approved B1. Recipe changes are limited to the truthful persistence/import-coordination boundary and awaiting its results.

**Interfaces:** App commits repository commands before claiming Saved/navigation. NewCookSetup presents two equally sized unselected choices: Enter temperatures manually / Use RFX probes. Mode is persisted per cook. Manual has no device dependency. RFX mode verifies an exact eligible binding and ownership before start, keeps manual spot entry secondary, and restores form after Devices. Until a fresh eligible sample is verified, retain the draft and show Waiting for probes with Start disabled; do not create an active pre-recording session or silently switch to manual. This preserves the previously documented start limitation for explicit review. Active view includes confirmed Change probe and per-channel recording status.

- [ ] Red manual/RFX complete-flow tests: no source preselected; no gateway needed for manual; eligible RFX channel yields only associated saved rows; source labels identical in chart/detail/export; multiple cook selection, resume and explicit replacement preserve history.
- [ ] Switch App lifecycle/read projections to repository authority only after the proof gates. Retain navigation/form semantics from Stage A. Manual/CSV source tags and stable IDs survive imports/exports. Hardware settings remain separate.
- [ ] Implement awaited Settings import and durable pending-recipe journal. Cook reject must preserve recipes/preview/dialog; recipe failure after cook success must show partial import and idempotent retry, including app reload and changed-recipe conflict. Do not claim cross-engine atomicity.
- [ ] `recipeStorage` exposes async `commitRecipes({operationId,expectedEpoch,expectedRaw,targetRaw})` and operation recovery using the revision-2 shared state-store transaction/journal contract. `useRecipes` add/update/remove/importMany/replaceAll return promises (add resolves its ID; importMany resolves counts) and publish state/success only after actual persistence. Update RecipesTab/App callers to await them and retain forms on failure. Keep the recipe array's existing storage format. No swallowed setItem exception or mocked callback may stand in for this boundary.
- [ ] Test delayed first recipe apply while a second tab attempts import/edit, durable pending ownership across reload, stale completion/epoch rejection, real localStorage.setItem failure through the hook, localStorage success followed by IndexedDB abort, and idempotent target-recognition recovery. Both first apply and retry validate expected revision. All cooperating recipe writers use the coordinator; old-writer divergence is disclosed/recoverable rather than claimed to be locked out.
- [ ] Backup worker converts/validates full-size data off the main thread. Export includes every committed raw reading and binding/source history after flush; pending failures are disclosed. Existing version-1 import/export remains self-contained. Add malformed payload/duplicate ID/unknown source/cook-reference boundary validation and forced worker/read/recipe failures.
- [ ] Run full regression and browser integration; commit B4. No integration to main or release claim yet.

### B5: Sustained fixture, PWA upgrade, independent verification

**Files:** extend `scripts/qa/cook-storage.mjs`; create `scripts/qa/cook-flow.mjs` and `scripts/qa/pwa-upgrade.mjs`; update synthetic evidence, audit/memory and plan checkboxes. Production service-worker edits are not included automatically.

- [ ] Full Vitest, changed-file lint, production build, diff check and exact TypeScript diagnostic comparison. No additional errors beyond the known eight legacy diagnostics.
- [ ] Controlled broker/isolated storage: two cooks, shared ambient, manual spot, reconnect, reload, probe replacement, finish and late packet. Exact sample/source/cook association assertions, not screenshot-only tests.
- [ ] Revision-2 12-hour/four-probe/1-Hz fixture: 172,800 samples through accepted-event recording with capture clock advanced and real transaction yields. Separately test overload pause; do not bypass the normalizer or silently increase queue bounds.
- [ ] Meet the revision-2 reference budgets: fixed-batch p95 <=250 ms/final <=2× early; navigation p95 <=250 ms; full detail/Stats <=2 seconds; <=1,200 chart points per series with truthful gap overflow; four full cooks/691,200 rows exported/reimported <=15 seconds per operation, main-thread scheduling p95 <=100 ms, combined instrumented JS heaps <=512 MiB. Warm up five and measure at least twenty runs/checkpoints; record absolute distributions/output bytes/browser/build/machine. Missing memory instrumentation is an unverified gate.
- [ ] Exercise real cached PWA client coexistence on an isolated test origin with a service-worker controller actually active, old-version save after cutover, blocked upgrades, missed messages and stale-tab retry. Loopback tests that bypass SW cannot count. Any needed cache/update product change is reviewed separately.
- [ ] Test foreground/locking/background/notification behavior on actual target mobile browsers/hardware before release; accelerated desktop evidence establishes none of those claims. Test storage eviction/quota recovery and multiple archived-cook backup limits.
- [ ] Independent whole-branch review, correct verified findings and rerun affected gates; report measured results and unresolved release gates. User chooses local merge/PR/keep branch afterward; no push/deploy is inferred.

## Adversarial finding disposition

| Finding | Revision contract | Explicit test/task |
| --- | --- | --- |
| R1 dense cadence | Elapsed time/coverage analytics policy | B3 curve-equivalence/current/historical tests |
| R2 large peak crash | Bounded reductions plus actual detail path | B3 persisted full-size detail/compare |
| R3 archive hydration | Distinct summaries and complete history status, including active StallCoach's archived-cut history | B3 Stats/Compare/StallCoach reload/error/cancellation |
| R4 older clients | Provenance detection/freeze/two-version recovery; no impossible atomicity claim | B1/B5 old writer and cached PWA tests |
| R5 replace races | Transactional epoch, old jobs never rebound | B1/B2 two-tab replace/retry and paused restored sessions |
| R6 replacement | Effective capture interval/revision and explicit repair UI | B2/B4 retained preassignment/reload/confirmation |
| R7 mixed import | Await cook transaction; durable operation ID/epoch, coordinated recipe writers and recoverable partial state | B4 real hook failure, overlapping import/edit, first apply/retry/reload and post-localStorage abort tests |
| R8 per-cook truth | Per-channel received/pending/committed identity | B2/B4 two cooks and partial food capture |
| R9 stale advice | Common eligibility and age-qualified advice | B3 notification/LiveIntelligence/App/ETA tests |
| R10 resource gates | Comparable fixed batches, rendered UI budgets, full-size worker backup | B5 distributions/691,200 rows/memory/failure tests |
| R11 migration IDs | Canonical collision rejection; deterministic unused IDs | B1 mixed missing/present and duplicate ID tests |

## Self-review and handoff

Every finding has a contract and test owner; Stage A has no dependency on IndexedDB, new source fields, or the recorder. Stage B covers manual lifecycle, existing consumers, backups and device-source integrity together. New numerical policies/budgets are proposed acceptance decisions for review, not measured product guarantees. Record unavoidable product limits (fresh-probe start and foreground recording) in user-facing setup; do not call them solved by a storage migration.

Recommended execution after approval: inline sequential tasks with an independent review per stage. Obtain separate Stage A versus Stage B/storage approval; the user approved this revision work only. No implementation has started.
