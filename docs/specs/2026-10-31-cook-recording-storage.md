# Cook recording storage — proposed amendment

Status: pending user approval. This changes the project brief's requirement that all state persist in localStorage. No storage implementation or migration has run.

## Why the change is needed

The approved flow treats manual and RFX cooks equally and associates live samples with cook history. The [synthetic local Chrome fixture](../qa/evidence/recording-storage-capacity.json) measured four probes at 1 Hz using explicit source/capture metadata: 1 hour serialized to 1,787,978 characters and saved; 4 hours serialized to 7,169,994 characters and failed with QuotaExceededError. Eight and twelve hours also failed. This is not a measured hardware rate or a universal browser quota. Rewriting an ever-growing JSON history for every live sample also scales poorly.

## Proposed boundary

Move cook records and readings to IndexedDB, a database inside the browser. Keep preferences, recipes, and MQTT configuration in their existing localStorage keys. No server, external synchronization, account, dependency, or cloud relay. All data remains on this device and usable offline.

Cook writes and reading writes share the same database, so ending a session and accepting a sample can be ordered transactionally. Do not split authoritative cook state across two different storage engines.

## Database version 1

Database name: `pitlogic-cooks`. Native IndexedDB only.

| Object store | Key | Contents |
| --- | --- | --- |
| `cooks` | `id` | Existing cook metadata; probe definitions without readings; `readingMode: manual/rfx`; optional exact food-channel bindings and ambient binding; live capture watermarks and interruption intervals |
| `readings` | `[cookId, seriesId, sampleId]` | `time` in minutes, `ts` capture milliseconds, `temp` canonical Fahrenheit, `source: manual/live/csv-import/legacy`, optional deviceProbeId and receivedAt; index by cookId |
| `state` | `key` | `current` for active cook IDs/dismissed notices; `migration-v5` for successful legacy migration |

Series IDs are `food:<probe.id>` and `smoker`. New probes have stable IDs. Existing probe IDs are preserved; missing IDs are assigned from their original index during migration.

Live sample ID: `live:<deviceProbeId>:<capturedAt>`; first accepted sample wins on equal timestamp. Manual and CSV samples receive unique IDs. Legacy migration IDs use original series/index, preserving equal-time rows. A live sample must have source `live`, an explicitly bound channel, finite normalized temperature, capture time at/after cook start, and capture time newer than that series' persisted live watermark. A completed cook is immutable to later telemetry. Manual spot readings never move the live watermark or overwrite a device sample.

Each live batch transaction reads current cook status and bindings, inserts accepted samples, and advances watermarks. It emits committed samples only after transaction completion. Concurrent End cook either follows the batch or precedes it; it cannot be bypassed by a stale React closure.

## Migration and existing data

- On first load, read legacy `pitlogic-v5` through existing storage helpers. Validate cook/probe/readings collections before migration; preserve original values, IDs, timestamps, notes, active IDs, ratings, timers, and other metadata.
- In one IndexedDB transaction, copy cook metadata and every legacy sample and write `current` plus `migration-v5`. Preserve original reading time/temperature exactly. Infer a missing timestamp from cook start plus minutes only for indexing; do not change its original minute value.
- Keep the original localStorage value untouched. Do not mark migration complete after a partial failure. Retry is idempotent; do not import the same original rows twice.
- Once migration succeeds, IndexedDB is authoritative. Never fall back silently to the old snapshot after a new database failure: it would lose newer cooks. Display a recovery error and allow exporting accessible data.
- A rollback to older app code sees the preserved pre-migration snapshot, not subsequent cooks. Export a current JSON backup before rollback; document this limitation.
- No API auto-deletes the legacy key or old backups. Existing JSON backup version 1 remains importable/exportable. Export materializes committed readings with source metadata so a backup is self-contained, not a set of device-local database references.
- Import merge/replace and cook deletion use transactions across cooks/readings/state. Merge conflicts preserve the existing cook by ID, matching current behavior. An unsuccessful replace leaves the original database intact.

## Recording and recovery

Bridge every accepted live reading synchronously from TelemetryStore through the existing permitted hook boundary; do not record React's latest snapshot, which can coalesce several incoming events.

Batch writes at most every 250 ms, flush all accepted queued samples, and flush before explicit End cook/export. Retain at most 1,000 uncommitted samples in memory. If persistence fails or the queue reaches its bound, stop automatic recording, retain the bounded pending batch for explicit retry, and show that new readings are not being saved. Retrying uses stable sample IDs. Later missing samples are an explicit recording gap; there is no invented backfill or uninterrupted-recording claim.

UI states distinguish connecting, receiving current device readings, writing/pending, committed, paused, and failed. A failed transaction cannot produce a Saved/Recorded label. A new/reloaded page detects whether the prior live interval ended without a clean stop and displays an interruption. Recording while suspended/closed is not promised.

IndexedDB can also encounter quota or availability failures. The app must display them and preserve committed history. A browser with unavailable IndexedDB must not imply a new cook is saved; the legacy snapshot remains available for recovery. Recipes/preferences remain usable.

## History and chart performance

Cook metadata and latest saved values support Home/History lists. Load full readings only for active cooks, an opened detail, export, or requested analytics; cancel stale results when navigation changes. Charts build rows in one pass rather than calling find for every timestamp. Preserve raw committed samples in storage; chart display may use a bounded min/max envelope with first/last points, preserving extremes and interruption boundaries. The display envelope is not the saved history. Existing analytics consume raw samples when explicitly requested.

## Verification gate

Prove migration rollback/idempotency, duplicate/late samples, same-channel cook isolation, explicit shared ambient, manual spot readings, quota/unavailable storage, simultaneous end/write, reload, and self-contained export/import. Run deterministic 12-hour/4-probe/1-Hz synthetic ingest (172,800 samples), verify sample counts and values, responsive navigation, bounded pending queue and chart point count. This accelerated test is not a real 12-hour hardware or background test. Publish measured timings, storage size, and failure conditions; native mobile and unattended long-cook verification remain release gates.

Historical review baseline: this revision was rejected by the adversarial review. Active proposal: [revision 2](2026-10-31-cook-recording-storage-v2.md). The original text above remains for comparison; it is not authorization to implement.
