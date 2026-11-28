# Adversarial review of the proposed cooking flow and recording plan

Date: 2026-10-31 (America/Chicago). Verdict: **request changes before approval**.

## Scope and method

Reviewed the [flow design](../specs/2026-10-30-intuitive-cook-flow.md), [storage amendment](../specs/2026-10-31-cook-recording-storage.md), and [implementation plan](../superpowers/plans/2026-10-31-intuitive-cook-flow.md) against the current application source. Three independent reviewers examined data/migration, usability, and performance/evidence. A fourth opponent challenged the findings and severity. The primary reviewer independently reproduced the analytics and large-array failures and ran a storage comparison.

No proposed product code exists yet. The findings below identify missing or contradictory design/implementation work, not newly deployed defects. P1 denotes an approval-blocking plan gap because implementing the plan as written can lose association integrity, misrepresent readings, or break a critical workflow. P2 denotes an additional contract or acceptance gap. No production data, migration, hardware configuration, branch integration, or deployment was changed. Reviewed plans remain unchanged for comparison.

## Reproduced facts

- **Same curve, different diagnosis:** existing analytics on a constant 160°F curve for 30 minutes report In Stall with samples at 0/10/20/30 minutes, but Normal with 1,801 samples at 1 Hz. Historical stall prediction similarly changes from a 160°F/30-minute result to null. [Saved reproduction](evidence/plan-adversarial-checks.json), [script](evidence/plan-adversarial-checks.mjs).
- **Large peak calculation fails:** the existing DetailView operation `Math.max(...allT)` throws RangeError: Maximum call stack size exceeded in the tested Chrome at 172,800 temperatures. A reduction returns the correct peak, 159°F, for the same fixture. This is a tested environment/count, not a universal browser threshold. The count represents four food probes over 12 hours at 1 Hz. Same evidence as above.
- **Storage conclusion needs its conditions:** in the additional 12-hour/four-probe Chrome comparison, verbose and compact 1-Hz histories both exceed localStorage quota; 5/15/60-second histories fit. A five-second verbose history is 4,026,994 JSON characters; a one-second verbose history is 20,156,914. Reduced cadence is a different capture policy, not lossless compression. Compact samples also omit per-reading provenance/receipt fields. [Comparison results](evidence/recording-storage-comparison.json), [script](evidence/recording-storage-comparison.mjs). Actual RFX cadence remains unmeasured.

## Findings requiring revision

### R1 — P1: high-frequency data changes the meaning of the existing analytics

**Anchors:** [plan:83](../superpowers/plans/2026-10-31-intuitive-cook-flow.md#task-3-shared-monitoring-truthful-freshness-and-scalable-history), `src/utils/analytics.js:38`, `:79`, and `src/App.jsx:101`.

The plan retains raw-history analytics but does not allocate explicit changes to fixed-sample stall and climb-rate windows. Three/four adjacent 1-Hz samples cannot span the existing 12/18-minute stall thresholds. The six-sample rate window also becomes seconds rather than a useful cooking interval. The reproduced sparse/dense mismatch violates equal manual/RFX behavior.

**Required revision/test:** define elapsed-time windows and gap handling for current and historical analytics; include analytics.js, App advice, and relevant consumers in the task map. Test equivalent underlying temperature curves sampled at manual, irregular, and 1-Hz cadences without altering raw storage.

### R2 — P1: the large-history test can pass storage/chart checks while cook detail still crashes

**Anchors:** `src/components/DetailView.jsx:28-29`, `:293-294`; plan Task 3 and Task 6.

A bounded chart-data builder does not repair the separate full-history flatten/spread peak operation. Opening a completed large cook or comparison can therefore fail even after ingestion succeeds. The Chrome operation was independently reproduced; the complete future repository/detail path has not been implemented or tested.

**Required revision/test:** replace unsafe full-array spread calculations and audit all full-history render consumers. Open completed detail and compare from the actual persisted 172,800-sample fixture, rather than checking only the chart builder and row count.

### R3 — P1: metadata-only archived cooks lack a concrete Stats/compare loading contract

**Anchors:** plan `loadState` at line 44, Task 3 lines 78-83; `src/App.jsx:522`, `src/components/AnalyticsTab.jsx:41-42`, `src/components/CompareChart.jsx:126-127`.

The storage design mentions requested analytics, but the task interfaces only define active/detail loading and do not wire/test all archived-history consumers. Existing Stats/compare code reads probe.readings immediately from ordinary cooks. Omitted arrays can throw; empty placeholders can silently produce incomplete analytics.

**Required revision/test:** define who loads full histories for Stats/compare, its loading/error/cancellation state, and the exact files/tasks. After a fresh metadata-only reload, open Stats and compare two archived cooks and assert real values and sources; never substitute empty history for not-yet-loaded history.

### R4 — P1: a normal upgrade can leave old and new clients writing divergent cook datasets

**Anchors:** storage amendment lines 33-37; `src/hooks/useStorage.js:3-4`; `public/sw.js:25`.

After migration the new app treats IndexedDB as authoritative. An already-open older app can still log/end a cook in the retained localStorage key and report success. Those writes remain physically present but are ignored by the upgraded client. This is unmerged divergence, not necessarily physical deletion. The documented deliberate rollback warning does not cover this normal concurrent-version scenario. Current service-worker caching also makes old/new-client coexistence a real deployment condition.

**Required revision/test:** define concurrent-version detection and recovery, migration provenance, later legacy-key change detection, and a user-visible reconciliation route. Test an old writer saving after new migration, then reopening the upgraded app. The old reading must remain recoverable and the conflict must be disclosed. Test deployed cache/update behavior; loopback-only browser tests bypass the current service worker.

### R5 — P1: flush-before-restore does not establish a complete dataset replacement boundary

**Anchors:** plan line 71; storage amendment lines 29, 39, 45.

After a flush, another sample can arrive while replacement runs. If restore recreates the same active cook ID/binding, a delayed append or retry from the old dataset can pass current validation and contaminate the restored dataset. A second open tab defeats a pause that affects only the importing tab.

**Required revision/test:** define a replacement fence that covers every writer and retry. A persisted dataset generation checked transactionally is one valid design; equivalent coordinated invalidation is possible. Enqueue a sample between flush and replace, restore the same cook ID, then release delayed local and second-tab retries. Neither may alter the restored dataset without an explicit new association.

### R6 — P1: probe replacement needs both an association-time boundary and a visible repair path

**Anchors:** storage amendment line 27; flow design probe-replacement requirement; plan lines 67-70 and 112.

A cook starts at 10:00; the previous sample is 10:01; a replacement probe is assigned at 10:20. A previously unseen retained sample from the replacement captured at 10:10 passes cook-start/watermark checks despite predating its association with this food. Separately, the plan tests replacement abstractly but only defines probe selection in NewCookSetup, with no action for repairing the active cook.

**Required revision/test:** persist binding revision and effective capture interval, validate queued/retried samples against it, and define an explicit active-cook Change probe action with confirmation and ownership checks. Preserve prior history. Deliver pre-assignment retained samples before/after reload and verify neither is attached; confirm the replacement contributes only subsequent eligible readings.

### R7 — P1: async cook import leaves the existing Settings completion behavior unsafe

**Anchors:** plan lines 71-72; `src/components/SettingsSheet.jsx:141-146`.

The current import handler calls onImportCooks, immediately changes recipes, clears the preview, and closes Settings. The plan turns cook import asynchronous but only makes awaited Settings export explicit. If the IndexedDB replace rejects while the old handler remains, recipes can already have changed and the recovery dialog has closed.

**Required revision/test:** explicitly await import before recipe changes/close, retain preview on failure, and define the partial-failure boundary between IndexedDB cooks and localStorage recipes. They are not one atomic database transaction. Inject cook-import rejection and recipe-storage rejection independently; assert truthful recovery, preserved data, and no premature success.

### R8 — P2: recording status needs a per-cook/per-channel contract

**Anchors:** plan recorder interface line 66 and CookRecordingStatus line 81.

The proposed status inputs have no cook identity, binding freshness, or last committed sample. With A receiving food samples and B receiving only a shared ambient sample, a global Recording state could incorrectly describe B's food recording. This is an interface omission, not proof that a future implementation necessarily makes that mistake.

**Required revision/test:** define per-cook/per-channel receiving, pending, committed, stale, and missing status, including partial recording. Test A healthy, B's food channel silent, and shared ambient healthy; B must disclose missing food history.

### R9 — P2: freshness protection must cover cooking advice as well as notification hooks

**Anchors:** plan Task 3 lines 86-88; `src/components/LiveIntelligencePanel.jsx:12`; `src/App.jsx:101`.

Existing Live Intelligence, Done, stall, wrap, and carryover advice can be derived from old samples. Updating notification hooks alone does not make current-sounding advice truthful after an interruption or a long pause in manual entry.

**Required revision/test:** qualify/suspend time-sensitive advice when supporting data is stale/gapped; show the reading time for manual estimates. Disconnect, advance time without samples, and verify no unqualified live/current-action claim remains.

### R10 — P2: sustained-use acceptance leaves comparable timing and large backup paths underdefined

**Anchors:** plan lines 126-128; storage amendment line 38; `src/utils/dataPortability.js:27`; Settings file import.

The plan does require absolute timing records and warns that a small ratio alone is insufficient. It still leaves first/final workload size, warm-up, repeated timing statistics, and absolute interaction ceilings unspecified. The 1,000-sample pending cap says nothing about memory during all-history export, pretty JSON stringify/Blob creation, or whole-file import. This is a test-definition gap; no out-of-memory failure has been demonstrated.

**Required revision/test:** define comparable measured batches/checkpoints, UI readiness/interaction limits, and full-size export/reimport using multiple archived cooks. Record output size, available memory metrics, navigation responsiveness, and failure recovery. Do not extrapolate IndexedDB/mobile performance from localStorage setItem timings, which exclude serialization in the original fixture.

### R11 — P2: synthesized legacy probe IDs can collide with preserved IDs

**Anchor:** storage amendment line 25.

The migration preserves present probe IDs and assigns missing IDs from array indices. A permitted legacy/import shape with probes `[{id: 1}, {}]` therefore assigns ID 1 to both probes, producing two `food:1` series. Current backup parsing validates top-level arrays but does not exclude this mixed-ID shape. Merging their samples would change probe identity/history.

**Required revision/test:** collision-check both existing and synthesized IDs. Choose unused stable IDs, or stop with recoverable validation before migration; never merge series silently. Test mixed present/missing IDs and duplicate existing IDs, preserving the original backup.

## Findings challenged or narrowed by the opponent

- **IndexedDB is not disproven.** It is defensible for preserving an append-only full sample history. The fixtures establish failure for the tested 1-Hz representation, not actual RFX rate, universal quotas, or the necessity of migrating manual cook metadata. Slower capture would require a separate retention/accuracy decision.
- **Old-client divergence is not automatic physical data erasure.** Preserved legacy records can be recovered if a reconciliation route exists.
- **Dataset generation is a solution, not the only solution.** Require the boundary and test outcome rather than prematurely mandating a mechanism.
- **The analytics loading intent is already mentioned.** The defect is missing concrete consumer integration/tests, not complete absence of that intention.
- **Probe replacement is already required in the spec.** The gap is the implementation's capture-time contract and active-cook recovery action.
- **Absolute timing was not entirely omitted.** Concrete comparability/acceptance definitions are missing.

## Product tradeoffs requiring explicit acceptance

These are documented choices, not newly discovered implementation defects:

- Requiring fresh probes before Start prevents preparing an RFX cook while probes sleep. A saved Waiting for probes session may be easier, but must never claim recording before receipt/persistence. Decide this intentionally.
- Foreground-only recording may be inconvenient for a phone used beside a smoker. The plan already discloses it. Actual lock/background/recovery and notification behavior must be established on target devices before release; a desktop accelerated fixture does not establish practical unattended usability.
- Moving Guides/Recipes/Stats under More is a proposed usability simplification, not a verified improvement from a novice user study.

## Recommended next revision

Do not approve the current storage/implementation plan as written. Keep the equal-manual/RFX flow direction, which remains reasonable. Revise the contracts/tests above, then re-review the changed sections.

For scope control, consider a separately reviewable UX increment (consistent navigation, essentials-first manual setup, discoverable Devices, edited-config connection fix, explicit current logging capability) before migrating cook history. This is sequencing advice rather than a defect: automatic RFX cook recording must remain unavailable or clearly unimplemented until its persistence/session gates pass. Do not ship a polished Recorded label over the current data gap.

## Revision follow-up

After the user approved revising the plan, revision 2 split usability from recording and added contracts/tests for all eleven findings. Independent follow-up review found the final changed contracts addressed at design level; see [revision-2 review result](FLOW_PLAN_REVISION_2_REVIEW.md). The verdict at the top applies to the original plan reviewed here. No implementation or migration was performed, and revision-2 execution/storage approval remains separate.
