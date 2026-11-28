# Cooking-flow plan revision 2 — review result

Date: 2026-10-31 (America/Chicago).

## Verdict and limits

The eleven findings in the [original adversarial review](FLOW_PLAN_ADVERSARIAL_REVIEW.md) are **addressed in the revised design and implementation tasks**. Two independent follow-up reviewers found no remaining approval-blocking omission in their respective data/concurrency and flow/analytics/performance lenses after corrections. This is document review, not evidence of working repository code, migration safety, hardware capture, or passing performance gates.

Reviewed active documents:

- [Two-stage implementation plan](../superpowers/plans/2026-10-31-intuitive-cook-flow-v2.md)
- [Recording/storage contracts](../specs/2026-10-31-cook-recording-storage-v2.md)
- [Flow direction and active-document links](../specs/2026-10-30-intuitive-cook-flow.md)

The original plan/amendment are retained as historical review baselines with supersession links. No product code, migration, integration, or deployment occurred during revision.

## What changed

**Stage A stands alone:** Home/Cook/History/More, essential manual-cook setup, discoverable Devices, and edited-config connection. It retains current saved-data format and manual lifecycle, labels device readings as not being recorded into a cook, and does not expose a working RFX cook-source selector. This intermediate stage is not completion of equal manual/RFX support.

**Stage B requires its own approval/proof:** transactional repository and migration, event-level recording, association identity, analytics/history adaptation, then equal-source integration and sustained/end-to-end verification. The localStorage-rule exception remains unapproved. IndexedDB is a proposed append-oriented design, not a measured guarantee of long-cook, background, or mobile recording.

## Finding disposition

| Finding | Reviewed correction | Implementation verification still required |
| --- | --- | --- |
| R1: cadence-sensitive analytics | Elapsed-time/coverage windows, common advice eligibility, StallCoach duration included | Sparse/irregular/dense curve and historical prediction tests |
| R2: large-history peak crash | Explicit bounded reductions and full consumer audit | Persisted 172,800-sample detail/compare render |
| R3: incomplete archived hydration | Distinct summaries; loading/error/cancel for Stats, Compare, detail, share and active StallCoach's completed-cut history | Fresh metadata-only reload and archived-advice tests |
| R4: old-client divergence | Baseline provenance, change detection/freeze, recoverable versions and explicit reconciliation; no impossible old-writer atomicity claim | Old/cached PWA client writes, missed events, blocked upgrade tests |
| R5: queued restore contamination | Transactional dataset epoch, old jobs never rebound, imported RFX authorization paused | Two-tab replacement/delayed retry tests |
| R6: probe reassignment | Effective intervals/revision, flush/recovery, explicit active-cook Change probe | Preassignment retained samples, old-channel packets, ownership/reload tests |
| R7: mixed-storage import | Awaited cook commit, durable import identity/epoch, coordinated recipe writers, real hook failure semantics and target-recognition recovery | First apply/retry/race/reload and localStorage-success/IDB-abort tests |
| R8: global status ambiguity | Per-cook/per-channel received/pending/committed identity and partial recording | Healthy A, missing B food, healthy shared ambient test |
| R9: stale advice | Shared source/freshness/gap policy across App, intelligence, coach and notifications | Time advance after dropout/manual pause and recovery tests |
| R10: incomplete resource acceptance | Fixed comparable batches and absolute rendered-UI budgets; worker-backed full-size backup/import | 691,200-row round trip, timing distributions, memory/failure evidence |
| R11: migration ID collision | Canonical duplicate rejection, deterministic unused missing IDs | Mixed missing/present and canonical-collision tests |

## Corrections made during the follow-up review

The first revision-2 pass still missed StallCoach's archived-data dependency and its independent slice(-4) duration. Both were added to exact task/file interfaces and tests.

The follow-up also identified that simply awaiting recipes did not serialize the recipe phase against another import/edit. The plan now specifies durable operation ownership, dataset epoch/revision validation on FIRST application as well as retry, serialized cooperating recipe writes, and recovery when localStorage succeeds but the subsequent database transaction aborts. The recipe hook/adapter and asynchronous callers are explicitly named, with real storage-failure tests. Both reviewers rechecked these changed sections and reported the gaps addressed in design.

## Remaining explicit decisions and release limits

The user authorized plan revision only. Obtain Stage A execution approval separately from Stage B/storage approval. Numerical analytics freshness/window policies and reference performance budgets in revision 2 are proposed reviewable choices, not measured product guarantees.

RFX setup still requires a fresh eligible probe before Start, preserving the documented limitation; the draft remains available while waiting. Capturing/alerting while the app is locked/suspended/closed is not promised. These constraints must remain visible and be tested on real target devices before a release-ready claim.

Recommended next approval: **Stage A only**, inline with independent branch review, leaving automatic recording and migration gated until their separate approval and proofs.
