# Isolated storage and recording proof

Date: 2026-11-01, America/Chicago. Branch: `codex/recording-storage-proof`, base `1067690`. Foundation commit: `91928e1`; the following recorder/review commit contains this report. The user agreed to begin Stage B after local Stage A integration. This checkpoint covers B1/B2 infrastructure in isolation; Stage B and release readiness are not complete.

## Delivered boundary

- Native IndexedDB repository with atomic migration, cook lifecycle, sample insertion, metadata/readings/state deletion, dataset-epoch fencing and explicit migration/recovery states. The original localStorage snapshot is retained unchanged. Canonical IDs, deterministic missing IDs and stable sample IDs preserve distinct equal-time samples. Duplicate identities and invalid live binding histories are rejected before migration/import.
- Legacy divergence checks at open, focus/storage events and before/after mutations. Divergence freezes writes and retains recoverable versions; a failed recovery copy leaves the original key intact and export available. Discovery exposes lost storage access, while committed history can still be exported. Blocked/versionchange states are explicit. Replacement pauses imported RFX recording and retires the old epoch; deleted cook IDs cannot be reused within the same epoch.
- An accepted-reading subscription through the existing telemetry-store hook boundary, independent of React snapshot renders. The opt-in recorder starts paused, batches within 250 ms, retains at most 1,000 pending plus recovery rows, preserves enqueue-time epoch/binding revision, and publishes committed callbacks only after transaction completion. Live recording excludes manual/replay/synthetic events; manual spot writes do not advance live watermarks.
- Transactional food-probe ownership and replacement intervals, historical binding validation, per-channel received/pending/committed state, missed-interval retention, failed-write retry and download-copy access. A lifecycle failure pauses visibly. Failed flush retains the old binding/cook. Finish-with-gap separates ended-cook recovery rows from active retries; release requires explicit download acknowledgment matching epoch/cook/series/revision/sample/token. A delayed acknowledgment cannot clear newer recovery rows. End cannot precede an already committed sample or current binding start.

These modules are not wired into App cook persistence or the source-selection UI. No user dataset was migrated. Recipes/preferences/connections retain existing storage. No dependency, authentication, CI, service-worker or device-hardware configuration change was made. The primary checkout remains Stage A at `1067690`; nothing was merged, pushed or deployed from this proof.

## Verification and evidence

| Check | Result |
| --- | --- |
| Full Vitest | 384/384 passed, 35 files |
| Changed JS/JSX lint, script syntax and whitespace | Passed, zero new diagnostics |
| Production build | Passed; existing large-chunk warning remains |
| Library TypeScript | Same eight known CsvProvider/ThermoWorksAdapter diagnostics; none added |
| Real Chromium IndexedDB scenarios | 17 passed |
| Accelerated four-channel, 12-hour, 1-Hz recording fixture | 172,800 exact samples, zero pending |
| Independent adversarial review | Verified findings corrected with observed failing regressions; final follow-ups found no remaining concrete blocker in reviewed paths |

Browser scenarios cover explicit migration preview, idempotent reopen, original snapshot preservation, aborted migration at each written store, malformed/unavailable data, synthetic quota/failure injection, old writers during and after writes, missed storage events, failed recovery copy, real second-tab epoch fencing, blocked/versionchange, source/duplicate/watermark behavior, exclusive ownership, retained/queued packets after replacement, aborted append, end ordering, atomic deletion and continued export after storage access loss.

The long fixture advances a virtual capture clock through the real normalizer, event bus, telemetry store, recorder and database. It awaits actual completion after every 250 samples, rather than overflowing the queue and calling that a throughput failure. Final reference run: 691 full batches plus final partial flush, 29.49 seconds elapsed, p95 full flush 38.8 ms. Every channel's 43,200 original captured timestamps, Fahrenheit values and live source tags matched; no pending rows remained. This run had an absent legacy key. It is accelerated sequence/retention evidence, not an actual unattended 12-hour or full performance-budget pass.

Evidence copied to primary `docs/qa/evidence/storage-recording-proof/`: final browser results, full-test log and baseline TypeScript diagnostics. No production readings or credentials are present.

## Adversarial corrections

Review reproduced silent intake stops after rejected lifecycle calls, ended-cook rows blocking later recovery, missing live-binding validation at import, loss of a known gap when finishing before another sample, end timestamps preceding committed history, ambiguous colon-separated channel identities, and recovery-memory/release hazards. Corrections retain visible failure states, transactionally validate end/bindings/identity, persist known finish interruptions, use tuple keys, cap all retained rows and bind acknowledgment to the downloaded snapshot. Additional validation caught storage-loss discovery presenting an apparently normal state; its browser regression now passes.

## Reproduce and remaining gates

Run `npm test -- --pool=forks --maxWorkers=1`, `npm run build` and changed-file lint. Serve Vite on loopback port 5182 with HMR disabled and `.qa-temp` excluded from watching. Run `node scripts/qa/cook-storage.mjs`; set `QA_LONG_PROOF=1` for the accelerated fixture. `PLAYWRIGHT_MODULE`, `CHROME_PATH`, `QA_BASE` and `QA_OUTPUT_DIR` override installed-runtime defaults. All browser storage is a fresh context on an isolated test origin.

B3 cadence-independent analytics, scalable rendering/history hydration and per-cook advice remain pending. B4 source UI, application authority, migration/download/reconciliation UX, recipe import coordination and worker-based backup remain pending. B5 rendered responsiveness, early/middle/final distributions with warm-up and large-legacy provenance cost, 691,200-sample backup round trips, combined heap budgets and cache/PWA upgrade are unverified. Physical hardware, native iPhone Safari, background/locking/eviction and actual sustained duration remain release gates. No claim of equal manual/RFX recording in the current app is made.
